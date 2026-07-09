/* ── Commit · Habits (Phase 1 — daily view) ─────────────────────────── */
import React from "react";
import { Flame, Plus, Repeat } from "lucide-react";
import type { AppData } from "@/hooks/useAppData";
import { HabitRow } from "@/components/habits";
import { EmptyState, Ring } from "@/components/ui";
import { pct } from "@/utils/date";

export function HabitsPage({ app }: { app: AppData }) {
  const { activeHabits, habits, habitChainDone, habitChainTotal, openNewHabit } = app;
  const chainPct = pct(habitChainDone, habitChainTotal);

  return (
    <div className="cm-page flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="cm-display text-2xl font-extrabold t-text">Habits</h1>
        <button className="cm-btn cm-btn-primary" onClick={openNewHabit}><Plus size={16} /> New habit</button>
      </div>

      {activeHabits.length > 0 && (
        <div className="cm-card p-5 flex items-center gap-5 flex-wrap">
          <Ring value={chainPct} size={84} stroke={8}>
            <span className="text-sm font-bold t-text">{habitChainDone}/{habitChainTotal}</span>
          </Ring>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide t-faint">Today's chain</div>
            <div className="cm-display text-xl font-extrabold t-text flex items-center gap-2 mt-0.5">
              <Flame size={20} className={habitChainDone > 0 ? "cm-flame t-brand" : "t-faint"} />
              {habitChainDone}/{habitChainTotal} habits completed
            </div>
            <div className="text-xs t-muted mt-1">Mark each habit below as you go — partials and misses still count toward tomorrow's streak math.</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 cm-stagger">
        {activeHabits.map((h) => <HabitRow key={h.id} habit={h} app={app} />)}
      </div>

      {habits.length === 0 && (
        <EmptyState
          icon={<Repeat size={22} />}
          title="No habits yet"
          blurb="Habits are the daily reps — walking, reading, prayer, studying. Each one earns XP and builds its own streak."
          action={<button className="cm-btn cm-btn-primary" onClick={openNewHabit}><Plus size={15} /> First habit</button>}
        />
      )}
      {habits.length > 0 && activeHabits.length === 0 && (
        <EmptyState
          icon={<Repeat size={22} />}
          title="All habits are inactive"
          blurb="Reactivate a habit from its edit modal to bring it back into the daily view."
        />
      )}
    </div>
  );
}
