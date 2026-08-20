import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  IndustryProblem, PriorArtSearch, Cohort, Milestone, MilestoneProgress,
  Mentor, Alumnus, Competition, IpPolicy, Patent, StudentVenture, ArchiveRow, FinancialModel,
} from "@/lib/types";

const LONG = { staleTime: 15 * 60_000 };

/* ── Industry problem bank ─────────────────────────────────────────── */

export function useIndustryProblems(status = "open") {
  return useQuery({
    queryKey: ["industry-problems", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("industry_problems")
        .select("*, partner:industry_partners(*), domain:domains(*)")
        .eq("status", status)
        .order("posted_on", { ascending: false });
      if (error) throw error;
      return data as IndustryProblem[];
    },
  });
}

export function useClaimProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { problem_id: string; project_id: string; pitch: string }) => {
      const { data, error } = await supabase.from("problem_claims").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["industry-problems"] }),
  });
}

/* ── IP ────────────────────────────────────────────────────────────── */

export function usePriorArt(projectId: string | undefined) {
  return useQuery({
    queryKey: ["prior-art", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prior_art_searches")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PriorArtSearch | null;
    },
  });
}

export function useIpPolicies() {
  return useQuery({
    queryKey: ["ip-policies"],
    ...LONG,
    queryFn: async () => {
      const { data, error } = await supabase.from("ip_policies").select("*");
      if (error) throw error;
      return data as IpPolicy[];
    },
  });
}

export function usePatents(projectId?: string) {
  return useQuery({
    queryKey: ["patents", projectId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("patents").select("*").order("created_at", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Patent[];
    },
  });
}

/* ── Cohorts and mentors ───────────────────────────────────────────── */

export function useCohorts() {
  return useQuery({
    queryKey: ["cohorts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cohorts").select("*").order("starts_on", { ascending: false });
      if (error) throw error;
      return data as Cohort[];
    },
  });
}

export function useMilestones(cohortId: string | undefined) {
  return useQuery({
    queryKey: ["milestones", cohortId],
    enabled: Boolean(cohortId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .eq("cohort_id", cohortId!)
        .order("week_number");
      if (error) throw error;
      return data as Milestone[];
    },
  });
}

export function useMilestoneProgress(projectId: string | undefined) {
  return useQuery({
    queryKey: ["milestone-progress", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("milestone_progress")
        .select("*")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data as MilestoneProgress[];
    },
  });
}

export function useMentors() {
  return useQuery({
    queryKey: ["mentors"],
    ...LONG,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentors")
        .select("*")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data as Mentor[];
    },
  });
}

export function useMentorAssignments(projectId: string | undefined) {
  return useQuery({
    queryKey: ["mentor-assignments", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_assignments")
        .select("*, mentor:mentors(*), sessions:mentor_sessions(*)")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data as Array<{ id: string; status: string; assigned_on: string; mentor: Mentor; sessions: any[] }>;
    },
  });
}

export function useLogMentorSession(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      assignment_id: string;
      held_on: string;
      duration_minutes: number;
      topics: string;
      advice?: string;
    }) => {
      const { data, error } = await supabase.from("mentor_sessions").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mentor-assignments", projectId] }),
  });
}

/* ── Alumni, competitions, ventures, archive ───────────────────────── */

export function useAlumni() {
  return useQuery({
    queryKey: ["alumni"],
    ...LONG,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alumni")
        .select("*")
        .order("batch_year", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Alumnus[];
    },
  });
}

export function useCompetitions() {
  return useQuery({
    queryKey: ["competitions"],
    ...LONG,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("*")
        .eq("is_active", true)
        .order("application_closes", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Competition[];
    },
  });
}

export function useVentures(projectId?: string) {
  return useQuery({
    queryKey: ["ventures", projectId ?? "mine"],
    queryFn: async () => {
      let q = supabase.from("student_ventures").select("*").order("date_of_commencement", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data as StudentVenture[];
    },
  });
}

/** Institutional memory: full-text search over every shared project. */
export function useArchive(query: string, filters: { domain?: string; year?: number; campus?: string }) {
  return useQuery({
    queryKey: ["archive", query, filters],
    queryFn: async () => {
      let q = supabase.from("project_archive").select("*").limit(100);
      if (query.trim()) {
        // Escape the search term so punctuation cannot break the tsquery.
        const term = query.trim().replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean).join(" & ");
        if (term) q = q.textSearch("search_vector", term, { config: "english" });
      }
      if (filters.domain) q = q.eq("domain_slug", filters.domain);
      if (filters.year) q = q.eq("project_year", filters.year);
      if (filters.campus) q = q.eq("campus", filters.campus);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return data as ArchiveRow[];
    },
  });
}

/* ── Financial model ───────────────────────────────────────────────── */

export function useFinancialModel(projectId: string | undefined) {
  return useQuery({
    queryKey: ["financial-model", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_models")
        .select("*")
        .eq("project_id", projectId!)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as FinancialModel | null;
    },
  });
}

export function useSaveFinancialModel(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { assumptions: any; projections: any; summary: any; version: number }) => {
      const { data, error } = await supabase
        .from("financial_models")
        .upsert({ ...input, project_id: projectId }, { onConflict: "project_id,version" })
        .select()
        .single();
      if (error) throw error;
      return data as FinancialModel;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["financial-model", projectId] }),
  });
}
