/* ── Commit · UI primitives ─────────────────────────────────────────────
   Small, reusable building blocks that define the design language:
   glass cards, metallic fills, calm motion.                            */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronRight, Sparkles, Target, Trophy, X, Zap } from "lucide-react";
import type { Difficulty, Priority } from "@/types";
import { DIFF_COLOR, PRIORITY_COLOR } from "@/utils/constants";
import type { AppToast, ToastKind } from "@/hooks/useAppData";
import { clamp } from "@/utils/date";

/* ---------- Progress bar (animated metallic fill) ---------- */
export function ProgressBar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  return (
    <div className="cm-track w-full" style={{ height }}>
      <div
        className="cm-fill"
        style={{
          width: `${clamp(value, 0, 100)}%`,
          ...(color ? { background: `linear-gradient(90deg, ${color}, ${color}CC)` } : {}),
        }}
      />
    </div>
  );
}

/* ---------- Circular progress ring ---------- */
let ringSeq = 0;
export function Ring({ value, size = 170, stroke = 13, children }: {
  value: number; size?: number; stroke?: number; children?: React.ReactNode;
}) {
  const gradId = useMemo(() => `cmRing${++ringSeq}`, []);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - clamp(value, 0, 100) / 100);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7091E6" />
            <stop offset="100%" stopColor="#3D52A0" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={`url(#${gradId})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ ["--full" as string]: `${c}`, animation: "cmRing 1.2s cubic-bezier(.22,1,.36,1)", transition: "stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/* ---------- Tiny colored dot ---------- */
export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, background: color, boxShadow: `0 0 0 3px ${color}22` }}
    />
  );
}

/* ---------- Badges ---------- */
export function PriorityBadge({ p }: { p: Priority }) {
  const c = PRIORITY_COLOR[p];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ color: c, background: `${c}14`, border: `1px solid ${c}2E` }}
    >
      <Dot color={c} size={5} /> {p}
    </span>
  );
}

export function DiffBadge({ d }: { d: Difficulty }) {
  const c = DIFF_COLOR[d];
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ color: c, background: `${c}12`, border: `1px solid ${c}2A` }}
    >
      <Zap size={10} /> {d}
    </span>
  );
}

/* ---------- Round check button ---------- */
export function CheckButton({ on, onClick, title }: { on: boolean; onClick: (e: React.MouseEvent) => void; title?: string }) {
  return (
    <button
      className={`cm-check ${on ? "on" : ""}`}
      onClick={onClick}
      title={title ?? (on ? "Mark incomplete" : "Mark complete")}
      aria-pressed={on}
    >
      <Check size={13} strokeWidth={3} />
    </button>
  );
}

/* ---------- Toggle switch ---------- */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`cm-switch ${on ? "on" : ""}`}
      onClick={() => onChange(!on)}
    />
  );
}

/* ---------- Confetti (restrained, brand-toned) ---------- */
const CONFETTI_COLORS = ["#3D52A0", "#7091E6", "#8697C4", "#ADBBDA", "#8A5CB8", "#FFFFFF"];
export function Confetti({ burst }: { burst: number }) {
  if (!burst) return null;
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 100 }}>
      {Array.from({ length: 80 }, (_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.7;
        const dur = 2.2 + Math.random() * 1.4;
        const size = 5 + Math.random() * 6;
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const round = Math.random() > 0.5;
        return (
          <span
            key={`${burst}_${i}`}
            className="absolute top-0"
            style={{
              left: `${left}%`,
              width: size,
              height: round ? size : size * 1.8,
              background: color,
              borderRadius: round ? 999 : 2,
              opacity: 0.9,
              boxShadow: `0 0 8px ${color}55`,
              animation: `cmConfetti ${dur}s cubic-bezier(.3,.6,.5,1) ${delay}s both`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ---------- Toasts ---------- */
const TOAST_ICON: Record<ToastKind, React.ReactNode> = {
  xp: <Zap size={15} />,
  level: <Trophy size={15} />,
  goal: <Target size={15} />,
  date: <CalendarDays size={15} />,
  info: <Sparkles size={15} />,
};
export function Toasts({ toasts }: { toasts: AppToast[] }) {
  return (
    <div className="fixed bottom-5 right-5 flex flex-col gap-2.5" style={{ zIndex: 110 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="cm-card cm-glass flex items-start gap-3 px-4 py-3 max-w-xs"
          style={{ animation: "cmToastIn .4s cubic-bezier(.22,1.3,.36,1) both", borderRadius: 14 }}
        >
          <span
            className="cm-metal inline-flex items-center justify-center rounded-xl shrink-0 text-white"
            style={{ width: 30, height: 30 }}
          >
            {TOAST_ICON[t.kind]}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold t-text truncate">{t.title}</div>
            {t.sub && <div className="text-xs t-muted mt-0.5">{t.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ zIndex: 90, background: "rgba(28,35,64,.35)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className={`cm-card cm-glass w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[92vh] overflow-y-auto cm-scroll`}
        style={{
          background: "var(--panel-strong)",
          borderRadius: "22px 22px 0 0",
          animation: "cmToastIn .35s cubic-bezier(.22,1.2,.36,1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="cm-glass flex items-center justify-between px-5 py-4 sticky top-0"
          style={{ borderBottom: "1px solid var(--border)", zIndex: 2, background: "var(--panel-strong)", borderRadius: "22px 22px 0 0" }}
        >
          <h3 className="cm-display text-base font-bold t-text">{title}</h3>
          <button className="cm-btn cm-btn-ghost px-2 py-1.5" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Labeled form field ---------- */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide t-faint">{label}</span>
      {children}
    </label>
  );
}

/* ---------- Stat card ---------- */
export function Stat({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode;
}) {
  return (
    <div className="cm-card cm-card-hover p-4 flex items-start gap-3">
      <span className="cm-metal inline-flex items-center justify-center rounded-xl text-white shrink-0" style={{ width: 34, height: 34 }}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xs t-faint font-medium">{label}</div>
        <div className="cm-display text-lg font-bold t-text leading-tight truncate">{value}</div>
        {sub && <div className="text-xs t-muted mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon, title, blurb, action }: {
  icon: React.ReactNode; title: string; blurb: string; action?: React.ReactNode;
}) {
  return (
    <div className="cm-card flex flex-col items-center justify-center text-center gap-3 px-6 py-12">
      <span className="cm-inset inline-flex items-center justify-center rounded-2xl t-brand" style={{ width: 52, height: 52 }}>
        {icon}
      </span>
      <div>
        <div className="cm-display text-base font-bold t-text">{title}</div>
        <div className="text-sm t-muted mt-1 max-w-sm">{blurb}</div>
      </div>
      {action}
    </div>
  );
}

/* ---------- Collapsible section (e.g. a "Completed" bucket) ---------- */
export function CollapsibleSection({ label, count, defaultOpen = false, children }: {
  label: string; count: number; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <div className="flex flex-col gap-3" style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 2 }}>
      <button
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide t-faint hover:text-[var(--brand)] transition-colors self-start"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {label} ({count})
      </button>
      {open && children}
    </div>
  );
}

/* ---------- Loading pieces ---------- */
export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="cm-spin inline-block rounded-full"
      style={{ width: size, height: size, border: "2.5px solid var(--track)", borderTopColor: "var(--brand)" }}
    />
  );
}

export function SkeletonCard({ height = 96 }: { height?: number }) {
  return <div className="cm-skeleton w-full" style={{ height, borderRadius: 18 }} />;
}

/* ---------- Count-up number (micro-interaction) ---------- */
export function CountUp({ value, duration = 700 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display.toLocaleString()}</>;
}
