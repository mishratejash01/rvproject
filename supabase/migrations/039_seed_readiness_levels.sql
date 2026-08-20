-- TRL 1-9 follows the standard definitions used by DST, BIRAC, iDEX and NIDHI
-- application forms. IRL 1-9 follows the Investment Readiness Level ladder from
-- the NSF I-Corps / customer development tradition.

insert into public.readiness_levels (scale, level, name, description, evidence_required) values
  ('trl', 1, 'Basic principles observed', 'The underlying scientific principle has been observed and reported. Nothing has been built.',
   'A literature review or written statement of the principle and why it could work.'),
  ('trl', 2, 'Technology concept formulated', 'A practical application of the principle has been articulated, but it remains speculative with no experimental proof.',
   'A written concept note describing the intended application and its assumptions.'),
  ('trl', 3, 'Proof of concept', 'Analytical and laboratory studies show the critical function works in isolation.',
   'Experimental results or simulation output demonstrating the critical function.'),
  ('trl', 4, 'Validated in the laboratory', 'Basic components are integrated and work together in a controlled laboratory setting.',
   'A breadboard or bench prototype plus test data from laboratory conditions.'),
  ('trl', 5, 'Validated in a relevant environment', 'Components are integrated with reasonably realistic supporting elements and tested in conditions resembling the real setting.',
   'Test results from a relevant environment, with the differences from the real setting stated.'),
  ('trl', 6, 'Demonstrated in a relevant environment', 'A representative model or prototype is demonstrated in a relevant environment, well beyond the laboratory.',
   'Demonstration record, performance data and observed failure modes.'),
  ('trl', 7, 'Demonstrated in an operational environment', 'A prototype near the planned system is demonstrated in the actual operating environment.',
   'Field trial results from the real environment with real users or operators.'),
  ('trl', 8, 'System complete and qualified', 'The technology is proven to work in its final form under expected conditions, including certification where required.',
   'Qualification and compliance test reports; certification where the sector requires it.'),
  ('trl', 9, 'Proven in operations', 'The system is deployed and operating successfully in real use, repeatedly.',
   'Operational deployment records, uptime and performance across a sustained period.'),

  ('irl', 1, 'Market opportunity identified', 'The market has been sized from the bottom up and the opportunity articulated.',
   'A bottom-up TAM, SAM and SOM with the arithmetic shown, not a top-down percentage of a large number.'),
  ('irl', 2, 'Value proposition hypothesised', 'A clear hypothesis exists about who has the problem and what value a solution creates.',
   'A written value proposition naming the segment, the pain and the measurable gain.'),
  ('irl', 3, 'Customer segment defined', 'The target customer archetype is specific, reachable and distinguishable from adjacent segments.',
   'A customer archetype with named example organisations or people who fit it.'),
  ('irl', 4, 'Problem/solution fit validated', 'Interviews with the real segment confirm the problem is acute and currently unsolved.',
   'At least ten problem interviews with the real segment, evidencing pain and current workarounds.'),
  ('irl', 5, 'Solution validated with users', 'Target users have engaged with a prototype or minimum viable product and completed the core task.',
   'Prototype test records showing real users completing the core task, and where they struggled.'),
  ('irl', 6, 'Product/market fit signals', 'Usage is repeating without prompting, or customers are asking for more.',
   'Retention or repeat-usage data, a waitlist with real conversion, or unsolicited demand.'),
  ('irl', 7, 'Business model validated', 'Pricing, channel and willingness to pay have been tested, not assumed.',
   'Signed letters of intent, pre-orders, or revenue, with the price point stated.'),
  ('irl', 8, 'Metrics and unit economics validated', 'Acquisition cost, lifetime value and margin are measured from real activity.',
   'A financial model driven by observed CAC, retention and margin rather than assumptions.'),
  ('irl', 9, 'Ready to scale', 'A repeatable, profitable growth motion exists and capital would accelerate a proven engine.',
   'Consistent growth data over several months plus a channel that reliably produces customers.')
on conflict (scale, level) do update set
  name = excluded.name, description = excluded.description, evidence_required = excluded.evidence_required;
