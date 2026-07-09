/* ── Commit · application state ─────────────────────────────────────────
   Single source of truth. Loads everything from Supabase on sign-in,
   keeps UI state optimistic, and persists every change automatically. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type {
  Category, Goal, LevelInfo, Project, Settings, Task, Toast, WidgetPrefs, NotifPrefs, ThemeMode,
} from "@/types";
import { db, loadAll } from "@/services/dataService";
import { seedCategories, seedGoals, seedProjects, seedTasks } from "@/services/seed";
import {
  addDays, daysAgo, daysAhead, nowStamp, parseISO, pct, shortDate, todayISO, weekday, DAY_MS,
} from "@/utils/date";
import { levelFromXP, XP_BY_DIFFICULTY } from "@/utils/xp";
import { PRIORITY_RANK, uid } from "@/utils/constants";

export type ToastKind = "xp" | "level" | "goal" | "date" | "info";
export interface AppToast extends Toast { kind: ToastKind }

const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  displayName: "",
  widgets: { focus: true, deadlines: true, charts: true, recent: true },
  notifPrefs: { d1: true, h1: true, m15: false },
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
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [editorTask, setEditorTask] = useState<Partial<Task> | null>(null);
  const [editorProject, setEditorProject] = useState<Partial<Project> | null>(null);
  const [editorGoal, setEditorGoal] = useState<Partial<Goal> | null>(null);
  const [editorCategory, setEditorCategory] = useState<Partial<Category> | null>(null);
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

  const toggleComplete = useCallback((id: string) => {
    const task = tasks.find((x) => x.id === id);
    if (!task) return;

    if (task.status === "Completed") {
      const reverted: Task = { ...task, status: "In Progress", completedAt: null };
      setTasks((prev) => prev.map((x) => (x.id === id ? reverted : x)));
      db.upsertTask(reverted, userId);
      return;
    }

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
  }, [tasks, today, totalXP, goals, pushToast, fireConfetti, userId]);

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
    setEditorTask(null);
  }, []);

  const moveDeadline = useCallback((id: string, dateStr: string) => {
    setTasks((prev) => prev.map((x) => {
      if (x.id !== id) return x;
      const moved = { ...x, deadline: dateStr };
      db.upsertTask(moved, userId);
      return moved;
    }));
    pushToast({ kind: "date", title: "Deadline moved", sub: `Now due ${shortDate(dateStr)}` });
  }, [pushToast, userId]);

  const toggleMilestone = useCallback((goalId: string, mId: string) => {
    const g = goals.find((x) => x.id === goalId);
    if (!g) return;
    const milestones = g.milestones.map((m) => (m.id === mId ? { ...m, done: !m.done } : m));
    const justFinished = milestones.every((m) => m.done) && !g.milestones.every((m) => m.done);
    const nextGoal = { ...g, milestones };
    setGoals((prev) => prev.map((x) => (x.id === goalId ? nextGoal : x)));
    db.upsertGoal(nextGoal, userId);
    if (justFinished) {
      fireConfetti();
      pushToast({ kind: "goal", title: "All milestones cleared", sub: g.name });
    }
  }, [goals, fireConfetti, pushToast, userId]);

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

  const saveGoal = useCallback((form: Goal) => {
    setGoals((prev) => {
      const exists = prev.some((x) => x.id === form.id);
      db.upsertGoal(form, userId);
      return exists ? prev.map((x) => (x.id === form.id ? form : x)) : [...prev, form];
    });
    setEditorGoal(null);
  }, [userId]);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((x) => x.id !== id));
    db.deleteGoal(id);
    setEditorGoal(null);
  }, []);

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

  const openNewProject = useCallback(() => setEditorProject({}), []);
  const openEditProject = useCallback((p: Project) => setEditorProject(p), []);
  const closeProjectEditor = useCallback(() => setEditorProject(null), []);

  const openNewGoal = useCallback(() => setEditorGoal({}), []);
  const openEditGoal = useCallback((g: Goal) => setEditorGoal(g), []);
  const closeGoalEditor = useCallback(() => setEditorGoal(null), []);

  const openNewCategory = useCallback(() => setEditorCategory({}), []);
  const openEditCategory = useCallback((c: Category) => setEditorCategory(c), []);
  const closeCategoryEditor = useCallback(() => setEditorCategory(null), []);

  return {
    booted, loadError, user,
    tasks, projects, goals, categories, categoriesById, projectsById, goalsById,
    settings, patchSettings, setTheme, setWidgets, setNotifPrefs,
    toasts, burst, pushToast, fireConfetti,
    todayDone, todayTotal, todayPct, streak, longestStreak, xpToday, totalXP, level,
    focusTasks, upcoming, recentDone, weeklyData, monthlyData, weekDelta,
    projectStats, categoryStats, goalStats, analytics,
    toggleComplete, saveTask, deleteTask, moveDeadline, toggleMilestone,
    saveProject, deleteProject, saveGoal, deleteGoal, saveCategory, deleteCategory, loadSample,
    editorTask, openNewTask, openNewTaskOn, openEditTask, closeEditor,
    editorProject, openNewProject, openEditProject, closeProjectEditor,
    editorGoal, openNewGoal, openEditGoal, closeGoalEditor,
    editorCategory, openNewCategory, openEditCategory, closeCategoryEditor,
  };
}

export type AppData = ReturnType<typeof useAppData>;
