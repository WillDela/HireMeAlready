# AI Interview Practice (ShellHacks)

Mock interviews with an AI interviewer (ElevenLabs voice + Gemini) or a real person over WebRTC, with AI-generated questions and post-interview analysis.

The full plan (scope, schema, workstreams, cut list, phases) is in [`docs/PLAN.md`](docs/PLAN.md).

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind 4 (own design system, see `DESIGN.md`) · Better Auth · Prisma 7 → Tiger Cloud Postgres + pgvector · DigitalOcean Spaces · Gemini · ElevenLabs Agents · PeerJS + coturn · Docker Compose + Caddy on a DigitalOcean droplet

## Setup

```bash
npm install               # also runs `prisma generate`
cp .env.example .env      # fill in values; BETTER_AUTH_SECRET: openssl rand -hex 32
npm run db:deploy         # apply migrations to the database in DATABASE_URL
npm run dev               # http://localhost:3000
```

Database scripts:

| Script | What it does |
|---|---|
| `npm run db:migrate` | Create + apply a new migration after editing `prisma/schema.prisma` (Stream B only) |
| `npm run db:deploy` | Apply existing migrations (everyone, and production) |
| `npm run db:vector-index` | Create the HNSW index on `resume.embedding` (optional, re-runnable) |
| `npm run db:studio` | Browse data |

The Prisma client is generated into `src/generated/prisma` (gitignored). Import the shared instance from `@/lib/db`.

## Workstreams and file ownership

Only the owning stream edits these paths; ask in team chat for changes elsewhere.

| Stream | Owns |
|---|---|
| **A — Infra & Realtime** | `docker-compose.yml`, `Caddyfile`, `coturn/`, `Dockerfile`, `src/lib/rtc/`, `src/app/api/turn-credentials/`, `src/app/call/` (live call, lobby, wrap-up), `src/app/rtc-test/`, `src/components/call/` |
| **B — Data, Auth, Matching** (William) | `prisma/`, `src/proxy.ts`, `src/lib/{db,auth,auth-client,session,api,storage,vector,contracts,matching}.ts`, `src/app/api/{auth,profile,resume,queue,interviews,friends,messages,invitations}/` |
| **C — AI** | `src/lib/gemini/`, `src/lib/elevenlabs/`, `scripts/sync-agent.mts`, `src/lib/pipeline/`, `src/app/api/ai/`, `src/app/(app)/practice/ai/` |
| **D — Product UX** | `DESIGN.md`, `PRODUCT.md`, `src/app/{layout.tsx,page.tsx,globals.css,not-found.tsx}`, `src/app/(auth)/`, `src/app/onboarding/`, `src/app/(app)/` (except `practice/ai/`), `src/components/{ui,shell}/`, `src/components/*.tsx`, `src/lib/{cn,mock,mock-state,prefs,theme-script}.ts` |

Shared interfaces live in `src/lib/contracts.ts` (zod schemas + types). `src/lib/gemini/index.ts` currently returns fixtures with the final signatures, so UI and API work doesn't wait on Gemini.

## UI and mock data

The UI came from the [hire-me-already](https://github.com/alejandro0955/hire-me-already) mockup. Nearly every screen now reads from the database: sign in and sign up (email or Google, through Better Auth), the profile and settings, resume upload and parsing (`/resume`, onboarding), AI and live practice through `/call/[id]` and its wrap-up, history (`GET /api/interviews` and `GET /api/interviews/[id]` in `src/lib/history.ts`), friends, notifications, and reports (the call's Report dialog files them; `/admin/reports` reviews them). What's left in `src/lib/mock.ts` is the friend interview invitations on `/practice`, the design-preview call ids in `callSessions`, and constants like `reportReasons`. To move a screen over, have its route return the shape the screen already uses (mappers live in `src/lib/views.ts`) and swap `useMockResource` for `useApiResource` (`src/lib/use-api.ts`), which returns the same `{ status, data, retry }`. `?state=loading|empty|error` (or the State preview button) forces each screen's loading, empty and error states for review.

Client components get the signed-in user from `useCurrentUser()` (`src/components/shell/CurrentUserProvider.tsx`). The `(app)`, `call` and `onboarding` layouts provide it after `requirePageUser()` checks the session.

## Notifications

The top bar's bell reads the `notification` table through `GET /api/notifications` and polls it every 30 s; `PATCH /api/notifications { id? }` marks one read, or all without an `id`. Rows are written by `notify()` in `src/lib/notifications.ts`, called after the action that caused them: friend request sent or accepted, results ready (`finalize.ts`), feedback received, resume parsed, and report reviewed. `notify()` is best-effort, so a failed insert is logged and never breaks the action itself. **Adding a background job? Call `notify()` when it finishes.**

## Conventions

- Route Handlers wrap their body in `handleRoute` (`src/lib/api.ts`) and call `requireUser()` (`src/lib/session.ts`) for auth. Errors come back as `{ error: string }`.
- Validate request bodies with the zod schemas from `contracts.ts`.
- `resume.embedding` is a pgvector column Prisma can't read or write; use `src/lib/vector.ts`.
- Work on feature branches and open PRs into `main`.

## Droplet

Domain `hiremealready.study` (Porkbun DNS; `.study` is a GoDaddy Registry TLD) with A records for `@` and `www` → DigitalOcean droplet `104.131.187.142` (Ubuntu 24.04, 2 vCPU / 4 GB / 80 GB). Docker Engine and the Compose plugin are installed, and container logs rotate at 10 MB × 3.

The `ufw` firewall allows only: 22 (SSH), 80/443 (Caddy), 3478 tcp+udp and 5349 tcp (TURN), 49160–49200 udp (TURN relay; match `min-port`/`max-port` in coturn).

**Docker-published ports bypass ufw.** In `docker-compose.yml`, only Caddy should use `ports:` (80/443). Every other service uses `expose:` and is reached through Caddy on the Compose network, and coturn uses `network_mode: host`. Writing `ports: ["3000:3000"]` would expose that service to the internet even though ufw doesn't allow it.

## WebRTC (peer video calls)

- **Signaling:** a PeerJS server (`peer-server/`), reached through Caddy at `https://hiremealready.study/peerjs`.
- **TURN/STUN:** coturn (`coturn/turnserver.conf`) on port 3478 over UDP and TCP, with relay ports 49160–49200.
- **Credentials:** `GET /api/turn-credentials` (signed-in users only) returns ICE servers with short-lived TURN credentials signed by `TURN_SECRET`.
- **Client:** `usePeerCall` (`src/lib/rtc/use-peer-call.ts`) handles camera/mic, dialing and redialing, answering, hang-up, and reports whether media goes direct or through the relay.
- **Local dev uses the production PeerJS and coturn servers**, so your local `TURN_SECRET` must match the droplet's.

**Live matching and the call hand-off:**

1. `/practice/live` sends `POST /api/queue` (role, plus job title and company for interviewees), then polls `GET /api/queue` every 2 s through search, match and lobby. Each poll is a heartbeat and a match attempt (`src/lib/matching.ts`): the partner is someone WAITING in the opposite role who polled in the last 15 s, closest resume embedding first (pgvector), then first come, first served. Both queue rows are locked in one transaction, so two simultaneous polls can't double-match.
2. A match creates a PEER `Interview` with two `Participant`s whose `peerId`s come from `peerIdFor()`, and generates the interviewer's suggested questions in the background.
3. `DELETE /api/queue` (Cancel, leaving the page) abandons a match that hasn't started. A matched partner that stops polling for 90 s counts as gone too (long enough for a hidden tab, whose timers Chrome throttles to about once a minute). Either way, the other person goes back to the front of the line with `partnerLeft`.
4. Joining from the lobby opens `/call/{interviewId}`. Ids that aren't in `callSessions` (mock.ts) render the **peer branch** (`src/app/call/[id]/PeerCall.tsx`, shared with Stream A and the AI-interviews stream): it polls `GET /api/interviews/{id}/peer` for the `PeerSession` (role, peer ids, partner, and for the interviewer the candidate's resume and questions), gets TURN credentials, and runs `usePeerCall`. The interviewer dials.
5. `PATCH /api/interviews/{id}/peer` records `{ event: "connected" }` (the first one makes the interview ACTIVE) and `{ event: "left" }` (COMPLETED, or ABANDONED if it never started). Leave currently goes to `/dashboard`; it moves to `/call/{id}/wrap-up` once the wrap-up and feedback routes land.

**Network check:** open `https://hiremealready.study/rtc-test` on two devices, join the same room as A and B, and keep "Force TURN relay" on. "Path: TURN relay" plus video both ways means calls will work on that network. Run it on the venue Wi-Fi before demoing.

## AI interviewer (ElevenLabs)

The interviewer is an ElevenLabs Agent whose config (prompt, first message, Gemini LLM, end-call tool, limits) lives in `src/lib/elevenlabs/interviewer-agent.ts`. After editing it, run `npm run agent:sync` to push the change. It creates the agent the first time and updates it after that.

- Sessions require a signed URL from our server (`getSignedUrl()` in `src/lib/elevenlabs/index.ts`), so the agent can't be used from outside the app.
- Each session fills `{{candidate_name}}`, `{{job_title}}`, `{{company}}`, `{{resume_summary}}`, and `{{questions}}` (see `InterviewVariables`).
- `getConversation(id)` returns the transcript. It reaches `status: "done"` a few seconds after the call ends.
- The ElevenLabs account is on the free plan, so conversation minutes are scarce. Test with the `text_only` override where possible.

## Deploying

```bash
scripts/deploy.sh
```

This rsyncs your working tree to `/opt/hiremealready` on the droplet, then runs `docker compose up -d --build` there (about 2–3 minutes). Caddy serves `https://hiremealready.study` with an automatic Let's Encrypt certificate and redirects `www` and plain HTTP to it.

- The droplet has its **own** `.env` at `/opt/hiremealready/.env`, which deploys never overwrite. It holds the production `BETTER_AUTH_URL`, its own `BETTER_AUTH_SECRET`, and the `NEXT_PUBLIC_PEER_*` values. To change a value, edit that file on the droplet and redeploy.
- `NEXT_PUBLIC_*` variables are baked in at build time, so changing one requires a redeploy (rebuild), not just a restart.
- Logs: `ssh root@104.131.187.142 'cd /opt/hiremealready && docker compose logs -f web'`
- Deploy from a branch that's been merged (or is about to be); there's one shared production.
