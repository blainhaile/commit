/* ── Commit · data service ──────────────────────────────────────────────
   All persistence goes through here. The UI updates optimistically;
   every write is queued so the app stays fast even on slow networks.  */
import { supabase } from "./supabase";
import type { Category, Goal, Habit, HabitCompletion, Project, Settings, Task } from "@/types";

/* ---------- row ↔ model mapping ---------- */

const taskToRow = (t: Task, userId: string) => ({
  id: t.id,
  user_id: userId,
  title: t.title,
  description: t.description,
  notes: t.notes,
  priority: t.priority,
  difficulty: t.difficulty,
  status: t.status,
  recurring: t.recurring,
  category_id: t.categoryId,
  project_id: t.projectId,
  goal_id: t.goalId,
  deadline: t.deadline,
  deadline_time: t.deadlineTime,
  start_date: t.startDate,
  duration: t.duration,
  tags: t.tags,
  subtasks: t.subtasks,
  created_date: t.createdAt,
  completed_at: t.completedAt ? new Date(t.completedAt).toISOString() : null,
});

const rowToTask = (r: any): Task => ({
  id: r.id,
  title: r.title,
  description: r.description ?? "",
  notes: r.notes ?? "",
  priority: r.priority,
  difficulty: r.difficulty,
  status: r.status,
  recurring: r.recurring,
  categoryId: r.category_id,
  projectId: r.project_id,
  goalId: r.goal_id,
  deadline: r.deadline,
  deadlineTime: r.deadline_time ?? null,
  startDate: r.start_date,
  duration: r.duration ?? 30,
  tags: r.tags ?? [],
  subtasks: r.subtasks ?? [],
  createdAt: r.created_date,
  completedAt: r.completed_at ? toLocalStamp(r.completed_at) : null,
});

/** timestamptz → local "YYYY-MM-DDTHH:mm:ss" (analytics use local day/hour) */
function toLocalStamp(ts: string): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

const projectToRow = (p: Project, userId: string) => ({
  id: p.id, user_id: userId, name: p.name, description: p.description,
  category_id: p.categoryId, goal_id: p.goalId, target_date: p.targetDate, sort_index: p.sortIndex,
});
const rowToProject = (r: any): Project => ({
  id: r.id, name: r.name, description: r.description ?? "",
  categoryId: r.category_id, goalId: r.goal_id, targetDate: r.target_date, sortIndex: r.sort_index ?? 0,
});

const goalToRow = (g: Goal, userId: string) => ({
  id: g.id, user_id: userId, name: g.name, description: g.description,
  category_id: g.categoryId, target_date: g.targetDate, milestones: g.milestones, sort_index: g.sortIndex,
});
const rowToGoal = (r: any): Goal => ({
  id: r.id, name: r.name, description: r.description ?? "",
  categoryId: r.category_id, targetDate: r.target_date,
  // Legacy rows' milestone objects may not have a taskId key at all — normalize to null (unlinked).
  milestones: (r.milestones ?? []).map((m: any) => ({ ...m, taskId: m.taskId ?? null })),
  sortIndex: r.sort_index ?? 0,
});

const categoryToRow = (c: Category, userId: string) => ({
  id: c.id, user_id: userId, name: c.name, color: c.color, icon: c.icon, sort_index: c.sortIndex,
});
const rowToCategory = (r: any): Category => ({
  id: r.id, name: r.name, color: r.color, icon: r.icon, sortIndex: r.sort_index ?? 0,
});

const habitToRow = (h: Habit, userId: string) => ({
  id: h.id,
  user_id: userId,
  name: h.name,
  category_id: h.categoryId,
  description: h.description,
  frequency_type: h.frequencyType,
  target_days_per_week: h.targetDaysPerWeek,
  goal_amount: h.goalAmount,
  measurement_unit: h.measurementUnit,
  xp_reward: h.xpReward,
  difficulty: h.difficulty,
  streak_multipliers: h.streakMultipliers,
  start_date: h.startDate,
  active: h.active,
});
const rowToHabit = (r: any): Habit => ({
  id: r.id,
  name: r.name,
  categoryId: r.category_id,
  description: r.description ?? "",
  frequencyType: r.frequency_type,
  targetDaysPerWeek: r.target_days_per_week,
  goalAmount: Number(r.goal_amount ?? 1),
  measurementUnit: r.measurement_unit ?? "count",
  xpReward: r.xp_reward ?? 10,
  difficulty: r.difficulty ?? "Medium",
  streakMultipliers: r.streak_multipliers ?? [],
  startDate: r.start_date,
  active: r.active ?? true,
  createdAt: (r.created_at ?? "").slice(0, 10),
});

const habitCompletionToRow = (c: HabitCompletion, userId: string) => ({
  id: c.id,
  user_id: userId,
  habit_id: c.habitId,
  date: c.date,
  status: c.status,
  amount: c.amount,
  notes: c.notes,
  xp_earned: c.xpEarned,
});
const rowToHabitCompletion = (r: any): HabitCompletion => ({
  id: r.id,
  habitId: r.habit_id,
  date: r.date,
  status: r.status,
  amount: Number(r.amount ?? 0),
  notes: r.notes ?? "",
  xpEarned: r.xp_earned ?? 0,
  createdAt: r.created_at ? toLocalStamp(r.created_at) : nowStampFallback(),
});

function nowStampFallback(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

/* ---------- write queue (serialized, fire-and-forget with logging) ---------- */

let chain: Promise<unknown> = Promise.resolve();
function enqueue(op: () => PromiseLike<{ error: any }>) {
  chain = chain
    .then(() => op())
    .then(({ error }) => {
      if (error) console.error("[Commit] Supabase write failed:", error.message ?? error);
    })
    .catch((e) => console.error("[Commit] Supabase write failed:", e));
}

/* ---------- public API ---------- */

export interface Snapshot {
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  categories: Category[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  settings: Partial<Settings> | null;
}

export async function loadAll(userId: string): Promise<Snapshot> {
  const [tasks, projects, goals, categories, habits, habitCompletions, settings] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at"),
    supabase.from("projects").select("*").order("sort_index"),
    supabase.from("goals").select("*").order("sort_index"),
    supabase.from("categories").select("*").order("sort_index"),
    supabase.from("habits").select("*").order("created_at"),
    supabase.from("habit_completions").select("*").order("date"),
    supabase.from("settings").select("data").eq("user_id", userId).maybeSingle(),
  ]);
  const firstError = tasks.error || projects.error || goals.error || categories.error || habits.error || habitCompletions.error;
  if (firstError) throw firstError;
  return {
    tasks: (tasks.data ?? []).map(rowToTask),
    projects: (projects.data ?? []).map(rowToProject),
    goals: (goals.data ?? []).map(rowToGoal),
    categories: (categories.data ?? []).map(rowToCategory),
    habits: (habits.data ?? []).map(rowToHabit),
    habitCompletions: (habitCompletions.data ?? []).map(rowToHabitCompletion),
    settings: (settings.data?.data as Partial<Settings>) ?? null,
  };
}

export const db = {
  upsertTask: (t: Task, userId: string) =>
    enqueue(() => supabase.from("tasks").upsert(taskToRow(t, userId))),
  deleteTask: (id: string) => enqueue(() => supabase.from("tasks").delete().eq("id", id)),

  upsertProject: (p: Project, userId: string) =>
    enqueue(() => supabase.from("projects").upsert(projectToRow(p, userId))),
  deleteProject: (id: string) => enqueue(() => supabase.from("projects").delete().eq("id", id)),

  upsertGoal: (g: Goal, userId: string) =>
    enqueue(() => supabase.from("goals").upsert(goalToRow(g, userId))),
  deleteGoal: (id: string) => enqueue(() => supabase.from("goals").delete().eq("id", id)),

  upsertCategory: (c: Category, userId: string) =>
    enqueue(() => supabase.from("categories").upsert(categoryToRow(c, userId))),
  deleteCategory: (id: string) => enqueue(() => supabase.from("categories").delete().eq("id", id)),

  upsertHabit: (h: Habit, userId: string) =>
    enqueue(() => supabase.from("habits").upsert(habitToRow(h, userId))),
  deleteHabit: (id: string) => enqueue(() => supabase.from("habits").delete().eq("id", id)),

  upsertHabitCompletion: (c: HabitCompletion, userId: string) =>
    enqueue(() => supabase.from("habit_completions").upsert(habitCompletionToRow(c, userId))),
  deleteHabitCompletion: (id: string) => enqueue(() => supabase.from("habit_completions").delete().eq("id", id)),

  saveSettings: (s: Settings, userId: string) =>
    enqueue(() => supabase.from("settings").upsert({ user_id: userId, data: s, updated_at: new Date().toISOString() })),

  bulkInsert: async (snap: Pick<Snapshot, "categories" | "goals" | "projects" | "tasks">, userId: string) => {
    const cats = snap.categories.map((c) => categoryToRow(c, userId));
    const goals = snap.goals.map((g) => goalToRow(g, userId));
    const projects = snap.projects.map((p) => projectToRow(p, userId));
    const tasks = snap.tasks.map((t) => taskToRow(t, userId));
    if (cats.length) await supabase.from("categories").upsert(cats);
    if (goals.length) await supabase.from("goals").upsert(goals);
    if (projects.length) await supabase.from("projects").upsert(projects);
    if (tasks.length) await supabase.from("tasks").upsert(tasks);
  },
};
