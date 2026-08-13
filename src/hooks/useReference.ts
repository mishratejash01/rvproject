import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Campus, Domain, GlossaryTerm, Investor, Benchmark, Grant, LeaderboardRow } from "@/lib/types";

/**
 * Reference data hooks. All content is served from the database — the app ships
 * with no hardcoded investors, benchmarks, grants or definitions.
 * Reference rows rarely change, so they are cached aggressively.
 */

const LONG_CACHE = { staleTime: 30 * 60_000, gcTime: 60 * 60_000 };

export function useDomains() {
  return useQuery({
    queryKey: ["domains"],
    ...LONG_CACHE,
    queryFn: async () => {
      const { data, error } = await supabase.from("domains").select("*").order("sort_order");
      if (error) throw error;
      return data as Domain[];
    },
  });
}

export function useCampuses() {
  return useQuery({
    queryKey: ["campuses"],
    ...LONG_CACHE,
    queryFn: async () => {
      const { data, error } = await supabase.from("campuses").select("*").order("sort_order");
      if (error) throw error;
      return data as Campus[];
    },
  });
}

export function useGlossary() {
  return useQuery({
    queryKey: ["glossary"],
    ...LONG_CACHE,
    queryFn: async () => {
      const { data, error } = await supabase.from("glossary").select("*").order("term");
      if (error) throw error;
      return data as GlossaryTerm[];
    },
  });
}

export function useInvestors() {
  return useQuery({
    queryKey: ["investors"],
    ...LONG_CACHE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investors")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Investor[];
    },
  });
}

export function useBenchmarks() {
  return useQuery({
    queryKey: ["benchmarks"],
    ...LONG_CACHE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benchmarks")
        .select("*")
        .order("valuation_usd", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Benchmark[];
    },
  });
}

export function useGrants() {
  return useQuery({
    queryKey: ["grants"],
    ...LONG_CACHE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grants")
        .select("*")
        .eq("is_active", true)
        .order("amount_max_inr", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Grant[];
    },
  });
}

export function useLeaderboard(campus?: string, domainSlug?: string) {
  return useQuery({
    queryKey: ["leaderboard", campus ?? "all", domainSlug ?? "all"],
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from("leaderboard")
        .select("*")
        .order("viability_score", { ascending: false })
        .limit(50);
      if (campus) query = query.eq("campus", campus);
      if (domainSlug) query = query.eq("domain_slug", domainSlug);
      const { data, error } = await query;
      if (error) throw error;
      return data as LeaderboardRow[];
    },
  });
}
