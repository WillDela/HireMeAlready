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
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isSignup = mode === "signup";
  const loading = busy || forced === "loading";
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

        <Button type="submit" size="lg" className="w-full" loading={loading} loadingLabel={isSignup ? "Creating account…" : "Signing in…"} disabled={loading}>
          {isSignup ? "Create account" : "Sign in"}
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

/** Only same-origin paths, so ?next= can't send someone to another site. */
function safeRedirect(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;
}
