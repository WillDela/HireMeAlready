# ShellHacks — AI Interview Platform: Backend Plan & Scope

## Context
This is a greenfield 36-hour hackathon build: a mock-interview platform with AI-interviewer mode (ElevenLabs voice + Gemini) and peer-to-peer video mode (WebRTC), plus AI question generation and post-interview analysis. It covers the build order (riskiest item first), four workstreams with frozen interfaces between them, the Prisma schema, a ranked cut list, and phase time boxes with a hard end-to-end checkpoint.

Confirmed with William:
- **36-hour hackathon, already underway (near the start).** The phases below are relative; the timeline is a guide, not a strict schedule. There's room for stretch items.
- **William owns Stream B** and makes the first commits: scaffold, schema, auth, contracts.
- **Nothing is provisioned yet.** There are 2 API keys and no code. Everything in §0 is an early task.
- **Scaffold locally now** with `git init`, and push once the GitHub repo exists.
- Stack is fixed as in the handoff and tech-stack image. Nothing here swaps a tool except the named WebRTC fallbacks.

---

## 0. First moves (William, before the streams split)

### Provisioning checklist (split across whoever is free; the DNS item comes first because HTTPS gates WebRTC testing)
| Item | Output → `.env` |
|---|---|
| GoDaddy Registry domain + A record → droplet IP | `BETTER_AUTH_URL=https://<domain>` |
| DO droplet (Ubuntu, 4 GB), Docker installed, firewall rules per Stream A | droplet IP |
| DO Spaces bucket + access key + CORS rule (PUT/GET from `https://<domain>` and `http://localhost:3000`) | `SPACES_*` |
| Tiger Cloud service (enable `vector`; `vectorscale` is available for the stretch) | `DATABASE_URL` |
| Gemini API key (Google AI Studio) | `GEMINI_API_KEY` |
| ElevenLabs API key + Agent created in the dashboard, LLM set to Gemini | `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` |
| Random secrets (`openssl rand -hex 32`) | `BETTER_AUTH_SECRET`, `TURN_SECRET` |

Confirm which provider the 2 existing API keys belong to, then create the rest.

### First commits (Stream B, local repo, pushed when GitHub is connected)
1. `create-next-app` in `~/shellhacks-interview` (you can rename it once the domain is picked), with TypeScript, Tailwind, App Router, `src/`, and ESLint, then `git init`. Standalone output goes in `next.config.ts`.
2. `shadcn init` with a few base components (button, card, input, dialog, sonner), so Stream D starts with them.
3. Prisma + the schema from §3. Better Auth models are generated first, then the app models are added. The first migration includes the pgvector SQL, and it's applied to Tiger Cloud.
4. Better Auth: `src/lib/auth.ts` (Prisma adapter, email/password), `src/lib/auth-client.ts`, `src/app/api/auth/[...all]/route.ts`, and a minimal sign-in page to prove it works.
5. `src/lib/contracts.ts` (zod schemas from §4), `src/lib/db.ts` (Prisma singleton), `src/lib/storage.ts` (S3 client + presign helper).
6. `.env.example`, `README.md` with setup steps + stream ownership table, and `src/lib/gemini/index.ts` stubs returning fixtures (so C's interface exists on day one).
7. Push, then teammates clone and branch per stream. Each stream uses feature branches + PRs into `main`, never direct pushes.

---

## 1. Scope

### In scope (MVP, load-bearing for the demo)
| Area | What ships |
|---|---|
| Auth | Email/password sign up and login (Better Auth), profile with interviewer/interviewee role toggle |
| Resume | PDF upload to DO Spaces → Gemini parse → structured JSON + 768-d embedding stored in pgvector |
| Questions | Gemini generates questions from resume + job title/description; optional Google Search grounding for a named company |
| AI interview | User webcam preview + ElevenLabs Agent voice (Gemini LLM) asking the generated questions; transcript pulled from ElevenLabs |
| Peer interview | Queue → match → PeerJS video call over coturn; interviewer/interviewee roles; Exit + Report buttons |
| Fallback | If no human match within ~30s, offer the AI interviewer |
| Post-interview | History list, full transcript, Gemini structured analysis, interviewer's written feedback, participant contact card |
| Deploy | One DO droplet, Docker Compose (web, peer, caddy, coturn), HTTPS on a GoDaddy Registry domain |

### Stretch (only after the hard checkpoint, ~H22)
- Resume-similarity matching (instead of FIFO)
- Friend requests + direct session invites
- Friend chat
- Tiger Data showcase: pgvectorscale `diskann` index + a hypertable for call telemetry with a live stats widget
- SSE instead of polling for queue/analysis status

### Out of scope
Mobile apps, group interviews, server-side call recording, moderation workflow beyond storing reports, OAuth providers (add Google OAuth only if it takes <20 min), payments, email notifications.

---

## 2. Build order (riskiest first)

1. **WebRTC spike (Stream A, starts right after DNS + droplet exist, time-boxed to ~5h).** Needs HTTPS because `getUserMedia` requires a secure context, so the domain, DNS, and Caddy are part of the spike.
   - **Pass criterion:** two laptops on *different networks* (venue WiFi + a phone hotspot) get two-way video through the droplet with `iceTransportPolicy: 'relay'` forced, which proves TURN relays traffic rather than connecting directly by luck.
   - **Decision point (~5h into the spike):**
     - Pass → continue with self-hosted PeerJS + coturn.
     - Fail on TURN (the venue usually blocks UDP/3478) → **Fallback 1: Metered.ca managed TURN** (supports `turns:` on 443). Keep PeerJS signaling. This is roughly a 15-min config swap in `/api/turn-credentials`.
     - Fail on signaling → temporarily point PeerJS at the public `0.peerjs.com` cloud server and keep debugging the self-hosted one on the side.
   - **Hard stop (~8h):** if video still isn't reliable → **Fallback 2: Daily.co Prebuilt** (iframe, free tier). Mic recording for transcription still works because we call `getUserMedia` separately. The interface in `src/lib/rtc/` stays the same, so no other stream changes.
2. **Schema + auth + contracts frozen (Stream B, H0–H2).** Everything else depends on these.
3. **Gemini lib functions behind stubs (Stream C, first ~8h).** The stubs return fixtures from minute one so B and D aren't blocked.
4. **ElevenLabs AI interview (Stream C, ~H5–H13).** Second-riskiest item: agent config, signed URL, and transcript retrieval.
5. **Queue/matching (Stream B, ~H4–H12)** → wired into A's call page.
6. **Post-interview pipeline (C + D, ~H14–H18):** recording upload → transcription → analysis → history UI.
7. **Integration** → **hard checkpoint (~H22)**. See §5.

---

## 3. Prisma schema (proposed, frozen at H2)

Key decisions:
- **Name the interview model `Interview`, not `Session`.** Better Auth already owns a `Session` model (auth sessions), and two "sessions" would cause a naming collision.
- **Better Auth's generated models (`User`, `Session`, `Account`, `Verification`) are generated once at H0** with `npx @better-auth/cli generate`, then only back-relation fields are hand-added to `User`. App data lives in `Profile` so the auth models stay nearly untouched.
- **Prisma has no native vector type.** Declare the column as `Unsupported("vector(768)")` and read/write it with `$queryRaw` / `$executeRaw`. The index is created in a hand-written migration.
- **Embeddings:** `gemini-embedding-001` with `outputDimensionality: 768`. That's plenty for resumes, and it stays under pgvector's 2000-dim limit for HNSW indexes.

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")       // Tiger Cloud, sslmode=require
  extensions = [vector]
}

// ---------- Better Auth (generated at H0; only back-relations added by hand) ----------
model User {
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[]
  accounts      Account[]

  profile        Profile?
  resumes        Resume[]
  participations Participant[]
  queueEntry     QueueEntry?
  feedbackGiven  Feedback[]    @relation("FeedbackAuthor")
  feedbackGot    Feedback[]    @relation("FeedbackSubject")
  reportsMade    Report[]      @relation("Reporter")
  reportsAgainst Report[]      @relation("Reported")
  friendsOut     Friendship[]  @relation("Requester")
  friendsIn      Friendship[]  @relation("Addressee")
  messagesOut    Message[]     @relation("Sender")
  messagesIn     Message[]     @relation("Recipient")
  invitesOut     Invitation[]  @relation("Inviter")
  invitesIn      Invitation[]  @relation("Invitee")
}
// model Session / Account / Verification — exactly as the Better Auth CLI emits them

// ---------- Enums ----------
enum InterviewRole   { INTERVIEWER INTERVIEWEE }
enum InterviewMode   { AI PEER }
enum InterviewStatus { PENDING ACTIVE COMPLETED ABANDONED }
enum QueueStatus     { WAITING MATCHED CANCELLED EXPIRED }
enum JobStatus       { PENDING PROCESSING READY FAILED }   // parse / transcribe / analyze
enum Speaker         { AI INTERVIEWER INTERVIEWEE }
enum FriendStatus    { PENDING ACCEPTED DECLINED }
enum InviteStatus    { PENDING ACCEPTED DECLINED EXPIRED }

// ---------- Profile & resume ----------
model Profile {
  userId         String        @id
  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  preferredRole  InterviewRole @default(INTERVIEWEE)
  headline       String?
  targetRole     String?
  linkedinUrl    String?
  shareContact   Boolean       @default(true)   // gates the "people involved" contact card
  activeResumeId String?       @unique
}

model Resume {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  storageKey  String                              // DO Spaces object key
  fileName    String
  parseStatus JobStatus @default(PENDING)
  parsed      Json?                               // ParsedResume (see contracts)
  embedding   Unsupported("vector(768)")?
  createdAt   DateTime  @default(now())
  @@index([userId])
}

// ---------- Interviews ----------
model Interview {
  id                 String          @id @default(cuid())
  mode               InterviewMode
  status             InterviewStatus @default(PENDING)
  jobTitle           String?
  company            String?
  jobDescription     String?
  elevenConversation String?         @unique        // AI mode only
  transcriptStatus   JobStatus       @default(PENDING)
  startedAt          DateTime?
  endedAt            DateTime?
  createdAt          DateTime        @default(now())

  participants Participant[]
  questions    Question[]
  segments     TranscriptSegment[]
  recordings   Recording[]
  analysis     Analysis?
  feedback     Feedback[]
  reports      Report[]
  invitations  Invitation[]
  @@index([status, createdAt])
}

model Participant {
  id          String        @id @default(cuid())
  interviewId String
  interview   Interview     @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  userId      String
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  role        InterviewRole
  peerId      String        @unique       // deterministic PeerJS id: `${interviewId}-${role}`
  joinedAt    DateTime?
  leftAt      DateTime?
  recordings  Recording[]
  @@unique([interviewId, userId])
}

model Question {
  id          String    @id @default(cuid())
  interviewId String
  interview   Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  order       Int
  text        String
  category    String                    // behavioral | technical | role-specific
  rationale   String?
  sourceUrl   String?                   // from Search grounding
  @@unique([interviewId, order])
}

model Recording {                        // peer mode: each client records ONLY its own mic
  id            String      @id @default(cuid())
  interviewId   String
  interview     Interview   @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  participantId String
  participant   Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)
  storageKey    String
  mimeType      String
  startedAt     DateTime                // wall clock, used to align both speakers' segments
  status        JobStatus   @default(PENDING)
  createdAt     DateTime    @default(now())
}

model TranscriptSegment {
  id          String    @id @default(cuid())
  interviewId String
  interview   Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  speaker     Speaker
  userId      String?
  startMs     Int                       // offset from Interview.startedAt
  endMs       Int?
  text        String
  @@index([interviewId, startMs])
}

model Analysis {
  id            String    @id @default(cuid())
  interviewId   String    @unique
  interview     Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  subjectUserId String                  // the interviewee being analyzed
  status        JobStatus @default(PENDING)
  result        Json?                   // AnalysisResult (see contracts)
  model         String?
  error         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Feedback {                         // written by the human interviewer
  id           String    @id @default(cuid())
  interviewId  String
  interview    Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  authorId     String
  author       User      @relation("FeedbackAuthor",  fields: [authorId],  references: [id])
  subjectId    String
  subject      User      @relation("FeedbackSubject", fields: [subjectId], references: [id])
  rating       Int?                     // 1–5
  strengths    String
  improvements String
  createdAt    DateTime  @default(now())
  @@unique([interviewId, authorId])
}

model Report {
  id          String    @id @default(cuid())
  interviewId String
  interview   Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  reporterId  String
  reporter    User      @relation("Reporter", fields: [reporterId], references: [id])
  reportedId  String
  reported    User      @relation("Reported", fields: [reportedId], references: [id])
  reason      String
  details     String?
  createdAt   DateTime  @default(now())
}

// ---------- Matching ----------
model QueueEntry {                       // one row per user; upserted on join
  id           String        @id @default(cuid())
  userId       String        @unique
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  role         InterviewRole
  status       QueueStatus   @default(WAITING)
  jobTitle     String?
  interviewId  String?                  // set when MATCHED; partner reads it on next poll
  lastSeenAt   DateTime      @default(now())   // heartbeat; stale > 15s = ignored
  createdAt    DateTime      @default(now())
  @@index([status, role, createdAt])
}

// ---------- Social (stretch) ----------
model Friendship {
  id          String       @id @default(cuid())
  requesterId String
  requester   User         @relation("Requester", fields: [requesterId], references: [id], onDelete: Cascade)
  addresseeId String
  addressee   User         @relation("Addressee", fields: [addresseeId], references: [id], onDelete: Cascade)
  status      FriendStatus @default(PENDING)
  createdAt   DateTime     @default(now())
  @@unique([requesterId, addresseeId])
}

model Message {
  id          String    @id @default(cuid())
  senderId    String
  sender      User      @relation("Sender",    fields: [senderId],    references: [id], onDelete: Cascade)
  recipientId String
  recipient   User      @relation("Recipient", fields: [recipientId], references: [id], onDelete: Cascade)
  body        String
  readAt      DateTime?
  createdAt   DateTime  @default(now())
  @@index([senderId, recipientId, createdAt])
}

model Invitation {
  id          String       @id @default(cuid())
  interviewId String
  interview   Interview    @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  fromId      String
  from        User         @relation("Inviter", fields: [fromId], references: [id], onDelete: Cascade)
  toId        String
  to          User         @relation("Invitee", fields: [toId],   references: [id], onDelete: Cascade)
  status      InviteStatus @default(PENDING)
  createdAt   DateTime     @default(now())
}
```

Hand-written migration SQL added after `prisma migrate dev --create-only`:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX resume_embedding_hnsw ON "Resume" USING hnsw (embedding vector_cosine_ops);
-- stretch (Tiger Data showcase): CREATE EXTENSION vectorscale; swap to USING diskann
```

---

## 4. Four workstreams & ownership

Merge-conflict rules:
- **Only Stream B edits `prisma/schema.prisma` and `src/lib/contracts.ts`.** Others request changes in the team chat, and B lands them within 15 min.
- **Only Stream D edits `src/components/ui/*`** (the shadcn components) and the root layout.
- Every stream works in its own route folders.

### Stream A — Infra & Realtime (owner: TBD, strongest with Linux/networking)
Owns: `docker-compose.yml`, `Caddyfile`, `coturn/turnserver.conf`, `Dockerfile`, `src/lib/rtc/*`, `src/app/api/turn-credentials/`, `src/app/(app)/interview/[id]/peer/`, `src/components/call/*`
- Droplet (4 GB RAM or larger, because `next build` can run out of memory on 1 GB; or build the image locally and push it), DO firewall rules: 80, 443, 3478 tcp+udp, 5349 tcp, UDP relay range 49160–49200 (set `min-port`/`max-port` in coturn).
- Compose services:
  - `web` (Next.js standalone build, port 3000)
  - `peer` (`peerjs/peerjs-server --port 9000 --path /peerjs`)
  - `caddy` (ports 80/443)
  - `coturn` (`network_mode: host`, `external-ip=<droplet IP>`, `use-auth-secret`, `static-auth-secret`, `realm`)
- Caddy config: `handle /peerjs* → peer:9000` (websocket), everything else → `web:3000`.
- `GET /api/turn-credentials` → time-limited TURN REST credentials (HMAC-SHA1 of `expiry:userId` with the shared secret, ~15 lines).
- `usePeerCall({ selfPeerId, remotePeerId, isCaller, iceServers })` → `{ localStream, remoteStream, state, hangUp }`. The interviewer is always the caller.
- `useMicRecorder()` records the **local mic only** (so each speaker is already separated before transcription). At call end it uploads through a presigned URL and then calls `POST /api/interviews/:id/recordings`.
- In-call controls: Exit (sends a `bye` over the PeerJS data channel, then calls `POST /end`) and Report (dialog → `POST /report`, then exit).

### Stream B — Data, Auth, Profiles, Matching (owner: William)
Owns: `prisma/*`, `src/lib/db.ts`, `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/storage.ts`, `src/lib/contracts.ts`, `src/lib/matching.ts`, `src/app/api/{auth,profile,resume,queue,interviews,friends,messages,invitations}/`
- H0–H2: Next.js skeleton, Prisma → Tiger Cloud, Better Auth (email/password + Prisma adapter, `/api/auth/[...all]`), `contracts.ts`, env template. **Freeze at H2.**
- Resume: `POST /api/resume/upload-url` (presigned PUT to Spaces; the bucket needs a CORS rule for the domain, which is easy to forget) → `POST /api/resume` confirms the upload, then runs in the background via Next `after()`: `parseResume` → `embedText(parsed.summary + skills)` → `UPDATE ... SET embedding = $1::vector`.
- Interview CRUD:
  - `POST /api/interviews` creates an AI interview (+ questions via C's `generateQuestions`)
  - `GET /api/interviews` returns history
  - `GET /api/interviews/:id` returns detail (participants + contact if `shareContact`, questions, segments, analysis, feedback)
  - `POST /:id/end`, `POST /:id/feedback`, `POST /:id/report`
- Queue:
  - `POST /api/queue` joins (upserts WAITING)
  - `GET /api/queue` polls every 2s. Each poll updates `lastSeenAt` and tries to match.
  - `DELETE /api/queue` leaves
  - Matching runs inside one transaction: `SELECT … WHERE status='WAITING' AND role=<opposite> AND "lastSeenAt" > now()-'15s' ORDER BY createdAt LIMIT 1 FOR UPDATE SKIP LOCKED`. On a hit, create the Interview + 2 Participants, and mark both entries MATCHED with `interviewId`.
  - Stretch: `ORDER BY resume.embedding <=> my_embedding` instead of FIFO. It's one SQL change, which is why it's cheap to add late.
  - The client shows an "Try the AI interviewer instead?" prompt after 30s.
- Stretch: friends/messages/invitations (polling).

### Stream C — AI (Gemini + ElevenLabs) (owner: TBD)
Owns: `src/lib/gemini/*`, `src/lib/elevenlabs.ts`, `src/app/api/ai/*`, `src/app/(app)/interview/[id]/ai/`, `src/lib/pipeline/*`
- Pure functions with fixture stubs committed by H1 (other streams import these):
  - `parseResume(pdf: Buffer): Promise<ParsedResume>`: PDF sent inline, `responseSchema` JSON output
  - `embedText(text): Promise<number[]>`: 768-d
  - `generateQuestions({ resume, jobTitle, jobDescription?, company?, grounded, count }): Promise<GeneratedQuestion[]>`. With grounding on, it runs **two calls**: a grounded call returns free text + source URLs, then a second call structures it into JSON. Grounding and a strict JSON schema may not combine on every model, so don't depend on it.
  - `transcribeAudio(buf, mime): Promise<{startMs,endMs,text}[]>`: inline audio (<20 MB, which is fine for a 15-min Opus recording)
  - `analyzeInterview({ transcript, questions, jobTitle, feedback? }): Promise<AnalysisResult>`
  - Model names come from env vars (`GEMINI_MODEL`, `GEMINI_EMBED_MODEL`), so they can be swapped without code changes.
- ElevenLabs:
  - Create one Agent in the dashboard, with LLM = Gemini (the built-in option).
  - System prompt uses dynamic variables `{{candidate_name}} {{job_title}} {{company}} {{questions}} {{resume_summary}}`.
  - `POST /api/ai/signed-url {interviewId}` → the server calls `GET /v1/convai/conversation/get-signed-url` and returns `{ signedUrl, dynamicVariables }`.
  - The client uses `@elevenlabs/react` `useConversation().startSession(...)` and stores `conversationId` via `PATCH /api/interviews/:id`.
  - The AI page shows the webcam preview (local only) + an animated orb driven by `isSpeaking`, plus a live caption from `onMessage`.
- Pipeline (`src/lib/pipeline/finalize.ts`, triggered by `/end` and by recording upload through `after()`):
  - AI mode: fetch `GET /v1/convai/conversations/{id}`, retrying for up to ~20s while ElevenLabs processes it, then map the turns to `TranscriptSegment`.
  - Peer mode: wait for both Recordings (or 60s), transcribe each one, offset each segment by `recording.startedAt - interview.startedAt`, and merge.
  - Then run `analyzeInterview` → `Analysis.result`, status READY. The UI polls `GET /api/interviews/:id`.

### Stream D — Product UX & Post-interview (owner: TBD, strongest on frontend/design)
Owns: `src/components/ui/*`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/(auth)/*`, `src/app/(app)/{dashboard,profile,lobby,history,friends}/*`, `src/components/{history,lobby,profile}/*`
- Builds against `contracts.ts` fixtures from H2, so D is never blocked on real APIs.
- Pages:
  - Landing
  - Sign in / sign up
  - Onboarding (role toggle, resume upload with parsed-skills preview)
  - Lobby (pick AI or Peer, JD / company form, queue waiting screen with the AI-fallback CTA)
  - History list
  - Interview detail (transcript view, analysis cards/scores, feedback, contact card)
  - Feedback form for interviewers
- Owns the demo: the script, seed data, the second demo laptop setup, and the Devpost write-up + domain pick (GoDaddy Registry challenge).

### Shared contracts (`src/lib/contracts.ts`, zod + inferred types, frozen H2)
```ts
ParsedResume      = { name?, summary, skills: string[], experience: {company,title,start?,end?,bullets[]}[], education: {school,degree?,year?}[] }
GeneratedQuestion = { text, category: 'behavioral'|'technical'|'role-specific', rationale?, sourceUrl? }
TranscriptLine    = { speaker: 'AI'|'INTERVIEWER'|'INTERVIEWEE', userId?, startMs, endMs?, text }
AnalysisResult    = { summary, overallScore /*0-100*/, scores: {communication,structure,technicalDepth,relevance}, strengths: string[], improvements: string[],
                      perQuestion: {question, answerSummary, feedback, score}[] }
QueueState        = { state:'waiting', since } | { state:'matched', interviewId, role, selfPeerId, remotePeerId } | { state:'expired' }
IceServersResponse= { iceServers: RTCIceServer[], ttl }
InterviewDetail   = { id, mode, status, jobTitle, company, startedAt, endedAt, participants: {userId,name,role,contact?}[],
                      questions: GeneratedQuestion[], transcript: TranscriptLine[], transcriptStatus, analysis: {status, result?}, feedback: {...}[] }
```

### Env vars (`.env.example`, owned by B)
`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `SPACES_KEY`, `SPACES_SECRET`, `SPACES_BUCKET`, `SPACES_REGION`, `SPACES_ENDPOINT`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_EMBED_MODEL`, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `TURN_SECRET`, `TURN_HOST`, `NEXT_PUBLIC_PEER_HOST`, `NEXT_PUBLIC_PEER_PATH`

---

## 5. Phases (36h event; hours are guides, not deadlines)

| Phase | Work | Exit criteria |
|---|---|---|
| **1. Foundation** (~first 3h) | §0 provisioning + first commits. A: DNS → droplet, Caddy HTTPS, compose skeleton. C: Gemini/ElevenLabs key sanity checks. D: app shell + auth pages. | Sign up works on `https://<domain>`; contracts merged |
| **1b. WebRTC spike** (A, parallel, time-boxed to ~5h) | See §2 | Relay-only video across two networks → **go/no-go decision** |
| **2. Build** (~until H14) | B: resume upload/parse/embed, interview CRUD, queue. C: real Gemini functions, ElevenLabs agent + AI page. D: onboarding, lobby, history against fixtures. A: `usePeerCall`, call page, recorder. | Each stream's features work alone with real APIs |
| **3. Pipeline + wiring** (~H14–H18) | C: finalize pipeline. B+A: queue → call page. D: swap fixtures for real APIs. | AI interview → analysis works on the droplet |
| **4. Integration** (~H18–H22) | On the deployed droplet only | ✅ **HARD CHECKPOINT (~H22)**: both demo paths in §7 work end-to-end on the prod URL from two laptops |
| **5. Polish + stretch** (~H22–H30) | Polish first (loading/empty/error states, orb animation), then stretch items in reverse cut-list order (resume matching → grounding polish → friends → Tiger Data showcase) | — |
| **6. Freeze + rehearse** (~H30–H34) | Feature freeze, bug fixes only, demo rehearsal with a timer, seed demo accounts, deploy freeze ~H33 | Demo runs clean 3 times in a row |
| **7. Submit** (~H34–H36) | Devpost (select all sponsor challenges), buffer | Submitted |

If the checkpoint slips: stop stretch work and cut from the top of §6 until it passes.

Sleep: stagger shifts so at least one of the B/C backend owners is always awake.

---

## 6. Cut list (drop first → last)

| # | Cut | Degrades to |
|---|---|---|
| 1 | Friend chat | — |
| 2 | Friends + direct invites | Random queue only (also decides against entering INIT "Building Together") |
| 3 | Tiger Data hypertable/stats widget | pgvector + diskann story only |
| 4 | SSE | Polling (already the default) |
| 5 | Resume-similarity matching | FIFO opposite-role matching. Embeddings are still stored, but pgvector no longer drives anything visible in the demo, which weakens the Tiger Data pitch, so cut this late |
| 6 | Web-grounded company questions | Resume + JD questions without grounding |
| 7 | Contact card | Participant names only |
| 8 | Peer-call transcription | Peer mode analysis = human feedback only; AI mode keeps full transcript + analysis |
| 9 | Report dialog | Report button writes a row with reason "unspecified" + exits (never fully cut; it's a listed feature and takes 10 min) |

**Never cut (load-bearing):** auth; resume upload + parse; question generation (basic); AI voice interview; peer video call over our own droplet (or the named fallback); post-interview AI analysis + transcript for AI mode; history; interviewer written feedback; Exit button; HTTPS on the custom domain.

Microsoft "What's Missing?" guardrail: the core flow is the video call. Friend chat stays a side feature, and the AI interview UI must never become a text chat box.

---

## 7. Demo paths (the hard checkpoint verifies these)

**Path 1: AI interview (a judge can drive it):** sign in → profile shows parsed resume skills → lobby: "Software Engineer Intern @ Google" + pasted JD, grounded on → questions appear with source links → Start AI interview → the judge answers 1–2 questions to the ElevenLabs voice → End → within ~15s history shows the transcript + analysis scores.

**Path 2: Peer interview:** laptop A (interviewee) and laptop B (interviewer, on a phone hotspot) both join the queue → matched in under 5s → two-way video → interviewer clicks End → writes feedback → both see the session in history with transcript + analysis + feedback + contact card.

**Pre-seeded safety net:** one completed peer interview already in history, so the post-interview view can be shown even if live transcription is slow. (Everything shown is still live-capable, not a recording.)

---

## 8. Verification per phase
- **Spike:** `chrome://webrtc-internals` shows the selected candidate pair is `relay`. Test on venue WiFi + a hotspot. `turnutils_uclient` from a laptop against the droplet.
- **Auth/DB:** `prisma migrate deploy` against Tiger Cloud; sign up/in/out on the prod URL; `psql` confirms the `vector` extension and the HNSW index.
- **Resume:** upload a real PDF → `Resume.parseStatus = READY`, `parsed` JSON looks right, `SELECT embedding IS NOT NULL`.
- **Queue:** two browsers (one incognito) as opposite roles match; a third user stays waiting; a user who closed the tab (stale `lastSeenAt`) is never matched.
- **AI:** each `src/lib/gemini` function has a `scripts/try-*.ts` runnable with `tsx` against a fixture input. The ElevenLabs conversation id is stored and its transcript retrieved.
- **E2E:** run both demo paths on the droplet from two physical machines on different networks, 3 clean runs in a row before the feature freeze (~H30).

---

## 9. Top risks
| Risk | Mitigation |
|---|---|
| Venue WiFi blocks UDP / 3478 | Test at H1 on-site; Metered `turns:443` fallback ready |
| ElevenLabs transcript not ready right after the call | Retry loop; fall back to the client-side `onMessage` log POSTed at end |
| Gemini grounding + JSON schema incompatibility | Two-call pattern (grounded text → structure) |
| `next build` running out of memory on the droplet | 4 GB droplet or build locally and push the image |
| Spaces CORS blocks browser upload | Add the bucket CORS rule in H0 setup |
| Tab closed mid-call → recording lost | Explicit End button in the demo; `pagehide` best-effort upload; analysis falls back to whatever transcript exists |
| Schema churn breaks others | Single owner + contracts frozen H2 + additive-only changes after that |
