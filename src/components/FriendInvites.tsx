"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { InvitationsResponse, InviteView } from "@/lib/contracts";
import { apiFetch, ApiError, useApiResource } from "@/lib/use-api";
import { timeAgo } from "@/lib/views";
import { Avatar } from "@/components/ui/Avatar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyFolder, ErrorReturned, LoadingSheets, StateView } from "@/components/ui/States";

function InviteRow({ invite, failed, children }: { invite: InviteView; failed: string | null; children: ReactNode }) {
  const { person } = invite;
  const place = [invite.jobTitle, invite.company].filter(Boolean).join(" · ");
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-3.5">
        <Avatar name={person.name} initials={person.initials} size={44} />
        <div className="min-w-0">
          <p className="font-bold">
            {person.name}{" "}
            <span className="font-normal text-ink-2">
              {invite.yourRole === "INTERVIEWER" ? "· you interview them" : "· they interview you"}
            </span>
          </p>
          <p className="text-[0.875rem] text-ink-2">
            {place ? `${place} · ` : ""}
            {timeAgo(new Date(invite.sentAt))}
          </p>
          {failed ? (
            <p role="alert" className="text-[0.8125rem] font-semibold text-stamp">
              {failed}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-[3.625rem] sm:pl-0">{children}</div>
    </li>
  );
}

/** The Practice page's invites from friends, plus the ones you've sent. Notifications link to #invitations. */
export function FriendInvites() {
  const router = useRouter();
  // Polled so new invites, and answers to yours, show up without a reload.
  const { status, data, retry, reload, mutate } = useApiResource<InvitationsResponse>("/api/invitations", {
    isEmpty: (d) => d.incoming.length === 0 && d.outgoing.length === 0,
    pollWhile: () => true,
    pollMs: 8000,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ id: string; message: string } | null>(null);
  const incoming = data?.incoming ?? [];
  const outgoing = data?.outgoing ?? [];

  async function act(inviteId: string, fn: () => Promise<void>) {
    setBusy(inviteId);
    setFailed(null);
    try {
      await fn();
    } catch (err) {
      setFailed({ id: inviteId, message: err instanceof ApiError ? err.message : "That didn't go through. Try again." });
      reload();
    } finally {
      setBusy(null);
    }
  }

  const respond = (invite: InviteView, decision: "ACCEPTED" | "DECLINED") =>
    act(invite.id, async () => {
      const next = await apiFetch<InvitationsResponse & { interviewId: string }>(`/api/invitations/${invite.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: decision }),
      });
      mutate(next);
      if (decision === "ACCEPTED") router.push(`/call/${next.interviewId}/lobby`);
    });

  const cancel = (invite: InviteView) =>
    act(invite.id, async () => {
      mutate(await apiFetch<InvitationsResponse>(`/api/invitations/${invite.id}`, { method: "DELETE" }));
    });

  const failedFor = (id: string) => (failed?.id === id ? failed.message : null);

  return (
    <section id="invitations" aria-labelledby="inv-heading" className="mt-14 scroll-mt-6">
      <h2 id="inv-heading" className="text-[1.375rem] font-extrabold tracking-[-0.01em]">
        Invitations from friends
      </h2>
      <p className="mt-1 text-[0.9375rem] text-manila-ink">
        Practice with a friend without waiting for a match. Invite one from the Friends page.
      </p>
      <div className="mt-5">
        <StateView
          status={status}
          loading={<LoadingSheets label="Checking for invitations…" rows={2} />}
          error={
            <ErrorReturned compact title="Invitations didn't load" onRetry={retry}>
              Your friends&apos; invites are still waiting; we just couldn&apos;t fetch them.
            </ErrorReturned>
          }
          empty={
            <div className="sheet">
              <EmptyFolder compact title="No invitations right now" action={<ButtonLink href="/friends" variant="secondary" size="sm">Invite a friend</ButtonLink>}>
                When a friend invites you to a practice interview, it shows up here.
              </EmptyFolder>
            </div>
          }
        >
          <div className="sheet">
            {incoming.length ? (
              <ul className="divide-y divide-edge" aria-label="Invitations you received">
                {incoming.map((inv) =>
                  inv.status === "ACCEPTED" ? (
                    <InviteRow key={inv.id} invite={inv} failed={failedFor(inv.id)}>
                      <ButtonLink href={`/call/${inv.interviewId}/lobby`} size="sm">
                        Back to the lobby
                      </ButtonLink>
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={busy === inv.id}
                        aria-label={`Call off the interview with ${inv.person.name}`}
                        onClick={() => cancel(inv)}
                      >
                        Call it off
                      </Button>
                    </InviteRow>
                  ) : (
                    <InviteRow key={inv.id} invite={inv} failed={failedFor(inv.id)}>
                      <Button size="sm" loading={busy === inv.id} disabled={busy !== null} onClick={() => respond(inv, "ACCEPTED")}>
                        Accept and go to lobby
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy !== null}
                        aria-label={`Decline invitation from ${inv.person.name}`}
                        onClick={() => respond(inv, "DECLINED")}
                      >
                        Decline
                      </Button>
                    </InviteRow>
                  ),
                )}
              </ul>
            ) : null}
            {outgoing.length ? (
              <>
                <h3
                  className={`cond border-b border-edge px-5 pt-5 pb-2 text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase ${incoming.length ? "border-t" : ""}`}
                >
                  Sent
                </h3>
                <ul className="divide-y divide-edge" aria-label="Invitations you sent">
                  {outgoing.map((inv) => (
                    <InviteRow key={inv.id} invite={inv} failed={failedFor(inv.id)}>
                      {inv.status === "ACCEPTED" ? (
                        <ButtonLink href={`/call/${inv.interviewId}/lobby`} size="sm">
                          {inv.person.name.split(" ")[0]} accepted. Join the lobby
                        </ButtonLink>
                      ) : (
                        <p className="text-[0.875rem] font-semibold text-ink-2">
                          Waiting for {inv.person.name.split(" ")[0]}
                        </p>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={busy === inv.id}
                        aria-label={`Cancel your invite to ${inv.person.name}`}
                        onClick={() => cancel(inv)}
                      >
                        Cancel invite
                      </Button>
                    </InviteRow>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </StateView>
      </div>
    </section>
  );
}
