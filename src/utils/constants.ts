/* ── Commit · shared constants & palette ────────────────────────────── */
import type { Difficulty, Priority, Recurring, Status } from "@/types";

export const APP_NAME = "Commit";
export const APP_TAGLINE = "Every task is a commitment to your future.";

/* Brand palette (metallic purple) */
export const BRAND = {
  primary: "#3D52A0",
  secondary: "#7091E6",
  accent: "#8697C4",
  surface: "#ADBBDA",
  background: "#EDE8F5",
} as const;

export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard", "Epic"];
export const PRIORITIES: Priority[] = ["Critical", "High", "Medium", "Low"];
export const STATUSES: Status[] = ["Not Started", "In Progress", "Completed", "Archived"];
export const RECUR_OPTIONS: Recurring[] = ["None", "Daily", "Weekly", "Monthly"];

/* Muted, editorial tones — deliberate, not neon */
export const PRIORITY_COLOR: Record<Priority, string> = {
  Critical: "#C0455E",
  High: "#C77B3F",
  Medium: "#3D52A0",
  Low: "#8697C4",
};

export const DIFF_COLOR: Record<Difficulty, string> = {
  Easy: "#4E9B6E",
  Medium: "#7091E6",
  Hard: "#3D52A0",
  Epic: "#8A5CB8",
};

export const PRIORITY_RANK: Record<Priority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

/* Chart palette derived from brand */
export const CHART = {
  bar: "#7091E6",
  barMuted: "#ADBBDA",
  line: "#3D52A0",
  areaFrom: "rgba(112,145,230,.45)",
  areaTo: "rgba(112,145,230,0)",
  grid: "rgba(61,82,160,.10)",
  tick: "#6B76A3",
};

let _uid = 0;
export const uid = (p = "id") => `${p}_${Date.now().toString(36)}_${(++_uid).toString(36)}`;
