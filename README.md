# LaunchPad RV Institutions

An AI venture-creation and fundraising workbench for engineering students at
RV Institutions, Bengaluru. It takes an academic project, stress-tests it
against the criteria real seed funds apply, tells the founder honestly whether
it is investible, rebuilds it when it is not, and produces the deck, the
investor shortlist and the grant applications to act on.

**Live:** https://rvproject.vercel.app

## What it does

| Module | What it produces |
| --- | --- |
| Idea validation | A 0–100 viability score across six weighted criteria, a vitamin/painkiller verdict, bottom-up TAM/SAM/SOM with stated method, and a defensibility audit that says plainly whether the project is a wrapper |
| Investibility verdict | The four filters a seed partner applies — founder-market fit, scalability, gross margins, barrier to entry — with a "Seed / Pre-Seed Investible" or "Academic Project Only" verdict and exactly three reasons |
| Pivot matrix | Three structurally different strategic pivots aimed at the weaknesses validation found, each with projected score delta; adopting one rewrites the project thesis |
| Pitch deck | Ten slides in YC/Sequoia order built from the project's own validation numbers, with markdown export and a full-screen demo-day mode |
| Investor matching | Real Indian early-stage funds ranked deterministically by sector, stage, cheque size and student-founder fit, with per-fund rationale and personalised cold email + LinkedIn drafts |
| Grant radar | Non-dilutive programmes a student team can actually enter, with the precise eligibility route and next step |
| Benchmarks | The project mapped onto real Indian companies at their earliest stage, with the honest parallel and where it breaks |
| War room | Live streaming defence against Roast Mode (one brutal partner) or a three-partner investment committee that follows up on weak answers |

Plus: a consolidated executive **pitch book** (print to PDF or copy as markdown),
a campus **leaderboard**, shareable **public pitch pages** with view counts, an
admin **Command Center** for faculty, and **jargon defuser** tooltips on every
venture term.

## Architecture

```
Browser (Vite + React SPA)
  ├── reads data directly from Postgres over RLS  ── Supabase
  └── calls /api/* only for AI work               ── Vercel Functions ── Gemini
```

- **Reads bypass the API entirely.** The browser queries Supabase directly under
  row-level security, cached by TanStack Query, so navigation is instant and no
  server round-trip sits between the user and their data.
- **Functions exist only where secrets are needed** — the Gemini key and the
  Supabase secret key never reach the client. Every AI response streams or
  returns structured JSON validated against a Zod schema.
- **Ranking is deterministic, not generated.** Investor and grant fit scores are
  computed in code so results are explainable and stable; the model only writes
  the prose rationale.

### Zero hardcoded content

Every piece of content the product displays lives in the database — investors,
benchmarks, grants, glossary, campuses, domains, the scoring rubric **and every
AI prompt**. Changing the roast persona, re-weighting the scoring rubric or
adding a fund is a SQL update, not a deploy.

| Table | Rows | Source |
| --- | --- | --- |
| `investors` | 41 | Researched and sourced, each with `source_url` and `as_of_date` |
| `benchmarks` | 30 | Indian startups with sourced valuations, campus founding stories |
| `grants` | 15 | Government and institutional non-dilutive programmes |
| `glossary` | 55 | Venture vocabulary with India-specific examples |
| `prompt_templates` | 13 | Server-only; RLS grants no client access |
| `rubric_criteria` | 10 | Scoring weights for validation and investibility |

## Stack

Vite · React 19 · TypeScript · Tailwind v4 · Framer Motion · Recharts ·
TanStack Query · Supabase (Postgres, Auth, RLS) · Vercel Functions ·
Google Gemini (Interactions API)

## Local development

```bash
npm install
cp .env.example .env     # fill in the values
npm run dev              # app on :5173
vercel dev               # functions on :3000 (the Vite proxy forwards /api)
```

`npm run typecheck` and `npm run build` must both pass before deploying.

## Database

Migrations live in `supabase/migrations/` and are applied in filename order.
They are idempotent for seed data (upsert on the natural key), so re-running a
seed migration refreshes the dataset rather than duplicating it.

## Security model

- RLS is enabled on every table; policies wrap `auth.uid()` in a subquery so it
  is evaluated once per statement rather than per row.
- Ownership checks live in `SECURITY DEFINER` helpers (`owns_project`,
  `can_read_project`, `is_admin`) with an empty `search_path`.
- Students cannot escalate their own role: `UPDATE` on `profiles` is revoked and
  re-granted column by column, excluding `role`.
- Serverless functions use the service-role key and therefore re-check ownership
  explicitly on every request.
- Public pitch pages expose only projects whose owner switched sharing on.

Verified end to end: prompt templates are unreadable from the browser, one
user's projects are invisible to another, and cross-user module execution
returns 403.
