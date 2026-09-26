"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useForcedState } from "@/lib/mock-state";
import { Button } from "@/components/ui/Button";
import { CheckboxField, TextField } from "@/components/ui/Field";
import { Stamp } from "@/components/ui/Stamp";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** Shared email/password form for /login and /signup. */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const forced = useForcedState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const isSignup = mode === "signup";
  const loading = busy !== null || forced === "loading";
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
    consent: submitted && !consent ? "Practice calls are recorded to score them, so this is required." : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  function go(kind: "email" | "google") {
    setServerError(null);
    setBusy(kind);
    window.setTimeout(() => router.push(isSignup ? "/onboarding" : "/dashboard"), 900);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const invalid =
      (isSignup && !name.trim()) || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || !consent;
    if (invalid) return;
    go("email");
  }

  function onGoogle() {
    setSubmitted(true);
    if (!consent) return;
    go("google");
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

        <Button type="submit" size="lg" className="w-full" loading={busy === "email" || forced === "loading"} loadingLabel={isSignup ? "Creating account…" : "Signing in…"} disabled={loading}>
          {isSignup ? "Create account" : "Sign in"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-4 text-[0.8125rem] font-semibold text-ink-3" aria-hidden="true">
        <span className="h-px flex-1 bg-edge" />
        or
        <span className="h-px flex-1 bg-edge" />
      </div>

      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={onGoogle}
        loading={busy === "google"}
        loadingLabel="Opening Google…"
        disabled={loading}
        icon={<GoogleMark />}
      >
        Continue with Google
      </Button>
      <p className="mt-2 text-center text-[0.8125rem] text-ink-2">Google sign-in also needs the recording agreement above.</p>

      <p className="mt-8 text-center text-[0.9375rem] text-ink-2">
        {isSignup ? "Already have an account? " : "New here? "}
        <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-ink underline">
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
