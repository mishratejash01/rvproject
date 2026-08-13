-- Static institutional seed: RV campuses and the six sector domains.

insert into public.campuses (slug, name, short_name, city, ecosystem_note, sort_order) values
  ('rvce', 'R.V. College of Engineering', 'RVCE', 'Bengaluru',
   'MSME Host Institute Business Incubator; E-Cell runs E-Summit (10,000+ attendees) and the campus Hult Prize.', 10),
  ('rvitm', 'R.V. Institute of Technology and Management', 'RVITM', 'Bengaluru',
   'Home of the Startup Ignition Cell (SIC) — 150+ students and faculty building a deeptech startup culture.', 20),
  ('rvu', 'RV University', 'RVU', 'Bengaluru',
   'Interdisciplinary programs with dedicated entrepreneurship and innovation tracks.', 30),
  ('other-rv', 'Other RV Institutions', 'RV Group', 'Bengaluru',
   'Part of the RV Institutions group under RSST.', 40);

insert into public.domains (slug, name, description, icon, example_startups, sort_order) values
  ('ai_ml', 'AI / ML', 'Models, agents, applied intelligence and AI infrastructure', 'brain-circuit',
   'Sarvam AI, Krutrim, Neysa', 10),
  ('deeptech', 'Deeptech', 'Space, robotics, advanced materials, core-engineering IP', 'atom',
   'Agnikul, Skyroot, Pixxel', 20),
  ('saas', 'SaaS', 'Software platforms and tools sold to businesses', 'layout-grid',
   'Zoho, Freshworks, Postman', 30),
  ('fintech', 'Fintech', 'Payments, credit, wealth, and financial infrastructure', 'landmark',
   'Razorpay, Zerodha, CRED', 40),
  ('hardware', 'Hardware', 'Devices, EVs, electronics, embedded and manufacturing', 'cpu',
   'Ather Energy, Zypp, Exponent', 50),
  ('consumer', 'Consumer', 'Apps, marketplaces, D2C brands and consumer platforms', 'users',
   'Zepto, boAt, PhysicsWallah', 60);
