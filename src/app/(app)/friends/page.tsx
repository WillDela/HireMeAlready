"use client";

import { useEffect, useId, useState } from "react";
import { ArrowRight, Search, UserPlus } from "lucide-react";
import type { FriendsResponse, InvitationsResponse, PersonSearchResult, PersonSummary } from "@/lib/contracts";
import { apiFetch, useApiResource } from "@/lib/use-api";
import { FriendRow } from "@/components/FriendRow";
import { InviteDialog } from "@/components/InviteDialog";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FolderTabs } from "@/components/ui/FolderTabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stamp } from "@/components/ui/Stamp";
import { EmptyFolder, ErrorReturned, LoadingSheets, StateView } from "@/components/ui/States";

type Tab = "friends" | "requests" | "find";

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>("friends");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const searchId = useId();
  const { status, data, retry, mutate } = useApiResource<FriendsResponse>("/api/friends", {
    isEmpty: (d) => d.friends.length === 0 && d.incoming.length === 0,
  });
  // Poll while an invite we sent is unanswered, so an accept shows up as "Join lobby".
  const invites = useApiResource<InvitationsResponse>("/api/invitations", {
    pollWhile: (d) => d.outgoing.some((i) => i.status === "PENDING"),
    pollMs: 5000,
  });
  const [inviting, setInviting] = useState<PersonSummary | null>(null);

  // Deep links from notifications: /friends?tab=requests
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "requests" || t === "find") setTab(t);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const t = window.setTimeout(() => {
      setSearching(true);
      apiFetch<PersonSearchResult[]>(`/api/friends/search?q=${encodeURIComponent(q)}`)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const shownResults = query.trim() ? results : [];

  const friends = data?.friends ?? [];
  const incoming = data?.incoming ?? [];
  const outgoing = data?.outgoing ?? [];

  async function withBusy(id: string, fn: () => Promise<void>) {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await fn();
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  function respond(requestId: string, decision: "ACCEPTED" | "DECLINED") {
    return withBusy(requestId, async () => {
      const next = await apiFetch<FriendsResponse>(`/api/friends/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: decision }),
      });
      mutate(next);
    });
  }

  function removeFriendship(friendshipId: string) {
    return withBusy(friendshipId, async () => {
      const next = await apiFetch<FriendsResponse>(`/api/friends/${friendshipId}`, {
        method: "DELETE",
      });
      mutate(next);
    });
  }

  function cancelInvite(inviteId: string) {
    return withBusy(inviteId, async () => {
      const next = await apiFetch<InvitationsResponse>(`/api/invitations/${inviteId}`, { method: "DELETE" });
      invites.mutate(next);
    });
  }

  /** What stands in for the Invite button while an invite with `friendId` is open. */
  function inviteState(friendId: string, firstName: string) {
    const sent = invites.data?.outgoing.find((i) => i.person.id === friendId);
    const received = invites.data?.incoming.find((i) => i.person.id === friendId);
    if (sent?.status === "ACCEPTED") {
      return (
        <ButtonLink href={`/call/${sent.interviewId}/lobby`} size="sm" icon={<ArrowRight size={15} aria-hidden="true" />}>
          {firstName} accepted. Join the lobby
        </ButtonLink>
      );
    }
    if (sent) {
      return (
        <>
          <Stamp tone="ink" land rotate={-5} className="mr-2 text-[0.8125rem]">
            Invited
          </Stamp>
          <Button
            variant="ghost"
            size="sm"
            loading={busy[sent.id]}
            aria-label={`Cancel your interview invite to ${firstName}`}
            onClick={() => cancelInvite(sent.id)}
          >
            Cancel invite
          </Button>
        </>
      );
    }
    if (received) {
      return (
        <ButtonLink
          href={received.status === "ACCEPTED" ? `/call/${received.interviewId}/lobby` : "/practice#invitations"}
          variant="secondary"
          size="sm"
        >
          {received.status === "ACCEPTED" ? "Back to the lobby" : `Answer ${firstName}'s invite`}
        </ButtonLink>
      );
    }
    return null;
  }

  function sendRequest(userId: string) {
    return withBusy(userId, async () => {
      const next = await apiFetch<FriendsResponse>("/api/friends", {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      mutate(next);
      setResults((r) => r.map((p) => (p.id === userId ? { ...p, status: "outgoing" } : p)));
    });
  }

  return (
    <>
      <title>Friends · hire-me-already</title>
      <PageHeader
        title="Friends"
        description="People you practice with. Invite a friend straight into an interview, on either side of the table."
      />

      <FolderTabs
        label="Friends"
        value={tab}
        onChange={(t) => setTab(t as Tab)}
        tabs={[
          { id: "friends", label: "Friends", count: friends.length },
          { id: "requests", label: "Requests", count: incoming.length },
          { id: "find", label: "Find people" },
        ]}
      >
        <StateView
          status={status === "empty" ? "ready" : status}
          loading={<LoadingSheets className="p-5" label="Loading your friends…" rows={4} />}
          error={
            <div className="p-4 sm:p-6">
              <ErrorReturned title="Your friends list didn't load" onRetry={retry}>
                Nothing changed with your friends. Try again in a moment.
              </ErrorReturned>
            </div>
          }
          empty={null}
        >
          {tab === "friends" ? (
            friends.length === 0 ? (
              <EmptyFolder
                title="No friends yet"
                action={
                  <Button variant="secondary" onClick={() => setTab("find")} icon={<UserPlus size={16} aria-hidden="true" />}>
                    Find people
                  </Button>
                }
              >
                Add people you trust to practice with. You can invite friends into an interview without waiting for a match.
              </EmptyFolder>
            ) : (
              <ul className="divide-y divide-edge" aria-label="Friends">
                {friends.map((f) => (
                  <FriendRow
                    key={f.friendshipId}
                    person={f}
                    meta={f.sharedInterviews ? `${f.sharedInterviews} ${f.sharedInterviews === 1 ? "interview" : "interviews"} together` : "No interviews together yet"}
                    onRemove={() => removeFriendship(f.friendshipId)}
                    onInvite={() => setInviting(f)}
                    invite={inviteState(f.id, f.name.split(" ")[0])}
                  />
                ))}
              </ul>
            )
          ) : null}

          {tab === "requests" ? (
            <div>
              <h2 className="cond border-b border-edge px-5 pt-5 pb-2 text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">
                Received
              </h2>
              {incoming.length === 0 ? (
                <p className="px-5 py-6 text-[0.9375rem] text-ink-2">No requests waiting for you.</p>
              ) : (
                <ul className="divide-y divide-edge" aria-label="Received requests">
                  {incoming.map((r) => (
                    <FriendRow
                      key={r.requestId}
                      person={r}
                      meta={`Sent ${new Date(r.sentAt).toLocaleDateString()}`}
                      actions={
                        <>
                          <Button
                            size="sm"
                            loading={busy[r.requestId]}
                            aria-label={`Accept ${r.name}`}
                            onClick={() => respond(r.requestId, "ACCEPTED")}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy[r.requestId]}
                            aria-label={`Decline ${r.name}`}
                            onClick={() => respond(r.requestId, "DECLINED")}
                          >
                            Decline
                          </Button>
                        </>
                      }
                    />
                  ))}
                </ul>
              )}
              <h2 className="cond border-y border-edge px-5 pt-5 pb-2 text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">
                Sent
              </h2>
              {outgoing.length === 0 ? (
                <p className="px-5 py-6 text-[0.9375rem] text-ink-2">You haven&apos;t sent any requests.</p>
              ) : (
                <ul className="divide-y divide-edge" aria-label="Sent requests">
                  {outgoing.map((r) => (
                    <FriendRow
                      key={r.requestId}
                      person={r}
                      meta={`Sent ${new Date(r.sentAt).toLocaleDateString()}`}
                      actions={
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={busy[r.requestId]}
                          aria-label={`Cancel request to ${r.name}`}
                          onClick={() => removeFriendship(r.requestId)}
                        >
                          Cancel request
                        </Button>
                      }
                    />
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {tab === "find" ? (
            <div>
              <div className="border-b border-edge p-5">
                <label htmlFor={searchId} className="field-label">
                  Search by name
                </label>
                <div className="relative max-w-md">
                  <Search size={17} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
                  <input
                    id={searchId}
                    type="search"
                    className="input !pl-10"
                    placeholder="e.g. Priya"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <p className="field-hint" aria-live="polite">
                  {query.trim()
                    ? searching
                      ? "Searching…"
                      : `${shownResults.length} ${shownResults.length === 1 ? "person" : "people"} found`
                    : "People who allow discovery in their settings."}
                </p>
              </div>
              {query.trim() && !searching && shownResults.length === 0 ? (
                <EmptyFolder compact title={`No one matches “${query}”`}>
                  Try a first or last name.
                </EmptyFolder>
              ) : (
                <ul className="divide-y divide-edge" aria-label="Search results">
                  {shownResults.map((p) => (
                    <FriendRow
                      key={p.id}
                      person={p}
                      actions={
                        p.status === "friends" ? (
                          <Stamp tone="ink" land rotate={-5} className="text-[0.75rem]">
                            Friends
                          </Stamp>
                        ) : p.status === "outgoing" ? (
                          <Stamp tone="ink" land rotate={-5} className="text-[0.75rem]">
                            Request sent
                          </Stamp>
                        ) : p.status === "incoming" ? (
                          <Button size="sm" onClick={() => setTab("requests")}>
                            Respond to their request
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={busy[p.id]}
                            icon={<UserPlus size={15} aria-hidden="true" />}
                            aria-label={`Add ${p.name} as a friend`}
                            onClick={() => sendRequest(p.id)}
                          >
                            Add friend
                          </Button>
                        )
                      }
                    />
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </StateView>
      </FolderTabs>

      <InviteDialog person={inviting} onClose={() => setInviting(null)} onSent={invites.mutate} />
    </>
  );
}
