# AI Interview Practice (ShellHacks)

Mock interviews with an AI interviewer (ElevenLabs voice + Gemini) or a real person over WebRTC, with AI-generated questions and post-interview analysis.

The full plan (scope, schema, workstreams, cut list, phases) is in [`docs/PLAN.md`](docs/PLAN.md).

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind 4 + shadcn/ui · Better Auth · Prisma 7 → Tiger Cloud Postgres + pgvector · DigitalOcean Spaces · Gemini · ElevenLabs Agents · PeerJS + coturn · Docker Compose + Caddy on a DigitalOcean droplet

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
| **A — Infra & Realtime** | `docker-compose.yml`, `Caddyfile`, `coturn/`, `Dockerfile`, `src/lib/rtc/`, `src/app/api/turn-credentials/`, `src/app/(app)/interview/[id]/peer/`, `src/components/call/` |
| **B — Data, Auth, Matching** (William) | `prisma/`, `src/lib/{db,auth,auth-client,session,api,storage,vector,contracts,matching}.ts`, `src/app/api/{auth,profile,resume,queue,interviews,friends,messages,invitations}/` |
| **C — AI** | `src/lib/gemini/`, `src/lib/elevenlabs.ts`, `src/lib/pipeline/`, `src/app/api/ai/`, `src/app/(app)/interview/[id]/ai/` |
| **D — Product UX** | `src/components/ui/`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/(auth)/`, `src/app/(app)/{dashboard,profile,lobby,history,friends}/`, `src/components/{history,lobby,profile}/` |

Shared interfaces live in `src/lib/contracts.ts` (zod schemas + types). `src/lib/gemini/index.ts` currently returns fixtures with the final signatures, so UI and API work doesn't wait on Gemini.

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

**Network check:** open `https://hiremealready.study/rtc-test` on two devices, join the same room as A and B, and keep "Force TURN relay" on. "Path: TURN relay" plus video both ways means calls will work on that network. Run it on the venue Wi-Fi before demoing.

## Deploying

```bash
scripts/deploy.sh
```

This rsyncs your working tree to `/opt/hiremealready` on the droplet, then runs `docker compose up -d --build` there (about 2–3 minutes). Caddy serves `https://hiremealready.study` with an automatic Let's Encrypt certificate and redirects `www` and plain HTTP to it.

- The droplet has its **own** `.env` at `/opt/hiremealready/.env`, which deploys never overwrite. It holds the production `BETTER_AUTH_URL`, its own `BETTER_AUTH_SECRET`, and the `NEXT_PUBLIC_PEER_*` values. To change a value, edit that file on the droplet and redeploy.
- `NEXT_PUBLIC_*` variables are baked in at build time, so changing one requires a redeploy (rebuild), not just a restart.
- Logs: `ssh root@104.131.187.142 'cd /opt/hiremealready && docker compose logs -f web'`
- Deploy from a branch that's been merged (or is about to be); there's one shared production.
