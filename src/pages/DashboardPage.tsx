/* ── Commit · Dashboard ─────────────────────────────────────────────── */
import React from "react";
import {
  ArrowUpRight, CalendarDays, CheckSquare, Clock, Flame, Hourglass, Plus, Sparkles, Star, Trophy, Zap,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { AppData } from "@/hooks/useAppData";
import type { Page } from "@/components/layout/nav";
import { TaskRow } from "@/components/tasks";
import { CountUp, Dot, ProgressBar, Ring, Stat } from "@/components/ui";
import { relativeDeadline } from "@/utils/date";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function motivation(app: AppData): string[] {
  const { todayDone, streak, projects, projectStats, weekDelta } = app;
  const msgs: string[] = [];
  if (todayDone > 0) msgs.push(`You've completed ${todayDone} task${todayDone === 1 ? "" : "s"} today.`);
  const near = projects
    .map((p) => projectStats[p.id])
    .filter((s) => s && s.pct >= 75 && s.pct < 100)
    .sort((a, b) => b.pct - a.pct)[0];
  if (near) msgs.push(`You're only ${100 - near.pct}% away from finishing ${near.name}.`);
  if (weekDelta > 0) msgs.push(`Your completion pace is up ${weekDelta}% versus last week.`);
  if (todayDone === 0 && streak > 0) msgs.push(`One task today keeps your ${streak}-day streak alive.`);
  if (msgs.length === 0) msgs.push("A clear day. Pick one task and set the tone.");
  return msgs;
}

const tooltipStyle = {
  background: "var(--panel-strong)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--text)",
  boxShadow: "var(--shadow-soft)",
  fontSize: 12,
} as const;

export function DashboardPage({ app, go }: { app: AppData; go: (p: Page) => void }) {
  const {
    todayDone, todayTotal, todayPct, streak, xpToday, level, focusTasks,
    upcoming, recentDone, weeklyData, monthlyData, openNewTask, categoriesById, settings, user,
  } = app;
  const widgets = settings.widgets;
  const msgs = motivation(app);
  const remaining = todayTotal - todayDone;
  const name = settings.displayName || user.email?.split("@")[0] || "there";

  return (
    <div className="cm-page flex flex-col gap-5">
      {/* Hero — greeting + momentum ring */}
      <div className="cm-card p-6 md:p-7 relative overflow-hidden">
        <div
          className="absolute -top-28 -right-28 rounded-full pointer-events-none"
          style={{ width: 360, height: 360, background: "radial-gradient(circle, rgba(112,145,230,.22), transparent 68%)" }}
        />
        <div
          className="absolute -bottom-32 -left-20 rounded-full pointer-events-none"
          style={{ width: 300, height: 300, background: "radial-gradient(circle, rgba(173,187,218,.28), transparent 68%)" }}
        />
        <div className="flex flex-col md:flex-row md:items-center gap-6 relative">
          <div className="flex-1 min-w-0">
            <div className="text-sm t-muted font-medium">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <h1 className="cm-display text-3xl md:text-4xl font-extrabold t-text mt-1 capitalize">
              {greeting()}, {name}.
            </h1>
            <div className="mt-3 flex flex-col gap-1.5">
              {msgs.slice(0, 2).map((m, i) => (
                <div key={i} className="text-sm t-muted flex items-center gap-2">
                  <Sparkles size={14} className="t-brand shrink-0" /> {m}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5 flex-wrap">
              <button className="cm-btn cm-btn-primary" onClick={openNewTask}><Plus size={16} /> New task</button>
              <button className="cm-btn cm-btn-ghost" onClick={() => go("tasks")}>View all tasks <ArrowUpRight size={15} /></button>
            </div>
          </div>
          <div className="flex items-center justify-center shrink-0">
            <Ring value={todayPct} size={180}>
              <div className="cm-display text-4xl font-extrabold t-text"><CountUp value={todayPct} />%</div>
              <div className="text-xs t-muted mt-1">of today complete</div>
              <div className="text-xs t-faint">{todayDone} done · {remaining} left</div>
            </Ring>
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 cm-stagger">
        <Stat icon={<CheckSquare size={17} />} label="Completed today" value={<CountUp value={todayDone} />} />
        <Stat icon={<Hourglass size={17} />} label="Remaining today" value={<CountUp value={remaining} />} />
        <Stat icon={<Flame size={17} className={streak > 0 ? "cm-flame" : ""} />} label="Day streak" value={streak} sub={streak > 0 ? "Keep it burning" : "Start one today"} />
        <Stat icon={<Zap size={17} />} label="XP today" value={`+${xpToday}`} />
        <Stat icon={<Trophy size={17} />} label="Level" value={level.level} sub={`${level.intoLevel}/${level.needed} XP`} />
        <Stat icon={<CalendarDays size={17} />} label="Due this week" value={upcoming.length} />
      </div>

      {/* Level bar */}
      <div className="cm-card p-4 flex items-center gap-4">
        <span className="cm-metal inline-flex items-center justify-center rounded-xl shrink-0 text-white" style={{ width: 40, height: 40 }}>
          <Trophy size={19} />
        </span>
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold t-text">Level {level.level}</span>
            <span className="t-muted">{level.needed - level.intoLevel} XP to level {level.level + 1}</span>
          </div>
          <ProgressBar value={level.progress * 100} height={9} />
        </div>
      </div>

      {(widgets.focus || widgets.deadlines) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Daily Focus */}
          {widgets.focus && (
            <div className="cm-card p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="cm-display font-bold t-text flex items-center gap-2"><Star size={16} className="t-brand" /> Daily Focus</h2>
                <span className="text-xs t-faint hidden sm:block">Three tasks. Nothing else matters right now.</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {focusTasks.length === 0 ? (
                  <div className="text-sm t-muted py-6 text-center">
                    Everything scheduled for today is done. Pull something forward or enjoy the win.
                  </div>
                ) : (
                  focusTasks.map((task) => <TaskRow key={task.id} task={task} app={app} />)
                )}
              </div>
            </div>
          )}

          {/* Upcoming deadlines */}
          {widgets.deadlines && (
            <div className="cm-card p-5">
              <h2 className="cm-display font-bold t-text mb-3 flex items-center gap-2"><Clock size={16} className="t-brand" /> Upcoming deadlines</h2>
              <div className="flex flex-col gap-2">
                {upcoming.slice(0, 6).map((task) => {
                  const cat = task.categoryId ? categoriesById[task.categoryId] : null;
                  const rel = relativeDeadline(task.deadline);
                  return (
                    <button
                      key={task.id}
                      onClick={() => app.openEditTask(task)}
                      className="cm-inset flex items-center gap-2.5 text-left px-3 py-2.5 hover:brightness-105 transition-all hover:-translate-y-px"
                    >
                      <Dot color={cat?.color || "var(--brand)"} />
                      <span className="text-sm t-text truncate flex-1">{task.title}</span>
                      <span className="text-xs t-muted shrink-0">{rel?.label}</span>
                    </button>
                  );
                })}
                {upcoming.length === 0 && <div className="text-sm t-muted py-4 text-center">No deadlines in the next 7 days.</div>}
              </div>
              <button className="text-xs t-brand font-semibold mt-3 flex items-center gap-1 hover:gap-1.5 transition-all" onClick={() => go("calendar")}>
                Open calendar <ArrowUpRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {widgets.charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="cm-card p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="cm-display font-bold t-text">This week</h2>
              <span className="text-xs t-muted">tasks completed per day</span>
            </div>
            <div style={{ height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} barSize={22}>
                  <CartesianGrid vertical={false} stroke="rgba(61,82,160,.10)" />
                  <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--faint)", fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip cursor={{ fill: "var(--track)" }} contentStyle={tooltipStyle} />
                  <Bar dataKey="completed" fill="#7091E6" radius={[7, 7, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="cm-card p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="cm-display font-bold t-text">Last 30 days</h2>
              <span className="text-xs t-muted">XP earned</span>
            </div>
            <div style={{ height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="cmXpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7091E6" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#7091E6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(61,82,160,.10)" />
                  <XAxis dataKey="day" tick={{ fill: "var(--faint)", fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
                  <YAxis tick={{ fill: "var(--faint)", fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="xp" stroke="#3D52A0" strokeWidth={2.5} fill="url(#cmXpGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {widgets.recent && (
        <div className="cm-card p-5">
          <h2 className="cm-display font-bold t-text mb-3">Recently completed</h2>
          <div className="flex flex-col gap-2">
            {recentDone.slice(0, 5).map((task) => <TaskRow key={task.id} task={task} app={app} compact />)}
            {recentDone.length === 0 && (
              <div className="text-sm t-muted py-3">Completed tasks will land here — with XP attached.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
