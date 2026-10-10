-- ===== Tables =====
create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table public.members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  unique (id, group_id)            -- target for same-group composite FKs
);

create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups(id) on delete cascade,
  paid_by      uuid not null,
  amount_cents integer not null check (amount_cents > 0),
  description  text not null check (length(trim(description)) > 0),
  created_at   timestamptz not null default now(),
  unique (id, group_id),
  -- payer must be a member of the SAME group
  foreign key (paid_by, group_id) references public.members(id, group_id)
);

create table public.expense_splits (
  expense_id  uuid not null,
  member_id   uuid not null,
  group_id    uuid not null,
  share_cents integer not null check (share_cents >= 0),
  primary key (expense_id, member_id),
  -- both the expense and the member must belong to the same group
  foreign key (expense_id, group_id) references public.expenses(id, group_id) on delete cascade,
  foreign key (member_id, group_id)  references public.members(id, group_id)
);

create index on public.members (group_id);
create index on public.expenses (group_id);
create index on public.expenses (paid_by, group_id);
create index on public.expense_splits (member_id, group_id);
create index on public.expense_splits (group_id);

-- ===== Row Level Security: read + insert only (no update/delete) =====
alter table public.groups         enable row level security;
alter table public.members        enable row level security;
alter table public.expenses       enable row level security;
alter table public.expense_splits enable row level security;

create policy "read groups"   on public.groups for select to anon, authenticated using (true);
create policy "insert groups" on public.groups for insert to anon, authenticated with check (true);

create policy "read members"   on public.members for select to anon, authenticated using (true);
create policy "insert members" on public.members for insert to anon, authenticated
  with check (exists (select 1 from public.groups g where g.id = group_id));

create policy "read expenses"   on public.expenses for select to anon, authenticated using (true);
create policy "insert expenses" on public.expenses for insert to anon, authenticated
  with check (exists (select 1 from public.groups g where g.id = group_id));

create policy "read splits"   on public.expense_splits for select to anon, authenticated using (true);
create policy "insert splits" on public.expense_splits for insert to anon, authenticated
  with check (exists (select 1 from public.expenses e where e.id = expense_id and e.group_id = group_id));

grant select, insert on public.groups, public.members, public.expenses, public.expense_splits
  to anon, authenticated;

-- ===== Balances view (runs with the caller's permissions, so RLS applies) =====
create view public.balances with (security_invoker = true) as
select
  m.group_id,
  m.id   as member_id,
  m.name,
  coalesce(p.total_paid, 0)::bigint                                  as total_paid_cents,
  coalesce(s.total_share, 0)::bigint                                 as total_share_cents,
  (coalesce(p.total_paid, 0) - coalesce(s.total_share, 0))::bigint   as balance_cents
from public.members m
left join (
  select paid_by, sum(amount_cents) as total_paid
  from public.expenses group by paid_by
) p on p.paid_by = m.id
left join (
  select member_id, sum(share_cents) as total_share
  from public.expense_splits group by member_id
) s on s.member_id = m.id;

grant select on public.balances to anon, authenticated;
