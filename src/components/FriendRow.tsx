"use client";

import { useState, type ReactNode } from "react";
import { Send, UserMinus } from "lucide-react";
import type { Person } from "@/lib/mock";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

/**
 * A friend on the roster. Remove asks for confirmation in place. `invite` stands in
 * for the Invite button while an invite with this friend is open.
 */
export function FriendRow({
  person,
  meta,
  status,
  onRemove,
  onInvite,
  invite,
  actions,
}: {
  person: Person;
  meta?: ReactNode;
  status?: "online" | "away" | "offline";
  onRemove?: (id: string) => void;
  onInvite?: () => void;
  invite?: ReactNode;
  /** Replace the default Invite / Remove pair, e.g. Accept / Decline. */
  actions?: ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <Avatar name={person.name} initials={person.initials} status={status} size={44} />
        <div className="min-w-0">
          <p className="font-bold text-ink">{person.name}</p>
          <p className="truncate text-[0.875rem] text-ink-2">{person.headline}</p>
          {meta ? <p className="text-[0.8125rem] text-ink-3">{meta}</p> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-[3.625rem] sm:pl-0">
        {actions ??
          (confirming ? (
            <div role="group" aria-label={`Confirm removing ${person.name}`} className="flex items-center gap-2">
              <span className="text-[0.875rem] font-semibold">Remove {person.name.split(" ")[0]}?</span>
              <Button variant="danger" size="sm" onClick={() => onRemove?.(person.id)}>
                Remove
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} autoFocus>
                Keep
              </Button>
            </div>
          ) : (
            <>
              {invite ?? (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Send size={15} aria-hidden="true" />}
                  onClick={onInvite}
                  aria-label={`Invite ${person.name} to interview`}
                >
                  Invite to interview
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                icon={<UserMinus size={15} aria-hidden="true" />}
                onClick={() => setConfirming(true)}
                aria-label={`Remove ${person.name}`}
              >
                Remove
              </Button>
            </>
          ))}
      </div>
    </li>
  );
}
