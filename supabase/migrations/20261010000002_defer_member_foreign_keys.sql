-- Deleting a group cascades to members, expenses and splits. The member FKs were
-- checked mid-cascade and failed; deferring them to commit lets the cascade finish.
-- Deleting a single member who still has expenses/splits is still rejected.
alter table public.expenses
  alter constraint expenses_paid_by_group_id_fkey deferrable initially deferred;
alter table public.expense_splits
  alter constraint expense_splits_member_id_group_id_fkey deferrable initially deferred;
