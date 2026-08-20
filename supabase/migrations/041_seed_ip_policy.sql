-- Institutional IP guidance. Deliberately generic and clearly marked as a
-- prompt to check the real policy, because ownership terms differ per campus
-- and getting this wrong costs a student their invention.

insert into public.ip_policies (campus_id, title, summary, ownership_rule, student_share, requires_disclosure, policy_url)
select
  c.id,
  'Who owns what you invent on campus',
  'Work created using institutional labs, funding, equipment or faculty supervision is usually NOT automatically yours. Most Indian institutions claim ownership or joint ownership of such IP, and share revenue with the inventor under a published policy. Confirm the exact terms with your institution''s IPR cell before you file, publish or pitch.',
  'Typically institution-owned or jointly owned where institutional resources, funded projects or faculty supervision were involved; typically inventor-owned where the work was genuinely independent of institutional resources.',
  'Commonly a revenue-share with the student inventor, set by the institution''s IPR policy.',
  true,
  null
from public.campuses c
where not exists (select 1 from public.ip_policies p where p.campus_id = c.id);
