/* ── Commit · domain types ──────────────────────────────────────────── */

export type Priority = "Critical" | "High" | "Medium" | "Low";
export type Difficulty = "Easy" | "Medium" | "Hard" | "Epic";
export type Status = "Not Started" | "In Progress" | "Completed" | "Archived";
export type Recurring = "None" | "Daily" | "Weekly" | "Monthly";
export type ThemeMode = "light" | "dark";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  notes: string;
  priority: Priority;
  difficulty: Difficulty;
  status: Status;
  recurring: Recurring;
  categoryId: string | null;
  projectId: string | null;
  goalId: string | null;
  deadline: string | null;   // YYYY-MM-DD
  startDate: string | null;  // YYYY-MM-DD
  duration: number;          // minutes
  tags: string[];
  subtasks: Subtask[];
  createdAt: string;         // YYYY-MM-DD
  completedAt: string | null; // YYYY-MM-DDTHH:mm:ss
}

export interface Project {
  id: string;
  name: string;
  description: string;
  categoryId: string | null;
  goalId: string | null;
  targetDate: string | null;
}

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
}

export interface Goal {
  id: string;
  name: string;
  description: string;
  categoryId: string | null;
  targetDate: string | null;
  milestones: Milestone[];
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string; // lucide icon name
}

export interface WidgetPrefs {
  focus: boolean;
  deadlines: boolean;
  charts: boolean;
  recent: boolean;
}

export interface NotifPrefs {
  d1: boolean;
  h1: boolean;
  m15: boolean;
}

export interface Settings {
  theme: ThemeMode;
  displayName: string;
  widgets: WidgetPrefs;
  notifPrefs: NotifPrefs;
}

export interface LevelInfo {
  level: number;
  intoLevel: number;
  needed: number;
  progress: number; // 0..1
}

export interface Toast {
  id: string;
  title: string;
  sub?: string;
  icon?: React.ReactNode;
}

/* ── Habits ──────────────────────────────────────────────────────────── */
export type HabitFrequencyType = "Daily" | "Weekly";
export type HabitStatus = "Completed" | "Partial" | "Missed";

export interface StreakMultiplierTier {
  days: number;       // streak length threshold, e.g. 7
  multiplier: number; // e.g. 1.1 — stored now, applied starting Phase 2
}

export interface Habit {
  id: string;
  name: string;
  categoryId: string | null;
  description: string;
  frequencyType: HabitFrequencyType;
  targetDaysPerWeek: number | null; // only meaningful when frequencyType === "Weekly"
  goalAmount: number;
  measurementUnit: string;          // "minutes" | "count" | "hours" | "pages" …
  xpReward: number;
  difficulty: Difficulty;
  streakMultipliers: StreakMultiplierTier[];
  startDate: string;  // YYYY-MM-DD
  active: boolean;
  createdAt: string;  // YYYY-MM-DD
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  date: string;       // YYYY-MM-DD
  status: HabitStatus;
  amount: number;
  notes: string;
  xpEarned: number;
  createdAt: string;  // YYYY-MM-DDTHH:mm:ss
}
