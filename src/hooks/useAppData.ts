/* ── Commit · application state ─────────────────────────────────────────
   Single source of truth. Loads everything from Supabase on sign-in,
   keeps UI state optimistic, and persists every change automatically. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type {
  Category, Goal, Habit, HabitCompletion, HabitStatus, LevelInfo, Project, Settings, Task, Toast,
  WidgetPrefs, NotifPrefs, ThemeMode,
} from "@/types";
import { db, loadAll } from "@/services/dataService";
import { seedCategories, seedGoals, seedProjects, seedTasks } from "@/services/seed";
import {
  addDays, daysAgo, daysAhead, nowStamp, parseISO, pct, shortDate, todayISO, weekday, DAY_MS,
} from "@/utils/date";
import { levelFromXP, XP_BY_DIFFICULTY } from "@/utils/xp";
import { PRIORITY_RANK, STREAK_MILESTONES, STREAK_MILESTONE_COPY, uid } from "@/utils/constants";

export type ToastKind = "xp" | "level" | "goal" | "date" | "info";
export interface AppToast extends Toast { kind: ToastKind }

/** Consecutive days (Completed or Partial) counting back from `today`; today itself
 *  doesn't break the streak until it ends, mirroring the task streak's grace period.
 *  Pure and side-effect-free so it can also be used to compare a streak before/after
 *  a single edit, for milestone-celebration detection. */
function computeHabitStreak(startDate: string, completions: HabitCompletion[], today: string): number {
  const days = new Set(
    completions.filter((c) => c.status === "Completed" || c.status === "Partial").map((c) => c.date),
  );
  let cur = 0;
  let d = today;
  if (!days.has(d)) d = addDays(d, -1);
  while (days.has(d) && d >= startDate) { cur += 1; d = addDays(d, -1); }
  return cur;
}

const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  displayName: "",
  widgets: { focus: true, deadlines: true, charts: true, recent: true },
  notifPrefs: { d1: true, h1: true, m15: false },
  activeYear: new Date().getFullYear(),
  dismissedArchiveYear: null,
  googleCalendarFeeds: [],
};

export interface ProjectStat { name: string; total: number; done: number; pct: number; eta: string }
export interface CategoryStat { total: number; done: number; pct: number; hours: number; trend: number }
export interface GoalStat { pct: number; tasksDone: number; tasksTotal: number; projects: number }

export function useAppData(user: User) {
  /* ---------- core state ---------- */
  const [booted, setBooted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitCompletions, setHabitCompletions] = useState<HabitCompletion[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [editorTask, setEditorTask] = useState<Partial<Task> | null>(null);
  const [editorProject, setEditorProject] = useState<Partial<Project> | null>(null);
  const [editorGoal, setEditorGoal] = useState<Partial<Goal> | null>(null);
  const [editorCategory, setEditorCategory] = useState<Partial<Category> | null>(null);
  const [editorHabit, setEditorHabit] = useState<Partial<Habit> | null>(null);
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const [burst, setBurst] = useState(0);

  const userId = user.id;
  const today = todayISO();

  /* ---------- boot: load everything from Supabase ---------- */
  useEffect(() => {
    let alive = true;
    setBooted(false);
    loadAll(userId)
      .then((snap) => {
        if (!alive) return;
        setTasks(snap.tasks);
        setProjects(snap.projects);
        setGoals(snap.goals);
        setCategories(snap.categories);
        setHabits(snap.habits);
        setHabitCompletions(snap.habitCompletions);
        if (snap.settings) setSettings({ ...DEFAULT_SETTINGS, ...snap.settings });
        setBooted(true);
      })
      .catch((e) => {
        if (!alive) return;
        console.error("[Commit] load failed:", e);
        setLoadError(e?.message ?? "Could not load your data.");
        setBooted(true);
      });
    return () => { alive = false; };
  }, [userId]);

  /* ---------- settings persistence (debounced) ---------- */
  const settingsTimer = useRef<number | null>(null);
  const patchSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (settingsTimer.current) window.clearTimeout(settingsTimer.current);
      settingsTimer.current = window.setTimeout(() => db.saveSettings(next, userId), 500);
      return next;
    });
  }, [userId]);

  const setTheme = useCallback((theme: ThemeMode) => patchSettings({ theme }), [patchSettings]);
  const setWidgets = useCallback((widgets: WidgetPrefs) => patchSettings({ widgets }), [patchSettings]);
  const setNotifPrefs = useCallback((notifPrefs: NotifPrefs) => patchSettings({ notifPrefs }), [patchSettings]);

  /* ---------- yearly archive ----------
     Archiving never deletes anything — it just advances activeYear, which is what
     every page's "This year" default filter compares against. */
  const currentCalendarYear = new Date().getFullYear();
  const needsArchivePrompt = currentCalendarYear > settings.activeYear && settings.dismissedArchiveYear !== currentCalendarYear;

  const archiveYear = useCallback(() => {
    patchSettings({ activeYear: currentCalendarYear, dismissedArchiveYear: null });
  }, [patchSettings, currentCalendarYear]);

  const dismissArchivePrompt = useCallback(() => {
    patchSettings({ dismissedArchiveYear: currentCalendarYear });
  }, [patchSettings, currentCalendarYear]);

  /* ---------- toasts & confetti ---------- */
  const pushToast = useCallback((toast: Omit<AppToast, "id">) => {
    const id = uid("toast");
    setToasts((ts) => [...ts, { id, ...toast }]);
    window.setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3400);
  }, []);
  const fireConfetti = useCallback(() => {
    setBurst(Date.now());
    window.setTimeout(() => setBurst(0), 3600);
  }, []);

  /* ---------- lookups ---------- */
  const categoriesById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const projectsById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
  const goalsById = useMemo(() => Object.fromEntries(goals.map((g) => [g.id, g])), [goals]);

  /* ---------- derived: XP / level / streaks ---------- */
  const doneTasks = useMemo(
    () => tasks.filter((x) => x.status === "Completed" && x.completedAt) as (Task & { completedAt: string })[],
    [tasks],
  );
  const totalXP = useMemo(() => doneTasks.reduce((s, x) => s + XP_BY_DIFFICULTY[x.difficulty], 0), [doneTasks]);
  const level: LevelInfo = useMemo(() => levelFromXP(totalXP), [totalXP]);
  const xpToday = useMemo(
    () => doneTasks.filter((x) => x.completedAt.slice(0, 10) === today).reduce((s, x) => s + XP_BY_DIFFICULTY[x.difficulty], 0),
    [doneTasks, today],
  );

  const { streak, longestStreak } = useMemo(() => {
    const days = new Set(doneTasks.map((x) => x.completedAt.slice(0, 10)));
    let cur = 0;
    let d = today;
    if (!days.has(d)) d = addDays(d, -1); // streak survives until the end of today
    while (days.has(d)) { cur += 1; d = addDays(d, -1); }
    let longest = 0, run = 0;
    let prev: string | null = null;
    for (const day of [...days].sort()) {
      run = prev && addDays(prev, 1) === day ? run + 1 : 1;
      longest = Math.max(longest, run);
      prev = day;
    }
    return { streak: cur, longestStreak: longest };
  }, [doneTasks, today]);

  /* ---------- derived: today / focus / upcoming ---------- */
  const todaySet = useMemo(
    () => tasks.filter((x) => x.status !== "Archived" &&
      (x.deadline === today || (x.completedAt && x.completedAt.slice(0, 10) === today))),
    [tasks, today],
  );
  const todayDone = todaySet.filter((x) => x.status === "Completed").length;
  const todayTotal = todaySet.length;
  const todayPct = pct(todayDone, todayTotal);

  const focusTasks = useMemo(() => tasks
    .filter((x) => x.status !== "Completed" && x.status !== "Archived")
    .sort((a, b) => {
      const ao = Boolean(a.deadline && a.deadline < today);
      const bo = Boolean(b.deadline && b.deadline < today);
      if (ao !== bo) return ao ? -1 : 1;
      const ad = a.deadline || "9999", bd = b.deadline || "9999";
      if (ad !== bd) return ad < bd ? -1 : 1;
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    })
    .slice(0, 3), [tasks, today]);

  const upcoming = useMemo(() => tasks
    .filter((x) => x.status !== "Completed" && x.status !== "Archived" &&
      x.deadline && x.deadline >= today && x.deadline <= addDays(today, 7))
    .sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1)), [tasks, today]);

  const recentDone = useMemo(
    () => [...doneTasks].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1)),
    [doneTasks],
  );

  /* ---------- derived: charts ---------- */
  const weeklyData = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = daysAgo(6 - i);
    const list = doneTasks.filter((x) => x.completedAt.slice(0, 10) === d);
    return { day: weekday(d), completed: list.length, xp: list.reduce((s, x) => s + XP_BY_DIFFICULTY[x.difficulty], 0) };
  }), [doneTasks]);

  const monthlyData = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const d = daysAgo(29 - i);
    const list = doneTasks.filter((x) => x.completedAt.slice(0, 10) === d);
    return { day: shortDate(d), completed: list.length, xp: list.reduce((s, x) => s + XP_BY_DIFFICULTY[x.difficulty], 0) };
  }), [doneTasks]);

  const weekDelta = useMemo(() => {
    const count = (from: string, to: string) =>
      doneTasks.filter((x) => { const d = x.completedAt.slice(0, 10); return d >= from && d <= to; }).length;
    const thisWk = count(daysAgo(6), today);
    const lastWk = count(daysAgo(13), daysAgo(7));
    if (lastWk === 0) return thisWk > 0 ? 100 : 0;
    return Math.round(((thisWk - lastWk) / lastWk) * 100);
  }, [doneTasks, today]);

  /* ---------- derived: project / category / goal stats ---------- */
  const projectStats = useMemo(() => {
    const out: Record<string, ProjectStat> = {};
    projects.forEach((p) => {
      const list = tasks.filter((x) => x.projectId === p.id && x.status !== "Archived");
      const d = list.filter((x) => x.status === "Completed").length;
      out[p.id] = { name: p.name, total: list.length, done: d, pct: pct(d, list.length), eta: p.targetDate || daysAhead(30) };
    });
    return out;
  }, [projects, tasks]);

  const categoryStats = useMemo(() => {
    const out: Record<string, CategoryStat> = {};
    categories.forEach((c) => {
      const list = tasks.filter((x) => x.categoryId === c.id && x.status !== "Archived");
      const doneList = list.filter((x) => x.status === "Completed");
      const wk = doneList.filter((x) => x.completedAt && x.completedAt.slice(0, 10) >= daysAgo(6)).length;
      const lastWk = doneList.filter((x) => x.completedAt &&
        x.completedAt.slice(0, 10) >= daysAgo(13) && x.completedAt.slice(0, 10) < daysAgo(6)).length;
      out[c.id] = {
        total: list.length,
        done: doneList.length,
        pct: pct(doneList.length, list.length),
        hours: Math.round(doneList.reduce((s, x) => s + (x.duration || 0), 0) / 6) / 10,
        trend: wk - lastWk,
      };
    });
    return out;
  }, [categories, tasks]);

  const goalStats = useMemo(() => {
    const out: Record<string, GoalStat> = {};
    goals.forEach((g) => {
      const list = tasks.filter((x) => x.goalId === g.id && x.status !== "Archived");
      const tDone = list.filter((x) => x.status === "Completed").length;
      const mDone = g.milestones.filter((m) => m.done).length;
      const mPct = g.milestones.length ? mDone / g.milestones.length : 0;
      const tPct = list.length ? tDone / list.length : 0;
      const combined = list.length && g.milestones.length ? (mPct + tPct) / 2 : list.length ? tPct : mPct;
      out[g.id] = {
        pct: Math.round(combined * 100),
        tasksDone: tDone,
        tasksTotal: list.length,
        projects: projects.filter((p) => p.goalId === g.id).length,
      };
    });
    return out;
  }, [goals, tasks, projects]);

  /* ---------- derived: habits (Phase 1 — daily view only) ---------- */
  const activeHabits = useMemo(() => habits.filter((h) => h.active), [habits]);

  const habitCompletionsByHabit = useMemo(() => {
    const out: Record<string, HabitCompletion[]> = {};
    habitCompletions.forEach((c) => { (out[c.habitId] ??= []).push(c); });
    return out;
  }, [habitCompletions]);

  const todayHabitEntries = useMemo(
    () => Object.fromEntries(habitCompletions.filter((c) => c.date === today).map((c) => [c.habitId, c])),
    [habitCompletions, today],
  ) as Record<string, HabitCompletion>;

  const habitStreaks = useMemo(() => {
    const out: Record<string, number> = {};
    habits.forEach((h) => { out[h.id] = computeHabitStreak(h.startDate, habitCompletionsByHabit[h.id] ?? [], today); });
    return out;
  }, [habits, habitCompletionsByHabit, today]);

  const habitChainDone = useMemo(
    () => activeHabits.filter((h) => todayHabitEntries[h.id]?.status === "Completed").length,
    [activeHabits, todayHabitEntries],
  );
  const habitChainTotal = activeHabits.length;

  /** Compact habit analytics — reuses the same "scheduled + credited" fill rule as the
   *  month/year calendar views, just aggregated over date ranges instead of rendered
   *  per day. "Combined" streaks track days where every active, scheduled habit was
   *  done (a "perfect day"), not any single habit. Week/month/year rates are calendar
   *  period-to-date (e.g. "this month" = the 1st through today), matching how the
   *  month/year views already frame those periods. Best/worst are all-time completion%
   *  among active habits with at least one scheduled day. */
  const habitAnalytics = useMemo(() => {
    const creditByHabit: Record<string, Set<string>> = {};
    habitCompletions.forEach((c) => {
      if (c.status !== "Completed" && c.status !== "Partial") return;
      (creditByHabit[c.habitId] ??= new Set()).add(c.date);
    });

    const perHabit = activeHabits.map((h) => {
      const days = creditByHabit[h.id] ?? new Set<string>();
      const current = computeHabitStreak(h.startDate, habitCompletionsByHabit[h.id] ?? [], today);
      let longest = 0, run = 0, prevDay: string | null = null;
      [...days].sort().forEach((day) => {
        run = prevDay && addDays(prevDay, 1) === day ? run + 1 : 1;
        longest = Math.max(longest, run);
        prevDay = day;
      });
      let scheduled = 0, done = 0;
      for (let d = h.startDate; d <= today; d = addDays(d, 1)) {
        scheduled += 1;
        if (days.has(d)) done += 1;
      }
      return { habit: h, current, longest, pct: pct(done, scheduled), scheduled };
    });

    const ranked = perHabit.filter((p) => p.scheduled > 0);
    const best = ranked.length ? ranked.reduce((a, b) => (b.pct > a.pct ? b : a)) : null;
    const worst = ranked.length ? ranked.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;

    /** true = every active habit scheduled that day was Completed/Partial; null = no
     *  active habit was scheduled that day at all (doesn't count either way). */
    const isPerfectDay = (dateStr: string): boolean | null => {
      const scheduled = activeHabits.filter((h) => h.startDate <= dateStr);
      if (scheduled.length === 0) return null;
      return scheduled.every((h) => creditByHabit[h.id]?.has(dateStr));
    };
    let combinedCurrentStreak = 0;
    {
      let d = today;
      if (isPerfectDay(d) !== true) d = addDays(d, -1);
      while (isPerfectDay(d) === true) { combinedCurrentStreak += 1; d = addDays(d, -1); }
    }
    let combinedLongestStreak = 0;
    if (activeHabits.length > 0) {
      const earliestStart = activeHabits.reduce((min, h) => (h.startDate < min ? h.startDate : min), today);
      let run = 0;
      for (let d = earliestStart; d <= today; d = addDays(d, 1)) {
        run = isPerfectDay(d) === true ? run + 1 : 0;
        combinedLongestStreak = Math.max(combinedLongestStreak, run);
      }
    }

    const periodPct = (periodStart: string) => {
      let scheduled = 0, done = 0;
      activeHabits.forEach((h) => {
        const from = periodStart < h.startDate ? h.startDate : periodStart;
        for (let d = from; d <= today; d = addDays(d, 1)) {
          scheduled += 1;
          if (creditByHabit[h.id]?.has(d)) done += 1;
        }
      });
      return pct(done, scheduled);
    };
    const weekStart = addDays(today, -((parseISO(today).getDay() + 6) % 7)); // Monday of this week
    const monthStart = `${today.slice(0, 7)}-01`;
    const yearStart = `${today.slice(0, 4)}-01-01`;

    return {
      totalHabits: habits.length,
      activeHabitsCount: activeHabits.length,
      totalDaysLogged: habitCompletions.length,
      combinedCurrentStreak,
      combinedLongestStreak,
      weekPct: periodPct(weekStart),
      monthPct: periodPct(monthStart),
      yearPct: periodPct(yearStart),
      best,
      worst,
      perHabit,
    };
  }, [habits, activeHabits, habitCompletions, habitCompletionsByHabit, today]);

  /* ---------- derived: analytics ---------- */
  const analytics = useMemo(() => {
    const open = tasks.filter((x) => x.status !== "Archived");
    const completionRate = pct(doneTasks.length, open.length);
    const dayCount: Record<string, number> = {};
    const hourCount: Record<string, number> = {};
    const catCount: Record<string, number> = {};
    let diffSum = 0;
    doneTasks.forEach((x) => {
      const dt = parseISO(x.completedAt.slice(0, 10));
      const wd = dt.toLocaleDateString(undefined, { weekday: "long" });
      dayCount[wd] = (dayCount[wd] || 0) + 1;
      const h = Number(x.completedAt.slice(11, 13));
      hourCount[h] = (hourCount[h] || 0) + 1;
      if (x.categoryId) catCount[x.categoryId] = (catCount[x.categoryId] || 0) + 1;
      diffSum += Math.max(0, (parseISO(x.completedAt.slice(0, 10)).getTime() - parseISO(x.createdAt).getTime()) / DAY_MS);
    });
    const top = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
    const bestDayE = top(dayCount), bestHourE = top(hourCount), topCatE = top(catCount);
    const fmtHour = (hs: string) => {
      const h = Number(hs);
      const ampm = h >= 12 ? "PM" : "AM";
      const hh = h % 12 === 0 ? 12 : h % 12;
      return `${hh} ${ampm}`;
    };
    let cum = 0;
    const xpCumulative = monthlyData.map((d) => { cum += d.xp; return { day: d.day, xp: cum }; });
    return {
      completionRate,
      totalDone: doneTasks.length,
      longestStreak,
      avgDays: doneTasks.length ? Math.round((diffSum / doneTasks.length) * 10) / 10 : 0,
      bestDay: bestDayE ? bestDayE[0] : "—",
      bestHour: bestHourE ? fmtHour(bestHourE[0]) : "—",
      topCategory: topCatE ? categoriesById[topCatE[0]]?.name ?? "—" : "—",
      projectsDone: projects.filter((p) => { const s = projectStats[p.id]; return s.total > 0 && s.pct === 100; }).length,
      goalsDone: goals.filter((g) => goalStats[g.id].pct === 100).length,
      xpCumulative,
      byCategory: Object.entries(catCount)
        .map(([id, v]) => ({ name: categoriesById[id]?.name || id, value: v, color: categoriesById[id]?.color || "#8697C4" }))
        .sort((a, b) => b.value - a.value),
    };
  }, [tasks, doneTasks, monthlyData, longestStreak, projects, projectStats, goals, goalStats, categoriesById]);

  /* ---------- actions (optimistic + persisted) ---------- */

  /** Core task-completion transition (Completed ↔ In Progress), shared by the task
   *  checkbox and by milestone-driven completion. `syncMilestone` (default true) also
   *  flips any goal milestone linked to this task via milestone.taskId — pass false
   *  when the caller is itself the milestone side, to avoid syncing back into itself. */
  const setTaskCompletion = useCallback((id: string, done: boolean, opts?: { syncMilestone?: boolean }) => {
    const task = tasks.find((x) => x.id === id);
    if (!task) return;
    const syncMilestone = opts?.syncMilestone !== false;

    const syncLinkedMilestone = (doneVal: boolean) => {
      if (!syncMilestone || !task.goalId) return;
      const g = goals.find((x) => x.id === task.goalId);
      if (!g) return;
      const m = g.milestones.find((x) => x.taskId === id);
      if (!m || m.done === doneVal) return;
      const nextGoal = { ...g, milestones: g.milestones.map((x) => (x.id === m.id ? { ...x, done: doneVal } : x)) };
      setGoals((prev) => prev.map((x) => (x.id === g.id ? nextGoal : x)));
      db.upsertGoal(nextGoal, userId);
    };

    if (!done) {
      if (task.status !== "Completed") return;
      const reverted: Task = { ...task, status: "In Progress", completedAt: null };
      setTasks((prev) => prev.map((x) => (x.id === id ? reverted : x)));
      db.upsertTask(reverted, userId);
      syncLinkedMilestone(false);
      return;
    }

    if (task.status === "Completed") return;
    const stamp = nowStamp();
    const xp = XP_BY_DIFFICULTY[task.difficulty];
    const completed: Task = {
      ...task,
      status: "Completed",
      completedAt: stamp,
      subtasks: task.subtasks.map((s) => ({ ...s, done: true })),
    };
    let spawned: Task | null = null;
    if (task.recurring !== "None") {
      const base = task.deadline || today;
      const nd = task.recurring === "Daily" ? addDays(base, 1) : task.recurring === "Weekly" ? addDays(base, 7) : addDays(base, 30);
      spawned = {
        ...task,
        id: uid("task"),
        status: "Not Started",
        completedAt: null,
        deadline: nd,
        createdAt: today,
        subtasks: task.subtasks.map((s) => ({ ...s, id: uid("s"), done: false })),
      };
    }
    setTasks((prev) => {
      const next = prev.map((x) => (x.id === id ? completed : x));
      return spawned ? [...next, spawned] : next;
    });
    db.upsertTask(completed, userId);
    if (spawned) db.upsertTask(spawned, userId);

    /* rewards */
    const before = levelFromXP(totalXP);
    const after = levelFromXP(totalXP + xp);
    pushToast({
      kind: "xp",
      title: `+${xp} XP — ${task.title}`,
      sub: task.recurring !== "None" ? "Recurring task rescheduled" : "Progress updated everywhere",
    });
    if (after.level > before.level) {
      fireConfetti();
      window.setTimeout(() => pushToast({ kind: "level", title: `Level ${after.level} reached`, sub: "Momentum compounds. Keep going." }), 350);
    }
    /* goal completion check */
    if (task.goalId) {
      const g = goals.find((x) => x.id === task.goalId);
      const rest = tasks.filter((x) => x.goalId === task.goalId && x.id !== id && x.status !== "Archived");
      const allTasksDone = rest.every((x) => x.status === "Completed");
      const allMilestones = Boolean(g && g.milestones.every((m) => m.done));
      if (g && allTasksDone && allMilestones) {
        fireConfetti();
        window.setTimeout(() => pushToast({ kind: "goal", title: `Goal complete: ${g.name}`, sub: "That one's in the books." }), 200);
      }
    }
    syncLinkedMilestone(true);
  }, [tasks, today, totalXP, goals, pushToast, fireConfetti, userId]);

  const toggleComplete = useCallback((id: string) => {
    const task = tasks.find((x) => x.id === id);
    if (!task) return;
    setTaskCompletion(id, task.status !== "Completed");
  }, [tasks, setTaskCompletion]);

  const saveTask = useCallback((form: Task) => {
    setTasks((prev) => {
      const exists = prev.some((x) => x.id === form.id);
      let saved: Task;
      if (!exists) {
        saved = {
          ...form,
          createdAt: today,
          completedAt: form.status === "Completed" ? nowStamp() : null,
        };
        db.upsertTask(saved, userId);
        return [...prev, saved];
      }
      return prev.map((x) => {
        if (x.id !== form.id) return x;
        saved = {
          ...form,
          completedAt: form.status === "Completed" ? (x.completedAt || nowStamp()) : null,
        };
        db.upsertTask(saved, userId);
        return saved;
      });
    });
    setEditorTask(null);
  }, [today, userId]);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((x) => x.id !== id));
    db.deleteTask(id);
    // A milestone linked to this task survives as a plain checklist item — unlink, don't cascade-delete it.
    const owner = goals.find((g) => g.milestones.some((m) => m.taskId === id));
    if (owner) {
      const nextGoal = { ...owner, milestones: owner.milestones.map((m) => (m.taskId === id ? { ...m, taskId: null } : m)) };
      setGoals((prev) => prev.map((g) => (g.id === owner.id ? nextGoal : g)));
      db.upsertGoal(nextGoal, userId);
    }
    setEditorTask(null);
  }, [goals, userId]);

  const moveDeadline = useCallback((id: string, dateStr: string) => {
    setTasks((prev) => prev.map((x) => {
      if (x.id !== id) return x;
      const moved = { ...x, deadline: dateStr };
      db.upsertTask(moved, userId);
      return moved;
    }));
    pushToast({ kind: "date", title: "Deadline moved", sub: `Now due ${shortDate(dateStr)}` });
  }, [pushToast, userId]);

  /** Shared write path for the task's own subtasks — the SAME task.subtasks field and
   *  db.upsertTask call the full edit modal uses, just committed immediately per action
   *  instead of batched behind a "Save changes" click. No parallel/duplicate state. */
  const updateTaskSubtasks = useCallback((taskId: string, updater: (subs: Task["subtasks"]) => Task["subtasks"]) => {
    setTasks((prev) => prev.map((x) => {
      if (x.id !== taskId) return x;
      const updated = { ...x, subtasks: updater(x.subtasks) };
      db.upsertTask(updated, userId);
      return updated;
    }));
  }, [userId]);

  const toggleSubtask = useCallback((taskId: string, subId: string) => {
    updateTaskSubtasks(taskId, (subs) => subs.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)));
  }, [updateTaskSubtasks]);

  const addSubtask = useCallback((taskId: string, title: string) => {
    if (!title.trim()) return;
    updateTaskSubtasks(taskId, (subs) => [...subs, { id: uid("s"), title: title.trim(), done: false }]);
  }, [updateTaskSubtasks]);

  const removeSubtask = useCallback((taskId: string, subId: string) => {
    updateTaskSubtasks(taskId, (subs) => subs.filter((s) => s.id !== subId));
  }, [updateTaskSubtasks]);

  const toggleMilestone = useCallback((goalId: string, mId: string) => {
    const g = goals.find((x) => x.id === goalId);
    if (!g) return;
    const target = g.milestones.find((x) => x.id === mId);
    if (!target) return;
    const newDone = !target.done;
    const milestones = g.milestones.map((m) => (m.id === mId ? { ...m, done: newDone } : m));
    const justFinished = milestones.every((m) => m.done) && !g.milestones.every((m) => m.done);
    const nextGoal = { ...g, milestones };
    setGoals((prev) => prev.map((x) => (x.id === goalId ? nextGoal : x)));
    db.upsertGoal(nextGoal, userId);
    if (justFinished) {
      fireConfetti();
      pushToast({ kind: "goal", title: "All milestones cleared", sub: g.name });
    }
    // Milestone is the source of truth here; sync the linked task without bouncing back.
    if (target.taskId) setTaskCompletion(target.taskId, newDone, { syncMilestone: false });
  }, [goals, fireConfetti, pushToast, userId, setTaskCompletion]);

  /** Drag-and-drop reorder within one goal's milestone list. Milestones live in a
   *  jsonb array (goal.milestones) — order is just array order, no per-item index
   *  field, so reordering is a plain splice-and-persist like reorderProjects etc. */
  const reorderMilestones = useCallback((goalId: string, draggedId: string, dropId: string) => {
    if (draggedId === dropId) return;
    setGoals((prev) => prev.map((g) => {
      if (g.id !== goalId) return g;
      const from = g.milestones.findIndex((m) => m.id === draggedId);
      const to = g.milestones.findIndex((m) => m.id === dropId);
      if (from === -1 || to === -1) return g;
      const next = [...g.milestones];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      const nextGoal = { ...g, milestones: next };
      db.upsertGoal(nextGoal, userId);
      return nextGoal;
    }));
  }, [userId]);

  /** Removes any milestone.taskId (in any goal) that points at this task and doesn't
   *  belong to `keepGoalId` — called whenever a task's goalId changes via search-link
   *  so a milestone never displays a stale "linked to a task" badge for a task that
   *  no longer actually belongs to that goal. */
  const clearStaleMilestoneLinks = useCallback((taskId: string, keepGoalId: string | null) => {
    goals.forEach((g) => {
      if (g.id === keepGoalId) return;
      const m = g.milestones.find((x) => x.taskId === taskId);
      if (!m) return;
      const nextGoal = { ...g, milestones: g.milestones.map((x) => (x.id === m.id ? { ...x, taskId: null } : x)) };
      setGoals((prev) => prev.map((x) => (x.id === g.id ? nextGoal : x)));
      db.upsertGoal(nextGoal, userId);
    });
  }, [goals, userId]);

  /** Links an already-existing task to a goal by setting its goalId — independent of
   *  milestones; never creates a task or a milestone. */
  const linkTaskToGoal = useCallback((taskId: string, goalId: string) => {
    setTasks((prev) => prev.map((t) => {
      if (t.id !== taskId) return t;
      const updated = { ...t, goalId };
      db.upsertTask(updated, userId);
      return updated;
    }));
    clearStaleMilestoneLinks(taskId, goalId);
  }, [userId, clearStaleMilestoneLinks]);

  const unlinkTaskFromGoal = useCallback((taskId: string) => {
    setTasks((prev) => prev.map((t) => {
      if (t.id !== taskId) return t;
      const updated = { ...t, goalId: null };
      db.upsertTask(updated, userId);
      return updated;
    }));
    // No goal to keep — clears any milestone anywhere still pointing at this task.
    clearStaleMilestoneLinks(taskId, null);
  }, [userId, clearStaleMilestoneLinks]);

  const saveProject = useCallback((form: Project) => {
    setProjects((prev) => {
      const exists = prev.some((x) => x.id === form.id);
      db.upsertProject(form, userId);
      return exists ? prev.map((x) => (x.id === form.id ? form : x)) : [...prev, form];
    });
    setEditorProject(null);
  }, [userId]);

  const deleteProject = useCallback((id: string) => {
    const proj = projects.find((x) => x.id === id);
    // A project's linked goal is deleted alongside it, unless another surviving
    // project still points at that same goal (shared goals are left intact).
    const goalStillShared = Boolean(proj?.goalId) && projects.some((p) => p.id !== id && p.goalId === proj!.goalId);
    setProjects((prev) => prev.filter((x) => x.id !== id));
    db.deleteProject(id);
    if (proj?.goalId && !goalStillShared) {
      setGoals((prev) => prev.filter((x) => x.id !== proj.goalId));
      db.deleteGoal(proj.goalId);
    }
    setEditorProject(null);
  }, [projects]);

  /** Drag-and-drop reorder: moves draggedId next to dropId, reindexes sortIndex
   *  for the whole list, and persists every reindexed row. */
  const reorderProjects = useCallback((draggedId: string, dropId: string) => {
    if (draggedId === dropId) return;
    setProjects((prev) => {
      const from = prev.findIndex((x) => x.id === draggedId);
      const to = prev.findIndex((x) => x.id === dropId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((p, i) => {
        if (p.sortIndex === i) return p;
        const updated = { ...p, sortIndex: i };
        db.upsertProject(updated, userId);
        return updated;
      });
    });
  }, [userId]);

  const saveGoal = useCallback((form: Goal) => {
    // The milestone checklist inside the edit modal is local-only until Save, so any
    // linked-milestone checkbox toggled there needs the same task sync applied here.
    const prevGoal = goals.find((x) => x.id === form.id);
    if (prevGoal) {
      form.milestones.forEach((m) => {
        if (!m.taskId) return;
        const prevM = prevGoal.milestones.find((x) => x.id === m.id);
        if (prevM && prevM.done !== m.done) setTaskCompletion(m.taskId!, m.done, { syncMilestone: false });
      });
    }
    setGoals((prev) => {
      const exists = prev.some((x) => x.id === form.id);
      db.upsertGoal(form, userId);
      return exists ? prev.map((x) => (x.id === form.id ? form : x)) : [...prev, form];
    });
    setEditorGoal(null);
  }, [userId, goals, setTaskCompletion]);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((x) => x.id !== id));
    db.deleteGoal(id);
    setEditorGoal(null);
  }, []);

  const reorderGoals = useCallback((draggedId: string, dropId: string) => {
    if (draggedId === dropId) return;
    setGoals((prev) => {
      const from = prev.findIndex((x) => x.id === draggedId);
      const to = prev.findIndex((x) => x.id === dropId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((g, i) => {
        if (g.sortIndex === i) return g;
        const updated = { ...g, sortIndex: i };
        db.upsertGoal(updated, userId);
        return updated;
      });
    });
  }, [userId]);

  const saveCategory = useCallback((form: Category) => {
    setCategories((prev) => {
      const exists = prev.some((x) => x.id === form.id);
      db.upsertCategory(form, userId);
      return exists ? prev.map((x) => (x.id === form.id ? form : x)) : [...prev, form];
    });
    setEditorCategory(null);
  }, [userId]);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((x) => x.id !== id));
    db.deleteCategory(id);
    setEditorCategory(null);
  }, []);

  const reorderCategories = useCallback((draggedId: string, dropId: string) => {
    if (draggedId === dropId) return;
    setCategories((prev) => {
      const from = prev.findIndex((x) => x.id === draggedId);
      const to = prev.findIndex((x) => x.id === dropId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((c, i) => {
        if (c.sortIndex === i) return c;
        const updated = { ...c, sortIndex: i };
        db.upsertCategory(updated, userId);
        return updated;
      });
    });
  }, [userId]);

  const saveHabit = useCallback((form: Habit) => {
    setHabits((prev) => {
      const exists = prev.some((x) => x.id === form.id);
      db.upsertHabit(form, userId);
      return exists ? prev.map((x) => (x.id === form.id ? form : x)) : [...prev, form];
    });
    setEditorHabit(null);
  }, [userId]);

  const deleteHabit = useCallback((id: string) => {
    setHabits((prev) => prev.filter((x) => x.id !== id));
    setHabitCompletions((prev) => prev.filter((x) => x.habitId !== id));
    db.deleteHabit(id);
    setEditorHabit(null);
  }, []);

  /** Logs (or overwrites) a habit's completion for `date` (defaults to today, so every
   *  existing "mark today" call site is unaffected). XP scales with amount/goal, capped
   *  at the base xpReward; streak multipliers are stored but not applied yet. */
  const logHabitCompletion = useCallback((habitId: string, status: HabitStatus, amount: number, notes: string, date: string = today) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const habitEntries = habitCompletionsByHabit[habitId] ?? [];
    const existing = habitEntries.find((c) => c.date === date);
    const xpEarned = status === "Missed"
      ? 0
      : Math.round(habit.xpReward * Math.min(1, habit.goalAmount > 0 ? amount / habit.goalAmount : 1));
    const saved: HabitCompletion = {
      id: existing?.id ?? uid("hc"),
      habitId,
      date,
      status,
      amount,
      notes,
      xpEarned,
      createdAt: existing?.createdAt ?? nowStamp(),
      year: parseISO(date).getFullYear(),
    };

    /* Streak-milestone celebration: compare the streak this exact edit produces against
     * the streak right before it, so a threshold only fires the moment it's newly
     * crossed by this action — never on app load, and never again once already past it
     * (a habit already at streak 10 has beforeStreak=10, so 10 < 7 is false and the
     * 7-day toast can't re-fire). If a streak fully resets and is later rebuilt past a
     * threshold again, it re-celebrates — intentional, no permanent "already earned" flag. */
    const beforeStreak = computeHabitStreak(habit.startDate, habitEntries, today);
    const afterEntries = existing ? habitEntries.map((c) => (c.id === saved.id ? saved : c)) : [...habitEntries, saved];
    const afterStreak = computeHabitStreak(habit.startDate, afterEntries, today);
    const newlyHitMilestones = STREAK_MILESTONES.filter((m) => beforeStreak < m && afterStreak >= m);

    setHabitCompletions((prev) => {
      const exists = prev.some((x) => x.id === saved.id);
      return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved];
    });
    db.upsertHabitCompletion(saved, userId);
    if (status === "Completed") {
      pushToast({
        kind: "xp",
        title: `+${xpEarned} XP — ${habit.name}`,
        sub: date === today ? "Habit logged for today" : `Habit logged for ${shortDate(date)}`,
      });
    }
    if (newlyHitMilestones.length > 0) {
      fireConfetti();
      newlyHitMilestones.forEach((m, i) => {
        window.setTimeout(() => pushToast({
          kind: "level",
          title: `${m}-day streak — ${habit.name}`,
          sub: STREAK_MILESTONE_COPY[m],
        }), 350 + i * 300);
      });
    }
  }, [habits, habitCompletionsByHabit, today, userId, pushToast, fireConfetti]);

  const loadSample = useCallback(async () => {
    setCategories(seedCategories);
    setGoals(seedGoals);
    setProjects(seedProjects);
    setTasks(seedTasks);
    pushToast({ kind: "info", title: "Sample workspace loaded", sub: "Everything is saved to your account." });
    try {
      await db.bulkInsert({ categories: seedCategories, goals: seedGoals, projects: seedProjects, tasks: seedTasks }, userId);
    } catch (e) {
      console.error("[Commit] sample import failed:", e);
    }
  }, [userId, pushToast]);

  /* ---------- editor helpers ---------- */
  const openNewTask = useCallback(() => setEditorTask({}), []);
  const openNewTaskOn = useCallback((dateStr: string) => setEditorTask({ deadline: dateStr }), []);
  const openEditTask = useCallback((task: Task) => setEditorTask(task), []);
  const closeEditor = useCallback(() => setEditorTask(null), []);

  const openNewProject = useCallback(() => setEditorProject({ sortIndex: projects.length }), [projects.length]);
  const openEditProject = useCallback((p: Project) => setEditorProject(p), []);
  const closeProjectEditor = useCallback(() => setEditorProject(null), []);

  const openNewGoal = useCallback(() => setEditorGoal({ sortIndex: goals.length }), [goals.length]);
  const openEditGoal = useCallback((g: Goal) => setEditorGoal(g), []);
  const closeGoalEditor = useCallback(() => setEditorGoal(null), []);

  const openNewCategory = useCallback(() => setEditorCategory({ sortIndex: categories.length }), [categories.length]);
  const openEditCategory = useCallback((c: Category) => setEditorCategory(c), []);
  const closeCategoryEditor = useCallback(() => setEditorCategory(null), []);

  const openNewHabit = useCallback(() => setEditorHabit({}), []);
  const openEditHabit = useCallback((h: Habit) => setEditorHabit(h), []);
  const closeHabitEditor = useCallback(() => setEditorHabit(null), []);

  return {
    booted, loadError, user,
    tasks, projects, goals, categories, categoriesById, projectsById, goalsById,
    habits, habitCompletions, activeHabits, todayHabitEntries, habitStreaks, habitChainDone, habitChainTotal, habitAnalytics,
    settings, patchSettings, setTheme, setWidgets, setNotifPrefs,
    needsArchivePrompt, archiveYear, dismissArchivePrompt,
    toasts, burst, pushToast, fireConfetti,
    todayDone, todayTotal, todayPct, streak, longestStreak, xpToday, totalXP, level,
    focusTasks, upcoming, recentDone, weeklyData, monthlyData, weekDelta,
    projectStats, categoryStats, goalStats, analytics,
    toggleComplete, saveTask, deleteTask, moveDeadline, toggleMilestone, reorderMilestones,
    linkTaskToGoal, unlinkTaskFromGoal,
    toggleSubtask, addSubtask, removeSubtask,
    saveProject, deleteProject, reorderProjects, saveGoal, deleteGoal, reorderGoals,
    saveCategory, deleteCategory, reorderCategories, loadSample,
    saveHabit, deleteHabit, logHabitCompletion,
    editorTask, openNewTask, openNewTaskOn, openEditTask, closeEditor,
    editorProject, openNewProject, openEditProject, closeProjectEditor,
    editorGoal, openNewGoal, openEditGoal, closeGoalEditor,
    editorCategory, openNewCategory, openEditCategory, closeCategoryEditor,
    editorHabit, openNewHabit, openEditHabit, closeHabitEditor,
  };
}

export type AppData = ReturnType<typeof useAppData>;
