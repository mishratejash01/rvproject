-- Skills taxonomy for co-founder matching and team-gap analysis. Deliberately
-- coarse: matching on complementary capability, not on tool trivia.

insert into public.skills (slug, name, category, sort_order) values
  ('backend', 'Backend engineering', 'engineering', 10),
  ('frontend', 'Frontend engineering', 'engineering', 20),
  ('mobile', 'Mobile development', 'engineering', 30),
  ('devops', 'Infrastructure and DevOps', 'engineering', 40),
  ('embedded', 'Embedded systems and firmware', 'engineering', 50),
  ('ml_engineering', 'Machine learning engineering', 'data_ai', 60),
  ('data_science', 'Data science and analytics', 'data_ai', 70),
  ('computer_vision', 'Computer vision', 'data_ai', 80),
  ('nlp', 'Natural language processing', 'data_ai', 90),
  ('robotics', 'Robotics and control', 'hardware', 100),
  ('mechanical_design', 'Mechanical design and CAD', 'hardware', 110),
  ('electronics', 'Electronics and PCB design', 'hardware', 120),
  ('manufacturing', 'Manufacturing and prototyping', 'hardware', 130),
  ('materials', 'Materials and chemical engineering', 'hardware', 140),
  ('product_design', 'Product design', 'design', 150),
  ('ux_research', 'UX research', 'design', 160),
  ('ui_design', 'Interface and visual design', 'design', 170),
  ('sales', 'Sales and business development', 'business', 180),
  ('marketing', 'Marketing and growth', 'business', 190),
  ('operations', 'Operations and supply chain', 'business', 200),
  ('finance', 'Finance and modelling', 'business', 210),
  ('legal_compliance', 'Legal and compliance', 'business', 220),
  ('customer_discovery', 'Customer discovery and research', 'business', 230),
  ('fundraising', 'Fundraising', 'business', 240),
  ('healthcare_domain', 'Healthcare domain knowledge', 'domain', 250),
  ('agriculture_domain', 'Agriculture domain knowledge', 'domain', 260),
  ('energy_domain', 'Energy and utilities domain knowledge', 'domain', 270),
  ('manufacturing_domain', 'Industrial and manufacturing domain knowledge', 'domain', 280),
  ('education_domain', 'Education domain knowledge', 'domain', 290),
  ('fintech_domain', 'Financial services domain knowledge', 'domain', 300),
  ('mobility_domain', 'Mobility and logistics domain knowledge', 'domain', 310),
  ('public_sector_domain', 'Government and public sector knowledge', 'domain', 320)
on conflict (slug) do update set
  name = excluded.name, category = excluded.category, sort_order = excluded.sort_order;
