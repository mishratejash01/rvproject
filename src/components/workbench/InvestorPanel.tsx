import { useState } from "react";
import { motion } from "framer-motion";
import { Landmark, Mail, Linkedin, Copy, Send, ExternalLink, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Card, CardBody, Badge, EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { copyToClipboard } from "@/lib/utils";
import type { InvestorMatch, OutreachDraft } from "@/lib/types";

export function InvestorPanel({
  matches,
  drafts,
  projectId,
  running,
  onRun,
  onRefetchDrafts,
  hasValidation,
}: {
  matches: InvestorMatch[] | undefined;
  drafts: OutreachDraft[] | undefined;
  projectId: string;
  running: boolean;
  onRun: () => void;
  onRefetchDrafts: () => void;
  hasValidation: boolean;
}) {
  const [drafting, setDrafting] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  if (!matches?.length) {
    return (
      <Card>
        <EmptyState
          icon={<Landmark className="h-6 w-6" />}
          title="No investor matches yet"
          description={
            hasValidation
              ? "Rank real Indian early-stage funds against your sector, stage and cheque-size fit — then draft outreach that references their actual thesis."
              : "Validate the idea first so matching has something to rank against."
          }
          action={
            <Button loading={running} onClick={onRun} disabled={!hasValidation}>
              Find matching investors
            </Button>
          }
        />
      </Card>
    );
  }

  async function draftOutreach(investorId: number) {
    setDrafting(investorId);
    try {
      await api.outreach(projectId, investorId);
      onRefetchDrafts();
      setOpen(investorId);
      toast.success("Outreach drafted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not draft outreach");
    } finally {
      setDrafting(null);
    }
  }

  async function markSent(draft: OutreachDraft) {
    const { error } = await supabase
      .from("outreach_drafts")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", draft.id);
    if (error) {
      toast.error("Could not update status");
      return;
    }
    onRefetchDrafts();
    toast.success(
      draft.channel === "email" ? "Marked as sent — track the reply here." : "Marked as sent on LinkedIn.",
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.8125rem] text-ink-mute">
          {matches.length} funds ranked by sector, stage, cheque size and student-founder fit.
        </p>
        <Button variant="outline" size="sm" loading={running} onClick={onRun}>
          Re-rank
        </Button>
      </div>

      <div className="space-y-3">
        {matches.map((match, i) => {
          const inv = match.investor;
          const investorDrafts = drafts?.filter((d) => d.investor_id === inv.id) ?? [];
          const expanded = open === inv.id;

          return (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.35 }}
            >
              <Card>
                <CardBody>
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-[0.9375rem] font-semibold tracking-tight text-ink">
                          {inv.name}
                        </h3>
                        <Badge tone="neutral">{inv.firm_type.replace(/_/g, " ")}</Badge>
                        {inv.works_with_student_founders && (
                          <Badge tone="good">
                            <GraduationCap className="h-3 w-3" />
                            Backs students
                          </Badge>
                        )}
                      </div>

                      <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-mute">{inv.thesis}</p>

                      {match.rationale && (
                        <p className="mt-2.5 border-l-2 border-accent/40 pl-3 text-[0.8125rem] leading-relaxed text-ink">
                          {match.rationale}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.75rem] text-ink-faint">
                        {inv.cheque_display && <span>Cheque: {inv.cheque_display}</span>}
                        {inv.hq_city && <span>{inv.hq_city}</span>}
                        {inv.stages?.length > 0 && <span>{inv.stages.join(", ").replace(/_/g, "-")}</span>}
                        {inv.notable_portfolio?.length > 0 && (
                          <span className="truncate">Portfolio: {inv.notable_portfolio.slice(0, 3).join(", ")}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="num text-lg font-semibold text-ink">{Math.round(match.fit_score)}</p>
                        <p className="text-[0.6875rem] text-ink-faint">fit score</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3.5">
                    {investorDrafts.length === 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={drafting === inv.id}
                        onClick={() => draftOutreach(inv.id)}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Draft outreach
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setOpen(expanded ? null : inv.id)}>
                        <Mail className="h-3.5 w-3.5" />
                        {expanded ? "Hide drafts" : "View drafts"}
                      </Button>
                    )}
                    {inv.apply_url && (
                      <a href={inv.apply_url} target="_blank" rel="noreferrer noopener">
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Apply directly
                        </Button>
                      </a>
                    )}
                    {inv.linkedin_url && (
                      <a href={inv.linkedin_url} target="_blank" rel="noreferrer noopener">
                        <Button size="sm" variant="ghost">
                          <Linkedin className="h-3.5 w-3.5" />
                          LinkedIn
                        </Button>
                      </a>
                    )}
                  </div>

                  {expanded && investorDrafts.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 space-y-3 overflow-hidden border-t border-line pt-4"
                    >
                      {investorDrafts.map((draft) => (
                        <div key={draft.id} className="rounded-lg border border-line bg-overlay/40 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={draft.channel === "email" ? "accent" : "neutral"}>
                              {draft.channel === "email" ? "Cold email" : "LinkedIn DM"}
                            </Badge>
                            {draft.status === "sent" && <Badge tone="good">Sent</Badge>}
                          </div>
                          {draft.subject && (
                            <p className="mt-2.5 text-[0.8125rem] font-medium text-ink">
                              Subject: {draft.subject}
                            </p>
                          )}
                          <p className="mt-2 text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-ink-mute">
                            {draft.body}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                const text = draft.subject ? `${draft.subject}\n\n${draft.body}` : draft.body;
                                const ok = await copyToClipboard(text);
                                toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copy
                            </Button>
                            {draft.status !== "sent" && (
                              <Button size="sm" variant="ghost" onClick={() => markSent(draft)}>
                                <Send className="h-3.5 w-3.5" />
                                Mark as sent
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </CardBody>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
