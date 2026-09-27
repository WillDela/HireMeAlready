"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface FolderTab {
  id: string;
  label: string;
  count?: number | string;
  icon?: ReactNode;
}

/**
 * Folder tabs over a paper panel. WAI-ARIA tabs pattern: arrow keys move
 * between tabs with automatic activation; Home/End jump to the ends.
 */
export function FolderTabs({
  tabs,
  value,
  onChange,
  label,
  children,
  className,
  panelClassName,
}: {
  tabs: FolderTab[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
}) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className="ftabs">
        {tabs.map((tab, i) => {
          const selected = tab.id === value;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              type="button"
              id={`${base}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel`}
              tabIndex={selected ? 0 : -1}
              className="ftab"
              onClick={(e) => {
                onChange(tab.id);
                // On narrow screens the strip scrolls; bring a half-hidden tab fully into view.
                e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
              }}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined ? <span className="ftab-count">{tab.count}</span> : null}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${base}-panel`}
        aria-labelledby={`${base}-tab-${value}`}
        tabIndex={0}
        className={cn("ftab-panel", panelClassName)}
      >
        {children}
      </div>
    </div>
  );
}
