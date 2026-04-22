-- Rental App Seed Data
-- Run this AFTER schema.sql
-- Admin password: admin123

-- ============================================================
-- 1. USERS
-- ============================================================
-- Password for all accounts: admin123
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Admin User',    'admin@stereosound.ee',  '$2a$10$r3mru6pl7wX105iDxmYnF.rIov4toDpj5ISUAkPY1EvvEW.ZMUO/q', 'admin'),
  ('Karmo Gudinas', 'karmo@stereosound.ee',  '$2a$10$r3mru6pl7wX105iDxmYnF.rIov4toDpj5ISUAkPY1EvvEW.ZMUO/q', 'manager'),
  ('Jaanus Tamm',   'jaanus@stereosound.ee', '$2a$10$r3mru6pl7wX105iDxmYnF.rIov4toDpj5ISUAkPY1EvvEW.ZMUO/q', 'crew')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- ============================================================
-- 2. CATEGORIES
-- ============================================================
INSERT INTO categories (name) VALUES
  ('Audio Equipment'),
  ('Lighting'),
  ('Staging')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 3. EQUIPMENT
-- ============================================================
INSERT INTO equipment (name, category_id, total_quantity, condition, location, description, daily_rate, barcode) VALUES
  -- Audio Equipment (category_id = 1)
  ('QSC K12.2 PA Speaker',       1, 8,  'excellent', 'Warehouse A, Shelf 1', 'Active 2000W 12" PA speaker with DSP', 75.00,  'QSC-K122-001'),
  ('Yamaha MG16XU Mixing Console',1, 3,  'good',      'Warehouse A, Shelf 2', '16-channel analog mixer with USB and effects', 85.00, 'YAM-MG16-001'),
  ('Shure SM58 Microphone',       1, 20, 'good',      'Warehouse A, Shelf 3', 'Industry standard dynamic vocal microphone', 15.00, 'SHU-SM58-001'),
  ('Pioneer CDJ-2000NXS2',        1, 4,  'excellent', 'Warehouse A, Shelf 4', 'Professional media player for DJs', 120.00, 'PIO-CDJ2000-001'),
  ('Sennheiser EW100 Wireless Set',1,6,  'good',      'Warehouse A, Shelf 5', 'UHF wireless microphone system', 45.00,  'SEN-EW100-001'),
  -- Lighting (category_id = 2)
  ('Chauvet DJ Intimidator Spot',  2, 12, 'good',     'Warehouse B, Shelf 1', '75W LED moving head spot fixture', 55.00,  'CHA-INTSPOT-001'),
  ('Cameo FLAT PRO 7 LED Par',     2, 24, 'excellent','Warehouse B, Shelf 2', 'Ultra-flat 7x8W RGBWA+UV LED par can', 18.00, 'CAM-FLATPRO-001'),
  ('Martin MAC Aura XB',           2, 6,  'excellent','Warehouse B, Shelf 3', 'Professional LED wash moving head', 145.00, 'MAR-MACAURA-001'),
  -- Staging (category_id = 3)
  ('Global Truss F34 2m Section',  3, 40, 'good',     'Warehouse C, Floor',  'F34 square truss section 2m length', 12.00,  'GLO-F34-2M-001'),
  ('Prolyte Stage Deck 2x1m',      3, 30, 'good',     'Warehouse C, Floor',  'Aluminium stage deck panel 2x1m', 22.00, 'PRO-DECK-2X1-001')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. CLIENTS
-- ============================================================
INSERT INTO clients (name, company, email, phone, address, notes) VALUES
  ('Tõnis Mägi',      'Tallinn Music Week OÜ',    'tonis@tmw.ee',          '+372 5234 1234', 'Vabaduse väljak 1, 10146 Tallinn', 'Annual music festival client, prefers email contact'),
  ('Erika Põldma',    'Põldma Events AS',          'erika@poldmaevents.ee', '+372 5678 9012', 'Narva mnt 7, 10117 Tallinn',       'Corporate event specialist, requires detailed invoices'),
  ('Mihkel Raudsepp', 'Studio Helilaine OÜ',       'mihkel@helilaine.ee',   '+372 5123 4567', 'Telliskivi 60a, 10412 Tallinn',    'Recording studio, long-term rental agreements'),
  ('Aino Kallas',     'Kallas Production Group',   'aino@kallasprod.ee',    '+372 5890 1234', 'Pärnu mnt 139, 11317 Tallinn',    'Film production company, high-end equipment only'),
  ('Rein Saar',       'Saar Konverentsid OÜ',      'rein@saarkonverents.ee','+372 5456 7890', 'Roosikrantsi 2, 10119 Tallinn',   'Conference organizer, regular client since 2021')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. CREW MEMBERS
-- ============================================================
INSERT INTO crew_members (name, role, skills, phone, email, hourly_rate, availability_notes) VALUES
  ('Andres Kask',   'Sound Engineer',       ARRAY['PA Systems', 'Live Sound', 'Recording', 'Stage Setup'], '+372 5611 2233', 'andres@crew.ee',   25.00, 'Available weekends and evenings'),
  ('Liisa Mets',    'Lighting Technician',  ARRAY['Moving Heads', 'LED Fixtures', 'DMX Programming', 'Rigging'], '+372 5644 5566', 'liisa@crew.ee', 22.00, 'Full-time availability'),
  ('Margus Oja',    'Stage Manager',        ARRAY['Staging', 'Truss Assembly', 'Rigging', 'Crew Coordination'], '+372 5677 8899', 'margus@crew.ee',  28.00, 'Available Mon-Sat'),
  ('Kersti Lõhmus', 'AV Technician',        ARRAY['Video Walls', 'Projection', 'AV Integration', 'Streaming'], '+372 5622 3344', 'kersti@crew.ee',  24.00, 'Limited availability in July')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. PROJECTS
-- ============================================================
INSERT INTO projects (name, client_id, start_date, end_date, status, budget, description) VALUES
  ('Tallinn Music Week 2025',      1, '2025-04-10', '2025-04-14', 'completed',   15000.00, 'Full production for 3 stages at Tallinn Music Week. Includes PA, lighting, and staging for all venues.'),
  ('Põldma Corporate Gala',        2, '2025-05-22', '2025-05-22', 'confirmed',   8500.00,  'Annual corporate gala dinner for 300 guests at Sokos Hotel Viru. Elegant audio and lighting setup required.'),
  ('Helilaine Studio Recording Session', 3, '2025-06-01', '2025-06-05', 'in_progress', 3200.00, 'Live recording session setup in Studio Helilaine. Requires top-quality microphones and mixing console.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. PROJECT EQUIPMENT
-- ============================================================
-- Project 1 (Tallinn Music Week - completed)
INSERT INTO project_equipment (project_id, equipment_id, quantity, daily_rate) VALUES
  (1, 1,  6, 70.00),  -- QSC K12.2 PA Speaker x6
  (1, 2,  2, 80.00),  -- Yamaha MG16XU x2
  (1, 3, 10, 12.00),  -- Shure SM58 x10
  (1, 6,  8, 50.00),  -- Chauvet Intimidator x8
  (1, 7, 16, 15.00),  -- Cameo FLAT PRO x16
  (1, 9, 20, 10.00),  -- Global Truss x20
  (1,10, 15, 20.00)   -- Prolyte Stage Deck x15
ON CONFLICT (project_id, equipment_id) DO NOTHING;

-- Project 2 (Põldma Gala - confirmed)
INSERT INTO project_equipment (project_id, equipment_id, quantity, daily_rate) VALUES
  (2, 1,  2, 75.00),  -- QSC K12.2 PA Speaker x2
  (2, 5,  4, 45.00),  -- Sennheiser Wireless x4
  (2, 7, 12, 18.00),  -- Cameo FLAT PRO x12
  (2, 8,  4, 140.00)  -- Martin MAC Aura x4
ON CONFLICT (project_id, equipment_id) DO NOTHING;

-- Project 3 (Helilaine Recording - in_progress)
INSERT INTO project_equipment (project_id, equipment_id, quantity, daily_rate) VALUES
  (3, 2, 1, 85.00),  -- Yamaha MG16XU x1
  (3, 3, 8, 15.00),  -- Shure SM58 x8
  (3, 5, 2, 45.00)   -- Sennheiser Wireless x2
ON CONFLICT (project_id, equipment_id) DO NOTHING;

-- ============================================================
-- 8. PROJECT CREW MEMBERS
-- ============================================================
-- Project 1
INSERT INTO project_crew_members (project_id, crew_member_id, role, hours, rate_per_hour) VALUES
  (1, 1, 'Lead Sound Engineer', 40.0, 28.00),
  (1, 2, 'Lighting Programmer',  40.0, 25.00),
  (1, 3, 'Stage Manager',        48.0, 30.00)
ON CONFLICT (project_id, crew_member_id) DO NOTHING;

-- Project 2
INSERT INTO project_crew_members (project_id, crew_member_id, role, hours, rate_per_hour) VALUES
  (2, 1, 'Sound Engineer', 10.0, 25.00),
  (2, 2, 'Lighting Tech',   8.0, 22.00)
ON CONFLICT (project_id, crew_member_id) DO NOTHING;

-- Project 3
INSERT INTO project_crew_members (project_id, crew_member_id, role, hours, rate_per_hour) VALUES
  (3, 1, 'Recording Engineer', 30.0, 25.00),
  (3, 4, 'AV Technician',      20.0, 24.00)
ON CONFLICT (project_id, crew_member_id) DO NOTHING;

-- ============================================================
-- 9. TASKS
-- ============================================================
INSERT INTO tasks (project_id, title, description, status, assigned_to, due_date) VALUES
  (2, 'Confirm equipment list with client', 'Send final equipment list to Erika for approval', 'done',        2, '2025-05-01'),
  (2, 'Arrange transport to venue',         'Book van for equipment delivery to Sokos Hotel',  'in_progress', 3, '2025-05-20'),
  (2, 'Pre-rig lighting',                   'Set up lighting rig day before the event',        'todo',        NULL, '2025-05-21'),
  (2, 'Sound check',                        'Full PA and microphone sound check on event day', 'todo',        3, '2025-05-22'),
  (3, 'Set up recording chain',             'Configure microphone signals and routing',        'done',        1, '2025-06-01'),
  (3, 'Record session day 1',               'Main recording session, tracks 1-12',             'in_progress', 1, '2025-06-02')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 10. QUOTES
-- ============================================================
INSERT INTO quotes (quote_number, project_id, client_id, status, date, due_date, notes, subtotal, vat_rate, vat_amount, total) VALUES
  ('Q-2025-0001', 2, 2, 'accepted', '2025-04-15', '2025-04-30',
   'Quote for Põldma Corporate Gala 2025. Price includes delivery and setup.',
   5250.00, 20.00, 1050.00, 6300.00),
  ('Q-2025-0002', NULL, 4, 'draft', '2025-05-01', '2025-05-15',
   'Quote for Kallas Production film shoot equipment package.',
   3800.00, 20.00, 760.00, 4560.00)
ON CONFLICT (quote_number) DO NOTHING;

-- Quote Items for Q-2025-0001
INSERT INTO quote_items (quote_id, description, quantity, unit_price, line_total) VALUES
  (1, 'QSC K12.2 PA Speaker (1 day)', 2, 75.00, 150.00),
  (1, 'Sennheiser EW100 Wireless Set (1 day)', 4, 45.00, 180.00),
  (1, 'Cameo FLAT PRO 7 LED Par (1 day)', 12, 18.00, 216.00),
  (1, 'Martin MAC Aura XB Moving Head (1 day)', 4, 140.00, 560.00),
  (1, 'Sound Engineer (10 hours)', 10, 25.00, 250.00),
  (1, 'Lighting Technician (8 hours)', 8, 22.00, 176.00),
  (1, 'Delivery and setup fee', 1, 350.00, 350.00),
  (1, 'Rigging and dismantling', 1, 200.00, 200.00),
  (1, 'Cable package and accessories', 1, 120.00, 120.00),
  (1, 'Additional consumables', 1, 48.00, 48.00)
ON CONFLICT DO NOTHING;

-- Quote Items for Q-2025-0002
INSERT INTO quote_items (quote_id, description, quantity, unit_price, line_total) VALUES
  (2, 'Pioneer CDJ-2000NXS2 (5 days)', 2, 120.00, 1200.00),
  (2, 'Yamaha MG16XU Mixing Console (5 days)', 1, 85.00, 425.00),
  (2, 'QSC K12.2 PA Speaker (5 days)', 4, 75.00, 1500.00),
  (2, 'Shure SM58 Microphone (5 days)', 6, 15.00, 450.00),
  (2, 'Cable and stand package', 1, 225.00, 225.00)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 11. INVOICES
-- ============================================================
INSERT INTO invoices (invoice_number, project_id, client_id, quote_id, status, date, due_date, notes, subtotal, vat_rate, vat_amount, total) VALUES
  ('INV-2025-0001', 1, 1, NULL, 'paid', '2025-04-20', '2025-05-20',
   'Invoice for Tallinn Music Week 2025 production services. Payment received.',
   12500.00, 20.00, 2500.00, 15000.00),
  ('INV-2025-0002', 2, 2, 1, 'sent', '2025-05-01', '2025-06-01',
   'Invoice for Põldma Corporate Gala. Please pay within 30 days.',
   5250.00, 20.00, 1050.00, 6300.00)
ON CONFLICT (invoice_number) DO NOTHING;

-- Invoice Items for INV-2025-0001
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, line_total) VALUES
  (1, 'QSC K12.2 PA Speaker x6 (4 days)', 24, 70.00, 1680.00),
  (1, 'Yamaha MG16XU Mixing Console x2 (4 days)', 8, 80.00, 640.00),
  (1, 'Shure SM58 Microphone x10 (4 days)', 40, 12.00, 480.00),
  (1, 'Chauvet Intimidator Spot x8 (4 days)', 32, 50.00, 1600.00),
  (1, 'Cameo FLAT PRO 7 LED Par x16 (4 days)', 64, 15.00, 960.00),
  (1, 'Global Truss F34 x20 (4 days)', 80, 10.00, 800.00),
  (1, 'Prolyte Stage Deck x15 (4 days)', 60, 20.00, 1200.00),
  (1, 'Lead Sound Engineer (40 hours)', 40, 28.00, 1120.00),
  (1, 'Lighting Programmer (40 hours)', 40, 25.00, 1000.00),
  (1, 'Stage Manager (48 hours)', 48, 30.00, 1440.00),
  (1, 'Transport and logistics', 1, 580.00, 580.00)
ON CONFLICT DO NOTHING;

-- Invoice Items for INV-2025-0002
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, line_total) VALUES
  (2, 'QSC K12.2 PA Speaker (1 day)', 2, 75.00, 150.00),
  (2, 'Sennheiser EW100 Wireless Set (1 day)', 4, 45.00, 180.00),
  (2, 'Cameo FLAT PRO 7 LED Par (1 day)', 12, 18.00, 216.00),
  (2, 'Martin MAC Aura XB Moving Head (1 day)', 4, 140.00, 560.00),
  (2, 'Sound Engineer (10 hours)', 10, 25.00, 250.00),
  (2, 'Lighting Technician (8 hours)', 8, 22.00, 176.00),
  (2, 'Delivery and setup fee', 1, 350.00, 350.00),
  (2, 'Rigging and dismantling', 1, 200.00, 200.00),
  (2, 'Cable package and accessories', 1, 120.00, 120.00),
  (2, 'Additional consumables', 1, 48.00, 48.00)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 12. COMMUNICATION LOGS
-- ============================================================
INSERT INTO communication_logs (client_id, user_id, type, subject, message) VALUES
  (1, 2, 'email',   'TMW 2025 Equipment Confirmation', 'Confirmed equipment list and delivery schedule for Tallinn Music Week 2025.'),
  (2, 2, 'email',   'Quote Q-2025-0001 Sent',          'Sent quote for corporate gala. Client responded with acceptance within 24h.'),
  (2, 2, 'phone',   'Gala Setup Details',               'Discussed venue access times and parking for equipment delivery.'),
  (3, 1, 'meeting', 'Studio Session Planning',          'Met at the studio to discuss microphone placement and signal routing requirements.'),
  (4, 2, 'email',   'Quote Q-2025-0002 Sent',           'Sent draft quote for film shoot. Awaiting client feedback.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 13. EQUIPMENT LOGS
-- ============================================================
INSERT INTO equipment_logs (equipment_id, project_id, action, quantity, user_id, notes) VALUES
  (1, 1, 'check_out', 6, 2, 'Checked out for Tallinn Music Week main stage'),
  (2, 1, 'check_out', 2, 2, 'Two mixing consoles for FOH and monitor mix'),
  (3, 1, 'check_out',10, 3, 'Vocal mics for all stages'),
  (1, 1, 'check_in',  6, 3, 'All speakers returned, one minor scratch on unit 3'),
  (2, 1, 'check_in',  2, 3, 'Both consoles returned in good condition'),
  (3, 1, 'check_in', 10, 3, 'All microphones returned with cables'),
  (2, 3, 'check_out', 1, 1, 'Console for Helilaine recording session'),
  (3, 3, 'check_out', 8, 1, 'Microphones for studio recording')
ON CONFLICT DO NOTHING;
