/* ── Commit · navigation model ──────────────────────────────────────── */
import {
  BarChart3, CalendarClock, CalendarDays, CheckSquare, FolderKanban, LayoutDashboard,
  PiggyBank, Repeat, Settings, Tag, Target,
} from "lucide-react";

export type Page =
  | "dashboard" | "calendar" | "tasks" | "projects" | "goals"
  | "categories" | "analytics" | "habits" | "googleCalendar" | "savings" | "settings";

export const NAV: { id: Page; label: string; icon: typeof LayoutDashboard; soon?: boolean }[] = [
  { id: "dashboard",  label: "Dashboard",      icon: LayoutDashboard },
  { id: "calendar",   label: "Calendar",       icon: CalendarDays },
  { id: "tasks",      label: "Tasks",          icon: CheckSquare },
  { id: "projects",   label: "Projects",       icon: FolderKanban },
  { id: "goals",      label: "Goals",          icon: Target },
  { id: "categories", label: "Categories",     icon: Tag },
  { id: "analytics",  label: "Analytics",      icon: BarChart3 },
  { id: "habits",     label: "Habits",         icon: Repeat },
  { id: "googleCalendar", label: "Google Calendar", icon: CalendarClock },
  { id: "savings",    label: "Savings Tracker", icon: PiggyBank, soon: true },
  { id: "settings",   label: "Settings",       icon: Settings },
];
