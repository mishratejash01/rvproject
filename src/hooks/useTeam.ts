import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CofounderProfile, ProjectMember, Skill, FoundersAgreement } from "@/lib/types";

/** Co-founder discovery, team roster and the founders' agreement. */

export function useSkills() {
  return useQuery({
    queryKey: ["skills"],
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("skills").select("*").order("sort_order");
      if (error) throw error;
      return data as Skill[];
    },
  });
}

export function useMyCofounderProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["cofounder-profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cofounder_profiles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as CofounderProfile | null;
    },
  });
}

export function useUpsertCofounderProfile(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CofounderProfile>) => {
      const { data, error } = await supabase
        .from("cofounder_profiles")
        .upsert({ ...input, user_id: userId, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return data as CofounderProfile;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cofounder-profile", userId] });
      qc.invalidateQueries({ queryKey: ["cofounder-directory"] });
    },
  });
}

/** Everyone currently open to being approached. */
export function useCofounderDirectory() {
  return useQuery({
    queryKey: ["cofounder-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cofounder_profiles")
        .select("*")
        .eq("is_seeking", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as CofounderProfile[];
    },
  });
}

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-members", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("*")
        .eq("project_id", projectId!)
        .order("joined_on");
      if (error) throw error;
      return data as ProjectMember[];
    },
  });
}

export function useUpsertMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ProjectMember>) => {
      const { data, error } = await supabase
        .from("project_members")
        .upsert({ ...input, project_id: projectId }, { onConflict: "project_id,user_id" })
        .select()
        .single();
      if (error) throw error;
      return data as ProjectMember;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-members", projectId] }),
  });
}

export function useFoundersAgreement(projectId: string | undefined) {
  return useQuery({
    queryKey: ["founders-agreement", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("founders_agreements")
        .select("*")
        .eq("project_id", projectId!)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as FoundersAgreement | null;
    },
  });
}

/** Incoming and outgoing co-founder requests for the signed-in user. */
export function useCofounderRequests(userId: string | undefined) {
  return useQuery({
    queryKey: ["cofounder-requests", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cofounder_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string;
        from_user: string;
        to_user: string;
        project_id: string | null;
        message: string;
        status: "pending" | "accepted" | "declined";
        created_at: string;
      }>;
    },
  });
}

export function useSendCofounderRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { to_user: string; project_id?: string | null; message: string }) => {
      const { data, error } = await supabase.from("cofounder_requests").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cofounder-requests"] }),
  });
}

export function useRespondToRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "declined" }) => {
      const { error } = await supabase
        .from("cofounder_requests")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cofounder-requests"] }),
  });
}
