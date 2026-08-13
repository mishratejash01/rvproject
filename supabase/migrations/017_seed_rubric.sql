-- Scoring rubric: the exact criteria and weights each AI module must apply.
-- Stored as data so scoring philosophy is tunable without redeploying.

insert into public.rubric_criteria (module, key, label, description, weight, sort_order) values
  -- Module 1: Idea Validation (weights sum to 100)
  ('validation', 'pain_severity', 'Pain Severity',
   'How acute and frequent is the problem for the target user? Painkillers score high; conveniences score low.', 25, 10),
  ('validation', 'market_urgency', 'Market Urgency',
   'Is the market actively seeking and paying for solutions today, or must demand be manufactured?', 20, 20),
  ('validation', 'solution_fit', 'Solution Fit',
   'Does the proposed technical approach actually resolve the stated pain better than current alternatives?', 20, 30),
  ('validation', 'feasibility', 'Execution Feasibility',
   'Can a student team realistically build and ship this with accessible resources in 6-12 months?', 15, 40),
  ('validation', 'defensibility', 'Defensibility',
   'Is there a credible moat forming — proprietary data, deep tech, network effects — or is this a replicable wrapper?', 12, 50),
  ('validation', 'timing', 'Why Now',
   'Is there a technology shift, regulation or behaviour change that makes this idea newly possible?', 8, 60),

  -- Module 2: VC Investibility (four PRD filters, weights sum to 100)
  ('investibility', 'founder_market_fit', 'Founder-Market Fit',
   'Does the team have the academic depth, technical skill or lived exposure to win this specific market?', 25, 10),
  ('investibility', 'scalability', 'Scalability & Unit Economics',
   'Can revenue grow without linear cost growth? Are the unit economics structurally sound at scale?', 30, 20),
  ('investibility', 'margins', 'Gross Margin Potential',
   'Will the long-term margin profile (software-like vs services-like) attract institutional capital?', 20, 30),
  ('investibility', 'moat', 'Barrier to Entry',
   'Could a well-funded competitor replicate this in under six months? What compounds over time?', 25, 40);
