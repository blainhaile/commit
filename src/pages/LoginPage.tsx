/* ── Commit · Login ─────────────────────────────────────────────────── */
import React, { useState } from "react";
import { ArrowRight, KeyRound, Mail, ShieldAlert, Sparkles } from "lucide-react";
import type { AuthState } from "@/hooks/useAuth";
import { Spinner } from "@/components/ui";
import { APP_NAME, APP_TAGLINE } from "@/utils/constants";
import { supabaseConfigured } from "@/services/supabase";
import { CommitMark } from "@/components/layout/CommitMark";

export function LoginPage({ auth }: { auth: AuthState }) {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
    setBusy(true);
    if (mode === "password") {
      await auth.signInWithEmail(email.trim(), password);
    } else {
      const err = await auth.sendMagicLink(email.trim());
      if (!err) setMagicSent(true);
    }
    setBusy(false);
  };

  return (
    <div className="cm-root cm-light min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-5" style={{ animation: "cmFadeUp .5s cubic-bezier(.22,1,.36,1) both" }}>
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 text-center">
          <CommitMark size={54} />
          <div>
            <h1 className="cm-display text-3xl font-extrabold t-text">{APP_NAME}</h1>
            <p className="text-sm t-muted mt-1">{APP_TAGLINE}</p>
          </div>
        </div>

        <div className="cm-card p-6 flex flex-col gap-4" style={{ background: "var(--panel-strong)" }}>
          {!supabaseConfigured && (
            <div className="cm-inset p-3 text-xs t-muted flex gap-2">
              <ShieldAlert size={15} className="t-brand shrink-0 mt-0.5" />
              <span>
                Supabase isn't configured yet. Copy <code>.env.example</code> to <code>.env</code>, add your project URL
                and anon key, then restart the dev server.
              </span>
            </div>
          )}

          {auth.status === "blocked" ? (
            <div className="flex flex-col items-center gap-3 text-center py-2">
              <span className="cm-inset inline-flex items-center justify-center rounded-2xl" style={{ width: 48, height: 48, color: "var(--bad)" }}>
                <ShieldAlert size={22} />
              </span>
              <div>
                <div className="font-bold t-text text-sm">This workspace is private</div>
                <div className="text-xs t-muted mt-1">
                  {auth.user?.email} isn't on the allow list. Only the owner's account can access Commit.
                </div>
              </div>
              <button className="cm-btn cm-btn-ghost" onClick={auth.signOut}>Use a different account</button>
            </div>
          ) : (
            <>
              {/* Google */}
              <button className="cm-btn cm-btn-primary w-full py-2.5" onClick={auth.signInWithGoogle} disabled={busy}>
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#fff" d="M21.35 11.1H12v2.9h5.35c-.5 2.5-2.6 3.9-5.35 3.9a6 6 0 1 1 0-12c1.5 0 2.9.55 3.95 1.55l2.15-2.15A8.96 8.96 0 0 0 12 3a9 9 0 1 0 0 18c5.2 0 8.65-3.65 8.65-8.8 0-.4-.1-.75-.3-1.1Z" />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 text-xs t-faint">
                <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
                or with email
                <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
              </div>

              {magicSent ? (
                <div className="cm-inset p-4 text-center flex flex-col items-center gap-2">
                  <Sparkles size={18} className="t-brand" />
                  <div className="text-sm font-semibold t-text">Check your inbox</div>
                  <div className="text-xs t-muted">We sent a sign-in link to {email}.</div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 t-faint" />
                    <input
                      className="cm-input" style={{ paddingLeft: 34 }}
                      type="email" placeholder="you@example.com" autoComplete="email"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submit()}
                    />
                  </div>
                  {mode === "password" && (
                    <div className="relative">
                      <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 t-faint" />
                      <input
                        className="cm-input" style={{ paddingLeft: 34 }}
                        type="password" placeholder="Password" autoComplete="current-password"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submit()}
                      />
                    </div>
                  )}
                  {auth.error && <div className="text-xs" style={{ color: "var(--bad)" }}>{auth.error}</div>}
                  <button className="cm-btn cm-btn-soft w-full py-2.5" onClick={submit} disabled={busy || !email.trim()}>
                    {busy ? <Spinner size={15} /> : <>{mode === "password" ? "Sign in" : "Email me a sign-in link"} <ArrowRight size={14} /></>}
                  </button>
                  <div className="flex items-center justify-between text-xs">
                    <button className="t-brand font-semibold" onClick={() => setMode(mode === "password" ? "magic" : "password")}>
                      {mode === "password" ? "Use a magic link instead" : "Use a password instead"}
                    </button>
                    {mode === "password" && (
                      <button
                        className="t-muted hover:t-text"
                        onClick={async () => {
                          if (!email.trim() || !password) return;
                          setBusy(true);
                          await auth.signUpWithEmail(email.trim(), password);
                          setBusy(false);
                        }}
                      >
                        First time? Create the account
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <p className="text-xs t-faint text-center">Private, single-user workspace. Only the allow-listed account can enter.</p>
      </div>
    </div>
  );
}
