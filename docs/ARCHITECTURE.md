# Architecture

## Request paths

There are exactly two, and keeping them separate is what makes the app feel fast.

**Reads — browser straight to Postgres.**
Every list, score, deck and match is fetched by `@supabase/supabase-js` from the
browser, authorised by row-level security using the user's own JWT. There is no
API layer in front of reads, so a tab switch costs one cached query rather than
a serverless cold start. TanStack Query holds results for 60s and refetches in
the background.

**Writes that need a secret — serverless functions.**
Only AI generation goes through `/api/*`. Those functions hold the Gemini key
and the Supabase secret key, neither of which may reach a browser.

```
src/hooks/use*.ts ──► Supabase REST (RLS)         reads
src/lib/api.ts    ──► /api/* (Vercel Function) ──► Gemini Interactions API
                                              └─► Supabase (service role)
```

## The AI layer

`api/_lib/gemini.ts` wraps the Gemini **Interactions API**
(`POST /v1beta/interactions`). Three details of that API cost real debugging
time and are worth recording:

1. Answer text lives in `steps[]` entries of type `model_output`. Entries of
   type `thought` are internal reasoning and must be filtered out — including
   mid-stream, by tracking which step index is the answer.
2. Sampling settings must be nested under `generation_config`. Sending
   `temperature` at the request root returns `Unknown parameter 'temperature'`.
3. `response_format` takes a JSON Schema **directly** — its `type` is the JSON
   type (`object`), not a wrapper like `json_schema`.

Multi-turn conversation is stateless: the full history is replayed as an array
of `user_input` / `model_output` steps, so no server-side session state has to
survive between function invocations.

### Structured output

Schemas are declared once in Zod (`api/_lib/schemas.ts`), converted with
`z.toJSONSchema` to constrain the model, and reused to validate the reply. A
sanitiser strips keywords Gemini rejects (`$schema`, `additionalProperties`,
`exclusiveMinimum/Maximum`). Field order is deliberate: reasoning fields are
declared before their scores so the model argues before it grades.

### Prompts as data

No prompt exists in the codebase. `buildSystemPrompt()` loads a template from
`prompt_templates`, merges in the tone persona (mentor or roast) and the scoring
rubric from `rubric_criteria`, then substitutes `{{tone}}`, `{{rubric}}` and
`{{project}}`. Product behaviour is tuned with SQL.

### Context chaining

`api/_lib/context.ts` renders upstream results into the prompt of every
downstream module, which is why the deck quotes the same TAM the validation
produced instead of inventing a new one.

## The Node adapter

Endpoints are written against Web-standard `Request`/`Response` because that
makes streaming clean. The Vercel Node runtime here invokes handlers as
`(req, res)` — returning a `Response` from that signature is silently ignored
and the invocation hangs until it times out. `api/_lib/node-adapter.ts` bridges
the two, converting the incoming message into a `Request` and piping the
response body back chunk by chunk so token streaming survives.

Relative imports inside `api/` carry explicit `.js` extensions: the package is
ESM (`"type": "module"`) and Node will not resolve extensionless specifiers.

## Data model

Reference tables (`investors`, `benchmarks`, `grants`, `glossary`, `domains`,
`campuses`) are world-readable. Student data is owner-scoped. Analysis outputs
(`validations`, `investibility_reports`, `decks`) are **versioned** rather than
overwritten, so re-running a module after adopting a pivot produces a score
history instead of destroying the previous result.

`leaderboard` is a `security_invoker` view, so the underlying RLS still applies:
an anonymous visitor sees public projects only, and the join to `profiles`
yields a null founder name because anonymous users cannot read profiles.

## Performance

- Every route past the landing and auth pages is `React.lazy`-split; charts, the
  deck editor and the war room never load for a visitor who only reads the
  landing page.
- Icons are imported individually. A namespace import of the icon set added
  ~600 kB to one chunk — `src/components/DomainIcon.tsx` maps the handful of
  names the database actually uses, with a fallback for unmapped ones.
- Functions are pinned to `syd1`, the region closest to the Supabase project
  (`ap-southeast-2`), so the service-role round trips stay short.
