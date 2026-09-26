---
name: hire-me-already
description: Rehearse the interview you're actually walking into.
colors:
  manila: "oklch(0.875 0.082 84)"
  manila-deep: "oklch(0.79 0.104 78)"
  manila-edge: "oklch(0.7 0.105 74)"
  manila-ink: "oklch(0.36 0.07 62)"
  paper: "oklch(0.992 0.004 95)"
  paper-2: "oklch(0.963 0.008 92)"
  rule: "oklch(0.84 0.045 245)"
  edge: "oklch(0.86 0.014 250)"
  ink: "oklch(0.27 0.075 268)"
  ink-2: "oklch(0.44 0.045 266)"
  ink-3: "oklch(0.56 0.03 266)"
  drawer: "oklch(0.255 0.068 268)"
  drawer-2: "oklch(0.32 0.07 268)"
  drawer-ink: "oklch(0.96 0.012 95)"
  drawer-ink-2: "oklch(0.8 0.035 266)"
  stamp: "oklch(0.52 0.19 29)"
  stamp-wash: "oklch(0.95 0.035 29)"
  hi: "oklch(0.925 0.18 118)"
  hi-ink: "oklch(0.26 0.06 128)"
  night: "oklch(0.17 0.03 266)"
  night-2: "oklch(0.22 0.035 266)"
  night-3: "oklch(0.29 0.04 266)"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 3.5rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.03em"
    fontVariation: "\"wdth\" 116"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.625rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.025em"
    fontVariation: "\"wdth\" 116"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.1em"
    fontVariation: "\"wdth\" 72"
  stamp:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.09em"
    fontVariation: "\"wdth\" 70"
rounded:
  hairline: "2px"
  sheet: "3px"
  control: "4px"
  folder: "6px"
  round: "999px"
spacing:
  xs: "0.375rem"
  sm: "0.75rem"
  md: "1.25rem"
  lg: "1.5rem"
  xl: "2.5rem"
  line: "1.75rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "0 1rem"
    height: "2.5rem"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 1rem"
    height: "2.5rem"
  button-secondary-hover:
    backgroundColor: "{colors.paper-2}"
  button-ghost:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 1rem"
    height: "2.5rem"
  button-danger:
    backgroundColor: "{colors.stamp}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "0 1rem"
    height: "2.5rem"
  button-danger-outline:
    textColor: "{colors.stamp}"
    rounded: "{rounded.control}"
    padding: "0 1rem"
    height: "2.5rem"
  button-danger-outline-hover:
    backgroundColor: "{colors.stamp-wash}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "0.55rem 0.75rem"
    height: "2.75rem"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
  folder:
    backgroundColor: "{colors.manila-deep}"
    textColor: "{colors.manila-ink}"
    rounded: "{rounded.folder}"
  folder-tab:
    backgroundColor: "{colors.manila-deep}"
    textColor: "{colors.manila-ink}"
    typography: "{typography.label}"
    padding: "0 1rem"
    height: "2.5rem"
  folder-tab-selected:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  tag:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sheet}"
    padding: "0 0.45rem"
    height: "1.375rem"
  nav-item:
    textColor: "{colors.drawer-ink-2}"
    rounded: "{rounded.control}"
    padding: "0 0.75rem"
    height: "2.75rem"
  nav-item-active:
    backgroundColor: "{colors.hi}"
    textColor: "{colors.hi-ink}"
  stamp:
    textColor: "{colors.ink}"
    typography: "{typography.stamp}"
    rounded: "{rounded.sheet}"
    padding: "0.2em 0.55em 0.18em"
---

# Design System: hire-me-already

## Overview

**Creative North Star: "The Application File"**

Every interview is a file on the candidate's own desk: briefed, rehearsed, stamped, filed. The working ground is manila folder stock with a faint fibre grain; content lives on bond-white sheets that sit a few millimetres above it; the drawer down the left edge is ballpoint blue-black. Outcomes are not badges or pills: they are rubber stamps, rotated a few degrees, with a double rule and worn ink, and they land with a short thud.

The system is built from five desk materials and nothing else. One grotesk (Archivo, variable width) does every job: stretched wide at poster scale for page titles, condensed to caps for folder tabs, labels and stamps. Folders are real objects (a tab with a cut corner, a front pocket laid over the sheet that carries the one action); sheets carry paper clips; the current thing is marked with a highlighter swipe. The night desk flips paper to ink rather than inventing a separate dark palette, and the call room plus the drawer stay dark in both themes.

Density is calm and tactile: generous sheet padding, a 76rem working column, one primary action per folder. Motion is physical and brief; sheets slide from folders, stamps thud, nothing bounces.

**Key Characteristics:**
- Five materials only: manila, bond paper, ballpoint ink, stamp red, highlighter lime. There is no green.
- One variable grotesk; width axis (not a second family) carries hierarchy.
- Rubber stamps are the signature mark for outcomes and states.
- Depth comes from stacked paper, never from floating cards.
- Fixed shell regions: drawer or tab bar, top bar, manila ground. Navigation swaps what's in the folder, never the frame.

## Colors

A warm desk of manila and bond paper, written on in blue-black ballpoint, with exactly two marks of colour: stamp red and highlighter lime.

### Primary
- **Ballpoint Ink** (`ink`): all text, primary buttons, checked controls, focus outlines, range fills, and scores. Its muted steps (`ink-2`, `ink-3`) carry secondary text, meta and placeholders.
- **Drawer Blue-Black** (`drawer`, `drawer-2`): the desktop sidebar and mobile tab bar; `drawer-2` is its hover. Text inside uses `drawer-ink` / `drawer-ink-2`.

### Secondary
- **Rubber-Stamp Red** (`stamp`, `stamp-wash`): recording, errors, destructive actions, invalid fields, the text caret, and RETURNED / REC stamps. `stamp-wash` is the tint behind an error block or a danger-outline hover.

### Tertiary
- **Highlighter Lime** (`hi`, text on it `hi-ink`): the current thing only. Active nav item, `<mark>` highlight swipes on the one thing to work on next, text selection, the focus halo, and the wordmark.

### Neutral
- **Manila Folder** (`manila`): the page ground everywhere outside the drawer and call room, overlaid with a multiply fibre grain.
- **Manila Deep / Edge** (`manila-deep`, `manila-edge`): folder bodies, folder tabs and pockets; `manila-edge` is the pocket's lip and the scrollbar thumb.
- **Manila Ink** (`manila-ink`): text written directly on manila (page subtitles, folder footnotes, tab labels).
- **Bond Paper** (`paper`, `paper-2`): sheets, inputs, dialogs, selected tabs; `paper-2` for hover and quiet fills.
- **Blue Rule / Edge** (`rule`, `edge`): ruled-line backgrounds and hairline dividers inside sheets.
- **Night Desk** (`night`, `night-2`, `night-3`): the call room, which is dark in both themes.

### Named Rules
**The Five Materials Rule.** Manila, bond paper, ballpoint ink, stamp red, highlighter lime. There is no green, no success colour, no brand gradient. A positive outcome is ink, stated in words or a stamp.

**The Red Is Trouble Rule.** Stamp red means recording, error, or a destructive act. It never colours a score, a rating, or a neutral status.

**The One Highlighter Rule.** Lime marks the one current thing on screen (active nav, the highlighted fix, the logo). It is never a fill for avatars, tags, charts or decoration.

**The Night Desk Rule.** Dark mode re-points the same tokens (paper becomes ink-dark, ink becomes paper-light); components never branch on theme. Regions that are always dark (drawer, call room) re-point tokens locally, and the candidate's file inside the call room is always day stock.

## Typography

**Display Font:** Archivo (variable, `wdth` axis), with ui-sans-serif, system-ui fallback
**Body Font:** Archivo
**Label Font:** Archivo, condensed (`wdth` 70-76), caps

**Character:** One grotesk stretched and squeezed. Wide and extra-bold for poster-scale titles, regular for reading, condensed tracked caps for tabs, labels and stamps, so the file feels typeset by one hand.

### Hierarchy
- **Display** (800, 2.5rem to 3.5rem, 0.98, wide 116): the dashboard greeting; one per page at most, max ~18ch.
- **Headline** (800, 2rem to 2.625rem, 1.05, wide 116): page titles via the page header.
- **Title** (800, 1.5rem to 1.75rem): folder and sheet headings; dialog titles step down to 700 at 1.375rem.
- **Body** (400, 1rem, 1.5): running text; secondary copy at 0.9375rem in `ink-2`; descriptions capped at 56-60ch.
- **Label** (700, 0.6875rem to 0.8125rem, 0.07-0.1em tracking, condensed, uppercase): folder tabs, table headers, definition terms, small section headings inside a sheet, tags.
- **Stamp** (800, condensed 70, 0.09em tracking, uppercase): stamp text; score stamps set the number at 0.36 of the stamp diameter with tabular figures.

### Named Rules
**The One Grotesk Rule.** Hierarchy comes from Archivo's width axis and weight, never from a second family.

**The No Eyebrow Rule.** Nothing sits above a heading to announce it. Condensed caps labels are headings or field terms in their own right; a folder tab that would restate the heading below it stays blank.

**The Tabular Score Rule.** Scores, counts and tables use tabular figures.

## Layout

Fixed shell regions: on desktop a 15rem ink drawer runs the full viewport height on the left, a top bar (role toggle, notifications, avatar) sits on manila, and the working column is centred at max 76rem with 1rem / 1.5rem / 2.5rem side padding by breakpoint. Below the `md` breakpoint (768px) the drawer becomes a six-slot bottom tab bar (4rem tall, safe-area aware) and the main column gains bottom padding so nothing hides behind it.

Pages open with a header (title, optional 60ch description, actions right-aligned from `sm`), then content on a grid with 1.5rem column and 2.5rem row gaps. The dashboard lays two tall practice folders and a narrower 19-22rem score sheet side by side at `lg` (1024px) and stacks them below. Ruled surfaces run on a 1.75rem line; interactive rows and nav items keep a 2.75rem minimum target.

## Elevation & Depth

Depth is stacked paper on a desk: soft, warm, downward shadows with a 1px contact line, tinted with the manila shade (and a cool near-black on the night desk). Nothing floats with a glow; layers are ground, folder, sheet, and a pocket laid back over the sheet.

### Shadow Vocabulary
- **Sheet** (`box-shadow: 0 1px 0 var(--shade-soft), 0 10px 22px -14px var(--shade)`): every bond-paper sheet, tab panel and dialog.
- **Folder** (`box-shadow: 0 1px 0 var(--shade-soft), 0 14px 28px -18px var(--shade)`): manila folder bodies, slightly deeper than a sheet.
- **Pocket lip** (`box-shadow: 0 -1px 0 var(--manila-edge), 0 -10px 18px -14px var(--shade)`): the folder front that overlaps the bottom of its sheet.
- **Flat sheet** (1px `edge` border, no shadow): sheets nested inside another sheet.

### Named Rules
**The Paper Stack Rule.** Elevation is only ever a sheet on a folder on the desk. If a surface isn't paper or a folder, it doesn't get a shadow.

## Shapes

Paper has barely-rounded corners: sheets, inputs, tags and stamps at 3px, buttons and nav items at 4px, folders at 6px with the top-left corner square where the tab joins. Folder tabs are cut with a slanted trailing edge (a clip-path ramp), not rounded. The only true circles are avatars, presence dots and round score stamps. Borders are 1.5px ink-mix strokes on controls; stamps use a 2.5px border plus a 1px outline offset 2px for the double rule, rotated -3 to -8 degrees and masked with a worn-ink noise texture.

## Components

### Buttons
Solid ink blocks, like a filled-in form box.
- **Shape:** gently squared (4px); 2.5rem default, 2rem small, 3rem large; 1.5px border.
- **Primary:** ink fill, paper text, weight 600. Hover mixes 14% paper into the ink.
- **Secondary:** paper with a 55% ink border; hover firms the border to full ink over `paper-2`.
- **Ghost:** transparent ink text; hover lays an 8% ink wash.
- **Danger / Danger outline:** stamp-red fill, or red text and border with a `stamp-wash` hover. Destructive acts only.
- **Press:** 1px downward nudge on `:active`. Disabled is 50% opacity with a not-allowed cursor.

### Tags
- **Style:** condensed caps (0.6875rem, 700, 0.08em), 1.5px current-colour border, 3px corners, 1.375rem tall, no fill. Used for type labels (AI / Human) and statuses; colour follows the text, which is ink unless it signals trouble.

### Sheets and Folders
- **Sheet:** bond paper, 3px corners, sheet shadow, padding 1.25rem to 1.5rem; may carry a paper clip overhanging the top edge.
- **Folder:** manila-deep body, 6px corners with a square top-left, an absolutely placed tab in the wrapper's 1.75rem top padding, a sheet tucked inside, and a front pocket overlapping the sheet's bottom that holds the one primary action and a manila-ink footnote.
- **Dialog:** a day-stock sheet (always light) with a 6px manila strip across the top, red for destructive dialogs; blue-black 55% backdrop.

### Inputs / Fields
- **Style:** paper fill, 1.5px border at 28% ink, 3px corners, 2.75rem tall; hover to 50% ink. Labels 0.875rem / 600 above; hints 0.8125rem in `ink-2`.
- **Focus:** full ink border plus a 4px lime halo.
- **Error:** stamp-red border and a red 600-weight message below. Disabled at 55% opacity.
- **Checkbox / Range:** square 3px ink boxes; range track fills with ink, thumb is a paper square with a 2px ink border.

### Navigation
- **Drawer:** ink blue-black; items 0.9375rem / 600 in `drawer-ink-2` with 19px line icons; hover to `drawer-2`. The active item gets the highlighter swipe (lime, `hi-ink` text, bold, thicker icon stroke).
- **Mobile tab bar:** six equal slots, condensed 0.6875rem labels, active icon sits in a lime 4px-cornered chip.
- **Folder tabs:** manila-deep condensed caps tabs over a paper panel; the selected tab becomes paper and ink so it reads as the front sheet. Optional tabular count chip.

### Rubber Stamp (signature)
The system's outcome mark: ASKED, FILED, RETURNED, REC, MATCHED, and round score stamps (e.g. 4.2 of 5). Condensed 800-weight caps inside a double rule, rotated, with worn-ink masking. Tone is ink by default; red only for RETURNED (errors) and REC. Score stamps are always ink. On first appearance a stamp lands (scale 1.9 to 0.97 to 1 over 280ms, ease-out-quint) as a short thud; with reduced motion it simply appears.

### States
Loading shows blank ruled sheets with a slow paper-coloured sweep; empty states are an empty folder with one next action; errors come back on a sheet stamped RETURNED with a retry.

### Motion
Ease-out-quint (`cubic-bezier(0.22, 1, 0.36, 1)`) for state changes at 90-160ms; ease-out-expo for sheets sliding in (240ms, 6px rise). No bounce anywhere. `prefers-reduced-motion` collapses all animation and transition to effectively instant.

## Do's and Don'ts

### Do:
- **Do** build every surface from the five materials: manila ground, paper sheets, ink text and drawer, stamp red for trouble, lime for the current thing.
- **Do** set scores in ink, as round stamps with tabular figures.
- **Do** mark outcomes with a rotated rubber stamp that lands once, and respect reduced motion.
- **Do** distinguish presence by fill and ring (solid ink online, ink ring away, empty thin ring offline), never by hue.
- **Do** give each folder one primary action, placed in its front pocket.
- **Do** get hierarchy from Archivo's width axis: wide for titles, condensed caps for tabs, labels and stamps.
- **Do** re-point tokens for dark regions instead of branching components on theme.

### Don't:
- **Don't** introduce green or any success hue; there is no green in this file.
- **Don't** use stamp red for scores, ratings, or neutral status.
- **Don't** use lime for avatar fills, tags, charts or decoration; it marks the current thing only.
- **Don't** put an eyebrow or kicker label above a heading, and leave a folder tab blank rather than restating the heading beneath it.
- **Don't** float rounded stat cards or glow shadows; elevation is paper on a folder on a desk.
- **Don't** add a second typeface.
- **Don't** bounce; motion is sheets sliding and stamps thudding.
