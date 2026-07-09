/* ── Commit · Analytics, Settings, Locked ───────────────────────────── */
import React from "react";
import {
  BellRing, CheckSquare, Clock, Database, Flame, FolderKanban, ListChecks, Lock,
  LogOut, Moon, Sun, Target, User,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { AppData } from "@/hooks/useAppData";
import type { ThemeMode } from "@/types";
import { Dot, Stat, Switch } from "@/components/ui";
import { APP_TAGLINE } from "@/utils/constants";

const tooltipStyle = {
  background: "var(--panel-strong)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--text)",
  boxShadow: "var(--shadow-soft)",
  fontSize: 12,
} as const;

/* ════════ Analytics ════════ */
export function AnalyticsPage({ app }: { app: AppData }) {
  const { analytics: a, weeklyData, monthlyData } = app;
  return (
    <div className="cm-page flex flex-col gap-5">
      <h1 className="cm-display text-2xl font-extrabold t-text">Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 cm-stagger">
        <Stat icon={<CheckSquare size={17} />} label="Completion rate" value={`${a.completionRate}%`} />
        <Stat icon={<ListChecks size={17} />} label="Tasks completed" value={a.totalDone} />
        <Stat icon={<Flame size={17} />} label="Longest streak" value={`${a.longestStreak}d`} />
        <Stat icon={<Clock size={17} />} label="Avg. completion" value={`${a.avgDays}d`} sub="created → done" />
        <Stat icon={<FolderKanban size={17} />} label="Projects done" value={a.projectsDone} />
        <Stat icon={<Target size={17} />} label="Goals done" value={a.goalsDone} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="cm-card p-4"><div className="text-xs t-muted mb-1">Most productive day</div><div className="cm-display text-xl font-bold t-text">{a.bestDay}</div></div>
        <div className="cm-card p-4"><div className="text-xs t-muted mb-1">Most productive hour</div><div className="cm-display text-xl font-bold t-text">{a.bestHour}</div></div>
        <div className="cm-card p-4"><div className="text-xs t-muted mb-1">Top category</div><div className="cm-display text-xl font-bold t-text">{a.topCategory}</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="cm-card p-5">
          <h2 className="cm-display font-bold t-text mb-2">Weekly trend</h2>
          <div style={{ height: 200 }}>
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
          <h2 className="cm-display font-bold t-text mb-2">Cumulative XP</h2>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={a.xpCumulative}>
                <CartesianGrid vertical={false} stroke="rgba(61,82,160,.10)" />
                <XAxis dataKey="day" tick={{ fill: "var(--faint)", fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
                <YAxis tick={{ fill: "var(--faint)", fontSize: 11 }} axisLine={false} tickLine={false} width={38} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="xp" stroke="#3D52A0" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="cm-card p-5">
          <h2 className="cm-display font-bold t-text mb-2">Completions by category</h2>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={a.byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={0}>
                  {a.byCategory.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            {a.byCategory.slice(0, 6).map((e) => (
              <span key={e.name} className="text-xs t-muted inline-flex items-center gap-1.5"><Dot color={e.color} /> {e.name} ({e.value})</span>
            ))}
          </div>
        </div>

        <div className="cm-card p-5">
          <h2 className="cm-display font-bold t-text mb-2">Monthly trend — XP per day</h2>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="cmXpGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8697C4" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8697C4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(61,82,160,.10)" />
                <XAxis dataKey="day" tick={{ fill: "var(--faint)", fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
                <YAxis tick={{ fill: "var(--faint)", fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="xp" stroke="#8697C4" strokeWidth={2} fill="url(#cmXpGrad2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════ Settings ════════ */
export function SettingsPage({ app, onSignOut }: { app: AppData; onSignOut: () => void }) {
  const { settings, setTheme, setWidgets, setNotifPrefs, patchSettings, user, loadSample, tasks } = app;
  const { theme, widgets, notifPrefs } = settings;

  const widgetLabels: Record<keyof typeof widgets, string> = {
    focus: "Daily Focus",
    deadlines: "Upcoming deadlines",
    charts: "Productivity graphs",
    recent: "Recently completed",
  };
  const notifLabels: Record<keyof typeof notifPrefs, string> = {
    d1: "1 day before",
    h1: "1 hour before",
    m15: "15 minutes before",
  };

  return (
    <div className="cm-page flex flex-col gap-5 max-w-2xl">
      <h1 className="cm-display text-2xl font-extrabold t-text">Settings</h1>

      {/* Account */}
      <div className="cm-card p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="cm-metal inline-flex items-center justify-center rounded-xl text-white shrink-0" style={{ width: 40, height: 40 }}>
            <User size={18} />
          </span>
          <div className="min-w-0">
            <div className="font-semibold t-text text-sm truncate">{user.email}</div>
            <div className="text-xs t-muted">Single-user workspace · everything auto-saves to Supabase</div>
          </div>
          <button className="cm-btn cm-btn-ghost ml-auto shrink-0" onClick={onSignOut}><LogOut size={14} /> Sign out</button>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide t-faint">Display name (used in the greeting)</span>
          <input
            className="cm-input max-w-xs"
            value={settings.displayName}
            onChange={(e) => patchSettings({ displayName: e.target.value })}
            placeholder="e.g. Alex"
          />
        </label>
      </div>

      {/* Appearance */}
      <div className="cm-card p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-semibold t-text text-sm">Theme</div>
            <div className="text-xs t-muted">Saved to your account and synced across devices.</div>
          </div>
          <div className="cm-inset flex gap-1 p-1" style={{ borderRadius: 12 }}>
            {(["light", "dark"] as ThemeMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setTheme(v)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize flex items-center gap-1.5 transition-all"
                style={theme === v
                  ? { background: "linear-gradient(150deg,#5b74c8,#3d52a0)", color: "#fff", boxShadow: "inset 0 1px 0 rgba(255,255,255,.3)" }
                  : { color: "var(--muted)" }}
              >
                {v === "light" ? <Sun size={14} /> : <Moon size={14} />} {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard widgets */}
      <div className="cm-card p-5 flex flex-col gap-4">
        <div className="font-semibold t-text text-sm">Dashboard widgets</div>
        {(Object.keys(widgetLabels) as (keyof typeof widgets)[]).map((k) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-sm t-muted">{widgetLabels[k]}</span>
            <Switch on={widgets[k]} onChange={(v) => setWidgets({ ...widgets, [k]: v })} label={widgetLabels[k]} />
          </div>
        ))}
      </div>

      {/* Notifications */}
      <div className="cm-card p-5 flex flex-col gap-4">
        <div>
          <div className="font-semibold t-text text-sm flex items-center gap-2"><BellRing size={15} className="t-brand" /> Reminders</div>
          <div className="text-xs t-muted mt-0.5">Browser notifications before a deadline.</div>
        </div>
        {(Object.keys(notifLabels) as (keyof typeof notifPrefs)[]).map((k) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-sm t-muted">{notifLabels[k]}</span>
            <Switch on={notifPrefs[k]} onChange={(v) => setNotifPrefs({ ...notifPrefs, [k]: v })} label={notifLabels[k]} />
          </div>
        ))}
        <button
          className="cm-btn cm-btn-ghost self-start"
          onClick={() => { if (typeof Notification !== "undefined") Notification.requestPermission(); }}
        >
          Enable browser notifications
        </button>
      </div>

      {/* Data */}
      <div className="cm-card p-5 flex flex-col gap-3">
        <div className="font-semibold t-text text-sm flex items-center gap-2"><Database size={15} className="t-brand" /> Data</div>
        <div className="text-xs t-muted">
          Everything you see is stored in your Supabase project and restored on every device you sign in from.
        </div>
        {tasks.length === 0 && (
          <button className="cm-btn cm-btn-soft self-start" onClick={loadSample}>Load sample workspace</button>
        )}
      </div>

      <div className="text-xs t-faint text-center pb-4">Commit — {APP_TAGLINE}</div>
    </div>
  );
}

/* ════════ Locked (coming soon) ════════ */
export function LockedPage({ title, blurb, icon }: { title: string; blurb: string; icon: React.ReactNode }) {
  return (
    <div className="cm-page flex flex-col items-center justify-center text-center py-24 gap-4">
      <span className="cm-metal inline-flex items-center justify-center rounded-2xl text-white" style={{ width: 64, height: 64 }}>
        {icon}
      </span>
      <h1 className="cm-display text-2xl font-extrabold t-text">{title}</h1>
      <p className="text-sm t-muted max-w-md">{blurb}</p>
      <span className="cm-chip inline-flex items-center gap-2"><Lock size={13} /> Coming soon — the data model is already wired in</span>
    </div>
  );
}
