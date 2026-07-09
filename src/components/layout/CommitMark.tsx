/* ── Commit · brand mark ────────────────────────────────────────────── */
import React from "react";

/** Brushed-metal app mark: a "C" resolving into a forward check. */
export function CommitMark({ size = 34 }: { size?: number }) {
  return (
    <span
      className="cm-metal inline-flex items-center justify-center rounded-2xl shrink-0"
      style={{ width: size, height: size, borderRadius: size * 0.3 }}
      aria-hidden
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <path
          d="M17.5 6.6A7 7 0 1 0 18.9 14"
          stroke="rgba(255,255,255,.92)" strokeWidth="2.6" strokeLinecap="round"
        />
        <path
          d="M10.4 11.8l2.5 2.5 6.3-6.3"
          stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
