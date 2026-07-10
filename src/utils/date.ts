/* ── Commit · date helpers (local-time, ISO YYYY-MM-DD strings) ─────── */

export const DAY_MS = 86400000;
export const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const todayISO = () => iso(new Date());
/** Advances by calendar day using the local y/m/d components (via setDate), not
 *  by adding raw milliseconds — a fixed-ms step can land on the same calendar
 *  day again (or skip one) across a DST transition, since a "day" isn't always
 *  exactly 86400000ms in local time. setDate rolls over months/years correctly
 *  and is immune to that, since it never leaves the local calendar field space. */
export const addDays = (dateStr: string, n: number) => {
  const d = parseISO(dateStr);
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const daysAgo = (n: number) => iso(new Date(Date.now() - n * DAY_MS));
export const daysAhead = (n: number) => iso(new Date(Date.now() + n * DAY_MS));
export const shortDate = (s: string) => parseISO(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const weekday = (s: string) => parseISO(s).toLocaleDateString(undefined, { weekday: "short" });
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const pct = (done: number, total: number) => (total === 0 ? 0 : Math.round((done / total) * 100));

export const nowStamp = () => {
  const n = new Date();
  return `${todayISO()}T${pad(n.getHours())}:${pad(n.getMinutes())}:00`;
};

/** The 42-cell Monday-start month grid containing `anchor` — pure date math,
 *  shared by any page that renders a month calendar (Calendar, Google Calendar). */
export function monthGridDays(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday start
  const start = new Date(first);
  start.setDate(1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** "14:30" -> "2:30 PM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${pad(m)} ${ampm}`;
}

/* ── Yearly archive filtering ─────────────────────────────────────────
   "current" = the smart default: this year's items, plus anything from a
   prior year that isn't finished yet, so archiving never hides open work.
   "all" = everything. A specific year = a literal, unfiltered snapshot of
   that year, complete or not. */
export type YearFilter = "current" | "all" | number;

export function matchesYearFilter(itemYear: number, isComplete: boolean, filter: YearFilter, activeYear: number): boolean {
  if (filter === "all") return true;
  if (filter === "current") return itemYear === activeYear || !isComplete;
  return itemYear === filter;
}

/** Distinct years present in a list, always including activeYear (so "this
 *  year" is selectable even before anything's been created in it), newest first. */
export function yearOptions(items: { year: number }[], activeYear: number): number[] {
  const set = new Set(items.map((i) => i.year));
  set.add(activeYear);
  return [...set].sort((a, b) => b - a);
}

export function relativeDeadline(deadline: string | null): { label: string; tone: "over" | "today" | "soon" | "later" } | null {
  if (!deadline) return null;
  const t = todayISO();
  if (deadline < t) {
    const days = Math.round((parseISO(t).getTime() - parseISO(deadline).getTime()) / DAY_MS);
    return { label: `${days}d overdue`, tone: "over" };
  }
  if (deadline === t) return { label: "Due today", tone: "today" };
  const days = Math.round((parseISO(deadline).getTime() - parseISO(t).getTime()) / DAY_MS);
  if (days === 1) return { label: "Tomorrow", tone: "soon" };
  if (days <= 7) return { label: `In ${days}d`, tone: "soon" };
  return { label: shortDate(deadline), tone: "later" };
}
