-- Evidence taxonomy. base_strength encodes the central rule of evidence
-- grading: what people DID outranks what they SAID, and a commitment of money,
-- time or reputation outranks an opinion.

insert into public.evidence_types (slug, name, description, category, is_behavioural, base_strength, guidance, sort_order) values
  ('desk_research', 'Desk research', 'A report, article or dataset you read about the market.', 'desk_research', false, 3,
   'Weakest evidence there is. It tells you the market exists, never that anyone wants your solution. Use it to size a market, never to justify building.', 10),

  ('expert_opinion', 'Expert opinion', 'A domain expert or professor gave a view on the problem.', 'conversation', false, 6,
   'Useful for feasibility, weak for demand. Experts predict badly. Ask what they have seen happen, not what they think will happen.', 20),

  ('problem_interview', 'Problem interview', 'A conversation with someone who lives the problem, about their actual past behaviour.', 'conversation', false, 11,
   'The core of customer discovery. Ask about the last time the problem happened, what it cost them and what they did about it. Never pitch. Never ask if they would use it.', 30),

  ('observation', 'Direct observation', 'You watched the problem happen in the real setting.', 'observation', true, 14,
   'You saw the queue, the spreadsheet, the workaround. Behavioural, so it beats any interview. Record what you counted, not what you felt.', 40),

  ('survey', 'Survey response', 'Structured responses from the target segment.', 'conversation', false, 8,
   'Scales badly for insight and well for prevalence. Only counts if respondents are genuinely in your segment. Stated intent is not demand.', 50),

  ('waitlist_signup', 'Waitlist signup', 'Someone gave you their contact details to be told when it launches.', 'commitment', true, 15,
   'A small real action. Strong only if the signup page described the product honestly and the traffic was not incentivised.', 60),

  ('smoke_test', 'Landing page smoke test', 'A page describing the product, with measured click-through or signup rate.', 'experiment', true, 17,
   'Report visitors, conversions and traffic source. A 30% conversion from twelve friends is not a signal.', 70),

  ('concierge_test', 'Concierge or Wizard of Oz test', 'You delivered the outcome manually, without the product existing.', 'experiment', true, 22,
   'Excellent early evidence. Proves people want the outcome and shows you the real workflow before you build it.', 80),

  ('prototype_test', 'Prototype test with a real user', 'A target user used your working prototype on a real task.', 'experiment', true, 21,
   'Record the task, whether they completed it unaided, and where they got stuck. Friends do not count as users.', 90),

  ('pilot', 'Pilot deployment', 'Your solution ran in a real environment with a real organisation.', 'experiment', true, 28,
   'Strong. Capture duration, scale, the metric that moved and whether they want to continue.', 100),

  ('letter_of_intent', 'Letter of intent', 'A written, signed statement of intent to buy or deploy.', 'commitment', true, 25,
   'Ask for it on their letterhead with a named signatory. An unsigned email of encouragement is not an LOI.', 110),

  ('pre_order', 'Pre-order or deposit', 'Someone paid money before the product existed.', 'commitment', true, 34,
   'The strongest early evidence available to a student team. Even a small deposit separates real demand from politeness.', 120),

  ('paying_customer', 'Paying customer', 'A customer has paid for the delivered product or service.', 'commitment', true, 38,
   'Revenue. Record amount, date, whether they renewed and whether they were related to the founders.', 130),

  ('institutional_commitment', 'Institutional commitment', 'A department, hospital, company or government body formally agreed to adopt or trial.', 'commitment', true, 30,
   'Name the body and the signatory. Verbal enthusiasm from a mid-level contact is not a commitment.', 140)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  is_behavioural = excluded.is_behavioural, base_strength = excluded.base_strength,
  guidance = excluded.guidance, sort_order = excluded.sort_order;
