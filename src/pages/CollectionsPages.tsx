/* ── Commit · Projects, Goals, Categories ───────────────────────────── */
import React, { useState } from "react";
import {
  CalendarDays, CheckSquare, FolderKanban, Layers, Pencil, Plus, Tag, Target, TrendingDown, TrendingUp, Trash2, X,
} from "lucide-react";
import type { Category, Goal, Project } from "@/types";
import type { AppData } from "@/hooks/useAppData";
import { CheckButton, Dot, EmptyState, Field, Modal, ProgressBar, Ring } from "@/components/ui";
import { daysAhead, shortDate } from "@/utils/date";
import { uid } from "@/utils/constants";

/* ════════ Projects ════════ */
export function ProjectsPage({ app }: { app: AppData }) {
  const { projects, projectStats, categoriesById, goalsById, openNewProject, openEditProject, loadSample } = app;

  return (
    <div className="cm-page flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="cm-display text-2xl font-extrabold t-text">Projects</h1>
        <button className="cm-btn cm-btn-primary" onClick={openNewProject}><Plus size={16} /> New project</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 cm-stagger">
        {projects.map((p) => {
          const s = projectStats[p.id];
          const cat = p.categoryId ? categoriesById[p.categoryId] : null;
          const goal = p.goalId ? goalsById[p.goalId] : null;
          return (
            <div key={p.id} className="cm-card cm-card-hover p-5 flex flex-col gap-3 group">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="cm-display font-bold t-text truncate">{p.name}</div>
                  <div className="text-xs t-muted mt-1 flex items-center gap-1.5">
                    {cat && <><Dot color={cat.color} /> {cat.name}</>}
                    {goal && <span className="t-faint truncate">· {goal.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    className="t-faint opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--brand)]"
                    onClick={() => openEditProject(p)}
                    aria-label="Edit project"
                  >
                    <Pencil size={14} />
                  </button>
                  <span className="cm-display text-2xl font-extrabold" style={{ color: s.pct === 100 ? "var(--good)" : "var(--brand)" }}>
                    {s.pct}%
                  </span>
                </div>
              </div>
              <ProgressBar value={s.pct} color={s.pct === 100 ? "#4E9B6E" : undefined} />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="cm-inset py-2"><div className="text-sm font-bold t-text">{s.done}</div><div className="text-xs t-faint">done</div></div>
                <div className="cm-inset py-2"><div className="text-sm font-bold t-text">{s.total - s.done}</div><div className="text-xs t-faint">remaining</div></div>
                <div className="cm-inset py-2"><div className="text-sm font-bold t-text">{shortDate(s.eta)}</div><div className="text-xs t-faint">est. finish</div></div>
              </div>
            </div>
          );
        })}
      </div>

      {projects.length === 0 && (
        <EmptyState
          icon={<FolderKanban size={22} />}
          title="No projects yet"
          blurb="Projects group tasks into bigger arcs — every completed task nudges its project's bar forward."
          action={
            <div className="flex gap-2">
              <button className="cm-btn cm-btn-primary" onClick={openNewProject}><Plus size={15} /> New project</button>
              <button className="cm-btn cm-btn-ghost" onClick={loadSample}>Load sample workspace</button>
            </div>
          }
        />
      )}
    </div>
  );
}

function blankProject(): Project {
  return { id: uid("proj"), name: "", description: "", categoryId: null, goalId: null, targetDate: daysAhead(30) };
}

export function ProjectModal({ app }: { app: AppData }) {
  const { editorProject, categories, goals, saveProject, closeProjectEditor, deleteProject } = app;
  const initial = editorProject!;
  const [form, setForm] = useState<Project>(() => ({
    ...blankProject(),
    categoryId: categories[0]?.id ?? null,
    ...initial,
  }));
  const set = <K extends keyof Project>(k: K, v: Project[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name.trim()) return;
    saveProject(form);
  };

  return (
    <Modal title={initial?.id ? "Edit project" : "New project"} onClose={closeProjectEditor}>
      <div className="flex flex-col gap-4">
        <Field label="Name">
          <input autoFocus className="cm-input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Portfolio redesign" />
        </Field>
        <Field label="Description">
          <textarea className="cm-textarea" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional context" />
        </Field>
        <Field label="Category">
          <select className="cm-select" value={form.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value || null)}>
            <option value="">None</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Goal">
          <select className="cm-select" value={form.goalId ?? ""} onChange={(e) => set("goalId", e.target.value || null)}>
            <option value="">None</option>
            {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Field>
        <Field label="Target date">
          <input type="date" className="cm-input" value={form.targetDate ?? ""} onChange={(e) => set("targetDate", e.target.value || null)} />
        </Field>
        <div className="flex items-center gap-3 mt-2">
          <button className="cm-btn cm-btn-primary" onClick={save} disabled={!form.name.trim()}>
            {initial?.id ? "Save changes" : "Create project"}
          </button>
          <button className="cm-btn cm-btn-ghost" onClick={closeProjectEditor}>Cancel</button>
          {initial?.id && (
            <button className="cm-btn cm-btn-danger ml-auto" onClick={() => deleteProject(initial.id!)}>
              <Trash2 size={15} /> Delete
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ════════ Goals ════════ */
export function GoalsPage({ app }: { app: AppData }) {
  const { goals, goalStats, toggleMilestone, openNewGoal, openEditGoal, loadSample } = app;

  return (
    <div className="cm-page flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="cm-display text-2xl font-extrabold t-text">Goals</h1>
        <button className="cm-btn cm-btn-primary" onClick={openNewGoal}><Plus size={16} /> New goal</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 cm-stagger">
        {goals.map((g) => {
          const s = goalStats[g.id];
          return (
            <div key={g.id} className="cm-card cm-card-hover p-5 flex flex-col gap-3 group">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="cm-display font-bold t-text flex items-center gap-2">
                    <Target size={16} className="t-brand shrink-0" /> {g.name}
                  </div>
                  <div className="text-sm t-muted mt-1">{g.description}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    className="t-faint opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--brand)]"
                    onClick={() => openEditGoal(g)}
                    aria-label="Edit goal"
                  >
                    <Pencil size={14} />
                  </button>
                  <Ring value={s.pct} size={72} stroke={7}>
                    <span className="text-sm font-bold t-text">{s.pct}%</span>
                  </Ring>
                </div>
              </div>
              <ProgressBar value={s.pct} color={s.pct === 100 ? "#4E9B6E" : undefined} height={7} />
              <div className="flex items-center gap-4 text-xs t-muted flex-wrap">
                {g.targetDate && <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> Target {shortDate(g.targetDate)}</span>}
                <span className="inline-flex items-center gap-1"><Layers size={13} /> {s.projects} project{s.projects === 1 ? "" : "s"}</span>
                <span className="inline-flex items-center gap-1"><CheckSquare size={13} /> {s.tasksDone}/{s.tasksTotal} tasks</span>
              </div>
              {g.milestones.length > 0 && (
                <div>
                  <div className="text-xs font-semibold t-faint uppercase tracking-wide mb-1.5">Milestones</div>
                  <div className="flex flex-col gap-1.5">
                    {g.milestones.map((m) => (
                      <div key={m.id} className="flex items-center gap-2.5 text-sm">
                        <CheckButton on={m.done} onClick={() => toggleMilestone(g.id, m.id)} title="Toggle milestone" />
                        <span className={`t-text ${m.done ? "line-through opacity-50" : ""}`}>{m.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {goals.length === 0 && (
        <EmptyState
          icon={<Target size={22} />}
          title="No goals yet"
          blurb="Goals are the destinations. Milestones and linked tasks both push the ring toward 100%."
          action={
            <div className="flex gap-2">
              <button className="cm-btn cm-btn-primary" onClick={openNewGoal}><Plus size={15} /> New goal</button>
              <button className="cm-btn cm-btn-ghost" onClick={loadSample}>Load sample workspace</button>
            </div>
          }
        />
      )}
    </div>
  );
}

function blankGoal(): Goal {
  return { id: uid("goal"), name: "", description: "", categoryId: null, targetDate: daysAhead(90), milestones: [] };
}

export function GoalModal({ app }: { app: AppData }) {
  const { editorGoal, categories, saveGoal, closeGoalEditor, deleteGoal } = app;
  const initial = editorGoal!;
  const [form, setForm] = useState<Goal>(() => ({ ...blankGoal(), ...initial }));
  const [mTitle, setMTitle] = useState("");
  const set = <K extends keyof Goal>(k: K, v: Goal[K]) => setForm((f) => ({ ...f, [k]: v }));

  const addMilestone = () => {
    if (!mTitle.trim()) return;
    set("milestones", [...form.milestones, { id: uid("m"), title: mTitle.trim(), done: false }]);
    setMTitle("");
  };

  const save = () => {
    if (!form.name.trim()) return;
    saveGoal(form);
  };

  return (
    <Modal title={initial?.id ? "Edit goal" : "New goal"} onClose={closeGoalEditor}>
      <div className="flex flex-col gap-4">
        <Field label="Name">
          <input autoFocus className="cm-input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Run a half marathon" />
        </Field>
        <Field label="Description">
          <textarea className="cm-textarea" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Category">
          <select className="cm-select" value={form.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value || null)}>
            <option value="">None</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Target date">
          <input type="date" className="cm-input" value={form.targetDate ?? ""} onChange={(e) => set("targetDate", e.target.value || null)} />
        </Field>
        <div>
          <span className="block text-xs font-semibold t-faint mb-1.5 uppercase tracking-wide">Milestones</span>
          <div className="flex flex-col gap-1.5 mb-2">
            {form.milestones.map((m) => (
              <div key={m.id} className="cm-inset flex items-center gap-2.5 text-sm px-3 py-2">
                <CheckButton on={m.done} onClick={() => set("milestones", form.milestones.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)))} />
                <span className={`t-text ${m.done ? "line-through opacity-50" : ""}`}>{m.title}</span>
                <button
                  className="ml-auto t-faint hover:text-[var(--bad)] transition-colors"
                  onClick={() => set("milestones", form.milestones.filter((x) => x.id !== m.id))}
                  aria-label="Remove milestone"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="cm-input"
              placeholder="Add a milestone"
              value={mTitle}
              onChange={(e) => setMTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMilestone()}
            />
            <button className="cm-btn cm-btn-ghost shrink-0" onClick={addMilestone}>Add</button>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <button className="cm-btn cm-btn-primary" onClick={save} disabled={!form.name.trim()}>
            {initial?.id ? "Save changes" : "Create goal"}
          </button>
          <button className="cm-btn cm-btn-ghost" onClick={closeGoalEditor}>Cancel</button>
          {initial?.id && (
            <button className="cm-btn cm-btn-danger ml-auto" onClick={() => deleteGoal(initial.id!)}>
              <Trash2 size={15} /> Delete
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ════════ Categories ════════ */
const SWATCHES = ["#3D52A0", "#7091E6", "#8A5CB8", "#4E9B6E", "#B08A3D", "#C77B3F", "#C0455E", "#B85C8A", "#3D8AA0", "#3DA08A"];

export function CategoriesPage({ app }: { app: AppData }) {
  const { categories, categoryStats, openNewCategory, openEditCategory } = app;

  return (
    <div className="cm-page flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="cm-display text-2xl font-extrabold t-text">Categories</h1>
        <button className="cm-btn cm-btn-primary" onClick={openNewCategory}><Plus size={16} /> New category</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 cm-stagger">
        {categories.map((c) => {
          const s = categoryStats[c.id];
          const up = s.trend >= 0;
          return (
            <div key={c.id} className="cm-card cm-card-hover p-5 flex flex-col gap-3 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Dot color={c.color} size={12} />
                  <span className="cm-display font-bold t-text">{c.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="t-faint opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--brand)]"
                    onClick={() => openEditCategory(c)}
                    aria-label="Edit category"
                  >
                    <Pencil size={14} />
                  </button>
                  <span className="text-sm font-bold" style={{ color: c.color }}>{s.pct}%</span>
                </div>
              </div>
              <ProgressBar value={s.pct} color={c.color} height={7} />
              <div className="flex items-center justify-between text-xs t-muted">
                <span>{s.done}/{s.total} tasks done</span>
                <span>{s.hours}h invested</span>
                <span className="inline-flex items-center gap-1" style={{ color: up ? "var(--good)" : "var(--bad)" }}>
                  {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {up ? "+" : ""}{s.trend} this wk
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {categories.length === 0 && (
        <EmptyState
          icon={<Tag size={22} />}
          title="No categories yet"
          blurb="Categories are life areas — Career, Health, Finance. Every task rolls up into one."
          action={<button className="cm-btn cm-btn-primary" onClick={openNewCategory}><Plus size={15} /> New category</button>}
        />
      )}
    </div>
  );
}

function blankCategory(): Category {
  return { id: uid("cat"), name: "", color: SWATCHES[0], icon: "Tag" };
}

export function CategoryModal({ app }: { app: AppData }) {
  const { editorCategory, saveCategory, closeCategoryEditor, deleteCategory } = app;
  const initial = editorCategory!;
  const [form, setForm] = useState<Category>(() => ({ ...blankCategory(), ...initial }));

  const save = () => {
    if (!form.name.trim()) return;
    saveCategory(form);
  };

  return (
    <Modal title={initial?.id ? "Edit category" : "New category"} onClose={closeCategoryEditor}>
      <div className="flex flex-col gap-4">
        <Field label="Name">
          <input
            autoFocus
            className="cm-input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Fitness"
          />
        </Field>
        <Field label="Color">
          <div className="flex gap-2 flex-wrap">
            {SWATCHES.map((s) => (
              <button
                key={s}
                className="rounded-full transition-transform hover:scale-110"
                style={{
                  width: 28, height: 28, background: s,
                  boxShadow: form.color === s ? `0 0 0 3px var(--panel-strong), 0 0 0 5px ${s}` : "inset 0 1px 0 rgba(255,255,255,.3)",
                }}
                onClick={() => setForm((f) => ({ ...f, color: s }))}
                aria-label={`Pick ${s}`}
              />
            ))}
          </div>
        </Field>
        <div className="flex items-center gap-3 mt-2">
          <button className="cm-btn cm-btn-primary" onClick={save} disabled={!form.name.trim()}>
            {initial?.id ? "Save changes" : "Create category"}
          </button>
          <button className="cm-btn cm-btn-ghost" onClick={closeCategoryEditor}>Cancel</button>
          {initial?.id && (
            <button className="cm-btn cm-btn-danger ml-auto" onClick={() => deleteCategory(initial.id!)}>
              <Trash2 size={15} /> Delete
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
