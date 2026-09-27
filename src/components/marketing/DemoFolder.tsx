import { aiSetupDefaults, sourceLabel } from "@/lib/mock";
import { cn } from "@/lib/cn";
import { PaperClip } from "@/components/ui/PaperClip";
import { ScoreStamp } from "@/components/ui/Stamp";

// A believable, specific question in the same voice as the real generator (see
// suggestedQuestions in lib/mock.ts), built from the shared Northwind/driver-app scenario.
const DEMO_QUESTION =
  "Northwind's drivers open this app mid-shift, one-handed, sometimes on a cracked screen. Walk me through a decision you'd make differently knowing that.";

/**
 * The landing page's proof object: a real folder, sheet and score stamp — the
 * same materials the product ships — holding one sample question and a filed
 * score. Not a screenshot; clearly labeled "Sample" rather than live data.
 */
export function DemoFolder({ className }: { className?: string }) {
  return (
    <div className={cn("relative pt-7", className)}>
      <div className="folder-tab w-60">{aiSetupDefaults.company} · Sample</div>
      <div className="folder">
        <div className="px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="sheet relative px-5 py-6 sm:px-6 sm:py-7">
            <PaperClip className="left-6" />
            <div className="flex items-start justify-between gap-3">
              <span className="cond text-[0.75rem] font-bold tracking-[0.1em] text-ink-3 uppercase">
                {aiSetupDefaults.jobTitle}
              </span>
              <span className="tag text-ink-3">Sample</span>
            </div>
            <p className="mt-4 text-[1.0625rem] leading-snug font-semibold text-ink">{DEMO_QUESTION}</p>
            <span className="tag mt-4 inline-flex text-manila-ink">{sourceLabel.company}</span>
          </div>
        </div>
        {/* The pocket: same treatment as PracticeFolder, holding the scored result instead of an action. */}
        <div className="relative -mt-6 flex items-center justify-between gap-4 rounded-b-[6px] bg-manila-deep px-5 py-5 shadow-[0_-1px_0_var(--manila-edge),0_-10px_18px_-14px_var(--shade)] sm:px-6">
          <p className="max-w-[14ch] text-[0.8125rem] text-manila-ink">Scored after your interview.</p>
          <ScoreStamp score={4.2} size={84} land rotate={-8} />
        </div>
      </div>
    </div>
  );
}
