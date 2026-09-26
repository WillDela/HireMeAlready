"use client";

import { useEffect, useId, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { friendRequests, friends as initialFriends, peopleDirectory } from "@/lib/mock";
import { useMockResource } from "@/lib/mock-state";
import { FriendRow } from "@/components/FriendRow";
import { Button } from "@/components/ui/Button";
import { FolderTabs } from "@/components/ui/FolderTabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stamp } from "@/components/ui/Stamp";
import { EmptyFolder, ErrorReturned, LoadingSheets, StateView } from "@/components/ui/States";

type Tab = "friends" | "requests" | "find";

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>("friends");
  const [roster, setRoster] = useState(initialFriends);
  const [requests, setRequests] = useState(friendRequests);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const searchId = useId();
  const { status, retry } = useMockResource(roster);

  // Deep links from notifications and the dashboard: /friends?tab=requests
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "requests" || t === "find") setTab(t);
  }, []);

  const incoming = requests.filter((r) => r.direction === "incoming");
  const outgoing = requests.filter((r) => r.direction === "outgoing");
  const q = query.trim().toLowerCase();
  const results = peopleDirectory.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.headline.toLowerCase().includes(q),
  );

  const empty = status === "empty";
  const list = empty ? [] : roster;
  const inc = empty ? [] : incoming;
  const out = empty ? [] : outgoing;

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
          { id: "friends", label: "Friends", count: list.length },
          { id: "requests", label: "Requests", count: inc.length },
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
            list.length === 0 ? (
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
                {list.map((f) => (
                  <FriendRow
                    key={f.id}
                    person={f}
                    status={f.status}
                    meta={
                      f.sharedInterviews
                        ? `${f.sharedInterviews} ${f.sharedInterviews === 1 ? "interview" : "interviews"} together`
                        : "No interviews together yet"
                    }
                    onRemove={(id) => setRoster((r) => r.filter((x) => x.id !== id))}
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
              {inc.length === 0 ? (
                <p className="px-5 py-6 text-[0.9375rem] text-ink-2">No requests waiting for you.</p>
              ) : (
                <ul className="divide-y divide-edge" aria-label="Received requests">
                  {inc.map((r) => (
                    <FriendRow
                      key={r.id}
                      person={r}
                      meta={`${r.mutual ? `${r.mutual} mutual · ` : ""}Sent ${r.sent}`}
                      actions={
                        <>
                          <Button
                            size="sm"
                            aria-label={`Accept ${r.name}`}
                            onClick={() => {
                              setRequests((all) => all.filter((x) => x.id !== r.id));
                              setRoster((all) => [...all, { ...r, sharedInterviews: 0, status: "offline" }]);
                            }}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Decline ${r.name}`}
                            onClick={() => setRequests((all) => all.filter((x) => x.id !== r.id))}
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
              {out.length === 0 ? (
                <p className="px-5 py-6 text-[0.9375rem] text-ink-2">You haven&apos;t sent any requests.</p>
              ) : (
                <ul className="divide-y divide-edge" aria-label="Sent requests">
                  {out.map((r) => (
                    <FriendRow
                      key={r.id}
                      person={r}
                      meta={`Sent ${r.sent}`}
                      actions={
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Cancel request to ${r.name}`}
                          onClick={() => setRequests((all) => all.filter((x) => x.id !== r.id))}
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
                  Search by name or role
                </label>
                <div className="relative max-w-md">
                  <Search size={17} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
                  <input
                    id={searchId}
                    type="search"
                    className="input !pl-10"
                    placeholder="e.g. designer, Omar"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <p className="field-hint" aria-live="polite">
                  {q ? `${results.length} ${results.length === 1 ? "person" : "people"} found` : "People who allow discovery in their settings."}
                </p>
              </div>
              {results.length === 0 ? (
                <EmptyFolder compact title={`No one matches “${query}”`}>
                  Try a first name or a role like “researcher”.
                </EmptyFolder>
              ) : (
                <ul className="divide-y divide-edge" aria-label="Search results">
                  {results.map((p) => (
                    <FriendRow
                      key={p.id}
                      person={p}
                      meta={p.mutual ? `${p.mutual} mutual ${p.mutual === 1 ? "friend" : "friends"}` : undefined}
                      actions={
                        sent[p.id] ? (
                          <Stamp tone="ink" land rotate={-5} className="text-[0.75rem]">
                            Request sent
                          </Stamp>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<UserPlus size={15} aria-hidden="true" />}
                            aria-label={`Add ${p.name} as a friend`}
                            onClick={() => setSent((s) => ({ ...s, [p.id]: true }))}
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
    </>
  );
}
