"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Download, Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { type Role } from "@/lib/mock";
import { useCurrentUser } from "@/components/shell/CurrentUserProvider";
import { setForcedState, useForcedState } from "@/lib/mock-state";
import { useRole, useTheme, type ThemeChoice } from "@/lib/prefs";
import { apiFetch } from "@/lib/use-api";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextField } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Switch } from "@/components/ui/Switch";
import { ErrorReturned, LoadingSheets, StateView } from "@/components/ui/States";

function Section({ id, title, description, children, tone }: { id: string; title: string; description?: string; children: ReactNode; tone?: "danger" }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="grid scroll-mt-24 gap-4 border-t-2 border-ink/80 pt-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 id={`${id}-h`} className={cn("text-[1.25rem] font-extrabold tracking-[-0.01em]", tone === "danger" && "text-stamp")}>
          {title}
        </h2>
        {description ? <p className="mt-1 text-[0.9375rem] text-manila-ink">{description}</p> : null}
      </div>
      <div className="sheet p-5 sm:p-7">{children}</div>
    </section>
  );
}

const themes: { value: ThemeChoice; label: string; hint: string; icon: typeof Sun }[] = [
  { value: "system", label: "Match my device", hint: "Switches with your system", icon: Monitor },
  { value: "light", label: "Day desk", hint: "Manila and paper", icon: Sun },
  { value: "dark", label: "Night desk", hint: "Easier in a dim room", icon: Moon },
];

export default function SettingsPage() {
  const currentUser = useCurrentUser();
  const router = useRouter();
  // The profile arrives with the page (from the layout); ?state= still previews the other states.
  const status = useForcedState() ?? "ready";
  const retry = () => setForcedState(null);
  const [, setRole] = useRole();
  const [role, setDefaultRole] = useState<Role>(currentUser.defaultRole);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [theme, setTheme] = useTheme();
  const blank = status === "empty";
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [headline, setHeadline] = useState(currentUser.headline);
  const [profileSaved, setProfileSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(currentUser.recordingConsent);
  const [shareResume, setShareResume] = useState(currentUser.shareResumeWithMatches);
  const [discoverable, setDiscoverable] = useState(currentUser.discoverable);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"idle" | "working" | "ready">("idle");

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setProfileError(null);
    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ name, headline, preferredRole: role.toUpperCase() }),
      });
      setRole(role);
      setProfileSaved(true);
      router.refresh(); // the top bar and sidebar read the name from the layout
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Your profile didn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  /** Privacy switches save as soon as they're flipped, and flip back if saving fails. */
  function savePrivacy(field: "recordingConsent" | "shareResume" | "discoverable", set: (v: boolean) => void) {
    return async (value: boolean) => {
      set(value);
      setPrivacyError(null);
      try {
        await apiFetch("/api/profile", { method: "PATCH", body: JSON.stringify({ [field]: value }) });
        router.refresh();
      } catch {
        set(!value);
        setPrivacyError("That setting didn't save. Try again.");
      }
    };
  }

  return (
    <>
      <title>Settings · hire-me-already</title>
      <PageHeader title="Settings" description="Your profile, how the app looks, and who sees your data." />

      <StateView
        status={status === "empty" ? "ready" : status}
        loading={<LoadingSheets label="Loading your settings…" layout="form" rows={4} />}
        error={
          <ErrorReturned title="Settings didn't load" onRetry={retry}>
            Your existing settings still apply. Try again to change them.
          </ErrorReturned>
        }
        empty={null}
      >
        <div className="space-y-12">
          <Section id="profile" title="Profile" description="Shown to your practice partners and friends.">
            <form onSubmit={saveProfile} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  label="Full name"
                  autoComplete="name"
                  value={blank ? "" : name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setProfileSaved(false);
                  }}
                  hint={blank ? "Add your name so partners know who they're talking to." : undefined}
                />
                <TextField
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={blank ? "" : email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled
                  hint="Email changes aren't available yet."
                />
              </div>
              <TextField
                label="Headline"
                value={blank ? "" : headline}
                onChange={(e) => {
                  setHeadline(e.target.value);
                  setProfileSaved(false);
                }}
                hint="One line, e.g. “Product designer, 4 years”."
              />
              <SelectField
                label="Default role when you sign in"
                options={["Interviewee", "Interviewer"]}
                value={role === "interviewee" ? "Interviewee" : "Interviewer"}
                onChange={(e) => {
                  setDefaultRole(e.target.value.toLowerCase() as Role);
                  setProfileSaved(false);
                }}
                className="max-w-xs"
              />
              <div className="flex items-center justify-end gap-4 pt-1">
                {profileError ? (
                  <span role="alert" className="text-[0.875rem] font-semibold text-stamp">
                    {profileError}
                  </span>
                ) : null}
                {profileSaved ? (
                  <span role="status" className="text-[0.875rem] font-semibold text-ink">
                    Saved
                  </span>
                ) : null}
                <Button type="submit" loading={saving} loadingLabel="Saving…">
                  Save profile
                </Button>
              </div>
            </form>
          </Section>

          <Section id="appearance" title="Appearance" description="Practice at night without the glare.">
            <fieldset>
              <legend className="visually-hidden">Theme</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {themes.map((t) => {
                  const checked = theme === t.value;
                  const Icon = t.icon;
                  return (
                    <label
                      key={t.value}
                      className={cn(
                        "flex cursor-pointer flex-col gap-1 rounded-[4px] border-2 p-4 transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                        checked ? "border-ink bg-ink text-paper" : "border-edge hover:border-ink-2",
                      )}
                    >
                      <input type="radio" name="theme" className="visually-hidden" checked={checked} onChange={() => setTheme(t.value)} />
                      <Icon size={20} aria-hidden="true" />
                      <span className="mt-1 font-bold">{t.label}</span>
                      <span className={cn("text-[0.8125rem]", checked ? "opacity-80" : "text-ink-2")}>{t.hint}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </Section>

          <Section id="privacy" title="Privacy and consent" description="You can change these at any time.">
            <div className="divide-y divide-edge">
              <Switch
                label="Record my practice calls"
                description="Needed to transcribe and score interviews. Turning it off means calls still work, but you won't get an AI analysis or transcript."
                checked={recording}
                onChange={savePrivacy("recordingConsent", setRecording)}
              />
              <Switch
                label="Share my resume with matched interviewers"
                description="Interviewers see your parsed resume during the call so they can ask about your real work."
                checked={shareResume}
                onChange={savePrivacy("shareResume", setShareResume)}
              />
              <Switch
                label="Let people find me by name"
                description="You'll appear in Find people. Friends can always see you."
                checked={discoverable}
                onChange={savePrivacy("discoverable", setDiscoverable)}
              />
            </div>
            {privacyError ? (
              <p role="alert" className="mt-2 text-[0.875rem] font-semibold text-stamp">
                {privacyError}
              </p>
            ) : null}
            {!recording ? (
              <p role="status" className="mt-2 rounded-[3px] bg-stamp-wash p-3 text-[0.875rem]">
                Recording is off. New interviews won&apos;t be scored or transcribed.
              </p>
            ) : null}
          </Section>

          <Section id="data" title="Your data" description="Export everything, or delete it for good." tone="danger">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Download my data</p>
                  <p className="text-[0.875rem] text-ink-2">Your resume, transcripts, scores and feedback as a zip file.</p>
                </div>
                <Button
                  variant="secondary"
                  icon={<Download size={16} aria-hidden="true" />}
                  loading={exporting === "working"}
                  loadingLabel="Preparing…"
                  onClick={() => {
                    setExporting("working");
                    window.setTimeout(() => setExporting("ready"), 1200);
                  }}
                >
                  {exporting === "ready" ? "Download ready" : "Request export"}
                </Button>
              </div>
              <div className="flex flex-col gap-3 border-t border-edge pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Delete account and data</p>
                  <p className="text-[0.875rem] text-ink-2">
                    Permanently deletes your account, resume, recordings, transcripts and scores. This can&apos;t be undone.
                  </p>
                </div>
                <Button variant="danger-outline" icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => setDeleteOpen(true)}>
                  Delete account
                </Button>
              </div>
            </div>
          </Section>
        </div>
      </StateView>

      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setConfirmText("");
        }}
        tone="danger"
        title="Delete your account?"
        description="Your account, resume, every recording, transcript, score and piece of feedback will be deleted permanently. Partners keep only the feedback they wrote about you."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (confirmText !== "DELETE") return;
            setDeleting(true);
            setDeleteError(null);
            try {
              await apiFetch("/api/account", { method: "DELETE" });
              router.push("/signup");
            } catch (err) {
              setDeleting(false);
              setDeleteError(
                err instanceof Error ? err.message : "Your account wasn't deleted. Try again.",
              );
            }
          }}
          className="space-y-5"
        >
          <TextField
            label={
              <>
                Type <span className="font-extrabold">DELETE</span> to confirm
              </>
            }
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
          />
          <div className="flex flex-wrap items-center justify-end gap-3">
            {deleteError ? (
              <span role="alert" className="text-[0.875rem] font-semibold text-stamp">
                {deleteError}
              </span>
            ) : null}
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteOpen(false);
                setConfirmText("");
                setDeleteError(null);
              }}
            >
              Keep my account
            </Button>
            <Button type="submit" variant="danger" disabled={confirmText !== "DELETE"} loading={deleting} loadingLabel="Deleting…">
              Delete everything
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
