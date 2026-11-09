-- Removals for Claude Code: the schema.
-- Plain Postgres. Runs on any Postgres 13+ and on embedded PGlite. No extensions.
-- Dates are the mover's own calendar dates (mover_today()), not UTC.

create function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- One row: the business, its rates and the periods and limits its terms set.
-- See docs/compliance.md for where each default comes from.
create table company_profile (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  singleton boolean not null default true unique check (singleton),
  jurisdiction text not null default 'AU' check (jurisdiction in ('AU', 'NZ')),
  state text,
  currency text not null default 'AUD' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Australia/Sydney',
  hourly_rate numeric(10,2) not null default 180 check (hourly_rate >= 0),
  quote_valid_days integer not null default 30 check (quote_valid_days > 0),
  follow_up_days integer not null default 3 check (follow_up_days > 0),
  enquiry_reply_days integer not null default 2 check (enquiry_reply_days > 0),
  deposit_pct numeric(5,2) not null default 20 check (deposit_pct between 0 and 100),
  survey_over_m3 numeric(8,2) not null default 30 check (survey_over_m3 >= 0),
  high_value_limit numeric(10,2) not null default 1000 check (high_value_limit >= 0),
  max_work_hours numeric(4,2) not null default 12 check (max_work_hours > 0),
  fatigue_gvm_t numeric(6,2) not null default 12 check (fatigue_gvm_t > 0),
  licence_warn_days integer not null default 30 check (licence_warn_days >= 0),
  invoice_due_days integer not null default 7 check (invoice_due_days >= 0),
  storage_bill_ahead_days integer not null default 7 check (storage_bill_ahead_days >= 0),
  storage_rate_notice_days integer not null default 28 check (storage_rate_notice_days > 0),
  storage_review_months integer not null default 12 check (storage_review_months > 0),
  storage_notice_days integer not null default 30 check (storage_notice_days > 0),
  storage_final_days integer not null default 60 check (storage_final_days > 0),
  storage_sale_notice_days integer not null default 28 check (storage_sale_notice_days > 0),
  claim_response_days integer not null default 14 check (claim_response_days > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger company_profile_updated before update on company_profile for each row execute function touch_updated_at();

-- The mover's own clock. The database may run in UTC; the depot runs on local dates.
create function mover_today() returns date language sql stable as $$
  select (now() at time zone coalesce((select timezone from company_profile limit 1), 'UTC'))::date
$$;

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  business boolean not null default false,
  source text,
  external_id text unique,
  last_contact_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger customers_updated before update on customers for each row execute function touch_updated_at();

create table trucks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  rego text,
  gvm_t numeric(6,2) not null check (gvm_t > 0),
  capacity_m3 numeric(8,2) not null check (capacity_m3 > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trucks_updated before update on trucks for each row execute function touch_updated_at();

create table crew (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  role text not null default 'porter' check (role in ('driver', 'porter', 'packer', 'supervisor')),
  licence_class text,
  licence_expires_on date,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger crew_updated before update on crew for each row execute function touch_updated_at();

-- A job runs enquiry -> quoted -> booked -> completed, or ends lost or cancelled.
create table jobs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  customer_id uuid not null references customers(id),
  kind text not null default 'local' check (kind in ('local', 'country', 'interstate', 'international', 'office', 'storage')),
  from_address text,
  to_address text,
  status text not null default 'enquiry' check (status in ('enquiry', 'quoted', 'booked', 'completed', 'cancelled', 'lost')),
  enquiry_on date not null default mover_today(),
  source text,
  survey text not null default 'none' check (survey in ('none', 'video', 'in-home')),
  survey_on date,
  move_on date,
  est_hours numeric(6,2) check (est_hours > 0),
  packing boolean not null default false,
  to_storage boolean not null default false,
  storage_rate numeric(10,2) check (storage_rate >= 0),
  quote_amount numeric(10,2) check (quote_amount >= 0),
  quote_sent_on date,
  quote_valid_to date,
  last_follow_up_on date,
  accepted_on date,
  deposit numeric(10,2) not null default 0 check (deposit >= 0),
  insurance text check (insurance in ('taken', 'declined')),
  insured_value numeric(12,2) check (insured_value >= 0),
  carriage_terms text,
  subcontractor text,
  sub_consent_on date,
  completed_on date,
  actual_hours numeric(6,2) check (actual_hours > 0),
  lost_reason text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('enquiry', 'lost', 'cancelled') or quote_amount is not null),
  check (status not in ('booked', 'completed') or (accepted_on is not null and move_on is not null))
);
create trigger jobs_updated before update on jobs for each row execute function touch_updated_at();

-- The survey inventory: what is moving, room by room.
create table inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  job_id uuid not null references jobs(id) on delete cascade,
  room text,
  qty integer not null default 1 check (qty > 0),
  m3_each numeric(6,3) not null default 0 check (m3_each >= 0),
  value numeric(12,2) check (value >= 0),
  declared_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger inventory_updated before update on inventory for each row execute function touch_updated_at();

-- Changes to a quoted job: more goods, an extra pickup, a stair carry.
create table variations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  job_id uuid not null references jobs(id),
  amount numeric(10,2) not null,
  agreed_on date,
  agreed_how text check (agreed_how in ('email', 'signed', 'sms', 'verbal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger variations_updated before update on variations for each row execute function touch_updated_at();

-- Who and which truck are on which job, which day, for how long.
create table allocations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  job_id uuid not null references jobs(id),
  crew_id uuid not null references crew(id),
  truck_id uuid references trucks(id),
  work_on date not null,
  hours numeric(4,2) not null check (hours > 0 and hours <= 24),
  driving boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, crew_id, work_on)
);
create trigger allocations_updated before update on allocations for each row execute function touch_updated_at();

create table storage_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  customer_id uuid not null references customers(id),
  job_id uuid references jobs(id),
  containers integer not null default 1 check (containers > 0),
  location text,
  rate numeric(10,2) not null check (rate >= 0),
  standard_rate numeric(10,2) not null check (standard_rate >= 0),
  start_on date not null,
  billed_to date not null,
  last_increase_on date,
  status text not null default 'active' check (status in ('active', 'ended', 'disposed')),
  end_on date,
  disposed_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger storage_accounts_updated before update on storage_accounts for each row execute function touch_updated_at();

create table rate_changes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_id uuid not null references storage_accounts(id),
  old_rate numeric(10,2) not null,
  new_rate numeric(10,2) not null check (new_rate >= 0),
  notice_on date not null,
  effective_on date not null,
  applied boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger rate_changes_updated before update on rate_changes for each row execute function touch_updated_at();

create table invoices (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  customer_id uuid not null references customers(id),
  job_id uuid references jobs(id),
  storage_id uuid references storage_accounts(id),
  kind text not null check (kind in ('deposit', 'move', 'storage', 'variation')),
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'AUD',
  issued_on date not null default mover_today(),
  due_on date not null,
  period_from date,
  period_to date,
  void boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger invoices_updated before update on invoices for each row execute function touch_updated_at();

create table payments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invoice_id uuid not null references invoices(id),
  amount numeric(10,2) not null check (amount > 0),
  paid_on date not null default mover_today(),
  reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger payments_updated before update on payments for each row execute function touch_updated_at();

-- Written notices on storage accounts: overdue, final (uncollected goods) and rate change.
create table notices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_id uuid not null references storage_accounts(id),
  kind text not null check (kind in ('overdue', 'final')),
  given_on date not null,
  method text not null default 'email' check (method in ('email', 'post', 'sms', 'hand')),
  amount_owing numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger notices_updated before update on notices for each row execute function touch_updated_at();

create table claims (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  job_id uuid not null references jobs(id),
  item text not null,
  amount_claimed numeric(10,2) not null check (amount_claimed >= 0),
  lodged_on date not null default mover_today(),
  responded_on date,
  status text not null default 'open' check (status in ('open', 'settled', 'declined')),
  settled_amount numeric(10,2) check (settled_amount >= 0),
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger claims_updated before update on claims for each row execute function touch_updated_at();

create table activity (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  customer_id uuid not null references customers(id),
  job_id uuid references jobs(id),
  note text not null,
  happened_on date not null default mover_today(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger activity_updated before update on activity for each row execute function touch_updated_at();

create table audit (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  record_id uuid,
  detail jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on jobs (status, move_on);
create index on allocations (work_on);
create index on invoices (customer_id);
create index on payments (invoice_id);

-- ------------------------------------------------------------------ views

create view invoice_balances as
select i.id, i.name, i.customer_id, c.name as customer, i.job_id, j.name as job, i.storage_id, i.kind, i.amount,
  i.amount - coalesce((select sum(p.amount) from payments p where p.invoice_id = i.id), 0) as balance,
  i.issued_on, i.due_on, i.period_from, i.period_to, i.void
from invoices i
join customers c on c.id = i.customer_id
left join jobs j on j.id = i.job_id;

create view job_detail as
select j.*, c.name as customer, c.email, c.phone,
  round(coalesce(inv.m3, 0), 1) as volume_m3,
  coalesce(inv.items, 0) as items,
  coalesce(inv.undeclared, 0) as undeclared_high_value,
  coalesce(v.total, 0) as variations,
  coalesce(j.quote_amount, 0) + coalesce(v.total, 0) as job_total,
  coalesce(b.invoiced, 0) as invoiced,
  coalesce(b.owing, 0) as owing,
  coalesce(b.deposit_paid, 0) as deposit_paid,
  case when j.move_on is not null then j.move_on - mover_today() end as days_to_move,
  coalesce(a.crew, 0) as crew_booked,
  a.trucks
from jobs j
join customers c on c.id = j.customer_id
left join lateral (
  select sum(qty * m3_each) as m3, sum(qty) as items,
    count(*) filter (where value >= (select high_value_limit from company_profile) and declared_on is null) as undeclared
  from inventory where job_id = j.id) inv on true
left join lateral (select sum(amount) as total from variations where job_id = j.id) v on true
left join lateral (
  select sum(amount) filter (where not void) as invoiced, sum(balance) filter (where not void) as owing,
    sum(amount - balance) filter (where not void and kind = 'deposit') as deposit_paid
  from invoice_balances where job_id = j.id) b on true
left join lateral (
  select count(distinct crew_id) as crew, string_agg(distinct t.name, ', ') as trucks
  from allocations al left join trucks t on t.id = al.truck_id where al.job_id = j.id) a on true;

create view storage_detail as
select s.*, c.name as customer, c.email,
  coalesce(o.owing, 0) as owing,
  o.oldest_due,
  case when o.oldest_due < mover_today() then mover_today() - o.oldest_due else 0 end as days_overdue,
  n.overdue_on as overdue_notice_on,
  n.final_on as final_notice_on
from storage_accounts s
join customers c on c.id = s.customer_id
left join lateral (
  select sum(balance) as owing, min(due_on) filter (where balance > 0) as oldest_due
  from invoice_balances where storage_id = s.id and not void and balance > 0) o on true
left join lateral (
  select max(given_on) filter (where kind = 'overdue') as overdue_on, max(given_on) filter (where kind = 'final') as final_on
  from notices where storage_id = s.id) n on true;

-- Hours per person per day, and whether any of it was on a fatigue-regulated truck.
create view crew_days as
select cr.name as crew, cr.role, al.work_on, sum(al.hours) as hours,
  bool_or(al.driving and t.gvm_t > p.fatigue_gvm_t) as drove_heavy,
  string_agg(j.name, ', ' order by j.name) as jobs
from allocations al
join crew cr on cr.id = al.crew_id
join jobs j on j.id = al.job_id
left join trucks t on t.id = al.truck_id
cross join company_profile p
group by cr.name, cr.role, al.work_on;
