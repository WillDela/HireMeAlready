---
version: 1
slug: "app"
primary_target: "app"
related_targets: ["components","lib"]
---

# App surface: interview practice app (all routes under app/)

Scope: the whole signed-in app plus auth, onboarding, call flow, admin reports. Visitor mode: **Operate**. Candidates prepare for a specific company's interview; interviewers run a peer mock with the candidate's file in hand. Frequent, anxious, bright-or-dim sessions on laptop and phone. UI structure with mock data only (lib/mock.ts); every screen has empty, loading and error states; fully keyboard accessible.

Anti-goals (user): corporate HR portal, generic AI startup, clinical/cold, gamified.

## Direction contract

THESIS: Every interview is a file on the candidate's own desk: briefed, rehearsed, stamped, filed. Refuses the category's light SaaS dashboard with rounded stat cards and a gradient AI orb.

OWN-WORLD: Manila folder stock owns the working ground; bond-white sheets carry content; ballpoint blue-black ink for text and the sidebar drawer; rubber-stamp red for recording, errors, destructive acts; highlighter lime marks the current thing. One grotesk (Archivo) for everything, condensed caps for tabs and stamps, poster-scale titles. Real folder tabs, stamped outcomes, paper-clipped items. Night desk theme flips paper to ink.

STORY: The candidate sees what to practice next, starts it in one move, and later reads a stamped, legible verdict with specifics to fix.

FIRST VIEWPORT: Dashboard = an open folder. A poster-scale greeting on manila. Two tall tabbed folders, "Practice with AI" and "Practice with a person", side by side, each opening with one primary action. Right of them, the last interview's sheet with its score set as a big rubber stamp. Friend requests clipped beneath. Mobile stacks the folders and the score sheet, with the tab bar below.

FORM: The Application File, candidate 7 of 7 on the ordered list; seed key 38494b7d. Raises: one grotesk (alphabet storm); four distinct material states (tensegrity); fixed shell regions (PC-98); persistent marks (flash-scrawl); fully inverting toggles (one-bit). Signature interaction: the rubber stamp landing (ASKED, FILED, score) with a short ink thud; motion elsewhere is sheets sliding from folders, never bounce.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- Real brand mark (wordmark is typographic for now).
- Rating criteria beyond the three feedback dimensions.
