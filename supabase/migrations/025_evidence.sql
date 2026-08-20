-- The Evidence Ledger: real-world proof a student gathered, graded on the
-- "said vs did" distinction. This is what stops a viability score from being
-- an opinion about a paragraph.

create table public.evidence_types (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  category text not null check (
    category in ('conversation', 'observation', 'commitment', 'experiment', 'desk_research')
  ),
  -- Behavioural evidence (what people DID) outranks stated intent (what they SAID).
  is_behavioural boolean not null default false,
  base_strength int not null check (base_strength between 1 and 40),
  guidance text not null,
  sort_order int not null default 100
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  type_id bigint not null references public.evidence_types (id),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 200),
  summary text not null,
  occurred_on date not null,
  sample_size int not null default 1 check (sample_size >= 1),
  -- Who it came from, so a claim can be traced to a real person.
  source_name text,
  source_role text,
  source_org text,
  artifact_url text,
  -- Verbatim notes or transcript; feeds the interview coach.
  transcript text,
  mom_test jsonb,                 -- {score, what_worked[], what_failed[], rewritten_questions[]}
  outcome text,
  strength_score numeric not null default 0,
  verified_by uuid references auth.users (id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index evidence_project_idx on public.evidence (project_id, occurred_on desc);
create index evidence_type_idx on public.evidence (type_id);
create index evidence_created_by_idx on public.evidence (created_by);

/*
 * Deterministic evidence strength. Never AI-generated, so the number is
 * explainable and identical on every recomputation.
 *   base            — how strong this kind of evidence is at all
 *   sample bonus    — logarithmic, so N=50 beats N=5 without dwarfing it
 *   artifact bonus  — proof it happened
 *   behaviour bonus — someone acted rather than merely agreed
 *   verified bonus  — a faculty member confirmed it
 */
create or replace function public.compute_evidence_strength(p_evidence_id uuid)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base int;
  v_behavioural boolean;
  v_sample int;
  v_artifact boolean;
  v_verified boolean;
  v_score numeric;
begin
  select t.base_strength, t.is_behavioural, e.sample_size,
         (e.artifact_url is not null and e.artifact_url <> ''),
         (e.verified_at is not null)
    into v_base, v_behavioural, v_sample, v_artifact, v_verified
  from public.evidence e
  join public.evidence_types t on t.id = e.type_id
  where e.id = p_evidence_id;

  if v_base is null then
    return 0;
  end if;

  v_score := v_base
           + least(12, 4 * ln(greatest(v_sample, 1))::numeric)
           + case when v_artifact then 4 else 0 end
           + case when v_behavioural then 4 else 0 end
           + case when v_verified then 5 else 0 end;

  return round(v_score, 2);
end;
$$;

-- Strength depends on the row itself, so it is recomputed after write.
create or replace function public.refresh_evidence_strength()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.evidence
  set strength_score = public.compute_evidence_strength(new.id)
  where id = new.id and strength_score is distinct from public.compute_evidence_strength(new.id);
  return null;
end;
$$;

create trigger evidence_strength_after
  after insert or update of type_id, sample_size, artifact_url, verified_at
  on public.evidence
  for each row execute function public.refresh_evidence_strength();

/*
 * Project evidence score, 0-100. Diminishing returns stop a student from
 * farming twenty weak desk-research entries into a high score.
 */
create or replace function public.project_evidence_score(p_project_id uuid)
returns numeric
language sql
security definer
set search_path = ''
stable
as $$
  select least(100, round(coalesce(sum(weighted), 0), 2))
  from (
    select strength_score
         * power(0.86, (row_number() over (order by strength_score desc)) - 1) as weighted
    from public.evidence
    where project_id = p_project_id
  ) ranked;
$$;

alter table public.evidence_types enable row level security;
alter table public.evidence enable row level security;

create policy evidence_types_read on public.evidence_types
  for select to anon, authenticated using (true);

create policy evidence_read on public.evidence
  for select to anon, authenticated
  using ((select public.can_read_project(project_id)));

create policy evidence_owner_write on public.evidence
  for insert to authenticated
  with check ((select public.owns_project(project_id)));

create policy evidence_owner_update on public.evidence
  for update to authenticated
  using ((select public.owns_project(project_id)))
  with check ((select public.owns_project(project_id)));

create policy evidence_owner_delete on public.evidence
  for delete to authenticated
  using ((select public.owns_project(project_id)));

-- Faculty verify evidence; they may update any row but only the verification columns.
create policy evidence_staff_update on public.evidence
  for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));
