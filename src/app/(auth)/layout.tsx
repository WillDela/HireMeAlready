import { Wordmark } from "@/components/shell/Wordmark";
import { Stamp } from "@/components/ui/Stamp";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="desk grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
      <section className="relative hidden flex-col justify-between overflow-hidden px-12 py-12 lg:flex xl:px-20">
        <div className="text-ink">
          <Wordmark variant="horizontal" />
        </div>

        <div className="relative max-w-[34rem]">
          <p className="wide text-[3.5rem] leading-[0.98] font-extrabold tracking-[-0.03em] text-ink">
            Rehearse the interview you&apos;re actually walking into.
          </p>
          <p className="mt-6 max-w-[42ch] text-[1.0625rem] text-manila-ink">
            Questions drawn from the company you applied to. An AI interviewer or a real person across the table. A
            scored file afterwards.
          </p>
        </div>

        {/* A stack of filed practice sheets, the product's end state. */}
        <div aria-hidden="true" className="relative h-44">
          <div className="sheet absolute bottom-0 left-8 h-36 w-72 rotate-[-4deg] opacity-70" />
          <div className="sheet absolute bottom-3 left-2 h-36 w-72 rotate-[2deg] p-5">
            <div className="ink-bar w-2/3" />
            <div className="ink-bar mt-3 w-1/2" />
            <div className="ink-bar mt-3 w-3/5" />
            <Stamp tone="ink" rotate={-9} className="absolute right-5 bottom-5 text-[1.125rem]">
              Filed
            </Stamp>
          </div>
        </div>
      </section>

      <main id="main" className="flex items-center justify-center px-4 py-10 sm:px-8 lg:bg-[color-mix(in_oklch,var(--manila-deep)_55%,transparent)]">
        <div className="w-full max-w-[28rem]">
          <div className="mb-8 text-ink lg:hidden">
            <Wordmark />
          </div>
          <div className="sheet px-6 py-8 sm:px-9 sm:py-10">{children}</div>
        </div>
      </main>
    </div>
  );
}
