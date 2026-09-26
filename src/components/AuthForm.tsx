"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";
import { useForcedState } from "@/lib/mock-state";
import { Button } from "@/components/ui/Button";
import { CheckboxField, TextField } from "@/components/ui/Field";
import { Stamp } from "@/components/ui/Stamp";

/** Shared email/password + Google form for /login and /signup. */
export function AuthForm({ mode, oauthError }: { mode: "login" | "signup"; oauthError?: string }) {
  const router = useRouter();
  const forced = useForcedState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [googleTried, setGoogleTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(() => oauthErrorMessage(oauthError));

  const isSignup = mode === "signup";
  const loading = busy || googleBusy || forced === "loading";
  const authError =
    forced === "error"
      ? isSignup
        ? "We couldn't create your account right now. Nothing was saved; try again in a minute."
        : "That email and password don't match an account. Check for typos or reset your password."
      : serverError;

  const errors = {
    name: isSignup && submitted && !name.trim() ? "Enter your name so partners know who they're talking to." : null,
    email: submitted && !/^\S+@\S+\.\S+$/.test(email) ? "Enter an email address like name@example.com." : null,
    password:
      submitted && password.length < 8 ? "Use at least 8 characters." : null,
    consent: (submitted || googleTried) && !consent ? "Practice calls are recorded to score them, so this is required." : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  async function submit() {
    setServerError(null);
    setBusy(true);
    const { error } = isSignup
      ? await signUp.email({ name: name.trim(), email, password })
      : await signIn.email({ email, password });
    if (error) {
      setBusy(false);
      setServerError(error.message ?? "Something went wrong. Try again in a minute.");
      return;
    }
    // Read at submit time rather than via useSearchParams, which would need a Suspense boundary.
    const next = safeRedirect(new URLSearchParams(window.location.search).get("next"));
    router.push(next ?? (isSignup ? "/onboarding" : "/dashboard"));
    router.refresh();
  }

  async function continueWithGoogle() {
    setGoogleTried(true);
    if (!consent) return;
    setServerError(null);
    setGoogleBusy(true);
    const next = safeRedirect(new URLSearchParams(window.location.search).get("next"));
    // Google sends failures back here with ?error=, keeping ?next= for the retry.
    const errorCallbackURL = next ? `/${mode}?next=${encodeURIComponent(next)}` : `/${mode}`;
    // Like the email form, /signup always lands on onboarding. Don't rely on Better Auth's
    // new-user check alone: a Google email that already has an account links to it
    // instead of creating a user, so newUserCallbackURL never fires.
    const { error } = await signIn.social({
      provider: "google",
      callbackURL: next ?? (isSignup ? "/onboarding" : "/dashboard"),
      newUserCallbackURL: next ?? "/onboarding",
      errorCallbackURL,
    });
    // On success the browser is already navigating to Google, so leave the spinner up.
    if (error) {
      setGoogleBusy(false);
      setServerError(error.message ?? "We couldn't reach Google. Try again in a minute.");
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const invalid =
      (isSignup && !name.trim()) || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || !consent;
    if (invalid) return;
    submit();
  }

  return (
    <div>
      <h1 className="wide text-[2rem] leading-[1.05] font-extrabold tracking-[-0.025em]">
        {isSignup ? "Open your file" : "Welcome back"}
      </h1>
      <p className="mt-2 text-ink-2">
        {isSignup ? "Two minutes to set up, then your first practice interview." : "Pick up where your last interview left off."}
      </p>

      {authError ? (
        <div role="alert" className="mt-6 flex items-start gap-3 rounded-[3px] bg-stamp-wash p-4">
          <Stamp tone="stamp" rotate={-6} land className="flex-none text-[0.75rem]">
            Returned
          </Stamp>
          <p className="text-[0.9375rem]">{authError}</p>
        </div>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="mt-7 space-y-5">
        {isSignup ? (
          <TextField
            label="Full name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            disabled={loading}
          />
        ) : null}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          disabled={loading}
        />
        <div className="relative">
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            hint={isSignup ? "At least 8 characters." : undefined}
            disabled={loading}
            className="[&_input]:pr-12"
          />
          <button
            type="button"
            className="icon-btn absolute top-[1.9rem] right-1"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
        {!isSignup ? (
          <p className="-mt-2 text-right text-[0.875rem]">
            <Link href="/login" className="font-semibold text-ink-2 underline hover:text-ink">
              Forgot password?
            </Link>
          </p>
        ) : null}

        <CheckboxField
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          error={errors.consent}
          required
          disabled={loading}
          label={
            <>
              I agree that my practice calls are <strong>recorded and transcribed</strong> to score them and give me feedback.{" "}
              <Link href="/settings#privacy" className="underline">
                How recordings are used
              </Link>
            </>
          }
        />

        {hasErrors ? (
          <p className="visually-hidden" role="alert">
            Some fields need attention.
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" loading={busy || forced === "loading"} loadingLabel={isSignup ? "Creating account…" : "Signing in…"} disabled={loading}>
          {isSignup ? "Create account" : "Sign in"}
        </Button>

        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-rule" />
          <span className="cond text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">or</span>
          <span className="h-px flex-1 bg-rule" />
        </div>

        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={continueWithGoogle}
          loading={googleBusy}
          loadingLabel="Opening Google…"
          disabled={loading}
          icon={<GoogleMark />}
        >
          Continue with Google
        </Button>
      </form>

      <p className="mt-8 text-center text-[0.9375rem] text-ink-2">
        {isSignup ? "Already have an account? " : "New here? "}
        <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-ink underline">
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}

/** Better Auth appends ?error=<code> to errorCallbackURL when the Google round trip fails. */
function oauthErrorMessage(code: string | undefined) {
  if (!code) return null;
  if (code === "access_denied") return "Google sign-in was cancelled. Nothing was saved.";
  if (code === "account_not_linked")
    return "That email already has an account here. Sign in with your password instead.";
  return "We couldn't sign you in with Google. Try again in a minute.";
}

/** Google's "G" mark, kept in its brand colors per Google's sign-in guidelines. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** Only same-origin paths, so ?next= can't send someone to another site. */
function safeRedirect(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;
}
