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

function parseIcs(icsText: string): GCalEvent[] {
  const jcal = ICAL.parse(icsText);
  const comp = new ICAL.Component(jcal);
  const vevents = comp.getAllSubcomponents("vevent");

  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const windowEnd = new Date(windowStart.getTime() + WINDOW_DAYS * 86400000);

  const out: GCalEvent[] = [];

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);
    const durationMs = event.startDate && event.endDate
      ? event.endDate.toJSDate().getTime() - event.startDate.toJSDate().getTime()
      : 0;
    const title = event.summary || "(untitled)";

    if (!event.isRecurring()) {
      const start = event.startDate.toJSDate();
      if (start < windowStart || start > windowEnd) continue;
      out.push({
        id: event.uid,
        title,
        start: start.toISOString(),
        end: new Date(start.getTime() + durationMs).toISOString(),
        allDay: event.startDate.isDate,
        recurring: false,
        location: event.location || undefined,
        description: event.description || undefined,
      });
      continue;
    }

    const iterator = event.iterator();
    let examined = 0;
    let collected = 0;
    let next: ICAL.Time | null;
    // eslint-disable-next-line no-cond-assign
    while ((next = iterator.next() as ICAL.Time | null) && examined < MAX_EXAMINED_PER_EVENT && collected < MAX_COLLECTED_PER_EVENT) {
      examined++;
      const occStart = next.toJSDate();
      if (occStart > windowEnd) break;
      if (occStart < windowStart) continue;
      collected++;
      out.push({
        id: `${event.uid}_${occStart.toISOString()}`,
        title,
        start: occStart.toISOString(),
        end: new Date(occStart.getTime() + durationMs).toISOString(),
        allDay: next.isDate,
        recurring: true,
        location: event.location || undefined,
        description: event.description || undefined,
      });
    }
  }

  out.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return out.slice(0, MAX_TOTAL_EVENTS);
}
