# Taskora

A full-stack dashboard where students submit projects for review and mentors approve or reject them.

- **`server/`** — Express 5 + Prisma 7 + PostgreSQL REST API (JWT in an httpOnly cookie, role-based access control).
- **`web/`** — Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + shadcn/ui frontend.

---

## Quick start

### 1. Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL 14+ running locally

### 2. Install dependencies

```bash
npm run install:all
```

This installs `server/` and `web/` dependencies (each workspace has its own lockfile).

### 3. Configure the environment

```bash
cp server/.env.example server/.env
cp web/.env.example web/.env
```

`server/.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/taskora?schema=public"
PORT=4000
JWT_SECRET="replace-with-a-long-random-string"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:3000"
NODE_ENV=development
```

`web/.env`:

```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

> The browser calls the API directly (not through a Next.js proxy), so `CORS_ORIGIN` must match the
> web origin exactly and the API must be started with `credentials: "include"` support (it is).

### 4. Create the database and seed it

```bash
createdb taskora        # only if the database does not exist yet
npm run db:setup
```

`db:setup` runs `prisma migrate deploy` (creating the tables and the partial unique index that
prevents duplicate submissions) followed by `prisma/seed.ts`, which inserts 1 mentor, 16 students
and 18 submissions.

### 5. Run both apps

```bash
npm run dev
```

| App    | URL                     |
| ------ | ----------------------- |
| Web    | http://localhost:3000   |
| API    | http://localhost:4000   |

> The root `dev` script uses `concurrently`. If you prefer separate terminals:
> `npm run dev --prefix server` and `npm run dev --prefix web`.

### 6. Production build

```bash
npm run build
```

---

## Seeded accounts

| Role   | Email                  | Password       |
| ------ | ---------------------- | -------------- |
| Mentor | `mentor@assessment.dev`| `Mentor@123`   |
| Student| `<slug>@student.dev`   | `Student@123`  |

The seed prints the mentor credentials and the number of seeded accounts. Example students:
`ayesha.rahman@student.dev`, `tanvir.hasan@student.dev`, …

---

## Architecture

```
project-submission-dashboard/
├── server/                     Express 5 API
│   ├── prisma/
│   │   ├── schema.prisma       User / Submission models, Role + SubmissionStatus enums
│   │   ├── migrations/         SQL migrations (incl. the partial unique index)
│   │   └── seed.ts             Deterministic demo data
│   └── src/
│       ├── app.ts              Express app: helmet, CORS, cookie-parser, routers, error handler
│       ├── index.ts            Process bootstrap
│       ├── config/env.ts       Zod-validated environment configuration
│       ├── lib/                Prisma client, JWT helpers
│       ├── middleware/         requireAuth / requireRole, rate limiting, validation, error handling
│       └── modules/
│           ├── auth/           signup, login, logout, me
│           └── submissions/    create, list, stats, mine, approve/reject
└── web/                        Next.js 16 App Router frontend
    └── src/
        ├── app/                Route segments: /, /login, /signup, /dashboard/*
        ├── components/         Feature components + shadcn/ui primitives
        ├── hooks/              useDebouncedValue
        └── lib/                api client, auth provider, TanStack Query provider, types, zod schemas
```

### Data model

```prisma
enum Role { STUDENT MENTOR }
enum SubmissionStatus { PENDING APPROVED REJECTED }

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(STUDENT)
  createdAt    DateTime @default(now())
  submissions  Submission[]
}

model Submission {
  id          String           @id @default(cuid())
  studentId   String
  student     User             @relation(fields: [studentId], references: [id], onDelete: Cascade)
  projectName String
  repoUrl     String
  liveUrl     String?
  description String
  status      SubmissionStatus @default(PENDING)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}
```

---

## API reference

All endpoints are prefixed with `/api`. Authentication uses a `token` httpOnly cookie
(`SameSite=Lax`, `Secure` in production, 7-day expiry).

| Method | Path                        | Access  | Description |
| ------ | --------------------------- | ------- | ----------- |
| GET    | `/api/health`               | public  | Liveness check |
| POST   | `/api/auth/signup`          | public  | Create a student account, sets the auth cookie |
| POST   | `/api/auth/login`           | public  | Sign in, sets the auth cookie |
| POST   | `/api/auth/logout`          | public  | Clear the auth cookie |
| GET    | `/api/auth/me`              | student or mentor | Current session user |
| POST   | `/api/submissions`          | student | Create a submission (validated, rate limited) |
| GET    | `/api/submissions/mine`     | student | The signed-in student's submissions |
| GET    | `/api/submissions`          | mentor  | List submissions — `status`, `search`, `sort`, `page`, `limit` |
| GET    | `/api/submissions/stats`    | mentor  | Total / pending / approved / rejected counters |
| PATCH  | `/api/submissions/:id/status` | mentor | Approve or reject a submission |

### Query parameters for `GET /api/submissions`

| Param    | Values                          | Default | Notes |
| -------- | ------------------------------- | ------- | ----- |
| `status` | `PENDING` \| `APPROVED` \| `REJECTED` | all | Server-side filter |
| `search` | free text (≤ 100 chars)         | –       | Case-insensitive match on project name, student name or email |
| `sort`   | `newest` \| `oldest` \| `name`  | `newest`| Server-side ordering |
| `page`   | integer ≥ 1                     | `1`     | |
| `limit`  | integer 1–50                    | `10`    | |

The response is `{ data: Submission[], meta: { page, limit, total, totalPages } }`.

### Error format

```json
{ "message": "Validation failed", "errors": { "email": ["Email is required"] } }
```

Validation problems (zod) return `400` with per-field messages, unauthenticated requests `401`,
role violations `403`, duplicates `409`, missing records `404`, and rate-limit exhaustion `429`.

---

## Frontend

| Route                 | Purpose |
| --------------------- | ------- |
| `/`                   | Redirects to the right dashboard (or `/login`) |
| `/login`, `/signup`   | Auth pages (redirect away when already authenticated) |
| `/dashboard`          | Role-based redirect |
| `/dashboard/student`  | Submission form + submission history |
| `/dashboard/mentor`   | Review dashboard: stats, filters, search, pagination, approve/reject |
| `/dashboard/profile`  | Current user profile |

Key implementation details:

- **Data fetching** — TanStack Query for server state; `AuthProvider` resolves the session once via
  `GET /api/auth/me` and exposes `useAuth()`.
- **Client-side route guards** — the dashboard pages check `status`/`user.role` and redirect.
  The API enforces the same rules server-side, so the guard is UX only, not a security boundary.
- **Validation** — zod schemas are shared in spirit between client (`web/src/lib/validation.ts`) and
  server (`server/src/modules/*/*.schema.ts`); the client uses react-hook-form + `@hookform/resolvers`.
- **Search** — the mentor search box is debounced (350 ms) and the query runs server-side.
- **Theme** — `next-themes` with a light/dark/system toggle; `ThemeProvider` is mounted in the root layout.
- **`cacheComponents` is intentionally disabled** in `web/next.config.ts`: with it enabled the Next 16
  router rejects client-side navigations with
  *"Could not validate that a segment in your UI has instant navigation"*.
  (`partialPrefetching` depends on it, so it is off too.)

---

## Feature decisions & assumptions

The brief left a few things open; these are the interpretations that were implemented.

1. **One active submission per student.** A student may have many submissions over time, but at most
   one `PENDING` or `APPROVED` one at a time — a rejected submission frees the slot. This is enforced
   in the database by a partial unique index
   (`Submission_studentId_active_key` on `studentId` where `status IN ('PENDING','APPROVED')`), so
   concurrent requests cannot both win. The API returns `409` with a friendly message, and the UI
   locks the form and shows *"Submission limit reached"*.
2. **Only mentors can approve/reject**, and only mentors can list all submissions or read the stats.
   Students can only ever read their own submissions (`GET /api/submissions/mine`).
3. **Mentors move a submission between `APPROVED` and `REJECTED`.** The API accepts exactly those two
   values for `PATCH /api/submissions/:id/status`; anything else is a `400`. There is no "send back to
   pending" action.
4. **`liveUrl` is optional**, `repoUrl` and `description` are required. Both URLs are validated as
   real URLs.
5. **Review feedback is not modelled.** The brief only asked for approve/reject, so the status enum
   carries no feedback column; the mentor dashboard shows the submission details inline.
6. **Sorting and filtering happen on the server**, never on the fetched page, so pagination totals
   stay correct.
7. **Rate limits** — 20 auth requests / 15 min and 5 submissions / 15 min, keyed by user id for
   authenticated requests and by IP (IPv6-normalised to a /64) otherwise. The limits live in
   `server/src/middleware/rateLimit.ts`.
8. **Password rules** — minimum 8 characters with at least one letter and one number, enforced on
   both sides; passwords are hashed with bcrypt (cost 12).
9. **Mentor accounts are seeded only.** The signup endpoint always creates `STUDENT` accounts; mentors
   are provisioned by seeding or directly in the database.
10. **CORS is locked to a single origin** (`CORS_ORIGIN`) with credentials enabled, and the auth
    cookie is httpOnly, so the JWT is never exposed to JavaScript.

---

## Useful commands

```bash
npm run dev            # run API + web together
npm run build          # build both
npm run db:setup       # migrate + seed
npm run db:studio      # Prisma Studio
npm run dev --prefix server
npm run dev --prefix web
cd server && npm run typecheck
cd web && npm run lint && npx tsc --noEmit
```

## Testing

`scripts/api-tests.sh` is a dependency-free (bash + curl) API test suite covering health, the auth
guards, mentor listing with status/search/sort/pagination, the stats endpoint, signup validation,
student/mentor RBAC, submission creation and duplicate prevention, approve/reject, error codes and
rate limiting — 47 assertions.

```bash
npm run dev --prefix server      # the API must be running
bash scripts/api-tests.sh
```

> The auth rate limiter allows 20 auth requests per IP per 15 minutes, so restart the API between
> back-to-back runs or the signup/login steps will return `429`.
