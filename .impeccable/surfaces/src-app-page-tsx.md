---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/components"]
---

# Landing surface: public marketing page before sign in / sign up (`src/app/page.tsx`)

Scope: the root route only, shown to signed-out visitors; signed-in visitors are redirected straight to `/practice` (unchanged). Visitor mode: **Persuade**. Audience: job candidates only (per user's answer), arriving anxious about one specific upcoming interview. No real testimonials, user counts, or ratings exist (PRODUCT.md "Evidence on Hand: None") — nothing here may imply otherwise.

Anti-goals (inherited from app.md): corporate HR portal, generic AI startup, clinical/cold, gamified. Persuade-specific anti-goal: a floating dashboard screenshot in a fake browser-chrome mockup (user explicitly said no screenshots); a hero-metric template (big fake number + label).

## Direction contract

THESIS: The landing page is the cover of the candidate's own file, opened before they've signed up — it proves the company-specific mechanism live in the first viewport instead of describing it in adjective copy. Refuses the category default of a floating product screenshot over a gradient.

OWN-WORLD: Unchanged Application File system inherited whole — manila ground, bond sheets, ballpoint ink, stamp red, highlighter lime, one Archivo grotesk, real folder tabs and rotated rubber stamps, the established Montserrat/red-italic-READY/mic wordmark lockup exactly as shipped. No new tokens, no new components invented; only new compositions of the existing ones.

STORY: A candidate lands already worried about one named company. Within the first viewport they see a real, live example: an open folder tabbed with a placeholder company name, holding one sample researched question, and a "Filed" score stamp landing with its thud — clearly synthetic (labeled), never a screenshot. They understand this rehearses the actual interview and grades it honestly, then take the one action offered: get started.

FIRST VIEWPORT: Slim top bar on manila (wordmark left; ghost "Sign in" link + theme toggle right, no other nav). Below it: left column carries the poster headline ("Rehearse the interview you're actually walking into."), one line of subtext, and the primary "Get started" button (→ /signup) plus a quiet "Sign in" text link; right column is a real `PracticeFolder`-family folder tabbed "ACME CORP · SAMPLE" holding a paper-clipped sheet with one sample company-specific question and a landing score stamp. Mobile stacks: headline block first, folder demo below it, full width.

Below the fold (new compositions only, same materials): a two-folder "how it works" pair mirroring the dashboard's AI/human folders but as static proof cards (no live actions); a sample scored file section reusing `ScoreCard` across the product's real rating dimensions, headed clearly as a sample; a short trust paragraph on resume/recording privacy and explicit consent (real product fact, not fabricated); a closing CTA band repeating "Get started" / "Sign in".

FORM: Extends the established Application File world into a new Persuade surface. Precisely scoped, single-page request inside a fixed, fully-specified visual system — shaped directly, no direction tournament run. Signature interaction: the score stamp's land-thud plays once on hero mount (280ms, ease-out-quint, scale 1.9→0.97→1), identical vocabulary to the dashboard's stamps; `prefers-reduced-motion` collapses it to instant, matching the rest of the system.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- None: no raster assets are planned (no screenshots, no new illustrations); every visual is built from existing markup/CSS/SVG components.
