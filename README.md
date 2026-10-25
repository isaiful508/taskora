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
MENTOR_EMAIL="mentor@example.com"
MENTOR_PASSWORD="use-a-unique-random-password-of-at-least-12-characters"
STUDENT_DEMO_PASSWORD="use-a-different-unique-password-of-at-least-12-characters"
# Optional ISO-8601 deadline including timezone. Omit for no deadline.
# SUBMISSION_DEADLINE="2026-12-31T23:59:59+06:00"
ALLOW_LATE_SUBMISSIONS=true
```

`web/.env`:

```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

> The browser calls the API directly (not through a Next.js proxy), so `CORS_ORIGIN` must match the
> web origin exactly and the API must be started with `credentials: "include"` support (it is).
> The seed requires unique mentor and student demo passwords from `server/.env`. Never commit the
> populated `.env` file or reuse these credentials for a deployed database.

### 4. Create the database and seed it

```bash
createdb taskora        # only if the database does not exist yet
npm run db:setup
```

`db:setup` runs `prisma migrate deploy` (creating the tables and the partial unique index that
prevents duplicate submissions) followed by `prisma/seed.ts`, which resets the database and inserts
1 mentor, 16 students and 18 submissions. Use it only for a local/demo database; do not run the seed
against a database containing real user data.

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
| Mentor | Value of `MENTOR_EMAIL` | Value of `MENTOR_PASSWORD` |
| Student| `<slug>@student.dev`   | Value of `STUDENT_DEMO_PASSWORD` |

The seed prints the mentor email and number of seeded accounts, but never prints passwords. Example students:
`ayesha.rahman@student.dev`, `tanvir.hasan@student.dev`, …

### Repository visibility requirement

Keep the GitHub repository private until the submission deadline. After the deadline, change the
repository visibility to public and verify that an unauthenticated browser can open the repository
and that `git ls-remote https://github.com/<owner>/<repo>.git` succeeds. Do not include populated
environment files, production credentials, or database backups when making the repository public.

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
│           └── submissions/    create, list, stats, mine, review, assign, deadline config
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
enum SubmissionStatus { PENDING APPROVED REJECTED NEEDS_REVISION }

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(STUDENT)
  createdAt    DateTime @default(now())
  submissions  Submission[]
  assignedSubmissions Submission[] @relation("MentorAssignments")
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
  reviewFeedback String?
  functionalityScore Int?
  codeQualityScore Int?
  documentationScore Int?
  presentationScore Int?
  isLate Boolean @default(false)
  assignedMentorId String?
  previousSubmissionId String? @unique
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
| GET    | `/api/submissions/config`   | public  | Configured deadline and late-submission policy |
| POST   | `/api/auth/signup`          | public  | Create a student account, sets the auth cookie |
| POST   | `/api/auth/login`           | public  | Sign in, sets the auth cookie |
| POST   | `/api/auth/logout`          | public  | Clear the auth cookie |
| GET    | `/api/auth/me`              | student or mentor | Current session user |
| POST   | `/api/submissions`          | student | Create a submission (validated, rate limited) |
| GET    | `/api/submissions/mine`     | student | The signed-in student's submissions |
| DELETE | `/api/submissions/:id`      | student | Delete one of the signed-in student's submissions |
| GET    | `/api/submissions`          | mentor  | List submissions — status, search, assignment filter, sort, page, limit |
| GET    | `/api/submissions/stats`    | mentor  | Submission counters by status |
| GET    | `/api/submissions/mentors`  | mentor  | Mentor list with assigned and pending workload counts |
| PATCH  | `/api/submissions/:id/status` | mentor | Approve, reject, or request revisions with feedback and rubric scores |
| PATCH  | `/api/submissions/:id/assignment` | mentor | Assign to a mentor or clear the assignment |

### Query parameters for `GET /api/submissions`

| Param    | Values                          | Default | Notes |
| -------- | ------------------------------- | ------- | ----- |
| `status` | `PENDING` \| `APPROVED` \| `REJECTED` \| `NEEDS_REVISION` | all | Server-side filter |
| `search` | free text (≤ 100 chars)         | –       | Case-insensitive match on project name, student name or email |
| `sort`   | `newest` \| `oldest` \| `name`  | `newest`| Server-side ordering |
| `assigned` | `all` \| `mine` \| `unassigned` | `all` | Server-side assignment filter |
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
| `/dashboard/mentor`   | Review dashboard: stats, mentor workload, assignments, rubric decisions |
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

1. **One pending submission per student, with duplicate project details blocked.** A student may submit another project after a mentor
   approves or rejects the previous one. This is enforced in the database by a partial unique index
   (`Submission_studentId_active_key` on `studentId` where `status = 'PENDING'`), so concurrent
   requests cannot both win. Project names, repository links and non-empty live links cannot be
   reused by the same student; duplicate fields are highlighted with a clear error. A revision request
   can retain its original details and be resubmitted from its history card when the student has no
   other submission pending review.
2. **Only mentors can review submissions or manage assignments**, and only mentors can list all
   submissions or read the stats.
   Students can only ever read their own submissions (`GET /api/submissions/mine`).
3. **Mentor decisions are `APPROVED`, `REJECTED`, or `NEEDS_REVISION`.** Each decision requires all
   four rubric scores (1–5); rejection and revision requests also require written feedback.
4. **`liveUrl` is optional**, `repoUrl` and `description` are required. Both URLs are validated as
   real URLs.
5. **Revision requests preserve history.** The student submits a new version linked to the reviewed
   one; the previous feedback and rubric scores remain visible in their submission history.
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
11. **Deadline behavior is configurable.** Set `SUBMISSION_DEADLINE` to an ISO-8601 timestamp that
    includes a timezone. Late submissions are accepted and marked by default; set
    `ALLOW_LATE_SUBMISSIONS=false` to reject submissions after the configured deadline. If the
    deadline is unset, submissions remain open.
12. **Mentor assignment is optional.** Mentors can assign submissions to any seeded mentor, filter
    their own/unassigned queues, and see assigned and pending workload totals.

---

## Useful commands

```bash
npm run dev            # run API + web together
npm run build          # typecheck the API and build the web app
npm run db:setup       # migrate + seed
npm run db:studio      # Prisma Studio
npm run dev --prefix server
npm run dev --prefix web
cd server && npm run typecheck
cd web && npm run lint && npx tsc --noEmit
```

## Deploying the API to Vercel

The API has a Vercel serverless entry point at `server/api/[...path].ts`. Create a separate Vercel
project for this repository and set its **Root Directory** to `server`. Vercel will build the
catch-all function, which serves the existing `/api/*` Express routes.

Set these project environment variables for each environment you deploy:

- `DATABASE_URL` — PostgreSQL connection string. For a serverless deployment, use your provider's
  pooled connection string when available.
- `DIRECT_URL` — optional direct PostgreSQL connection string for Prisma migrations. If omitted,
  migrations use `DATABASE_URL`.
- `JWT_SECRET` — long, randomly generated secret.
- `JWT_EXPIRES_IN` — for example, `7d`.
- `CORS_ORIGIN` — the exact frontend origin, including `https://` and without a trailing slash.
- `NODE_ENV` — `production` for production deployments.

The server build runs `prisma generate` and TypeScript checks. Apply schema migrations separately
from a trusted machine with the production database environment configured:

```bash
npm run db:migrate --prefix server
```

This runs `prisma migrate deploy`; it does not seed or reset data. Do not run the demo seed against a
database containing data you need to keep. After deployment, check
`https://<your-vercel-api-domain>/api/health` and set the frontend's `NEXT_PUBLIC_API_URL` to the
API's HTTPS origin. Verify cookie-based login in the deployed browser; separate Vercel project
domains may require a same-origin proxy or custom domain arrangement for reliable authentication.

## Testing

`scripts/api-tests.sh` is a dependency-free (bash + curl) API test suite covering health, the auth
guards, status/search/sort/assignment filters and pagination, mentor workload, signup validation,
student/mentor RBAC, submission creation and duplicate prevention, rubric reviews, revision linking,
assignment, owner-only deletion and error codes and rate limiting.

```bash
npm run dev --prefix server      # the API must be running
MENTOR_EMAIL=mentor@example.com MENTOR_PASSWORD='your-seeded-mentor-password' bash scripts/api-tests.sh
```

> The auth rate limiter allows 20 auth requests per IP per 15 minutes, so restart the API between
> back-to-back runs or the signup/login steps will return `429`. The root `npm run build` typechecks
> the API and creates the Next.js production build; the API currently runs from TypeScript with `tsx`.
