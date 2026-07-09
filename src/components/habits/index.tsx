/* ── Commit · habit components ──────────────────────────────────────── */
import React, { useState } from "react";
import { Check, CircleDot, Flame, MessageSquare, Pencil, Trash2, X } from "lucide-react";
import type { Habit, HabitFrequencyType, HabitStatus } from "@/types";
import type { AppData } from "@/hooks/useAppData";
import { Dot, Field, Modal } from "@/components/ui";
import { DIFFICULTIES, HABIT_FREQUENCIES, MEASUREMENT_UNITS, DEFAULT_STREAK_MULTIPLIERS, uid } from "@/utils/constants";
import { todayISO } from "@/utils/date";
import type { Difficulty } from "@/types";

/* ---------- Habit row (today's mark-off card) ---------- */
export function HabitRow({ habit, app }: { habit: Habit; app: AppData }) {
  const { categoriesById, todayHabitEntries, habitStreaks, logHabitCompletion, openEditHabit } = app;
  const cat = habit.categoryId ? categoriesById[habit.categoryId] : null;
  const entry = todayHabitEntries[habit.id];
  const streak = habitStreaks[habit.id] ?? 0;

  const [amount, setAmount] = useState<number | "">(entry?.amount ?? habit.goalAmount);
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [showNotes, setShowNotes] = useState(Boolean(entry?.notes));

  const mark = (status: HabitStatus) => {
    const amt = status === "Missed" ? 0 : Number(amount) || 0;
    if (status === "Missed") setAmount(0);
    logHabitCompletion(habit.id, status, amt, notes);
  };

  const saveNotes = () => {
    if (!entry) return;
    logHabitCompletion(habit.id, entry.status, entry.amount, notes);
  };

  return (
    <div className="cm-card cm-card-hover p-4 flex flex-col gap-3 group">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold t-text truncate">{habit.name}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs t-muted">
            {cat && <span className="inline-flex items-center gap-1.5"><Dot color={cat.color} /> {cat.name}</span>}
            <span>
              {habit.goalAmount} {habit.measurementUnit} · {habit.frequencyType === "Weekly" ? `${habit.targetDaysPerWeek}x/wk` : "daily"}
            </span>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
          style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
          title={`${streak}-day streak`}
        >
          <Flame size={12} className={streak > 0 ? "cm-flame" : ""} /> {streak}
        </span>
        <button
          className="t-faint opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--brand)] shrink-0"
          onClick={() => openEditHabit(habit)}
          aria-label="Edit habit"
        >
          <Pencil size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button className={`cm-chip ${entry?.status === "Completed" ? "cm-chip-on" : ""}`} onClick={() => mark("Completed")}>
          <Check size={13} /> Done
        </button>
        <button className={`cm-chip ${entry?.status === "Partial" ? "cm-chip-on" : ""}`} onClick={() => mark("Partial")}>
          <CircleDot size={13} /> Partial
        </button>
        <button className={`cm-chip ${entry?.status === "Missed" ? "cm-chip-on" : ""}`} onClick={() => mark("Missed")}>
          <X size={13} /> Missed
        </button>
        <input
          type="number"
          min={0}
          className="cm-input"
          style={{ width: 84 }}
          value={amount}
          onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder={String(habit.goalAmount)}
          aria-label={`Amount (${habit.measurementUnit})`}
        />
        <span className="text-xs t-faint">{habit.measurementUnit}</span>
        <button
          className="text-xs t-faint hover:text-[var(--brand)] ml-auto inline-flex items-center gap-1"
          onClick={() => setShowNotes((s) => !s)}
        >
          <MessageSquare size={13} /> {entry?.notes ? "Note" : "Add note"}
        </button>
      </div>

      {showNotes && (
        <textarea
          className="cm-textarea"
          rows={2}
          placeholder="How did it go?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
        />
      )}

      {entry && (
        <div className="text-xs t-faint">
          +{entry.xpEarned} XP earned today
        </div>
      )}
    </div>
  );
}

/* ---------- Habit editor modal ---------- */
function blankHabit(): Habit {
  return {
    id: uid("habit"),
    name: "",
    categoryId: null,
    description: "",
    frequencyType: "Daily",
    targetDaysPerWeek: null,
    goalAmount: 30,
    measurementUnit: "minutes",
    xpReward: 20,
    difficulty: "Medium",
    streakMultipliers: DEFAULT_STREAK_MULTIPLIERS,
    startDate: todayISO(),
    active: true,
    createdAt: todayISO(),
  };
}

export function HabitModal({ app }: { app: AppData }) {
  const { editorHabit, categories, saveHabit, closeHabitEditor, deleteHabit } = app;
  const initial = editorHabit!;
  const [form, setForm] = useState<Habit>(() => ({
    ...blankHabit(),
    categoryId: categories[0]?.id ?? null,
    ...initial,
  }));
  const set = <K extends keyof Habit>(k: K, v: Habit[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name.trim()) return;
    saveHabit(form);
  };

  return (
    <Modal title={initial?.id ? "Edit habit" : "New habit"} onClose={closeHabitEditor} wide>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Field label="Name">
            <input autoFocus className="cm-input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Walking" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Description">
            <textarea className="cm-textarea" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional context" />
          </Field>
        </div>
        <Field label="Category">
          <select className="cm-select" value={form.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value || null)}>
            <option value="">None</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Difficulty">
          <select className="cm-select" value={form.difficulty} onChange={(e) => set("difficulty", e.target.value as Difficulty)}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Frequency">
          <select className="cm-select" value={form.frequencyType} onChange={(e) => set("frequencyType", e.target.value as HabitFrequencyType)}>
            {HABIT_FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
        {form.frequencyType === "Weekly" && (
          <Field label="Target days per week">
            <input
              type="number" min={1} max={7} className="cm-input"
              value={form.targetDaysPerWeek ?? 3}
              onChange={(e) => set("targetDaysPerWeek", Number(e.target.value) || 1)}
            />
          </Field>
        )}
        <Field label="Goal amount">
          <input type="number" min={0} className="cm-input" value={form.goalAmount} onChange={(e) => set("goalAmount", Number(e.target.value) || 0)} />
        </Field>
        <Field label="Measurement unit">
          <input
            className="cm-input" list="cm-habit-units" value={form.measurementUnit}
            onChange={(e) => set("measurementUnit", e.target.value)} placeholder="minutes"
          />
          <datalist id="cm-habit-units">
            {MEASUREMENT_UNITS.map((u) => <option key={u} value={u} />)}
          </datalist>
        </Field>
        <Field label="XP reward">
          <input type="number" min={0} className="cm-input" value={form.xpReward} onChange={(e) => set("xpReward", Number(e.target.value) || 0)} />
        </Field>
        <Field label="Start date">
          <input type="date" className="cm-input" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <div className="flex items-center justify-between cm-inset px-3 py-2.5 md:col-span-2">
          <div>
            <div className="text-sm font-semibold t-text">Active</div>
            <div className="text-xs t-muted">Inactive habits stay saved but drop out of the daily view.</div>
          </div>
          <button
            role="switch" aria-checked={form.active}
            className={`cm-switch ${form.active ? "on" : ""}`}
            onClick={() => set("active", !form.active)}
          />
        </div>
        <div className="md:col-span-2 text-xs t-faint">
          Streak multiplier tiers ({form.streakMultipliers.map((t) => `${t.days}d → ${t.multiplier}x`).join(" · ")}) are saved now and applied automatically once XP leveling ships.
        </div>
      </div>
      <div className="flex items-center gap-3 mt-6">
        <button className="cm-btn cm-btn-primary" onClick={save} disabled={!form.name.trim()}>
          {initial?.id ? "Save changes" : "Create habit"}
        </button>
        <button className="cm-btn cm-btn-ghost" onClick={closeHabitEditor}>Cancel</button>
        {initial?.id && (
          <button className="cm-btn cm-btn-danger ml-auto" onClick={() => deleteHabit(initial.id!)}>
            <Trash2 size={15} /> Delete
          </button>
        )}
      </div>
    </Modal>
  );
}
