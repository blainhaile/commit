/* ── Commit · authentication hook ──────────────────────────────────── */
import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isAllowed, supabase } from "@/services/supabase";

export type AuthStatus = "loading" | "signed-out" | "blocked" | "signed-in";

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  sendMagicLink: (email: string) => Promise<string>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  const blocked = Boolean(user && !isAllowed(user.email));

  const status: AuthStatus = loading
    ? "loading"
    : !user
      ? "signed-out"
      : blocked
        ? "blocked"
        : "signed-in";

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    if (!isAllowed(email)) {
      setError("This app is private. That email isn't on the allow list.");
      return;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
  }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    setError(null);
    if (!isAllowed(email)) {
      const msg = "This app is private. That email isn't on the allow list.";
      setError(msg);
      return msg;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
      return error.message;
    }
    return "";
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { status, user, error, signInWithGoogle, signInWithEmail, signUpWithEmail, sendMagicLink, signOut };
}
