/* ── Commit · Google Calendar (read-only, external feed) ──────────────
   Deliberately separate from Tasks/Calendar — these events are never
   merged into app.tasks or tasksByDay. Fetched through /api/ics-proxy
   (see that file for why: Google's ICS endpoint sends no CORS headers,
   so this can't be fetched directly from the browser).

   Month-grid *math* (monthGridDays) is shared with CalendarPage.tsx.
   Cell rendering stays separate on purpose — these chips are read-only
   (no drag, no click-to-edit, feed-color instead of category-color),
   which is different enough from task chips that sharing the render
   would mean threading a pile of unused interactivity props through it. */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CalendarRange, ChevronLeft, ChevronRight, MapPin, Repeat, RotateCw, Settings as SettingsIcon } from "lucide-react";
import type { AppData } from "@/hooks/useAppData";
import type { Page } from "@/components/layout/nav";
import { EmptyState, Spinner } from "@/components/ui";
import { supabase } from "@/services/supabase";
import { addDays, iso, monthGridDays, parseISO, shortDate, todayISO, weekday } from "@/utils/date";

interface GCalEvent {
  id: string;
  title: string;
  start: string; // full ISO datetime
  end: string;
  allDay: boolean;
  recurring: boolean;
  location?: string;
  description?: string;
}

type TaggedEvent = GCalEvent & { feedLabel: string; feedColor: string };
type DayEntry = { event: TaggedEvent; segment: "single" | "start" | "middle" | "end" };
type FeedResult = { label: string; events: GCalEvent[] } | { error: string };

const VIEWS = ["Agenda", "Month"] as const;
type View = (typeof VIEWS)[number];

const PALETTE = ["#3D52A0", "#7091E6", "#8A5CB8", "#4E9B6E", "#B08A3D", "#C77B3F"];
const WINDOW_DAYS = 60;
const MAX_SPAN_DAYS = 366; // same bounded-loop precedent as the calendar's DST fix

/** The server canonicalizes all-day event timestamps to UTC midnight from the
 *  literal date written in the ICS (see dateOf() in api/ics-proxy.ts) — so an
 *  all-day date must be read back via UTC fields here, not local ones. Reading
 *  it with local fields would reintroduce the exact bug that fix closed: the
 *  calendar day shifting depending on the browser's own timezone. Timed events
 *  are real, timezone-anchored instants, so local fields are correct for those. */
function dayKeyOf(isoString: string, allDay: boolean): string {
  const d = new Date(isoString);
  if (!allDay) return iso(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

/** Which calendar day(s) an event occupies. An all-day event's `end` is
 *  exclusive per the iCal spec (a 3-day all-day event's end is technically
 *  the day *after* it finishes) — a timed event's end is not adjusted. */
function daysSpanned(event: TaggedEvent): { day: string; segment: DayEntry["segment"] }[] {
  const startDay = dayKeyOf(event.start, event.allDay);
  const endMs = new Date(event.end).getTime();
  const endDay = dayKeyOf(new Date(event.allDay ? endMs - 1 : endMs).toISOString(), event.allDay);
  if (startDay >= endDay) return [{ day: startDay, segment: "single" }];
  const out: { day: string; segment: DayEntry["segment"] }[] = [];
  let d = startDay;
  let i = 0;
  while (d <= endDay && i < MAX_SPAN_DAYS) {
    out.push({ day: d, segment: d === startDay ? "start" : d === endDay ? "end" : "middle" });
    d = addDays(d, 1);
    i++;
  }
  return out;
}

export function GoogleCalendarPage({ app, go }: { app: AppData; go: (p: Page) => void }) {
  const feeds = app.settings.googleCalendarFeeds;
  const feedsKey = feeds.map((f) => `${f.id}:${f.url}`).join("|");
  const [results, setResults] = useState<Record<string, FeedResult>>({});
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("Agenda");
  const [anchor, setAnchor] = useState(() => new Date());
  const today = todayISO();

  const fetchAll = useCallback(async () => {
    if (feeds.length === 0) { setResults({}); return; }
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const entries = await Promise.all(feeds.map(async (feed): Promise<[string, FeedResult]> => {
      try {
        const res = await fetch(`/api/ics-proxy?feedId=${encodeURIComponent(feed.id)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (!res.ok) return [feed.id, { error: json?.error || `Request failed (${res.status})` }];
        return [feed.id, { label: json.label ?? feed.label, events: json.events ?? [] }];
      } catch {
        return [feed.id, { error: "Network error reaching the proxy" }];
      }
    }));
    setResults(Object.fromEntries(entries));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedsKey]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const multipleFeeds = Object.values(results).filter((r) => "events" in r).length > 1;

  const eventsByDay = useMemo(() => {
    const flat: TaggedEvent[] = [];
    Object.values(results).forEach((r, i) => {
      if ("events" in r) {
        const color = PALETTE[i % PALETTE.length];
        r.events.forEach((e) => flat.push({ ...e, feedLabel: r.label, feedColor: color }));
      }
    });
    const map: Record<string, DayEntry[]> = {};
    flat.forEach((event) => {
      daysSpanned(event).forEach(({ day, segment }) => {
        (map[day] = map[day] || []).push({ event, segment });
      });
    });
    // Untimed/multi-day entries first, then timed entries in ascending local time.
    Object.values(map).forEach((list) => list.sort((a, b) => {
      const at = a.segment === "single" && !a.event.allDay ? new Date(a.event.start).toTimeString().slice(0, 5) : "";
      const bt = b.segment === "single" && !b.event.allDay ? new Date(b.event.start).toTimeString().slice(0, 5) : "";
      return at < bt ? -1 : at > bt ? 1 : 0;
    }));
    return map;
  }, [results]);

  const errors = Object.values(results).filter((r): r is { error: string } => "error" in r);
  const monthLabel = anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const shiftMonth = (n: number) => {
    const d = new Date(anchor);
    d.setMonth(d.getMonth() + n);
    setAnchor(d);
  };

  const MonthCell = ({ dateStr, dim }: { dateStr: string; dim?: boolean }) => {
    const dayEntries = eventsByDay[dateStr] || [];
    const isToday = dateStr === today;
    return (
      <div
        className="rounded-xl p-1.5 flex flex-col gap-1 transition-all"
        style={{
          minHeight: 96,
          background: "var(--inset)",
          border: `1px solid ${isToday ? "var(--brand-2)" : "var(--border)"}`,
          boxShadow: isToday ? "0 0 0 3px rgba(112,145,230,.16)" : undefined,
          opacity: dim ? 0.45 : 1,
        }}
      >
        <div className={`text-xs font-semibold px-1 ${isToday ? "t-brand" : "t-muted"}`}>{parseISO(dateStr).getDate()}</div>
        <div className="flex flex-col gap-1 overflow-hidden">
          {dayEntries.slice(0, 3).map(({ event, segment }) => {
            const roundingClass = segment === "single" ? "rounded-md" : segment === "start" ? "rounded-l-md" : segment === "end" ? "rounded-r-md" : "";
            return (
              <div
                key={event.id}
                className={`text-xs px-1.5 py-1 ${roundingClass} truncate`}
                style={{ background: `${event.feedColor}1C`, color: event.feedColor, fontWeight: 600, border: `1px solid ${event.feedColor}30` }}
                title={`${event.title}${event.recurring ? " (recurring)" : ""} — ${event.feedLabel}`}
              >
                {segment === "single" && !event.allDay && <span style={{ opacity: 0.7 }}>{formatEventTime(event.start)} </span>}
                {event.title}
              </div>
            );
          })}
          {dayEntries.length > 3 && <div className="text-xs t-faint px-1">+{dayEntries.length - 3} more</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="cm-page flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="cm-display text-2xl font-extrabold t-text">Google Calendar</h1>
          <div className="text-xs t-muted mt-0.5">
            Read-only — shown side by side with your own tasks, never merged in. Next {WINDOW_DAYS} days.
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="cm-card flex gap-1 p-1" style={{ borderRadius: 12 }}>
            {VIEWS.map((v) => (
              <button
                key={v}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={view === v
                  ? { background: "linear-gradient(150deg,#5b74c8,#3d52a0)", color: "#fff", boxShadow: "inset 0 1px 0 rgba(255,255,255,.3)" }
                  : { color: "var(--muted)" }}
                onClick={() => setView(v)}
              >
                {v}
              </button>
            ))}
          </div>
          {view === "Month" && (
            <>
              <button className="cm-btn cm-btn-ghost px-2.5" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={16} /></button>
              <button className="cm-btn cm-btn-ghost" onClick={() => setAnchor(new Date())}>Today</button>
              <button className="cm-btn cm-btn-ghost px-2.5" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={16} /></button>
            </>
          )}
          <button className="cm-btn cm-btn-ghost" onClick={fetchAll} disabled={loading || feeds.length === 0}>
            <RotateCw size={14} className={loading ? "cm-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {feeds.length === 0 && (
        <EmptyState
          icon={<CalendarClock size={22} />}
          title="No Google Calendars linked yet"
          blurb="Paste your calendar's secret iCal address in Settings to see its events here."
          action={<button className="cm-btn cm-btn-primary" onClick={() => go("settings")}><SettingsIcon size={15} /> Go to Settings</button>}
        />
      )}

      {feeds.length > 0 && loading && Object.keys(results).length === 0 && (
        <div className="cm-card flex items-center justify-center gap-2 p-10 text-sm t-muted">
          <Spinner size={18} /> Loading your calendars…
        </div>
      )}

      {errors.map((e, i) => (
        <div key={i} className="cm-card p-3 text-xs" style={{ color: "var(--bad)" }}>{e.error}</div>
      ))}

      {feeds.length > 0 && !loading && Object.keys(eventsByDay).length === 0 && errors.length === 0 && (
        <EmptyState icon={<CalendarClock size={22} />} title="Nothing in the next 60 days" blurb="This calendar is quiet for now." />
      )}

      {view === "Month" ? (
        <>
          <div className="text-sm t-muted -mt-1">{monthLabel}</div>
          <div className="cm-card p-3 md:p-4">
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="text-xs t-faint text-center font-semibold">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {monthGridDays(anchor).map((d) => <MonthCell key={iso(d)} dateStr={iso(d)} dim={d.getMonth() !== anchor.getMonth()} />)}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(eventsByDay).map(([d, dayEntries]) => (
            <div key={d}>
              <div className="text-xs font-bold t-brand uppercase tracking-wide mb-2">
                {weekday(d)} · {shortDate(d)} {d === today ? "· Today" : ""}
              </div>
              <div className="flex flex-col gap-2">
                {dayEntries.map(({ event, segment }) => (
                  <div key={event.id} className="cm-card p-3.5 flex items-start gap-3">
                    <span className="inline-block rounded-full shrink-0 mt-1.5" style={{ width: 8, height: 8, background: event.feedColor }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold t-text truncate">{event.title}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-xs t-muted">
                        <span>
                          {multipleFeeds ? event.feedLabel + " · " : ""}
                          {event.allDay ? "All day" : formatEventTime(event.start)}
                        </span>
                        {segment !== "single" && (
                          <span className="inline-flex items-center gap-1 t-faint"><CalendarRange size={11} /> multi-day</span>
                        )}
                        {event.recurring && <span className="inline-flex items-center gap-1 t-faint"><Repeat size={11} /> Recurring</span>}
                        {event.location && <span className="inline-flex items-center gap-1 t-faint truncate"><MapPin size={11} /> {event.location}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
