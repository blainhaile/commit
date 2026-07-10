/* ── Commit · Google Calendar ICS proxy ───────────────────────────────
   Runs server-side only (Vercel serverless function). Exists because
   Google's calendar.google.com ICS endpoint sends no CORS headers, so a
   browser can't fetch it directly — see the CORS investigation that led
   to this file.

   Locked to the caller's own Supabase session: the client never sends a
   raw ICS URL, only an opaque feedId. This function verifies the bearer
   token against Supabase (using the anon key + the forwarded JWT, exactly
   like the browser client does — no service-role key, no new secret),
   looks up that user's own stored feed by id, and only then fetches it.
   Nobody without a valid session for the single allowed account can use
   this as a URL-fetching relay.                                        */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import ICAL from "ical.js";

const WINDOW_DAYS = 60;
// Recurrence expansion must walk an RRULE from its true dtstart to stay
// phase-aligned (there's no "start expanding from date X" shortcut) — these
// caps bound that walk so a years-old daily/hourly event can't run away.
const MAX_EXAMINED_PER_EVENT = 3660; // ~10 years of daily occurrences
const MAX_COLLECTED_PER_EVENT = 300;
const MAX_TOTAL_EVENTS = 500;

interface GCalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  recurring: boolean;
  location?: string;
  description?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const feedId = typeof req.query.feedId === "string" ? req.query.feedId : null;
  if (!feedId) {
    res.status(400).json({ error: "Missing feedId" });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    res.status(500).json({ error: "Server misconfigured (missing Supabase env vars)" });
    return;
  }

  const authHeader = req.headers.authorization ?? "";
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = userData.user.id;

  const { data: settingsRow, error: settingsErr } = await supabase
    .from("settings")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (settingsErr) {
    res.status(500).json({ error: "Could not load settings" });
    return;
  }

  const feeds = ((settingsRow?.data as any)?.googleCalendarFeeds ?? []) as { id: string; label: string; url: string }[];
  const feed = feeds.find((f) => f.id === feedId);
  if (!feed) {
    res.status(404).json({ error: "Calendar feed not found" });
    return;
  }

  let icsText: string;
  try {
    const icsRes = await fetch(feed.url);
    if (!icsRes.ok) {
      res.status(502).json({ error: `Google returned ${icsRes.status} fetching that calendar` });
      return;
    }
    icsText = await icsRes.text();
  } catch {
    res.status(502).json({ error: "Could not reach the calendar URL" });
    return;
  }

  let events: GCalEvent[];
  try {
    events = parseIcs(icsText);
  } catch {
    res.status(422).json({ error: "Could not parse that calendar feed — is the URL a valid iCal address?" });
    return;
  }

  res.status(200).json({ label: feed.label, events });
}

/** Resolves an ICAL.Time to a real Date. Date-only (all-day) values are read
 *  straight from their raw y/m/d components and canonicalized to UTC midnight
 *  ourselves — never through toJSDate() for these, which builds the Date using
 *  whichever timezone happens to be running the code (UTC on Vercel today, but
 *  not guaranteed, and wrong the instant it isn't) instead of the literal date
 *  written in the ICS. Timed values (with an explicit TZID or UTC 'Z') are
 *  already timezone-anchored by ical.js, so toJSDate() is safe for those. */
function dateOf(t: ICAL.Time): Date {
  if (t.isDate) return new Date(Date.UTC(t.year, t.month - 1, t.day));
  return t.toJSDate();
}

function parseIcs(icsText: string): GCalEvent[] {
  const jcal = ICAL.parse(icsText);
  const comp = new ICAL.Component(jcal);
  const vevents = comp.getAllSubcomponents("vevent");

  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const windowEnd = new Date(windowStart.getTime() + WINDOW_DAYS * 86400000);

  // Group by UID so a rescheduled single instance — a separate VEVENT carrying
  // RECURRENCE-ID — gets related back to its series. Without this, the base
  // RRULE has no idea that date was overridden and keeps generating it, so both
  // the old (superseded) and new (rescheduled) date would appear.
  const byUid = new Map<string, { master: any | null; overrides: any[] }>();
  for (const vevent of vevents) {
    const uid = String(vevent.getFirstPropertyValue("uid"));
    const recurrenceId = vevent.getFirstPropertyValue("recurrence-id");
    const entry = byUid.get(uid) ?? { master: null, overrides: [] };
    if (recurrenceId) entry.overrides.push(vevent);
    else entry.master = vevent;
    byUid.set(uid, entry);
  }

  const out: GCalEvent[] = [];

  const pushSingle = (event: ICAL.Event, recurring: boolean) => {
    const start = dateOf(event.startDate);
    if (start < windowStart || start > windowEnd) return;
    const end = event.endDate ? dateOf(event.endDate) : start;
    out.push({
      id: `${event.uid}_${start.toISOString()}`,
      title: event.summary || "(untitled)",
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: event.startDate.isDate,
      recurring,
      location: event.location || undefined,
      description: event.description || undefined,
    });
  };

  for (const [, { master, overrides }] of byUid) {
    if (!master) {
      // An override with no matching master shouldn't normally happen — handle it
      // gracefully (as its own standalone event) rather than dropping it silently.
      overrides.forEach((ov) => pushSingle(new ICAL.Event(ov), true));
      continue;
    }

    const exceptions = overrides.map((ov) => new ICAL.Event(ov));
    const event = new ICAL.Event(master, exceptions.length ? { exceptions } : undefined);

    if (!event.isRecurring()) {
      pushSingle(event, false);
      continue;
    }

    const iterator = event.iterator();
    let examined = 0;
    let collected = 0;
    let next: ICAL.Time | null;
    // eslint-disable-next-line no-cond-assign
    while ((next = iterator.next() as ICAL.Time | null) && examined < MAX_EXAMINED_PER_EVENT && collected < MAX_COLLECTED_PER_EVENT) {
      examined++;
      // Raw (un-overridden) occurrence times are monotonically increasing, so these
      // are the correct signal for when to stop/skip walking the RRULE — the
      // resolved (possibly overridden) date is checked separately below, since an
      // override can move an occurrence outside the window in either direction.
      const rawStart = dateOf(next);
      if (rawStart > windowEnd) break;
      if (rawStart < windowStart) continue;
      collected++;

      // Resolves to the override's own details if this series has one for this
      // exact date, otherwise the master's own recurring instance.
      const details = event.getOccurrenceDetails(next);
      const occEvent = details.item;
      const occStart = dateOf(details.startDate);
      const occEnd = details.endDate ? dateOf(details.endDate) : occStart;
      if (occStart < windowStart || occStart > windowEnd) continue;

      out.push({
        id: `${event.uid}_${occStart.toISOString()}`,
        title: occEvent.summary || "(untitled)",
        start: occStart.toISOString(),
        end: occEnd.toISOString(),
        allDay: details.startDate.isDate,
        recurring: true,
        location: occEvent.location || undefined,
        description: occEvent.description || undefined,
      });
    }
  }

  out.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return out.slice(0, MAX_TOTAL_EVENTS);
}
