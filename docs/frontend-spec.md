# See Newspaper — Frontend Specification

> A build brief for the frontend of **See Newspaper**, a personal AI newspaper
> by Percussion Labs. This document describes the product, the three surfaces to
> build, the exact API to talk to, the onboarding flow, and the visual design.

---

## 1. Product overview

See Newspaper gives each reader their own daily paper: a small set of curated
stories per section, a "key learning" of the day, and a short quiz — all tuned
to what they care about. The backend already exists (AdonisJS REST API); this
brief is for the **web frontend**.

There are **three surfaces** to build, ideally as one app with routing (or two
apps if you prefer to separate admin):

1. **Reader onboarding** — an invite-only, magic-link, four-stage setup flow.
2. **Reader app** — the daily edition plus settings.
3. **Admin console** — a small area for admins to invite readers.

The product is **invite-only**: there is no public sign-up. An admin invites
people by email; each gets a magic link and walks the onboarding flow.

---

## 2. Tech, conventions & auth

### Base URL & CORS
- All endpoints live under **`{API_BASE}/api/v1`**. Put the API base in an env var
  (`NEXT_PUBLIC_API_BASE_URL` for direct client calls, or a server-only
  `API_BASE_URL` if you proxy — see §3). In local dev the backend serves at
  `http://localhost:3333`.
- If the browser calls the backend **directly**, its origin must be added to the
  backend's CORS allow list (a small backend config change — coordinate if you hit
  CORS errors). If you **proxy through Next.js Route Handlers** (recommended), all
  browser calls are same-origin and CORS is a non-issue.

### Response envelope
- **Success bodies are wrapped in `data`**: `{ "data": { ... } }`. Always read
  `response.data`.
- A few endpoints return a bare `{ "message": "..." }` (the logout endpoints) —
  noted per-endpoint below.
- `204 No Content` is returned by deletes (empty body).

### Error shapes (handle both)
- **Domain errors** (a specific rule): `{ "error": "Human readable message." }`
  with an appropriate status (`404`, `409`, `422`).
- **Validation errors** (bad/missing fields): `{ "errors": [ { "message": "...",
  "field": "email", "rule": "required" }, ... ] }` with status `422`.
- **Auth failures**: `401` with an `errors` array; **bad credentials** on login:
  `400`.
- A robust handler: if `body.error` is a string, show it; else if `body.errors`
  is an array, show/annotate each; else show a generic message.

### Authentication
- Auth is **bearer token**. Send `Authorization: Bearer <token>` on every
  protected request.
- There are **two independent token types**:
  - **Reader token** — from `POST /auth/login` or `POST /onboarding/accept`.
    Grants the reader app + reader settings + onboarding stage 3.
  - **Admin token** — from `POST /admin/login`. Grants the admin console only.
  - They are not interchangeable. Store them under different keys; a reader token
    gets `401` on admin routes and vice-versa.
- Tokens **do not expire** (no refresh flow needed). Persist in `localStorage`
  (or `sessionStorage` if you prefer). On `401`, clear the token and redirect to
  the relevant login/landing.
- **Logout**: call the logout endpoint (best-effort) and clear the stored token.

### Misc
- Dates from the API are **ISO 8601 strings** (e.g. `2026-07-15T09:00:00.000Z`)
  or `YYYY-MM-DD` for edition dates. Format for display client-side.
- Token values are opaque strings (e.g. `oat_Mtk...`); don't parse them.

---

## 3. Visual design & brand

**See Newspaper** — an elegant, calm, editorial feel. Think "a beautifully typeset
personal broadsheet," not a busy dashboard. Generous whitespace, restrained
colour, serif headlines. The existing email digest already uses this system;
match it.

### Colour palette (Percussion Labs)

| Token            | Hex       | Use |
|------------------|-----------|-----|
| Primary          | `#A676FC` | Accent bars, primary buttons, links, active states, source labels |
| Navy (ink)       | `#1E1647` | Headlines, primary text on light |
| Deep purple      | `#4C398F` | Secondary emphasis, greetings, hovers |
| Medium purple    | `#D798FD` | Highlights, badges |
| Light lavender   | `#DAC5FD` | Soft fills, dividers, tags |
| Divider lavender  | `#EDE7FB` | Hairline separators between items |
| Page background  | `#F1F1F1` | App background |
| Body text        | `#4A4560` | Paragraph / summary text |
| Muted text       | `#9B93B5` | Meta, captions, footers, placeholders |
| Surface          | `#FFFFFF` | Cards |

Accents/gradients may lean on the purples; keep backgrounds neutral (`#F1F1F1` /
white). Success/error can use conventional green/red but tinted to sit calmly
next to the palette.

### Typography
- **Headlines & titles: Lora** (serif) — confident, elegant, authoritative. Use
  for the wordmark, page/section titles, story headlines, dates. Bold for impact,
  italic for occasional emphasis. Fallback: `Georgia, 'Times New Roman', serif`.
- **Body, UI & subheaders: Geist** (sans-serif). Fallback: `-apple-system,
  BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`.
- Both are on Google Fonts. Generous line-height (~1.6) for body.

### Shape & components
- Cards: white, **rounded 12–16px**, subtle shadow, ~24–40px padding.
- A **6px primary-coloured accent bar** at the top of key cards is a signature
  motif (see the email).
- Buttons: primary = solid `#A676FC` white text, rounded 10px, 14×28px padding;
  secondary = outline/ghost in navy or purple.
- Source/section labels: small, uppercase, letter-spaced, in `#A676FC`.
- Footer wordmark: "See Newspaper by Percussion Labs".

### Stack & architecture — Next.js

Build with **Next.js (App Router) + TypeScript**.

- **Rendering:** the authenticated surfaces (reader app, admin, onboarding past
  stage 1) are token-gated with a client-held bearer token, so those areas are
  **client components** (`'use client'`) that fetch from the API. Public/marketing
  or the magic-link landing can be static/server-rendered. Full SSR of reader data
  isn't required.
- **Data fetching:** use **TanStack Query** (or SWR) against the API — it fits the
  CRUD-heavy config screens (caching, mutations, optimistic rate/discard). Wrap
  the API in a small typed client (see below).
- **Routing (App Router):** map the flows to routes — `/onboard` (magic-link
  landing + stages), `/login`, the reader app under a route group (e.g.
  `(reader)/today`, `(reader)/editions/[date]`, `(reader)/settings/*`,
  `(reader)/submit`), and the admin console under `(admin)/admin/*`. Use layouts +
  a guard (redirect to the right login/landing when the relevant token is absent).
- **Auth token handling — two options:**
  - *Simple:* keep the reader and admin tokens in `localStorage`, injected by a
    per-surface fetch wrapper; on `401`, clear and redirect. (Requires the backend
    to allow the frontend origin via CORS.)
  - *More secure (recommended if easy):* proxy the API through Next.js **Route
    Handlers** (`app/api/*`) and keep tokens in **httpOnly cookies** — this also
    sidesteps CORS entirely, since the browser only ever calls same-origin
    `/api/*`. Either is fine; pick one and be consistent.
- **Styling:** **Tailwind CSS**, with the palette in §3 mapped to theme tokens
  (e.g. `primary: #A676FC`, `ink: #1E1647`). Load **Lora** and **Geist** via
  `next/font/google` (set them as CSS variables and wire into the Tailwind
  `fontFamily` for `font-serif` = Lora headlines, `font-sans` = Geist body).
- **Typed client:** generate it from `docs/openapi.yaml` (e.g. `@hey-api/openapi-ts`
  or `orval`) so requests/responses are typed end-to-end, or at minimum generate
  types with `openapi-typescript`.
- **Env:** `NEXT_PUBLIC_API_BASE_URL` for the API origin (or, in the proxy
  approach, a server-only `API_BASE_URL`).

---

## 4. Surfaces & flows

### 4a. Reader onboarding (invite-only, magic link)

Entry point is the magic link in the invitation email:
`{APP_URL}/onboard?token=<token>`. Build a route at **`/onboard`** that reads the
`token` query param and runs the four stages. If the token is missing/invalid,
show a friendly "this link is invalid or has expired" screen.

**Stage 0 — validate link.** On load, `GET /onboarding/invitation?token=…`.
On success you get the invited `email` (show it, read-only). On `404`, show the
expired/invalid state (offer "ask your admin for a new invite").

**Stage 1 — create account.** Form: **name**, **password** (min 8). Email is
fixed (from the invitation). Submit → `POST /onboarding/accept { token, name,
password }`. On success you receive `{ user, token }` — **store the reader token**
and treat the reader as logged in for the rest of onboarding. Errors: `422`
(invalid/expired token or weak input), `409` (email already has an account).

**Stage 2 — persona.** A friendly form so the model can build the reader's
persona. Fields (only **role** and at least one **learning goal** are required):
- Role / line of work (required, text)
- Fields they want to learn about (required, list of chips/tags — ≥1)
- Industry (optional)
- Experience level (optional; free text or a select like junior/mid/senior)
- Interests (optional list)
- Goals — "what do you want from your newspaper?" (optional, textarea)
- Preferred depth (optional select: **deep** / **balanced** / **high-level**)
- Topics to avoid (optional list)
- Location / region (optional)

Submit → `POST /persona/generate`. Returns `{ persona }` (markdown). **Show the
generated persona and let them edit it** (a textarea; save with `PUT /persona
{ content }`). This is a nice "here's how we understand you" moment. (Submitting
the persona also sets the reader's learning-gap topics behind the scenes.)

**Stage 3 — categories & sources.** Two ways to define categories; support both
in one screen (a tab/toggle):
- **Describe interests (recommended default):** a single big textarea — "Tell us,
  in your own words, everything you'd like your newspaper to cover." Submit as
  `POST /onboarding/categories { interests: "…" }`.
- **Name categories:** let them add categories manually, each with a title and an
  optional description. Submit as `POST /onboarding/categories { categories:
  [{ title, description? }] }`.

This call **runs synchronously and can take a while** (the model proposes sources
per category and each RSS feed is fetched + verified). Show a "**Pulling great
sources for you…**" loading state. The response is `{ categories: [ …with their
sources ] }`.

> Note: a category may come back with an **empty `sources` array** if none of the
> proposed feeds resolved. That's expected — don't treat it as an error; prompt
> the reader to add sources in stage 4.

**Stage 4 — review & edit sources.** Show each category with its discovered
sources (name + feed URL). Let the reader:
- Toggle a source on/off, edit its name/feed, or delete it — `PUT`/`DELETE
  /config/sources/:id`.
- Add a source — `POST /config/sources`.
- Add/edit/delete a category — `POST`/`PUT`/`DELETE /config/categories`.

A **"Finish setup"** button ends onboarding and drops them into the reader app.

### 4b. Reader app

The reader logs in later at **`/login`** (`POST /auth/login { email, password }`)
→ store reader token. Main navigation:

**Today (home)** — `GET /editions/today`:
- If it returns `404`, show an empty state: "Your first edition is on its way"
  (with a button to trigger a build — see Run now — if you want to expose it).
- The **key learning** as a highlighted card at the top (`keyLearning`, markdown).
- The **categories**, each a titled section with its **items**. Each item card:
  serif headline linking to `url` (open in new tab), the `source` label, and the
  `summary`. Show the current `rating` if present.
  - **Rate**: 1–5 stars (+ optional note) → `POST /items/:id/rate`. Updates the
    item's rating.
  - **Discard**: "not interested" → `POST /items/:id/discard`. Returns the
    discarded item and its **promoted** replacement (or `null`). Swap the card
    for the replacement (or remove it) — nice little animation.
- The **quiz** section: each question (`question` + `options`), no answer shown.
  On answering `POST /quiz/:id/answer { selectedIndex }` → reveal `isCorrect`,
  the `correctIndex`, and the `explanation`. Show a running **score**
  (`GET /quiz/score` → answered / correct / accuracy).

**Past editions** — a date picker → `GET /editions/:date` (`YYYY-MM-DD`); same
layout; `404` when there's no edition for that day.

**Submit a link** — a small form (URL + optional note + today/tomorrow) →
`POST /links`. Confirmation toast. (These are links the reader wants considered
for a future edition.)

**Settings** — tabs:
- **Schedule & email**: run time (HH:mm), email on/off, **frequency** (daily /
  weekly / monthly). `GET`/`PUT /config/schedule`.
- **Categories & sources**: full CRUD (the stage-4 UI, reusable). `GET
  /config/categories`, `…/sources`, plus POST/PUT/DELETE.
- **Learning topics**: edit the list of gap topics (`GET`/`PUT /config/gap-topics`
  — PUT replaces the whole list).
- **Persona**: view/edit the persona markdown (`GET`/`PUT /persona`), and a
  "Regenerate from details" action that reopens the stage-2 form → `POST
  /persona/generate`.
- **Account**: name/email (read-only from `GET /account/profile`), logout.

**Run now (optional)** — `POST /run-daily` rebuilds *today's* edition for the
reader on demand. **It's slow** (scouts sources + several LLM calls) and may
email them. Only expose it behind a clear "Rebuild today's edition" action with a
spinner; disable while running.

### 4c. Admin console

A separate, minimal area at **`/admin`** (own login, own token).

- **Login** — `POST /admin/login { username, password }` → store admin token.
  `400` on bad credentials.
- **Invite readers** — a form that accepts **multiple emails at once** (comma /
  newline separated, or a tag input). `POST /admin/invitations { emails: [...] }`.
  The response splits into `invited` (new magic links sent) and `skipped` (emails
  that already have an account) — show both clearly.
- **Invitations list** — `GET /admin/invitations` → table of email, status
  (`pending` / `accepted`), expiry, and whether it's been accepted.
- Header shows the current admin (`GET /admin/me`) and a logout.

---

## 5. API reference

Base: `{API_BASE}/api/v1`. All success bodies are under `data` unless noted.
"Auth" column: **—** = none, **Reader** = reader bearer token, **Admin** = admin
bearer token.

### Auth & onboarding

**POST `/auth/login`** — Auth: — · Body `{ email, password }`
→ `200 { data: { user: User, token: string } }` · `400` bad credentials.

**GET `/onboarding/invitation?token=…`** — Auth: —
→ `200 { data: { email: string } }` · `404 { error }` invalid/expired.

**POST `/onboarding/accept`** — Auth: — · Body `{ token, name, password }`
→ `200 { data: { user: User, token: string } }` · `422 { error }` invalid/expired
token · `409 { error }` email already exists · `422 { errors }` validation.

**POST `/onboarding/categories`** — Auth: Reader · Body **either**
`{ categories: [ { title, description? }, … ] }` **or** `{ interests: string }`
→ `200 { data: { categories: Category[] } }` · `422` if neither is given. **Slow**
(source discovery + feed verification).

### Reader — account

**GET `/account/profile`** — Auth: Reader → `200 { data: User }`.

**POST `/account/logout`** — Auth: Reader → `200 { message: string }` (not wrapped).

### Reader — editions & items

**GET `/editions/today`** — Auth: Reader → `200 { data: Edition }` · `404 { error }`.

**GET `/editions/:date`** — Auth: Reader (`date` = `YYYY-MM-DD`)
→ `200 { data: Edition }` · `404 { error }`.

**POST `/items/:id/rate`** — Auth: Reader · Body `{ stars: 1..5, note?: string }`
→ `200 { data: Item }` (rating populated) · `404` · `422` invalid stars.

**POST `/items/:id/discard`** — Auth: Reader
→ `200 { data: { discarded: Item, promoted: Item | null } }` · `404` ·
`422 { error }` (only a surfaced item can be discarded).

### Reader — quiz

**GET `/quiz/score`** — Auth: Reader
→ `200 { data: { answered: number, correct: number, accuracy: number } }`
(`accuracy` is 0–1, rounded to 2dp).

**POST `/quiz/:id/answer`** — Auth: Reader · Body `{ selectedIndex: number }`
→ `200 { data: { isCorrect: boolean, correctIndex: number, explanation: string } }`
· `404` · `422` index out of range.

### Reader — links

**POST `/links`** — Auth: Reader · Body `{ url, note?, targetDate?: 'today' |
'tomorrow' }` (default `tomorrow`) → `200 { data: SubmittedLink }`.

### Reader — persona

**GET `/persona`** — Auth: Reader → `200 { data: { persona: string } }` (markdown).

**PUT `/persona`** — Auth: Reader · Body `{ content: string }`
→ `200 { data: { persona: string } }`.

**POST `/persona/generate`** — Auth: Reader · Body `{ role: string, learningGoals:
string[] (≥1), industry?, experienceLevel?, interests?: string[], goals?,
preferredDepth?: 'deep'|'balanced'|'high-level', avoid?: string[], location? }`
→ `200 { data: { persona: string } }`. (Also replaces the reader's gap topics
from `learningGoals`.)

### Reader — pipeline

**POST `/run-daily`** — Auth: Reader → `200 { data: { date, status, failures:
[ { source, message } ] } }`. **Slow**; may send an email.

### Reader — config (settings)

**GET `/config/categories`** — Auth: Reader → `200 { data: { categories:
Category[] } }` (each with nested `sources`).

**POST `/config/categories`** — Auth: Reader · Body `{ key, title, min, max,
poolSize, relevanceHint }` → `200 { data: Category }` · `422` (duplicate key, or
`max < min`). `key` must match `^[a-z0-9-]+$` and is immutable after creation.

**PUT `/config/categories/:id`** — Auth: Reader · Body any of `{ title, min, max,
poolSize, relevanceHint }` → `200 { data: Category }` · `404`.

**DELETE `/config/categories/:id`** — Auth: Reader → `204` · `404`. (Cascades to
its sources.)

**GET `/config/sources`** — Auth: Reader → `200 { data: { sources: Source[] } }`.

**POST `/config/sources`** — Auth: Reader · Body `{ categoryId, type: 'rss' |
'youtube' | 'websearch' | 'x', name, settings, enabled? }` → `200 { data: Source }`
· `422` (category not owned by the reader). `settings` is type-specific (below).

**PUT `/config/sources/:id`** — Auth: Reader · Body any of `{ categoryId, type,
name, settings, enabled }` → `200 { data: Source }` · `404`.

**DELETE `/config/sources/:id`** — Auth: Reader → `204` · `404`.

**GET `/config/schedule`** — Auth: Reader → `200 { data: { runTime, emailEnabled,
emailFrequency } }`.

**PUT `/config/schedule`** — Auth: Reader · Body any of `{ runTime: 'HH:mm',
emailEnabled: boolean, emailFrequency: 'daily'|'weekly'|'monthly' }`
→ `200 { data: { runTime, emailEnabled, emailFrequency } }`.

**GET `/config/gap-topics`** — Auth: Reader → `200 { data: { topics: string[] } }`.

**PUT `/config/gap-topics`** — Auth: Reader · Body `{ topics: string[] }` (replaces
the whole list, order preserved) → `200 { data: { topics: string[] } }`.

### Admin

**POST `/admin/login`** — Auth: — · Body `{ username, password }`
→ `200 { data: { admin: { id, username }, token: string } }` · `400` bad creds.

**GET `/admin/me`** — Auth: Admin → `200 { data: { id, username } }`.

**POST `/admin/logout`** — Auth: Admin → `200 { message }` (not wrapped).

**POST `/admin/invitations`** — Auth: Admin · Body `{ emails: string[] (≥1) }`
→ `200 { data: { invited: Invitation[], skipped: string[] } }`. `skipped` =
emails that already belong to a reader.

**GET `/admin/invitations`** — Auth: Admin → `200 { data: { invitations:
Invitation[] } }` (newest first).

---

## 6. Data shapes

```ts
// Reader account
type User = {
  id: string            // UUID
  name: string | null
  email: string
  createdAt: string     // ISO
  updatedAt: string | null
  initials: string
}

// A day's edition
type Edition = {
  id: number
  date: string          // 'YYYY-MM-DD'
  status: 'building' | 'ready' | 'emailed'
  keyLearning: string | null   // markdown, may be null on an empty day
  categories: Array<{
    key: string
    title: string
    items: Item[]       // only "surfaced" items appear
  }>
  quiz: Array<{         // answers are withheld here
    id: number
    topic: string
    question: string
    options: string[]
  }>
}

type Item = {
  id: number
  categoryKey: string
  title: string
  url: string
  summary: string | null
  source: string | null
  author: string | null
  mediaType: 'article' | 'video' | 'podcast'
  publishedAt: string | null   // ISO
  rating: { stars: number; note: string | null } | null
}

type SubmittedLink = {
  id: number
  url: string
  note: string | null
  targetDate: string    // 'YYYY-MM-DD'
  source: 'api' | 'telegram'
  status: 'pending' | 'consumed'
}

type Category = {
  id: number
  key: string
  title: string
  min: number           // fewest items surfaced/day
  max: number           // most items surfaced/day
  poolSize: number      // ranked candidates kept in reserve
  relevanceHint: string // guidance given to the ranking model
  sources: Source[]
}

type Source = {
  id: number
  categoryId: number
  type: 'rss' | 'youtube' | 'websearch' | 'x'
  name: string
  settings: {           // only the field(s) for `type` are used
    feedUrl?: string    // rss
    channelId?: string  // youtube
    query?: string      // websearch
    username?: string   // x (twitter handle, no @)
  }
  enabled: boolean
  lastFetchedAt: string | null
}

type Invitation = {
  id: number
  email: string
  status: 'pending' | 'accepted'
  expiresAt: string     // ISO — 3 days from issue
  acceptedUserId: string | null
}
```

---

## 7. Screens checklist (states to design)

For every data screen, design **loading**, **empty**, **error**, and **success**
states. Specific ones to not forget:

- Magic-link landing: valid / invalid-or-expired.
- Onboarding stage 3: the **long-running "pulling sources"** state; and a category
  that returns **no sources**.
- Today: **no edition yet** (first-time or off-cadence day) vs a full edition.
- Item after **discard**: replaced by a promoted item, or removed if none.
- Quiz: unanswered → answered (revealing correctness + explanation); running score.
- Rate: optimistic star update + error rollback.
- CRUD forms: inline validation matching backend rules (see §5).
- Admin invite: mixed result (some invited, some skipped).
- `401` anywhere: session expired → clear token, back to login/landing.

---

## 8. Notes, edge cases & non-goals

- **One Next.js app, two tokens.** Host the reader and admin surfaces as separate
  route groups (e.g. `(reader)` and `(admin)`) in one app, but keep their tokens
  strictly separate — a reader token is rejected on admin routes and vice-versa.
  A fetch wrapper per surface that injects the right token is cleanest.
- **Weekly/monthly readers**: an off-cadence day may simply have no edition
  (`/editions/today` → 404). That's normal; the empty state should reassure, and
  the reader can "Rebuild today's edition" if you expose Run now.
- **markdown**: `keyLearning` and `persona` are markdown — render with a small,
  safe markdown renderer (sanitised).
- **Story links** (`item.url`) may point off-site (or at an X/Twitter post or a
  shared link) — open in a new tab with `rel="noopener"`.
- **No public sign-up**, no password reset endpoint yet, and **no token refresh**
  (tokens are long-lived). If you need "forgot password", flag it — it's not built.
- **Magic-link route** must be exactly `/onboard` (the backend emails
  `{APP_URL}/onboard?token=…`). If you want a different path, it's a one-line
  backend change — coordinate.
- Out of scope on the backend today (don't design around them): real-time updates
  for stage-3 discovery (it's synchronous), telegram ingestion UI, and
  per-reader scheduled send times (the schedule is stored but a single cron
  drives sends).
```
