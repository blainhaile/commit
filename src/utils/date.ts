/* ── Commit · date helpers (local-time, ISO YYYY-MM-DD strings) ─────── */

export const DAY_MS = 86400000;
export const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const todayISO = () => iso(new Date());
export const addDays = (dateStr: string, n: number) => iso(new Date(parseISO(dateStr).getTime() + n * DAY_MS));
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

/** "14:30" -> "2:30 PM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${pad(m)} ${ampm}`;
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
