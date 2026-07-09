/* ── Commit · Supabase client ───────────────────────────────────────── */
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabaseConfigured = Boolean(url && anonKey && !url.includes("YOUR-PROJECT-REF"));

export const supabase = createClient(url ?? "http://localhost", anonKey ?? "anon", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Emails allowed to use this app (single-user lock). Comma-separated env. */
export const allowedEmails: string[] = (import.meta.env.VITE_ALLOWED_EMAIL ?? "")
  .split(",")
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

export const isAllowed = (email?: string | null) =>
  allowedEmails.length === 0 ? true : Boolean(email && allowedEmails.includes(email.toLowerCase()));
