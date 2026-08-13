import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  Project,
  Validation,
  InvestibilityReport,
  Pivot,
  Deck,
  InvestorMatch,
  GrantMatch,
  BenchmarkLink,
  OutreachDraft,
} from "@/lib/types";

/** Project reads go straight from the browser to Postgres under RLS. */

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, domain:domains(*)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["project", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, domain:domains(*)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as Project | null;
    },
  });
}

export function useValidation(projectId: string | undefined) {
  return useQuery({
    queryKey: ["validation", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("validations")
        .select("*")
        .eq("project_id", projectId!)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Validation | null;
    },
  });
}

/** Full score history — powers the iteration timeline. */
export function useValidationHistory(projectId: string | undefined) {
  return useQuery({
    queryKey: ["validation-history", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("validations")
        .select("version, viability_score, pain_classification, headline, created_at")
        .eq("project_id", projectId!)
        .order("version");
      if (error) throw error;
      return data as Array<Pick<Validation, "version" | "viability_score" | "pain_classification" | "headline" | "created_at">>;
    },
  });
}

export function useInvestibility(projectId: string | undefined) {
  return useQuery({
    queryKey: ["investibility", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investibility_reports")
        .select("*")
        .eq("project_id", projectId!)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as InvestibilityReport | null;
    },
  });
}

export function usePivots(projectId: string | undefined) {
  return useQuery({
    queryKey: ["pivots", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pivots")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at");
      if (error) throw error;
      return data as Pivot[];
    },
  });
}

export function useDeck(projectId: string | undefined) {
  return useQuery({
    queryKey: ["deck", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decks")
        .select("*")
        .eq("project_id", projectId!)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Deck | null;
    },
  });
}

export function useMatches(projectId: string | undefined) {
  return useQuery({
    queryKey: ["matches", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investor_matches")
        .select("*, investor:investors(*)")
        .eq("project_id", projectId!)
        .order("fit_score", { ascending: false });
      if (error) throw error;
      return data as InvestorMatch[];
    },
  });
}

export function useGrantMatches(projectId: string | undefined) {
  return useQuery({
    queryKey: ["grant-matches", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grant_matches")
        .select("*, grant:grants(*)")
        .eq("project_id", projectId!)
        .order("fit_score", { ascending: false });
      if (error) throw error;
      return data as GrantMatch[];
    },
  });
}

export function useBenchmarkLinks(projectId: string | undefined) {
  return useQuery({
    queryKey: ["benchmark-links", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benchmark_links")
        .select("*, benchmark:benchmarks(*)")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data as BenchmarkLink[];
    },
  });
}

export function useOutreachDrafts(projectId: string | undefined) {
  return useQuery({
    queryKey: ["outreach", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_drafts")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OutreachDraft[];
    },
  });
}

/* ── Mutations ─────────────────────────────────────────────────────── */

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      problem_statement: string;
      target_persona: string;
      technical_approach: string;
      domain_id: number;
    }) => {
      const { data, error } = await supabase.from("projects").insert(input).select("*, domain:domains(*)").single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Project>) => {
      const { data, error } = await supabase
        .from("projects")
        .update(patch)
        .eq("id", projectId)
        .select("*, domain:domains(*)")
        .single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      qc.setQueryData(["project", projectId], data);
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

/** Adopting a pivot rewrites the project thesis and clears the old status. */
export function useAdoptPivot(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pivot: Pivot) => {
      const { error: pivotErr } = await supabase
        .from("pivots")
        .update({ adopted: true })
        .eq("id", pivot.id);
      if (pivotErr) throw pivotErr;

      const { data, error } = await supabase
        .from("projects")
        .update({
          title: pivot.title,
          problem_statement: pivot.pivot_thesis,
          target_persona: pivot.target_market,
          status: "pivoted",
        })
        .eq("id", projectId)
        .select("*, domain:domains(*)")
        .single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["pivots", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
