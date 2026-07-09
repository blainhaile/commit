/* ── Commit · XP & level curve ──────────────────────────────────────── */
import type { Difficulty, LevelInfo } from "@/types";

export const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  Easy: 10, Medium: 25, Hard: 50, Epic: 100,
};

/** Level n requires 200 + (n-1)*150 XP. Returns level + progress within it. */
export function levelFromXP(totalXP: number): LevelInfo {
  let level = 1;
  let rem = totalXP;
  let needed = 200;
  while (rem >= needed) {
    rem -= needed;
    level += 1;
    needed = 200 + (level - 1) * 150;
  }
  return { level, intoLevel: rem, needed, progress: rem / needed };
}
