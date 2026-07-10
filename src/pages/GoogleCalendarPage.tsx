/* ── Commit · Google Calendar (read-only, external feed) ──────────────
   Deliberately separate from Tasks/Calendar — these events are never
   merged into app.tasks or tasksByDay. Fetched through /api/ics-proxy
   (see that file for why: Google's ICS endpoint sends no CORS headers,
   so this can't be fetched directly from the browser). */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, MapPin, Repeat, RotateCw, Settings as SettingsIcon } from "lucide-react";
import type { AppData } from "@/hooks/useAppData";
import type { Page } from "@/components/layout/nav";
import { EmptyState, Spinner } from "@/components/ui";
import { supabase } from "@/services/supabase";
import { iso, shortDate, weekday } from "@/utils/date";

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

type FeedResult = { label: string; events: GCalEvent[] } | { error: string };

const PALETTE = ["#3D52A0", "#7091E6", "#8A5CB8", "#4E9B6E", "#B08A3D", "#C77B3F"];

export function GoogleCalendarPage({ app, go }: { app: AppData; go: (p: Page) => void }) {
  const feeds = app.settings.googleCalendarFeeds;
  const feedsKey = feeds.map((f) => `${f.id}:${f.url}`).join("|");
  const [results, setResults] = useState<Record<string, FeedResult>>({});
  const [loading, setLoading] = useState(false);

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

  const groups = useMemo(() => {
    const flat: (GCalEvent & { feedLabel: string; feedColor: string })[] = [];
    Object.values(results).forEach((r, i) => {
      if ("events" in r) {
        const color = PALETTE[i % PALETTE.length];
        r.events.forEach((e) => flat.push({ ...e, feedLabel: r.label, feedColor: color }));
      }
    });
    flat.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    const out: Record<string, typeof flat> = {};
    flat.forEach((e) => {
      const day = iso(new Date(e.start));
      (out[day] = out[day] || []).push(e);
    });
    return out;
  }, [results]);

  const errors = Object.values(results).filter((r): r is { error: string } => "error" in r);

  return (
    <div className="cm-page flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="cm-display text-2xl font-extrabold t-text">Google Calendar</h1>
          <div className="text-xs t-muted mt-0.5">
            Read-only — shown side by side with your own tasks, never merged in. Next {60} days.
          </div>
        </div>
        <button className="cm-btn cm-btn-ghost" onClick={fetchAll} disabled={loading || feeds.length === 0}>
          <RotateCw size={14} className={loading ? "cm-spin" : ""} /> Refresh
        </button>
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

      {feeds.length > 0 && !loading && Object.keys(groups).length === 0 && errors.length === 0 && (
        <EmptyState icon={<CalendarClock size={22} />} title="Nothing in the next 60 days" blurb="This calendar is quiet for now." />
      )}

      <div className="flex flex-col gap-4">
        {Object.entries(groups).map(([d, dayEvents]) => (
          <div key={d}>
            <div className="text-xs font-bold t-brand uppercase tracking-wide mb-2">
              {weekday(d)} · {shortDate(d)}
            </div>
            <div className="flex flex-col gap-2">
              {dayEvents.map((e) => (
                <div key={e.id} className="cm-card p-3.5 flex items-start gap-3">
                  <span
                    className="inline-block rounded-full shrink-0 mt-1.5"
                    style={{ width: 8, height: 8, background: e.feedColor }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold t-text truncate">{e.title}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap text-xs t-muted">
                      <span>{feedsHaveMultiple(results) ? e.feedLabel + " · " : ""}{e.allDay ? "All day" : formatEventTime(e.start)}</span>
                      {e.recurring && <span className="inline-flex items-center gap-1 t-faint"><Repeat size={11} /> Recurring</span>}
                      {e.location && <span className="inline-flex items-center gap-1 t-faint truncate"><MapPin size={11} /> {e.location}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function feedsHaveMultiple(results: Record<string, FeedResult>): boolean {
  return Object.values(results).filter((r) => "events" in r).length > 1;
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
