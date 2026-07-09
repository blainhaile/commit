/* ── Commit · task components ───────────────────────────────────────── */
import React, { useState } from "react";
import { ChevronDown, ChevronRight, Clock, ListChecks, Pencil, Repeat, Trash2, X } from "lucide-react";
import type { Difficulty, Priority, Recurring, Status, Task } from "@/types";
import type { AppData } from "@/hooks/useAppData";
import { CheckButton, DiffBadge, Dot, Field, Modal, PriorityBadge } from "@/components/ui";
import { formatTime, relativeDeadline, todayISO } from "@/utils/date";
import { DIFFICULTIES, PRIORITIES, RECUR_OPTIONS, STATUSES, uid } from "@/utils/constants";
import { XP_BY_DIFFICULTY } from "@/utils/xp";

/* ---------- Task row ---------- */
export function TaskRow({ task, app, compact }: { task: Task; app: AppData; compact?: boolean }) {
  const { categoriesById, projectsById, toggleComplete, openEditTask, toggleSubtask, addSubtask, removeSubtask } = app;
  const cat = task.categoryId ? categoriesById[task.categoryId] : null;
  const proj = task.projectId ? projectsById[task.projectId] : null;
  const isDone = task.status === "Completed";
  const rel = relativeDeadline(task.deadline);
  const overdue = !isDone && rel?.tone === "over";
  const hasSubtasks = task.subtasks.length > 0;
  const subDone = task.subtasks.filter((s) => s.done).length;
  const [expanded, setExpanded] = useState(false);
  const [subTitle, setSubTitle] = useState("");

  const addSub = () => {
    if (!subTitle.trim()) return;
    addSubtask(task.id, subTitle);
    setSubTitle("");
  };

  return (
    <div className={`cm-card cm-card-hover px-4 ${compact ? "py-2.5" : "py-3.5"} flex flex-col gap-2.5 group`}>
      <div className="flex items-center gap-3">
        <CheckButton on={isDone} onClick={(e) => { e.stopPropagation(); toggleComplete(task.id); }} />
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openEditTask(task)}>
          <div className={`text-sm font-semibold truncate t-text ${isDone ? "line-through opacity-50" : ""}`}>{task.title}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {cat && <span className="text-xs t-muted inline-flex items-center gap-1.5"><Dot color={cat.color} /> {cat.name}</span>}
            {proj && !compact && <span className="text-xs t-faint truncate">· {proj.name}</span>}
            {hasSubtasks && (
              <button
                className="text-xs t-faint inline-flex items-center gap-1 hover:text-[var(--brand)] transition-colors"
                onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
                aria-label={expanded ? "Collapse subtasks" : "Expand subtasks"}
                aria-expanded={expanded}
              >
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <ListChecks size={12} /> {subDone}/{task.subtasks.length}
              </button>
            )}
            {task.recurring !== "None" && (
              <span className="text-xs t-faint inline-flex items-center gap-1"><Repeat size={12} /> {task.recurring}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!compact && <span className="hidden sm:inline-flex"><DiffBadge d={task.difficulty} /></span>}
          <PriorityBadge p={task.priority} />
          {rel && (
            <span className="text-xs font-medium inline-flex items-center gap-1" style={{ color: overdue ? "var(--bad)" : "var(--muted)" }}>
              <Clock size={12} /> {rel.label}{task.deadlineTime && ` · ${formatTime(task.deadlineTime)}`}
            </span>
          )}
          <button
            className="t-faint opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--brand)]"
            onClick={() => openEditTask(task)}
            aria-label="Edit task"
          >
            <Pencil size={15} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="pl-9 flex flex-col gap-1.5">
          {task.subtasks.map((s) => (
            <div key={s.id} className="cm-inset flex items-center gap-2.5 text-sm px-3 py-2">
              <CheckButton on={s.done} onClick={() => toggleSubtask(task.id, s.id)} />
              <span className={`t-text ${s.done ? "line-through opacity-50" : ""}`}>{s.title}</span>
              <button
                className="ml-auto t-faint hover:text-[var(--bad)] transition-colors"
                onClick={() => removeSubtask(task.id, s.id)}
                aria-label="Remove subtask"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              className="cm-input"
              placeholder="Add a subtask"
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSub()}
            />
            <button className="cm-btn cm-btn-ghost shrink-0" onClick={addSub}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Task editor modal ---------- */
type TaskForm = Omit<Task, "tags" | "duration"> & { tags: string; duration: number | string };

function blankTask(): Task {
  return {
    id: uid("task"), title: "", description: "", notes: "", priority: "Medium",
    difficulty: "Medium", categoryId: null, projectId: null, goalId: null,
    deadline: null, deadlineTime: null, startDate: null, duration: 60, recurring: "None", tags: [],
    status: "Not Started", subtasks: [], createdAt: todayISO(), completedAt: null,
  };
}

export function TaskModal({ app }: { app: AppData }) {
  const { editorTask, categories, projects, goals, saveTask, closeEditor, deleteTask } = app;
  const initial = editorTask!;
  const [form, setForm] = useState<TaskForm>(() => ({
    ...blankTask(),
    categoryId: categories[0]?.id ?? null,
    ...initial,
    tags: (initial?.tags || []).join(", "),
  }));
  const [subTitle, setSubTitle] = useState("");
  const set = <K extends keyof TaskForm>(k: K, v: TaskForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const addSub = () => {
    if (!subTitle.trim()) return;
    set("subtasks", [...form.subtasks, { id: uid("s"), title: subTitle.trim(), done: false }]);
    setSubTitle("");
  };

  const save = () => {
    if (!form.title.trim()) return;
    saveTask({
      ...form,
      tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      duration: Number(form.duration) || 0,
    });
  };

  return (
    <Modal title={initial?.id ? "Edit task" : "New task"} onClose={closeEditor} wide>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Field label="Title">
            <input autoFocus className="cm-input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="What moves you forward?" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Description">
            <textarea className="cm-textarea" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional context" />
          </Field>
        </div>
        <Field label="Priority">
          <select className="cm-select" value={form.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Difficulty (sets XP)">
          <select className="cm-select" value={form.difficulty} onChange={(e) => set("difficulty", e.target.value as Difficulty)}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d} — {XP_BY_DIFFICULTY[d]} XP</option>)}
          </select>
        </Field>
        <Field label="Category">
          <select className="cm-select" value={form.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value || null)}>
            <option value="">None</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Project">
          <select className="cm-select" value={form.projectId || ""} onChange={(e) => set("projectId", e.target.value || null)}>
            <option value="">None</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Goal">
          <select className="cm-select" value={form.goalId || ""} onChange={(e) => set("goalId", e.target.value || null)}>
            <option value="">None</option>
            {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className="cm-select" value={form.status} onChange={(e) => set("status", e.target.value as Status)}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Deadline">
          <div className="flex gap-2">
            <input
              type="date"
              className="cm-input"
              value={form.deadline || ""}
              onChange={(e) => {
                const v = e.target.value || null;
                set("deadline", v);
                if (!v) set("deadlineTime", null); // a bare time with no date is meaningless
              }}
            />
            <input
              type="time"
              className="cm-input"
              style={{ maxWidth: 118 }}
              value={form.deadlineTime || ""}
              onChange={(e) => set("deadlineTime", e.target.value || null)}
              aria-label="Deadline time (optional)"
              title="Optional time"
            />
          </div>
        </Field>
        <Field label="Start date">
          <input type="date" className="cm-input" value={form.startDate || ""} onChange={(e) => set("startDate", e.target.value || null)} />
        </Field>
        <Field label="Estimated duration (min)">
          <input type="number" min={0} className="cm-input" value={form.duration} onChange={(e) => set("duration", e.target.value)} />
        </Field>
        <Field label="Recurring">
          <select className="cm-select" value={form.recurring} onChange={(e) => set("recurring", e.target.value as Recurring)}>
            {RECUR_OPTIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Tags (comma separated)">
            <input className="cm-input" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="study, deep-work" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Notes">
            <textarea className="cm-textarea" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Links, checklists, anything…" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <span className="block text-xs font-semibold t-faint mb-1.5 uppercase tracking-wide">Subtasks</span>
          <div className="flex flex-col gap-1.5 mb-2">
            {form.subtasks.map((s) => (
              <div key={s.id} className="cm-inset flex items-center gap-2.5 text-sm px-3 py-2">
                <CheckButton on={s.done} onClick={() => set("subtasks", form.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))} />
                <span className={`t-text ${s.done ? "line-through opacity-50" : ""}`}>{s.title}</span>
                <button className="ml-auto t-faint hover:text-[var(--bad)] transition-colors" onClick={() => set("subtasks", form.subtasks.filter((x) => x.id !== s.id))} aria-label="Remove subtask">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="cm-input"
              placeholder="Add a subtask"
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSub()}
            />
            <button className="cm-btn cm-btn-ghost shrink-0" onClick={addSub}>Add</button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-6">
        <button className="cm-btn cm-btn-primary" onClick={save} disabled={!form.title.trim()}>
          {initial?.id ? "Save changes" : "Create task"}
        </button>
        <button className="cm-btn cm-btn-ghost" onClick={closeEditor}>Cancel</button>
        {initial?.id && (
          <button className="cm-btn cm-btn-danger ml-auto" onClick={() => deleteTask(initial.id!)}>
            <Trash2 size={15} /> Delete
          </button>
        )}
      </div>
    </Modal>
  );
}
