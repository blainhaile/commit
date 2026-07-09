/* ── Commit · layout: sidebar & topbar ──────────────────────────────── */
import React, { useMemo, useState } from "react";
import {
  CheckSquare, Flame, FolderKanban, Lock, Menu, Moon, Plus, Search, Sun, Target, Zap,
} from "lucide-react";
import type { AppData } from "@/hooks/useAppData";
import { NAV, type Page } from "./nav";
import { CommitMark } from "./CommitMark";
import { ProgressBar } from "@/components/ui";
import { APP_NAME } from "@/utils/constants";

/* ---------- Sidebar ---------- */
export function Sidebar({ app, page, go, mobile, onNavigate }: {
  app: AppData; page: Page; go: (p: Page) => void; mobile?: boolean; onNavigate?: () => void;
}) {
  const { level, totalXP } = app;
  return (
    <aside
      className={`${mobile ? "flex" : "hidden lg:flex"} flex-col gap-1 p-4 shrink-0 cm-glass cm-safe-top`}
      style={{
        width: 236,
        borderRight: mobile ? "none" : "1px solid var(--border)",
        height: "100%",
      }}
    >
      <div className="flex items-center gap-2.5 px-2 pb-5">
        <CommitMark size={34} />
        <span className="cm-display text-lg font-extrabold t-text">{APP_NAME}</span>
      </div>

      {NAV.map(({ id, label, icon: Icon, soon }) => (
        <button
          key={id}
          className={`cm-nav ${page === id ? "cm-nav-on" : ""}`}
          onClick={() => { go(id); onNavigate?.(); }}
        >
          <Icon size={17} className="cm-nav-ico shrink-0" />
          <span className="flex-1 text-left">{label}</span>
          {soon && <Lock size={12} className="t-faint" />}
        </button>
      ))}

      <div className="mt-auto cm-card p-3.5" style={{ borderRadius: 16 }}>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold t-text">Level {level.level}</span>
          <span className="t-muted">{totalXP.toLocaleString()} XP</span>
        </div>
        <ProgressBar value={level.progress * 100} height={6} />
        <div className="text-xs t-faint mt-1.5">{level.needed - level.intoLevel} XP to next level</div>
      </div>
    </aside>
  );
}

/* ---------- Topbar (global search, streak, XP, theme, new task) ---------- */
export function Topbar({ app, go, onOpenSidebar }: {
  app: AppData; go: (p: Page) => void; onOpenSidebar: () => void;
}) {
  const { tasks, projects, goals, streak, xpToday, settings, setTheme, openNewTask, openEditTask } = app;
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    if (!q.trim()) return null;
    const needle = q.toLowerCase();
    const match = (s?: string | null) => (s || "").toLowerCase().includes(needle);
    return {
      tasks: tasks.filter((x) => match(x.title) || match(x.notes) || x.tags.some(match)).slice(0, 5),
      projects: projects.filter((p) => match(p.name)).slice(0, 3),
      goals: goals.filter((g) => match(g.name) || match(g.description)).slice(0, 3),
    };
  }, [q, tasks, projects, goals]);

  const empty = results && results.tasks.length + results.projects.length + results.goals.length === 0;

  return (
    <header
      className="cm-glass flex items-center gap-3 px-4 md:px-6 py-3 shrink-0 cm-safe-top"
      style={{ borderBottom: "1px solid var(--border)", zIndex: 40 }}
    >
      <button className="lg:hidden t-muted" onClick={onOpenSidebar} aria-label="Open menu"><Menu size={20} /></button>

      <div className="relative flex-1 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 t-faint" />
        <input
          className="cm-input"
          style={{ paddingLeft: 34 }}
          placeholder="Search tasks, projects, goals…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {results && (
          <div
            className="absolute left-0 right-0 mt-2 cm-card p-2 flex flex-col gap-0.5 max-h-96 overflow-y-auto cm-scroll"
            style={{ zIndex: 60, background: "var(--panel-strong)" }}
          >
            {results.tasks.map((x) => (
              <button
                key={x.id}
                className="text-left px-3 py-2 rounded-lg hover:bg-[var(--brand-softer)] flex items-center gap-2 transition-colors"
                onClick={() => { openEditTask(x); setQ(""); }}
              >
                <CheckSquare size={14} className="t-brand shrink-0" />
                <span className="text-sm t-text truncate">{x.title}</span>
                <span className="text-xs t-faint ml-auto shrink-0">task</span>
              </button>
            ))}
            {results.projects.map((x) => (
              <button
                key={x.id}
                className="text-left px-3 py-2 rounded-lg hover:bg-[var(--brand-softer)] flex items-center gap-2 transition-colors"
                onClick={() => { go("projects"); setQ(""); }}
              >
                <FolderKanban size={14} className="t-brand shrink-0" />
                <span className="text-sm t-text truncate">{x.name}</span>
                <span className="text-xs t-faint ml-auto shrink-0">project</span>
              </button>
            ))}
            {results.goals.map((x) => (
              <button
                key={x.id}
                className="text-left px-3 py-2 rounded-lg hover:bg-[var(--brand-softer)] flex items-center gap-2 transition-colors"
                onClick={() => { go("goals"); setQ(""); }}
              >
                <Target size={14} className="t-brand shrink-0" />
                <span className="text-sm t-text truncate">{x.name}</span>
                <span className="text-xs t-faint ml-auto shrink-0">goal</span>
              </button>
            ))}
            {empty && <div className="text-sm t-muted px-3 py-2">No matches. Try a different word.</div>}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <span
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full"
          style={{ background: "var(--brand-soft)", color: "var(--brand)", border: "1px solid var(--border)" }}
          title={`${streak}-day streak`}
        >
          <Flame size={14} className={streak > 0 ? "cm-flame" : ""} /> {streak}
        </span>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold t-muted">
          <Zap size={14} className="t-brand" /> +{xpToday} today
        </span>
        <button
          className="cm-btn cm-btn-ghost px-2.5"
          onClick={() => setTheme(settings.theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {settings.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="cm-btn cm-btn-primary hidden md:flex" onClick={openNewTask}>
          <Plus size={15} /> New task
        </button>
      </div>
    </header>
  );
}
