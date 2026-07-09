/* ── Commit · Projects, Goals, Categories ───────────────────────────── */
import React, { useState } from "react";
import { CalendarDays, CheckSquare, FolderKanban, Layers, Plus, Tag, Target, TrendingDown, TrendingUp } from "lucide-react";
import type { AppData } from "@/hooks/useAppData";
import { CheckButton, Dot, EmptyState, Field, Modal, ProgressBar, Ring } from "@/components/ui";
import { daysAhead, shortDate } from "@/utils/date";

/* ════════ Projects ════════ */
export function ProjectsPage({ app }: { app: AppData }) {
  const { projects, projectStats, categoriesById, goalsById, categories, addProject, loadSample } = app;
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [catId, setCatId] = useState<string>(categories[0]?.id ?? "");
  const [target, setTarget] = useState(daysAhead(30));

  const create = () => {
    if (!name.trim()) return;
    addProject({ name: name.trim(), description: "", categoryId: catId || null, goalId: null, targetDate: target });
    setModal(false);
    setName("");
  };

  return (
    <div className="cm-page flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="cm-display text-2xl font-extrabold t-text">Projects</h1>
        <button className="cm-btn cm-btn-primary" onClick={() => setModal(true)}><Plus size={16} /> New project</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 cm-stagger">
        {projects.map((p) => {
          const s = projectStats[p.id];
          const cat = p.categoryId ? categoriesById[p.categoryId] : null;
          const goal = p.goalId ? goalsById[p.goalId] : null;
          return (
            <div key={p.id} className="cm-card cm-card-hover p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="cm-display font-bold t-text truncate">{p.name}</div>
                  <div className="text-xs t-muted mt-1 flex items-center gap-1.5">
                    {cat && <><Dot color={cat.color} /> {cat.name}</>}
                    {goal && <span className="t-faint truncate">· {goal.name}</span>}
                  </div>
                </div>
                <span className="cm-display text-2xl font-extrabold shrink-0" style={{ color: s.pct === 100 ? "var(--good)" : "var(--brand)" }}>
                  {s.pct}%
                </span>
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
              <button className="cm-btn cm-btn-primary" onClick={() => setModal(true)}><Plus size={15} /> New project</button>
              <button className="cm-btn cm-btn-ghost" onClick={loadSample}>Load sample workspace</button>
            </div>
          }
        />
      )}

      {modal && (
        <Modal title="New project" onClose={() => setModal(false)}>
          <div className="flex flex-col gap-4">
            <Field label="Name">
              <input autoFocus className="cm-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Portfolio redesign" />
            </Field>
            <Field label="Category">
              <select className="cm-select" value={catId} onChange={(e) => setCatId(e.target.value)}>
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Target date">
              <input type="date" className="cm-input" value={target} onChange={(e) => setTarget(e.target.value)} />
            </Field>
            <button className="cm-btn cm-btn-primary self-start" onClick={create} disabled={!name.trim()}>Create project</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ════════ Goals ════════ */
export function GoalsPage({ app }: { app: AppData }) {
  const { goals, goalStats, toggleMilestone, addGoal, loadSample } = app;
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState(daysAhead(90));

  const create = () => {
    if (!name.trim()) return;
    addGoal({ name: name.trim(), description: desc, targetDate: target });
    setModal(false);
    setName("");
    setDesc("");
  };

  return (
    <div className="cm-page flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="cm-display text-2xl font-extrabold t-text">Goals</h1>
        <button className="cm-btn cm-btn-primary" onClick={() => setModal(true)}><Plus size={16} /> New goal</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 cm-stagger">
        {goals.map((g) => {
          const s = goalStats[g.id];
          return (
            <div key={g.id} className="cm-card cm-card-hover p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="cm-display font-bold t-text flex items-center gap-2">
                    <Target size={16} className="t-brand shrink-0" /> {g.name}
                  </div>
                  <div className="text-sm t-muted mt-1">{g.description}</div>
                </div>
                <Ring value={s.pct} size={72} stroke={7}>
                  <span className="text-sm font-bold t-text">{s.pct}%</span>
                </Ring>
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
              <button className="cm-btn cm-btn-primary" onClick={() => setModal(true)}><Plus size={15} /> New goal</button>
              <button className="cm-btn cm-btn-ghost" onClick={loadSample}>Load sample workspace</button>
            </div>
          }
        />
      )}

      {modal && (
        <Modal title="New goal" onClose={() => setModal(false)}>
          <div className="flex flex-col gap-4">
            <Field label="Name">
              <input autoFocus className="cm-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Run a half marathon" />
            </Field>
            <Field label="Description">
              <textarea className="cm-textarea" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </Field>
            <Field label="Target date">
              <input type="date" className="cm-input" value={target} onChange={(e) => setTarget(e.target.value)} />
            </Field>
            <button className="cm-btn cm-btn-primary self-start" onClick={create} disabled={!name.trim()}>Create goal</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ════════ Categories ════════ */
const SWATCHES = ["#3D52A0", "#7091E6", "#8A5CB8", "#4E9B6E", "#B08A3D", "#C77B3F", "#C0455E", "#B85C8A", "#3D8AA0", "#3DA08A"];

export function CategoriesPage({ app }: { app: AppData }) {
  const { categories, categoryStats, addCategory } = app;
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);

  const create = () => {
    if (!name.trim()) return;
    addCategory({ name: name.trim(), color, icon: "Tag" });
    setModal(false);
    setName("");
  };

  return (
    <div className="cm-page flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="cm-display text-2xl font-extrabold t-text">Categories</h1>
        <button className="cm-btn cm-btn-primary" onClick={() => setModal(true)}><Plus size={16} /> New category</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 cm-stagger">
        {categories.map((c) => {
          const s = categoryStats[c.id];
          const up = s.trend >= 0;
          return (
            <div key={c.id} className="cm-card cm-card-hover p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Dot color={c.color} size={12} />
                  <span className="cm-display font-bold t-text">{c.name}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: c.color }}>{s.pct}%</span>
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
          action={<button className="cm-btn cm-btn-primary" onClick={() => setModal(true)}><Plus size={15} /> New category</button>}
        />
      )}

      {modal && (
        <Modal title="New category" onClose={() => setModal(false)}>
          <div className="flex flex-col gap-4">
            <Field label="Name">
              <input autoFocus className="cm-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fitness" />
            </Field>
            <Field label="Color">
              <div className="flex gap-2 flex-wrap">
                {SWATCHES.map((s) => (
                  <button
                    key={s}
                    className="rounded-full transition-transform hover:scale-110"
                    style={{
                      width: 28, height: 28, background: s,
                      boxShadow: color === s ? `0 0 0 3px var(--panel-strong), 0 0 0 5px ${s}` : "inset 0 1px 0 rgba(255,255,255,.3)",
                    }}
                    onClick={() => setColor(s)}
                    aria-label={`Pick ${s}`}
                  />
                ))}
              </div>
            </Field>
            <button className="cm-btn cm-btn-primary self-start" onClick={create} disabled={!name.trim()}>Create category</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
