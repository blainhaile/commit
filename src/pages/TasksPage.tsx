/* ── Commit · Tasks ─────────────────────────────────────────────────── */
import React, { useMemo, useState } from "react";
import { CheckSquare, Plus, Search } from "lucide-react";
import type { AppData } from "@/hooks/useAppData";
import { TaskRow } from "@/components/tasks";
import { CollapsibleSection, EmptyState } from "@/components/ui";
import { addDays, matchesYearFilter, todayISO, yearOptions, type YearFilter } from "@/utils/date";
import { DIFFICULTIES, PRIORITIES, STATUSES } from "@/utils/constants";

const QUICK_FILTERS = ["All", "Today", "Tomorrow", "This Week", "Overdue", "Completed"] as const;
type Quick = (typeof QUICK_FILTERS)[number];

export function TasksPage({ app }: { app: AppData }) {
  const { tasks, categories, projects, goals, settings, openNewTask, loadSample } = app;
  const activeYear = settings.activeYear;
  const [quick, setQuick] = useState<Quick>("All");
  const [fPriority, setFPriority] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fProject, setFProject] = useState("");
  const [fGoal, setFGoal] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fDiff, setFDiff] = useState("");
  const [yearFilter, setYearFilter] = useState<YearFilter>("current");
  const [q, setQ] = useState("");

  const today = todayISO();
  const filtered = useMemo(() => {
    return tasks
      .filter((task) => {
        if (task.status === "Archived" && fStatus !== "Archived") return false;
        if (!matchesYearFilter(task.year, task.status === "Completed", yearFilter, activeYear)) return false;
        if (quick === "Today" && task.deadline !== today) return false;
        if (quick === "Tomorrow" && task.deadline !== addDays(today, 1)) return false;
        if (quick === "This Week" && !(task.deadline && task.deadline >= today && task.deadline <= addDays(today, 7))) return false;
        if (quick === "Overdue" && !(task.deadline && task.deadline < today && task.status !== "Completed")) return false;
        if (quick === "Completed" && task.status !== "Completed") return false;
        if (fPriority && task.priority !== fPriority) return false;
        if (fCategory && task.categoryId !== fCategory) return false;
        if (fProject && task.projectId !== fProject) return false;
        if (fGoal && task.goalId !== fGoal) return false;
        if (fStatus && task.status !== fStatus) return false;
        if (fDiff && task.difficulty !== fDiff) return false;
        if (q) {
          const hay = `${task.title} ${task.description} ${task.notes} ${task.tags.join(" ")}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const ad = a.status === "Completed", bd = b.status === "Completed";
        if (ad !== bd) return ad ? 1 : -1;
        const ad2 = a.deadline || "9999", bd2 = b.deadline || "9999";
        if (ad2 !== bd2) return ad2 < bd2 ? -1 : 1;
        const at = a.deadlineTime || "", bt = b.deadlineTime || "";
        return at < bt ? -1 : at > bt ? 1 : 0;
      });
  }, [tasks, quick, fPriority, fCategory, fProject, fGoal, fStatus, fDiff, yearFilter, activeYear, q, today]);

  const years = yearOptions(tasks, activeYear).filter((y) => y !== activeYear);

  // The "Completed" quick filter already asked for exactly the completed set —
  // collapsing it there would hide the very thing that was filtered for.
  const splitByCompletion = quick !== "Completed";
  const activeTasks = splitByCompletion ? filtered.filter((t) => t.status !== "Completed") : filtered;
  const doneTasks = splitByCompletion ? filtered.filter((t) => t.status === "Completed") : [];

  const sel = (
    v: string,
    set: (s: string) => void,
    opts: (string | { id: string; name: string })[],
    label: string,
  ) => (
    <select className="cm-select" style={{ width: "auto", minWidth: 118 }} value={v} onChange={(e) => set(e.target.value)}>
      <option value="">{label}</option>
      {opts.map((o) =>
        typeof o === "string" ? <option key={o}>{o}</option> : <option key={o.id} value={o.id}>{o.name}</option>,
      )}
    </select>
  );

  return (
    <div className="cm-page flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="cm-display text-2xl font-extrabold t-text">Tasks</h1>
        <button className="cm-btn cm-btn-primary" onClick={openNewTask}><Plus size={16} /> New task</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {QUICK_FILTERS.map((f) => (
          <button key={f} className={`cm-chip ${quick === f ? "cm-chip-on" : ""}`} onClick={() => setQuick(f)}>{f}</button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1" style={{ minWidth: 200, maxWidth: 320 }}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 t-faint" />
          <input className="cm-input" style={{ paddingLeft: 34 }} placeholder="Search tasks, notes, tags…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {sel(fPriority, setFPriority, PRIORITIES, "Priority")}
        {sel(fCategory, setFCategory, categories, "Category")}
        {sel(fProject, setFProject, projects, "Project")}
        {sel(fGoal, setFGoal, goals, "Goal")}
        {sel(fStatus, setFStatus, STATUSES, "Status")}
        {sel(fDiff, setFDiff, DIFFICULTIES, "Difficulty")}
        <select
          className="cm-select"
          style={{ width: "auto", minWidth: 140 }}
          value={typeof yearFilter === "number" ? String(yearFilter) : yearFilter}
          onChange={(e) => {
            const v = e.target.value;
            setYearFilter(v === "current" || v === "all" ? v : Number(v));
          }}
        >
          <option value="current">This year ({activeYear})</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
          <option value="all">All years</option>
        </select>
      </div>

      <div className="flex flex-col gap-2.5 cm-stagger">
        {activeTasks.map((task) => <TaskRow key={task.id} task={task} app={app} />)}
        {filtered.length === 0 && tasks.length > 0 && (
          <EmptyState
            icon={<CheckSquare size={22} />}
            title="No tasks match these filters"
            blurb="Loosen a filter or two, or create something new."
            action={<button className="cm-btn cm-btn-primary" onClick={openNewTask}><Plus size={15} /> New task</button>}
          />
        )}
        {tasks.length === 0 && (
          <EmptyState
            icon={<CheckSquare size={22} />}
            title="Your task list is a blank slate"
            blurb="Create your first task, or load the sample workspace to see Commit fully in motion."
            action={
              <div className="flex gap-2">
                <button className="cm-btn cm-btn-primary" onClick={openNewTask}><Plus size={15} /> First task</button>
                <button className="cm-btn cm-btn-ghost" onClick={loadSample}>Load sample workspace</button>
              </div>
            }
          />
        )}
      </div>

      <CollapsibleSection label="Completed" count={doneTasks.length}>
        <div className="flex flex-col gap-2.5 cm-stagger">
          {doneTasks.map((task) => <TaskRow key={task.id} task={task} app={app} />)}
        </div>
      </CollapsibleSection>
    </div>
  );
}
