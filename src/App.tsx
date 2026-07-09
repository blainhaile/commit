/* ── Commit · app root ──────────────────────────────────────────────────
   Auth gate → data boot → shell (sidebar / topbar / pages / modals).   */
import React, { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { PiggyBank, Plus, Repeat } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppData } from "@/hooks/useAppData";
import { NAV, type Page } from "@/components/layout/nav";
import { Sidebar, Topbar } from "@/components/layout";
import { CommitMark } from "@/components/layout/CommitMark";
import { Confetti, SkeletonCard, Spinner, Toasts } from "@/components/ui";
import { TaskModal } from "@/components/tasks";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { TasksPage } from "@/pages/TasksPage";
import { CalendarPage } from "@/pages/CalendarPage";
import {
  CategoriesPage, CategoryModal, GoalModal, GoalsPage, ProjectModal, ProjectsPage,
} from "@/pages/CollectionsPages";
import { AnalyticsPage, LockedPage, SettingsPage } from "@/pages/SystemPages";
import { APP_NAME, APP_TAGLINE } from "@/utils/constants";

export default function App() {
  const auth = useAuth();

  if (auth.status === "loading") {
    return (
      <div className="cm-root cm-light min-h-screen flex flex-col items-center justify-center gap-4">
        <CommitMark size={52} />
        <Spinner size={22} />
      </div>
    );
  }

  if (auth.status !== "signed-in") return <LoginPage auth={auth} />;

  return <Shell user={auth.user!} onSignOut={auth.signOut} />;
}

function Shell({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  const app = useAppData(user);
  const [page, setPage] = useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* Keep <html> theme + PWA theme-color in sync */
  useEffect(() => {
    document.title = `${APP_NAME} — ${APP_TAGLINE.replace(/\.$/, "")}`;
  }, []);

  /* "New task" PWA shortcut (?action=new-task) */
  useEffect(() => {
    if (!app.booted) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "new-task") {
      app.openNewTask();
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.booted]);

  const go = (p: Page) => setPage(p);
  const theme = app.settings.theme;

  if (!app.booted) {
    return (
      <div className={`cm-root ${theme === "dark" ? "cm-dark" : "cm-light"} min-h-screen p-6`}>
        <div className="max-w-6xl mx-auto flex flex-col gap-4 pt-10">
          <div className="flex items-center gap-3">
            <CommitMark size={38} />
            <span className="cm-display text-lg font-extrabold t-text">{APP_NAME}</span>
            <span className="text-xs t-muted ml-2">Syncing your workspace…</span>
          </div>
          <SkeletonCard height={168} />
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} height={78} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SkeletonCard height={220} />
            <SkeletonCard height={220} />
          </div>
        </div>
      </div>
    );
  }

  const pages: Record<Page, React.ReactNode> = {
    dashboard: <DashboardPage app={app} go={go} />,
    calendar: <CalendarPage app={app} />,
    tasks: <TasksPage app={app} />,
    projects: <ProjectsPage app={app} />,
    goals: <GoalsPage app={app} />,
    categories: <CategoriesPage app={app} />,
    analytics: <AnalyticsPage app={app} />,
    settings: <SettingsPage app={app} onSignOut={onSignOut} />,
    habits: (
      <LockedPage
        title="Habits"
        icon={<Repeat size={28} />}
        blurb="Daily habit chains with their own streaks and XP multipliers. The task engine underneath is ready — this view ships next."
      />
    ),
    savings: (
      <LockedPage
        title="Savings Tracker"
        icon={<PiggyBank size={28} />}
        blurb="Virtual envelopes — Emergency Fund, Travel, Rent, Conferences — each with a target, monthly contribution, and projected completion. Architecture is in place; no bank connection required."
      />
    ),
  };

  return (
    <div className={`cm-root ${theme === "dark" ? "cm-dark" : "cm-light"} h-screen w-full flex overflow-hidden`}>
      <Confetti burst={app.burst} />
      <Toasts toasts={app.toasts} />

      <Sidebar app={app} page={page} go={go} />
      {sidebarOpen && (
        <div
          className="fixed inset-0 lg:hidden"
          style={{ zIndex: 70, background: "rgba(28,35,64,.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setSidebarOpen(false)}
        >
          <div className="h-full" style={{ width: 236, background: "var(--bg)" }} onClick={(e) => e.stopPropagation()}>
            <Sidebar app={app} page={page} go={go} mobile onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar app={app} go={go} onOpenSidebar={() => setSidebarOpen(true)} />

        {app.loadError && (
          <div className="px-4 md:px-6 pt-3">
            <div className="cm-card p-3 text-xs" style={{ color: "var(--bad)" }}>
              Couldn't reach Supabase ({app.loadError}). Changes made now may not be saved — check your connection and
              the keys in <code>.env</code>, then reload.
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto cm-scroll p-4 md:p-6 cm-safe-bottom" key={page}>
          <div className="max-w-6xl mx-auto">{pages[page]}</div>
        </main>
      </div>

      {/* Floating add on mobile */}
      <button
        className="md:hidden fixed bottom-5 right-5 cm-btn cm-btn-primary rounded-full p-0 flex items-center justify-center"
        style={{ width: 54, height: 54, zIndex: 50, borderRadius: 999 }}
        onClick={app.openNewTask}
        aria-label="New task"
      >
        <Plus size={22} />
      </button>

      {app.editorTask !== null && <TaskModal key={app.editorTask.id ?? "new"} app={app} />}
      {app.editorProject !== null && <ProjectModal key={app.editorProject.id ?? "new"} app={app} />}
      {app.editorGoal !== null && <GoalModal key={app.editorGoal.id ?? "new"} app={app} />}
      {app.editorCategory !== null && <CategoryModal key={app.editorCategory.id ?? "new"} app={app} />}
    </div>
  );
}
