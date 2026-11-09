-- Fictional demo mover. Every date is relative to today, so the attention commands always have
-- something to say: an enquiry nobody answered, a quote due a follow-up, an expired quote still
-- open, a move tomorrow with no crew, a deposit not paid, a driver rostered past the fatigue limit,
-- a driver whose licence lapses before the move, an undeclared piano, a subcontracted move with no
-- consent, a finished job not invoiced, a verbal variation, a claim nobody answered, storage
-- accounts at every step of the overdue ladder, a short rate notice and a disposal done too early.
-- Idempotent: fixed ids and on conflict do nothing.

insert into company_profile (id, name, jurisdiction, state, currency, timezone)
values ('00000000-0000-4000-8000-000000000001', 'Harbourside Removals and Storage', 'AU', 'NSW', 'AUD', 'Australia/Sydney')
on conflict do nothing;

insert into customers (id, name, email, phone, business, source, last_contact_on) values
('10000000-0000-4000-8000-000000000001', 'Emma Wilson', 'emma.wilson@example.com', '0400 555 101', false, 'Website', mover_today() - 4),
('10000000-0000-4000-8000-000000000002', 'Daniel Lee', 'daniel.lee@example.com', '0400 555 102', false, 'Google', mover_today() - 1),
('10000000-0000-4000-8000-000000000003', 'Sophie Chen', 'sophie.chen@example.com', '0400 555 103', false, 'Referral', mover_today() - 6),
('10000000-0000-4000-8000-000000000004', 'Marcus Brown', 'marcus.brown@example.com', '0400 555 104', false, 'Google', mover_today() - 35),
('10000000-0000-4000-8000-000000000005', 'Coastal Dental Pty Ltd', 'practice@coastaldental.example', '02 9555 0105', true, 'Referral', mover_today() - 2),
('10000000-0000-4000-8000-000000000006', 'Olivia Martin', 'olivia.martin@example.com', '0400 555 106', false, 'Website', mover_today() - 10),
('10000000-0000-4000-8000-000000000007', 'James Patel', 'james.patel@example.com', '0400 555 107', false, 'Google', mover_today() - 8),
('10000000-0000-4000-8000-000000000008', 'Ruby Taylor', 'ruby.taylor@example.com', '0400 555 108', false, 'Website', mover_today() - 9),
('10000000-0000-4000-8000-000000000009', 'Noah Harris', 'noah.harris@example.com', '0400 555 109', false, 'Repeat', mover_today() - 4),
('10000000-0000-4000-8000-000000000010', 'Grace Kim', 'grace.kim@example.com', '0400 555 110', false, 'Google', mover_today() - 18),
('10000000-0000-4000-8000-000000000011', 'Liam Scott', 'liam.scott@example.com', '0400 555 111', false, 'Google', mover_today() - 10),
('10000000-0000-4000-8000-000000000012', 'Ava Robinson', 'ava.robinson@example.com', '0400 555 112', false, 'Referral', mover_today() - 40),
('10000000-0000-4000-8000-000000000013', 'Henry Walker', 'henry.walker@example.com', '0400 555 113', false, 'Website', mover_today() - 25),
('10000000-0000-4000-8000-000000000014', 'Chloe Adams', 'chloe.adams@example.com', '0400 555 114', false, 'Repeat', mover_today() - 7),
('10000000-0000-4000-8000-000000000015', 'Zoe Clarke', 'zoe.clarke@example.com', '0400 555 115', false, 'Phone', mover_today() - 5),
('10000000-0000-4000-8000-000000000016', 'Ethan Wright', 'ethan.wright@example.com', '0400 555 116', false, 'Website', mover_today() - 3),
('10000000-0000-4000-8000-000000000017', 'Peter Nguyen', 'peter.nguyen@example.com', '0400 555 117', false, 'Repeat', mover_today() - 200),
('10000000-0000-4000-8000-000000000018', 'Megan Fraser', 'megan.fraser@example.com', '0400 555 118', false, 'Google', mover_today() - 60),
('10000000-0000-4000-8000-000000000019', 'Jack Morrison', 'jack.morrison@example.com', '0400 555 119', false, 'Website', mover_today() - 40),
('10000000-0000-4000-8000-000000000020', 'Lucy Bennett', 'lucy.bennett@example.com', '0400 555 120', false, 'Google', mover_today() - 35),
('10000000-0000-4000-8000-000000000021', 'Harper Family Trust', 'admin@harpertrust.example', '02 9555 0121', true, 'Referral', mover_today() - 7),
('10000000-0000-4000-8000-000000000022', 'Oscar Reid', 'oscar.reid@example.com', '0400 555 122', false, 'Google', mover_today() - 100)
on conflict do nothing;

insert into trucks (id, name, rego, gvm_t, capacity_m3) values
('20000000-0000-4000-8000-000000000001', 'Truck 1', 'HRS01A', 8, 30),
('20000000-0000-4000-8000-000000000002', 'Truck 2', 'HRS02B', 14, 45),
('20000000-0000-4000-8000-000000000003', 'Truck 3', 'HRS03C', 16, 45)
on conflict do nothing;

insert into crew (id, name, role, licence_class, licence_expires_on, phone) values
('30000000-0000-4000-8000-000000000001', 'Ben Carter', 'driver', 'MR', mover_today() + 400, '0411 000 001'),
('30000000-0000-4000-8000-000000000002', 'Tama Ngata', 'driver', 'HR', mover_today() + 2, '0411 000 002'),
('30000000-0000-4000-8000-000000000003', 'Mia Rossi', 'porter', null, null, '0411 000 003'),
('30000000-0000-4000-8000-000000000004', 'Josh Evans', 'porter', 'C', mover_today() + 900, '0411 000 004'),
('30000000-0000-4000-8000-000000000005', 'Priya Singh', 'packer', null, null, '0411 000 005'),
('30000000-0000-4000-8000-000000000006', 'Sean Murphy', 'driver', 'HR', mover_today() + 700, '0411 000 006')
on conflict do nothing;

insert into jobs (id, name, customer_id, kind, from_address, to_address, status, enquiry_on, source, survey, survey_on, move_on, est_hours, packing, to_storage, storage_rate, quote_amount, quote_sent_on, quote_valid_to, last_follow_up_on, accepted_on, deposit, insurance, insured_value, subcontractor, completed_on, actual_hours, lost_reason) values
-- Open enquiries
('40000000-0000-4000-8000-000000000001', 'MOV-1001', '10000000-0000-4000-8000-000000000001', 'local', '12 Ocean St, Bondi', '4 Park Rd, Randwick', 'enquiry', mover_today() - 4, 'Website', 'none', null, mover_today() + 21, null, false, false, null, null, null, null, null, null, 0, null, null, null, null, null, null),
('40000000-0000-4000-8000-000000000002', 'MOV-1002', '10000000-0000-4000-8000-000000000002', 'local', '8 King St, Newtown', '19 Queen St, Glebe', 'enquiry', mover_today() - 1, 'Google', 'none', null, mover_today() + 30, null, false, false, null, null, null, null, null, null, 0, null, null, null, null, null, null),
-- Quotes out
('40000000-0000-4000-8000-000000000003', 'MOV-1003', '10000000-0000-4000-8000-000000000003', 'local', '3 Hill Ave, Epping', '77 Lake Rd, Ryde', 'quoted', mover_today() - 9, 'Referral', 'none', null, mover_today() + 18, 8, false, false, null, 1440, mover_today() - 6, mover_today() + 24, null, null, 0, null, null, null, null, null, null),
('40000000-0000-4000-8000-000000000004', 'MOV-1004', '10000000-0000-4000-8000-000000000004', 'interstate', '5 Bay St, Manly', '20 River Tce, Brisbane', 'quoted', mover_today() - 40, 'Google', 'video', mover_today() - 38, mover_today() + 10, 16, true, false, null, 6900, mover_today() - 35, mover_today() - 5, mover_today() - 30, null, 0, null, null, null, null, null, null),
('40000000-0000-4000-8000-000000000005', 'MOV-1005', '10000000-0000-4000-8000-000000000005', 'office', 'Suite 2, 40 Pitt St, Sydney', 'Level 1, 9 Miller St, North Sydney', 'quoted', mover_today() - 5, 'Referral', 'in-home', mover_today() - 4, mover_today() + 25, 10, true, false, null, 2650, mover_today() - 2, mover_today() + 28, null, null, 0, null, null, null, null, null, null),
('40000000-0000-4000-8000-000000000016', 'MOV-1016', '10000000-0000-4000-8000-000000000016', 'local', '61 Elm St, Ashfield', 'Harbourside depot (storage)', 'quoted', mover_today() - 4, 'Website', 'video', mover_today() - 3, mover_today() + 16, 6, false, true, null, 1080, mover_today() - 1, mover_today() + 29, null, null, 0, null, null, null, null, null, null),
-- Booked
('40000000-0000-4000-8000-000000000006', 'MOV-1006', '10000000-0000-4000-8000-000000000006', 'local', '22 Grove St, Lilyfield', '8 Wharf Rd, Balmain', 'booked', mover_today() - 20, 'Website', 'in-home', mover_today() - 18, mover_today() + 3, 8, true, false, null, 1640, mover_today() - 16, mover_today() + 14, null, mover_today() - 10, 328, null, null, null, null, null, null),
('40000000-0000-4000-8000-000000000007', 'MOV-1007', '10000000-0000-4000-8000-000000000007', 'interstate', '14 Rose Cres, Parramatta', '3 Collins Pl, Melbourne', 'booked', mover_today() - 25, 'Google', 'in-home', mover_today() - 22, mover_today() + 5, 20, true, false, null, 8400, mover_today() - 20, mover_today() + 10, mover_today() - 15, mover_today() - 8, 1680, 'taken', 60000, 'Westline Linehaul', null, null, null),
('40000000-0000-4000-8000-000000000008', 'MOV-1008', '10000000-0000-4000-8000-000000000008', 'local', '9 Smith St, Marrickville', '41 Albert Rd, Strathfield', 'booked', mover_today() - 15, 'Website', 'video', mover_today() - 14, mover_today() + 1, 5, false, false, null, 900, mover_today() - 13, mover_today() + 17, null, mover_today() - 9, 180, 'declined', null, null, null, null, null),
('40000000-0000-4000-8000-000000000014', 'MOV-1014', '10000000-0000-4000-8000-000000000014', 'local', '2 Cliff St, Mosman', '50 Spit Rd, Mosman', 'booked', mover_today() - 12, 'Repeat', 'none', null, mover_today() + 3, 4, false, false, null, 720, mover_today() - 11, mover_today() + 19, null, mover_today() - 7, 144, 'declined', null, null, null, null, null),
('40000000-0000-4000-8000-000000000015', 'MOV-1015', '10000000-0000-4000-8000-000000000015', 'local', '7 Beach Rd, Cronulla', '18 Kingsway, Miranda', 'booked', mover_today() - 6, 'Phone', 'none', null, mover_today() + 7, 6, false, false, null, 1080, null, null, null, mover_today() - 5, 216, 'taken', 25000, null, null, null, null),
-- Done
('40000000-0000-4000-8000-000000000009', 'MOV-1009', '10000000-0000-4000-8000-000000000009', 'local', '30 High St, Kensington', '6 Station St, Kogarah', 'completed', mover_today() - 21, 'Repeat', 'video', mover_today() - 20, mover_today() - 4, 7, false, false, null, 1260, mover_today() - 18, mover_today() + 12, null, mover_today() - 14, 252, 'declined', null, null, mover_today() - 4, 9, null),
('40000000-0000-4000-8000-000000000010', 'MOV-1010', '10000000-0000-4000-8000-000000000010', 'local', '15 Bridge Rd, Glebe', '2 Darling St, Rozelle', 'completed', mover_today() - 40, 'Google', 'in-home', mover_today() - 38, mover_today() - 20, 6, true, false, null, 1180, mover_today() - 36, mover_today() - 6, null, mover_today() - 30, 236, 'taken', 30000, null, mover_today() - 20, 6, null),
('40000000-0000-4000-8000-000000000012', 'MOV-1012', '10000000-0000-4000-8000-000000000012', 'storage', '44 Forest Rd, Hurstville', 'Harbourside depot (storage)', 'completed', mover_today() - 60, 'Referral', 'in-home', mover_today() - 55, mover_today() - 40, 7, true, true, 330, 1350, mover_today() - 52, mover_today() - 22, null, mover_today() - 48, 270, 'taken', 45000, null, mover_today() - 40, 7, null),
-- Lost
('40000000-0000-4000-8000-000000000011', 'MOV-1011', '10000000-0000-4000-8000-000000000011', 'local', '1 Main St, Penrith', '90 Great Western Hwy, Blacktown', 'lost', mover_today() - 30, 'Google', 'none', null, mover_today() - 5, 7, false, false, null, 1260, mover_today() - 28, mover_today() + 2, mover_today() - 24, null, 0, null, null, null, null, null, 'Price: went with a cheaper quote'),
('40000000-0000-4000-8000-000000000013', 'MOV-1013', '10000000-0000-4000-8000-000000000013', 'local', '5 Church St, Ryde', '12 Victoria Rd, Gladesville', 'lost', mover_today() - 50, 'Website', 'none', null, mover_today() - 25, 5, false, false, null, 900, mover_today() - 45, mover_today() - 15, null, null, 0, null, null, null, null, null, 'Timing: no truck on the day they wanted')
on conflict do nothing;

-- Survey inventories (cubic metres each).
insert into inventory (id, name, job_id, room, qty, m3_each, value, declared_on) values
('50000000-0000-4000-8000-000000000001', 'Three seater sofa', '40000000-0000-4000-8000-000000000003', 'Lounge', 1, 2.0, null, null),
('50000000-0000-4000-8000-000000000002', 'Queen bed', '40000000-0000-4000-8000-000000000003', 'Bedroom 1', 2, 2.2, null, null),
('50000000-0000-4000-8000-000000000003', 'Cartons', '40000000-0000-4000-8000-000000000003', 'Whole house', 70, 0.1, null, null),
('50000000-0000-4000-8000-000000000004', 'Dining setting', '40000000-0000-4000-8000-000000000003', 'Dining', 1, 2.5, null, null),
('50000000-0000-4000-8000-000000000005', 'Wardrobe', '40000000-0000-4000-8000-000000000003', 'Bedroom 2', 2, 1.8, null, null),
('50000000-0000-4000-8000-000000000006', 'Garage shelving and tools', '40000000-0000-4000-8000-000000000003', 'Garage', 1, 15.0, null, null),
('50000000-0000-4000-8000-000000000007', 'Upright piano', '40000000-0000-4000-8000-000000000007', 'Lounge', 1, 1.5, 8000, null),
('50000000-0000-4000-8000-000000000008', 'Cartons', '40000000-0000-4000-8000-000000000007', 'Whole house', 120, 0.1, null, null),
('50000000-0000-4000-8000-000000000009', 'Furniture, four bedroom house', '40000000-0000-4000-8000-000000000007', 'Whole house', 1, 36.5, null, null),
('50000000-0000-4000-8000-000000000010', 'Artwork, framed', '40000000-0000-4000-8000-000000000007', 'Hall', 4, 0.1, 2500, mover_today() - 22),
('50000000-0000-4000-8000-000000000011', 'Furniture, two bedroom unit', '40000000-0000-4000-8000-000000000006', 'Whole house', 1, 18.0, null, null),
('50000000-0000-4000-8000-000000000012', 'Cartons', '40000000-0000-4000-8000-000000000006', 'Whole house', 40, 0.1, null, null),
('50000000-0000-4000-8000-000000000013', 'Furniture, one bedroom unit', '40000000-0000-4000-8000-000000000008', 'Whole house', 1, 11.0, null, null),
('50000000-0000-4000-8000-000000000014', 'Furniture, three bedroom house', '40000000-0000-4000-8000-000000000012', 'Whole house', 1, 26.0, null, null),
('50000000-0000-4000-8000-000000000015', 'Furniture, two bedroom unit', '40000000-0000-4000-8000-000000000009', 'Whole house', 1, 17.0, null, null),
('50000000-0000-4000-8000-000000000016', 'Furniture, studio', '40000000-0000-4000-8000-000000000014', 'Whole house', 1, 7.0, null, null),
('50000000-0000-4000-8000-000000000017', 'Furniture, two bedroom unit', '40000000-0000-4000-8000-000000000015', 'Whole house', 1, 16.0, null, null),
('50000000-0000-4000-8000-000000000019', 'Dental chairs and cabinetry', '40000000-0000-4000-8000-000000000005', 'Surgery', 1, 22.0, null, null),
('50000000-0000-4000-8000-000000000018', 'Furniture, two bedroom unit', '40000000-0000-4000-8000-000000000016', 'Whole house', 1, 14.0, null, null)
on conflict do nothing;

insert into variations (id, name, job_id, amount, agreed_on, agreed_how) values
('51000000-0000-4000-8000-000000000001', 'Extra two hours, piano up stairs not on the inventory', '40000000-0000-4000-8000-000000000009', 360, mover_today() - 4, 'verbal'),
('51000000-0000-4000-8000-000000000002', 'Second pickup from a storage cage', '40000000-0000-4000-8000-000000000010', 180, mover_today() - 22, 'email')
on conflict do nothing;

insert into allocations (id, name, job_id, crew_id, truck_id, work_on, hours, driving) values
('60000000-0000-4000-8000-000000000001', 'MOV-1006 Ben Carter', '40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', mover_today() + 3, 8, true),
('60000000-0000-4000-8000-000000000002', 'MOV-1006 Mia Rossi', '40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', mover_today() + 3, 8, false),
('60000000-0000-4000-8000-000000000003', 'MOV-1014 Ben Carter', '40000000-0000-4000-8000-000000000014', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', mover_today() + 3, 5, true),
('60000000-0000-4000-8000-000000000004', 'MOV-1014 Josh Evans', '40000000-0000-4000-8000-000000000014', '30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', mover_today() + 3, 5, false),
('60000000-0000-4000-8000-000000000005', 'MOV-1007 Tama Ngata', '40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', mover_today() + 5, 10, true),
('60000000-0000-4000-8000-000000000006', 'MOV-1007 Josh Evans', '40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000003', mover_today() + 5, 10, false),
('60000000-0000-4000-8000-000000000007', 'MOV-1007 Priya Singh', '40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000005', null, mover_today() + 4, 8, false),
('60000000-0000-4000-8000-000000000008', 'MOV-1015 Sean Murphy', '40000000-0000-4000-8000-000000000015', '30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', mover_today() + 7, 6, true),
('60000000-0000-4000-8000-000000000009', 'MOV-1015 Mia Rossi', '40000000-0000-4000-8000-000000000015', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', mover_today() + 7, 6, false),
('60000000-0000-4000-8000-000000000010', 'MOV-1009 Ben Carter', '40000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', mover_today() - 4, 9, true),
('60000000-0000-4000-8000-000000000011', 'MOV-1009 Josh Evans', '40000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', mover_today() - 4, 9, false)
on conflict do nothing;

insert into storage_accounts (id, name, customer_id, job_id, containers, location, rate, standard_rate, start_on, billed_to, last_increase_on, status, end_on, disposed_on) values
('70000000-0000-4000-8000-000000000001', 'ST-201', '10000000-0000-4000-8000-000000000012', '40000000-0000-4000-8000-000000000012', 3, 'Bay A, rows 4 to 6', 330, 330, mover_today() - 40, mover_today() + 20, null, 'active', null, null),
('70000000-0000-4000-8000-000000000002', 'ST-202', '10000000-0000-4000-8000-000000000017', null, 2, 'Bay B, row 2', 150, 220, mover_today() - 760, mover_today() + 3, null, 'active', null, null),
('70000000-0000-4000-8000-000000000003', 'ST-203', '10000000-0000-4000-8000-000000000018', null, 1, 'Bay B, row 7', 110, 110, mover_today() - 300, mover_today() + 15, mover_today() - 300, 'active', null, null),
('70000000-0000-4000-8000-000000000004', 'ST-204', '10000000-0000-4000-8000-000000000019', null, 2, 'Bay C, row 1', 220, 220, mover_today() - 400, mover_today() + 15, mover_today() - 100, 'active', null, null),
('70000000-0000-4000-8000-000000000005', 'ST-205', '10000000-0000-4000-8000-000000000020', null, 1, 'Bay C, row 9', 110, 110, mover_today() - 500, mover_today() + 10, null, 'active', null, null),
('70000000-0000-4000-8000-000000000006', 'ST-206', '10000000-0000-4000-8000-000000000021', null, 4, 'Bay A, rows 1 to 3', 380, 440, mover_today() - 420, mover_today() + 12, null, 'active', null, null),
('70000000-0000-4000-8000-000000000007', 'ST-198', '10000000-0000-4000-8000-000000000022', null, 1, 'Bay D, row 3', 110, 110, mover_today() - 600, mover_today() - 200, null, 'disposed', null, mover_today() - 90)
on conflict do nothing;

insert into rate_changes (id, name, storage_id, old_rate, new_rate, notice_on, effective_on, applied) values
('71000000-0000-4000-8000-000000000001', 'ST-206 rise', '70000000-0000-4000-8000-000000000006', 380, 440, mover_today() - 7, mover_today() + 7, false)
on conflict do nothing;

insert into invoices (id, name, customer_id, job_id, storage_id, kind, amount, currency, issued_on, due_on, period_from, period_to) values
-- Deposits and move invoices
('80000000-0000-4000-8000-000000000001', 'INV-1001', '10000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000006', null, 'deposit', 328, 'AUD', mover_today() - 10, mover_today() - 3, null, null),
('80000000-0000-4000-8000-000000000002', 'INV-1002', '10000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000007', null, 'deposit', 1680, 'AUD', mover_today() - 8, mover_today() - 1, null, null),
('80000000-0000-4000-8000-000000000003', 'INV-1003', '10000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000008', null, 'deposit', 180, 'AUD', mover_today() - 9, mover_today() - 2, null, null),
('80000000-0000-4000-8000-000000000004', 'INV-1004', '10000000-0000-4000-8000-000000000014', '40000000-0000-4000-8000-000000000014', null, 'deposit', 144, 'AUD', mover_today() - 7, mover_today(), null, null),
('80000000-0000-4000-8000-000000000005', 'INV-1005', '10000000-0000-4000-8000-000000000015', '40000000-0000-4000-8000-000000000015', null, 'deposit', 216, 'AUD', mover_today() - 5, mover_today() + 2, null, null),
('80000000-0000-4000-8000-000000000006', 'INV-1006', '10000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-000000000009', null, 'deposit', 252, 'AUD', mover_today() - 14, mover_today() - 7, null, null),
('80000000-0000-4000-8000-000000000007', 'INV-1007', '10000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000010', null, 'deposit', 236, 'AUD', mover_today() - 30, mover_today() - 23, null, null),
('80000000-0000-4000-8000-000000000008', 'INV-1008', '10000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000010', null, 'move', 1124, 'AUD', mover_today() - 20, mover_today() - 13, null, null),
('80000000-0000-4000-8000-000000000009', 'INV-1009', '10000000-0000-4000-8000-000000000012', '40000000-0000-4000-8000-000000000012', null, 'deposit', 270, 'AUD', mover_today() - 48, mover_today() - 41, null, null),
('80000000-0000-4000-8000-000000000010', 'INV-1010', '10000000-0000-4000-8000-000000000012', '40000000-0000-4000-8000-000000000012', null, 'move', 1080, 'AUD', mover_today() - 40, mover_today() - 33, null, null),
-- Storage, billed monthly in advance
('80000000-0000-4000-8000-000000000011', 'INV-1011', '10000000-0000-4000-8000-000000000012', null, '70000000-0000-4000-8000-000000000001', 'storage', 330, 'AUD', mover_today() - 40, mover_today() - 40, mover_today() - 40, mover_today() - 11),
('80000000-0000-4000-8000-000000000012', 'INV-1012', '10000000-0000-4000-8000-000000000012', null, '70000000-0000-4000-8000-000000000001', 'storage', 330, 'AUD', mover_today() - 10, mover_today() - 10, mover_today() - 10, mover_today() + 20),
('80000000-0000-4000-8000-000000000013', 'INV-1013', '10000000-0000-4000-8000-000000000018', null, '70000000-0000-4000-8000-000000000003', 'storage', 110, 'AUD', mover_today() - 45, mover_today() - 45, mover_today() - 45, mover_today() - 16),
('80000000-0000-4000-8000-000000000014', 'INV-1014', '10000000-0000-4000-8000-000000000018', null, '70000000-0000-4000-8000-000000000003', 'storage', 110, 'AUD', mover_today() - 15, mover_today() - 15, mover_today() - 15, mover_today() + 15),
('80000000-0000-4000-8000-000000000015', 'INV-1015', '10000000-0000-4000-8000-000000000019', null, '70000000-0000-4000-8000-000000000004', 'storage', 220, 'AUD', mover_today() - 75, mover_today() - 75, mover_today() - 75, mover_today() - 46),
('80000000-0000-4000-8000-000000000016', 'INV-1016', '10000000-0000-4000-8000-000000000019', null, '70000000-0000-4000-8000-000000000004', 'storage', 220, 'AUD', mover_today() - 45, mover_today() - 45, mover_today() - 45, mover_today() - 16),
('80000000-0000-4000-8000-000000000017', 'INV-1017', '10000000-0000-4000-8000-000000000019', null, '70000000-0000-4000-8000-000000000004', 'storage', 220, 'AUD', mover_today() - 15, mover_today() - 15, mover_today() - 15, mover_today() + 15),
('80000000-0000-4000-8000-000000000018', 'INV-1018', '10000000-0000-4000-8000-000000000020', null, '70000000-0000-4000-8000-000000000005', 'storage', 110, 'AUD', mover_today() - 110, mover_today() - 110, mover_today() - 110, mover_today() - 81),
('80000000-0000-4000-8000-000000000019', 'INV-1019', '10000000-0000-4000-8000-000000000020', null, '70000000-0000-4000-8000-000000000005', 'storage', 110, 'AUD', mover_today() - 80, mover_today() - 80, mover_today() - 80, mover_today() - 51),
('80000000-0000-4000-8000-000000000020', 'INV-1020', '10000000-0000-4000-8000-000000000020', null, '70000000-0000-4000-8000-000000000005', 'storage', 110, 'AUD', mover_today() - 50, mover_today() - 50, mover_today() - 50, mover_today() - 21),
('80000000-0000-4000-8000-000000000021', 'INV-1021', '10000000-0000-4000-8000-000000000020', null, '70000000-0000-4000-8000-000000000005', 'storage', 110, 'AUD', mover_today() - 20, mover_today() - 20, mover_today() - 20, mover_today() + 10),
('80000000-0000-4000-8000-000000000022', 'INV-1022', '10000000-0000-4000-8000-000000000017', null, '70000000-0000-4000-8000-000000000002', 'storage', 150, 'AUD', mover_today() - 27, mover_today() - 27, mover_today() - 27, mover_today() + 3),
('80000000-0000-4000-8000-000000000023', 'INV-1023', '10000000-0000-4000-8000-000000000021', null, '70000000-0000-4000-8000-000000000006', 'storage', 380, 'AUD', mover_today() - 18, mover_today() - 18, mover_today() - 18, mover_today() + 12)
on conflict do nothing;

insert into payments (id, name, invoice_id, amount, paid_on, reference) values
('81000000-0000-4000-8000-000000000001', 'Receipt DD-5001', '80000000-0000-4000-8000-000000000002', 1680, mover_today() - 6, 'DD-5001'),
('81000000-0000-4000-8000-000000000002', 'Receipt DD-5002', '80000000-0000-4000-8000-000000000003', 180, mover_today() - 8, 'DD-5002'),
('81000000-0000-4000-8000-000000000003', 'Receipt DD-5003', '80000000-0000-4000-8000-000000000004', 144, mover_today() - 6, 'DD-5003'),
('81000000-0000-4000-8000-000000000004', 'Receipt DD-5004', '80000000-0000-4000-8000-000000000005', 216, mover_today() - 5, 'DD-5004'),
('81000000-0000-4000-8000-000000000005', 'Receipt DD-5005', '80000000-0000-4000-8000-000000000006', 252, mover_today() - 13, 'DD-5005'),
('81000000-0000-4000-8000-000000000006', 'Receipt DD-5006', '80000000-0000-4000-8000-000000000007', 236, mover_today() - 29, 'DD-5006'),
('81000000-0000-4000-8000-000000000007', 'Receipt DD-5007', '80000000-0000-4000-8000-000000000008', 500, mover_today() - 12, 'DD-5007'),
('81000000-0000-4000-8000-000000000008', 'Receipt DD-5008', '80000000-0000-4000-8000-000000000009', 270, mover_today() - 47, 'DD-5008'),
('81000000-0000-4000-8000-000000000009', 'Receipt DD-5009', '80000000-0000-4000-8000-000000000010', 1080, mover_today() - 38, 'DD-5009'),
('81000000-0000-4000-8000-000000000010', 'Receipt DD-5010', '80000000-0000-4000-8000-000000000011', 330, mover_today() - 40, 'DD-5010'),
('81000000-0000-4000-8000-000000000011', 'Receipt DD-5011', '80000000-0000-4000-8000-000000000012', 330, mover_today() - 10, 'DD-5011'),
('81000000-0000-4000-8000-000000000012', 'Receipt DD-5012', '80000000-0000-4000-8000-000000000022', 150, mover_today() - 27, 'DD-5012'),
('81000000-0000-4000-8000-000000000013', 'Receipt DD-5013', '80000000-0000-4000-8000-000000000023', 380, mover_today() - 18, 'DD-5013')
on conflict do nothing;

insert into notices (id, name, storage_id, kind, given_on, method, amount_owing) values
('90000000-0000-4000-8000-000000000001', 'Overdue notice Jack Morrison', '70000000-0000-4000-8000-000000000004', 'overdue', mover_today() - 40, 'email', 220),
('90000000-0000-4000-8000-000000000002', 'Overdue notice Lucy Bennett', '70000000-0000-4000-8000-000000000005', 'overdue', mover_today() - 75, 'email', 110),
('90000000-0000-4000-8000-000000000003', 'Final notice Lucy Bennett', '70000000-0000-4000-8000-000000000005', 'final', mover_today() - 35, 'post', 330),
('90000000-0000-4000-8000-000000000004', 'Final notice Oscar Reid', '70000000-0000-4000-8000-000000000007', 'final', mover_today() - 100, 'post', 440)
on conflict do nothing;

insert into claims (id, name, job_id, item, amount_claimed, lodged_on, responded_on, status, settled_amount, outcome) values
('91000000-0000-4000-8000-000000000001', 'Grace Kim: scratched dining table', '40000000-0000-4000-8000-000000000010', 'Dining table, top scratched', 650, mover_today() - 18, null, 'open', null, null),
('91000000-0000-4000-8000-000000000002', 'Ava Robinson: broken lamp', '40000000-0000-4000-8000-000000000012', 'Floor lamp, base cracked', 120, mover_today() - 38, mover_today() - 36, 'settled', 120, 'Paid in full')
on conflict do nothing;

insert into activity (id, name, customer_id, job_id, note, happened_on) values
('92000000-0000-4000-8000-000000000001', 'Contact with Marcus Brown', '10000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', 'Called, still comparing quotes, will decide after the lease is signed.', mover_today() - 30),
('92000000-0000-4000-8000-000000000002', 'Contact with James Patel', '10000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000007', 'Linehaul to Melbourne goes with Westline. Mentioned on the phone, not confirmed in writing.', mover_today() - 8),
('92000000-0000-4000-8000-000000000003', 'Contact with Grace Kim', '10000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000010', 'Emailed photos of the table scratch.', mover_today() - 18)
on conflict do nothing;
