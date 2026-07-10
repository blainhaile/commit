/* ── Commit · Calendar ──────────────────────────────────────────────── */
import React, { useMemo, useState } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { AppData } from "@/hooks/useAppData";
import type { Task } from "@/types";
import { TaskRow } from "@/components/tasks";
import { addDays, DAY_MS, formatTime, iso, parseISO, shortDate, todayISO, weekday } from "@/utils/date";

const VIEWS = ["Month", "Week", "Day", "Agenda"] as const;
type View = (typeof VIEWS)[number];

/** One task's appearance on one specific day. `segment` locates that day within a
 *  multi-day span (start/deadline both set); "single" is today's default one-day case. */
type DayTaskEntry = { task: Task; segment: "single" | "start" | "middle" | "end"; dayIndex: number; totalDays: number };

export function CalendarPage({ app }: { app: AppData }) {
  const { tasks, categoriesById, openEditTask, openNewTaskOn, moveDeadline } = app;
  const [view, setView] = useState<View>("Month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [dragOver, setDragOver] = useState<string | null>(null);
  const today = todayISO();

  const tasksByDay = useMemo(() => {
    const map: Record<string, DayTaskEntry[]> = {};
    tasks.forEach((task) => {
      if (!task.deadline || task.status === "Archived") return;
      const isRange = Boolean(task.startDate) && task.startDate! < task.deadline;
      if (!isRange) {
        (map[task.deadline] = map[task.deadline] || []).push({ task, segment: "single", dayIndex: 1, totalDays: 1 });
        return;
      }
      const totalDays = Math.round((parseISO(task.deadline).getTime() - parseISO(task.startDate!).getTime()) / DAY_MS) + 1;
      let d = task.startDate!;
      let dayIndex = 1;
      // Safety cap: guarantees this terminates no matter what — a correctness bug in
      // addDays, a future data-entry edge case, whatever — a stuck loop here freezes
      // the whole tab, so bail out rather than trust the loop condition alone.
      const MAX_SPAN_DAYS = 366;
      while (d <= task.deadline && dayIndex <= MAX_SPAN_DAYS) {
        const segment = d === task.startDate ? "start" : d === task.deadline ? "end" : "middle";
        (map[d] = map[d] || []).push({ task, segment, dayIndex, totalDays });
        d = addDays(d, 1);
        dayIndex += 1;
      }
    });
    // Untimed and multi-day (all-day style) entries first, then single-day timed
    // tasks in ascending order — "" sorts before any "HH:mm" string.
    Object.values(map).forEach((list) => list.sort((a, b) => {
      const at = a.segment === "single" ? (a.task.deadlineTime || "") : "";
      const bt = b.segment === "single" ? (b.task.deadlineTime || "") : "";
      return at < bt ? -1 : at > bt ? 1 : 0;
    }));
    return map;
  }, [tasks]);

  const monthLabel = anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const shift = (n: number) => {
    const d = new Date(anchor);
    if (view === "Month") d.setMonth(d.getMonth() + n);
    else if (view === "Week") d.setDate(d.getDate() + 7 * n);
    else d.setDate(d.getDate() + n);
    setAnchor(d);
  };

  const DayCell = ({ dateStr, dim, tall }: { dateStr: string; dim?: boolean; tall?: boolean }) => {
    const dayTasks = tasksByDay[dateStr] || [];
    const isToday = dateStr === today;
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(dateStr); }}
        onDragLeave={() => setDragOver((d) => (d === dateStr ? null : d))}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/task");
          if (id) moveDeadline(id, dateStr);
          setDragOver(null);
        }}
        onClick={() => openNewTaskOn(dateStr)}
        className="rounded-xl p-1.5 flex flex-col gap-1 cursor-pointer transition-all"
        style={{
          minHeight: tall ? 220 : 96,
          background: dragOver === dateStr ? "var(--brand-soft)" : "var(--inset)",
          border: `1px solid ${isToday ? "var(--brand-2)" : "var(--border)"}`,
          boxShadow: isToday ? "0 0 0 3px rgba(112,145,230,.16)" : undefined,
          opacity: dim ? 0.45 : 1,
        }}
      >
        <div className={`text-xs font-semibold px-1 ${isToday ? "t-brand" : "t-muted"}`}>{parseISO(dateStr).getDate()}</div>
        <div className="flex flex-col gap-1 overflow-hidden">
          {dayTasks.slice(0, tall ? 12 : 3).map(({ task, segment }) => {
            const cat = task.categoryId ? categoriesById[task.categoryId] : null;
            const isDone = task.status === "Completed";
            const c = cat?.color || "#8697C4";
            // Only the deadline-day chip (single or the range's end segment) actually
            // moves the deadline on drop, so only that one is draggable — dragging a
            // start/middle segment would confusingly move the END of the span, not itself.
            const draggableHere = segment === "single" || segment === "end";
            const roundingClass = segment === "single" ? "rounded-md" : segment === "start" ? "rounded-l-md" : segment === "end" ? "rounded-r-md" : "";
            return (
              <div
                key={task.id}
                draggable={draggableHere}
                onDragStart={draggableHere ? (e) => e.dataTransfer.setData("text/task", task.id) : undefined}
                onClick={(e) => { e.stopPropagation(); openEditTask(task); }}
                className={`text-xs px-1.5 py-1 ${roundingClass} truncate transition-transform hover:-translate-y-px ${draggableHere ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${isDone ? "line-through opacity-50" : ""}`}
                style={{ background: `${c}1C`, color: c, fontWeight: 600, border: `1px solid ${c}30` }}
                title={draggableHere ? `${task.title} — drag to move deadline` : `${task.title} — spans ${shortDate(task.startDate!)}–${shortDate(task.deadline!)}`}
              >
                {task.deadlineTime && draggableHere && <span style={{ opacity: 0.7 }}>{formatTime(task.deadlineTime)} </span>}{task.title}
              </div>
            );
          })}
          {!tall && dayTasks.length > 3 && <div className="text-xs t-faint px-1">+{dayTasks.length - 3} more</div>}
        </div>
      </div>
    );
  };

  let body: React.ReactNode = null;
  if (view === "Month") {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday start
    const start = new Date(first);
    start.setDate(1 - startOffset);
    const cells = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    body = (
      <>
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-xs t-faint text-center font-semibold">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((d) => <DayCell key={iso(d)} dateStr={iso(d)} dim={d.getMonth() !== anchor.getMonth()} />)}
        </div>
      </>
    );
  } else if (view === "Week") {
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
    const cells = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    body = (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-1.5">
        {cells.map((d) => (
          <div key={iso(d)}>
            <div className="text-xs t-faint text-center font-semibold mb-1.5">
              {d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
            </div>
            <DayCell dateStr={iso(d)} tall />
          </div>
        ))}
      </div>
    );
  } else if (view === "Day") {
    const dateStr = iso(anchor);
    const dayTasks = tasksByDay[dateStr] || [];
    body = (
      <div className="flex flex-col gap-2.5">
        <div className="text-sm t-muted font-medium">
          {anchor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </div>
        {dayTasks.map(({ task, segment, dayIndex, totalDays }) => (
          <div key={task.id} className="flex flex-col gap-1">
            {segment !== "single" && (
              <div className="text-xs t-faint px-1 inline-flex items-center gap-1">
                <CalendarRange size={11} /> Day {dayIndex} of {totalDays}
              </div>
            )}
            <TaskRow task={task} app={app} />
          </div>
        ))}
        {dayTasks.length === 0 && (
          <div className="cm-inset p-8 text-center text-sm t-muted">Nothing scheduled. Click below to add something.</div>
        )}
        <button className="cm-btn cm-btn-ghost self-start" onClick={() => openNewTaskOn(dateStr)}>
          <Plus size={15} /> Add task on this day
        </button>
      </div>
    );
  } else {
    // Built from tasksByDay (not a fresh filter over `tasks`) so a multi-day task's
    // start/middle/end segments all show up here too, already sorted per day.
    const upcomingDays = Object.keys(tasksByDay).filter((d) => d >= today).sort();
    const groups: Record<string, DayTaskEntry[]> = {};
    let shown = 0;
    for (const d of upcomingDays) {
      if (shown >= 30) break;
      groups[d] = tasksByDay[d];
      shown += tasksByDay[d].length;
    }
    body = (
      <div className="flex flex-col gap-4">
        {Object.entries(groups).map(([d, group]) => (
          <div key={d}>
            <div className="text-xs font-bold t-brand uppercase tracking-wide mb-2">
              {weekday(d)} · {shortDate(d)} {d === today ? "· Today" : ""}
            </div>
            <div className="flex flex-col gap-2">
              {group.map(({ task, segment, dayIndex, totalDays }) => (
                <div key={task.id} className="flex flex-col gap-1">
                  {segment !== "single" && (
                    <div className="text-xs t-faint px-1 inline-flex items-center gap-1">
                      <CalendarRange size={11} /> Day {dayIndex} of {totalDays}
                    </div>
                  )}
                  <TaskRow task={task} app={app} compact />
                </div>
              ))}
            </div>
          </div>
        ))}
        {upcomingDays.length === 0 && <div className="text-sm t-muted">Nothing on the horizon.</div>}
      </div>
    );
  }

  return (
    <div className="cm-page flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="cm-display text-2xl font-extrabold t-text">Calendar</h1>
          <span className="text-sm t-muted">{monthLabel}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="cm-card flex gap-1 p-1" style={{ borderRadius: 12 }}>
            {VIEWS.map((v) => (
              <button
                key={v}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={view === v
                  ? { background: "linear-gradient(150deg,#5b74c8,#3d52a0)", color: "#fff", boxShadow: "inset 0 1px 0 rgba(255,255,255,.3)" }
                  : { color: "var(--muted)" }}
                onClick={() => setView(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <button className="cm-btn cm-btn-ghost px-2.5" onClick={() => shift(-1)} aria-label="Previous"><ChevronLeft size={16} /></button>
          <button className="cm-btn cm-btn-ghost" onClick={() => setAnchor(new Date())}>Today</button>
          <button className="cm-btn cm-btn-ghost px-2.5" onClick={() => shift(1)} aria-label="Next"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="text-xs t-faint">Click a day to create a task · drag a task chip to move its deadline.</div>
      <div className="cm-card p-3 md:p-4">{body}</div>
    </div>
  );
}
