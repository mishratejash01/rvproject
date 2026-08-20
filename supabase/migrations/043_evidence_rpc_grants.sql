-- Expose the evidence score to the API layer. The function is SECURITY DEFINER
-- and read-only; the serverless layer already checks project ownership before
-- calling it.

grant execute on function public.project_evidence_score(uuid) to authenticated, service_role;
grant execute on function public.compute_evidence_strength(uuid) to authenticated, service_role;
grant execute on function public.evidence_cap_for(numeric) to anon, authenticated;
grant execute on function public.is_staff() to authenticated;
