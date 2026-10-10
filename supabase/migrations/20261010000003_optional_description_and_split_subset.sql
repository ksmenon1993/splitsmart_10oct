-- 1) Description is optional: blank is allowed (the app shows a generic label).
alter table public.expenses drop constraint expenses_description_check;
alter table public.expenses alter column description set default '';

-- 2) add_expense_equal can split between a chosen subset of members.
--    p_member_ids = null (the default) means everyone in the group, as before.
drop function public.add_expense_equal(uuid, uuid, integer, text);

create function public.add_expense_equal(
  p_group_id     uuid,
  p_paid_by      uuid,
  p_amount_cents integer,
  p_description  text   default '',
  p_member_ids   uuid[] default null
) returns public.expenses
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_expense public.expenses;
  v_count   integer;
begin
  -- Who shares this expense: everyone, or the given members (which must all be in this group).
  select count(*) into v_count
  from public.members
  where group_id = p_group_id and (p_member_ids is null or id = any (p_member_ids));

  if v_count = 0 then
    raise exception 'Choose at least one member to split between';
  end if;
  if p_member_ids is not null
     and v_count <> (select count(distinct x) from unnest(p_member_ids) as x) then
    raise exception 'Every member in the split must belong to this group';
  end if;

  insert into public.expenses (group_id, paid_by, amount_cents, description)
  values (p_group_id, p_paid_by, p_amount_cents, coalesce(trim(p_description), ''))
  returning * into v_expense;

  -- Equal shares; leftover cents go one each to the earliest-added sharers.
  insert into public.expense_splits (expense_id, member_id, group_id, share_cents)
  select v_expense.id, s.id, p_group_id,
         p_amount_cents / v_count + case when s.rn <= p_amount_cents % v_count then 1 else 0 end
  from (
    select id, row_number() over (order by created_at, id) as rn
    from public.members
    where group_id = p_group_id and (p_member_ids is null or id = any (p_member_ids))
  ) s;

  return v_expense;
end;
$$;

revoke execute on function public.add_expense_equal(uuid, uuid, integer, text, uuid[]) from public;
grant execute on function public.add_expense_equal(uuid, uuid, integer, text, uuid[]) to anon, authenticated;
