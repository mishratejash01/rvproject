import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Evidence, EvidenceType, ReadinessLevel, ReadinessAssessment } from "@/lib/types";

/** Evidence ledger and readiness ladder. */

export function useEvidenceTypes() {
  return useQuery({
    queryKey: ["evidence-types"],
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("evidence_types").select("*").order("sort_order");
      if (error) throw error;
      return data as EvidenceType[];
    },
  });
}

export function useEvidence(projectId: string | undefined) {
  return useQuery({
    queryKey: ["evidence", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evidence")
        .select("*, type:evidence_types(*)")
        .eq("project_id", projectId!)
        .order("occurred_on", { ascending: false });
      if (error) throw error;
      return data as Evidence[];
    },
  });
}

/** Project evidence score, 0-100, computed in the database. */
export function useEvidenceScore(projectId: string | undefined) {
  return useQuery({
    queryKey: ["evidence-score", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("project_evidence_score", { p_project_id: projectId! });
      if (error) throw error;
      return Number(data ?? 0);
    },
  });
}

export function useAddEvidence(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Evidence>) => {
      const { data, error } = await supabase
        .from("evidence")
        .insert({ ...input, project_id: projectId })
        .select("*, type:evidence_types(*)")
        .single();
      if (error) throw error;
      return data as Evidence;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evidence", projectId] });
      qc.invalidateQueries({ queryKey: ["evidence-score", projectId] });
    },
  });
}

export function useDeleteEvidence(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("evidence").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evidence", projectId] });
      qc.invalidateQueries({ queryKey: ["evidence-score", projectId] });
    },
  });
}

export function useReadinessLevels(scale: "trl" | "irl") {
  return useQuery({
    queryKey: ["readiness-levels", scale],
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("readiness_levels")
        .select("*")
        .eq("scale", scale)
        .order("level");
      if (error) throw error;
      return data as ReadinessLevel[];
    },
  });
}

export function useReadiness(projectId: string | undefined) {
  return useQuery({
    queryKey: ["readiness", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("readiness_assessments")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ReadinessAssessment[];
    },
  });
}
