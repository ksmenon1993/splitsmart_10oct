import { supabase } from './supabase'

export type Group = { id: string; name: string; created_at: string }
export type Member = { id: string; group_id: string; name: string; created_at: string }
export type Expense = {
  id: string
  group_id: string
  paid_by: string
  amount_cents: number
  description: string
  created_at: string
  /** Member who logged it (self-reported by their device); null for older expenses. */
  added_by: string | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isGroupId(value: string | null): value is string {
  return value !== null && UUID_RE.test(value)
}

/** The group id lives in the URL as ?g=<id>, so the link itself is shareable. */
export function getGroupIdFromUrl(): string | null {
  const id = new URLSearchParams(window.location.search).get('g')
  return isGroupId(id) ? id : null
}

export function groupUrl(groupId: string): string {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('g', groupId)
  return url.toString()
}

export async function createGroup(name: string): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .insert({ name: name.trim() })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Returns null when no group has this id. */
export async function loadGroup(
  groupId: string,
): Promise<{ group: Group; members: Member[]; expenses: Expense[] } | null> {
  const [groupRes, membersRes, expensesRes] = await Promise.all([
    supabase.from('groups').select().eq('id', groupId).maybeSingle(),
    supabase.from('members').select().eq('group_id', groupId).order('created_at'),
    supabase
      .from('expenses')
      .select()
      .eq('group_id', groupId)
      .order('created_at', { ascending: false }),
  ])
  if (groupRes.error) throw groupRes.error
  if (membersRes.error) throw membersRes.error
  if (expensesRes.error) throw expensesRes.error
  if (!groupRes.data) return null
  return { group: groupRes.data, members: membersRes.data, expenses: expensesRes.data }
}

export async function addMember(groupId: string, name: string): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .insert({ group_id: groupId, name: name.trim() })
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Saves the expense and its equal split rows in a single transaction (see the
 * add_expense_equal database function). Omit `memberIds` to split between everyone.
 */
export async function addExpense(input: {
  groupId: string
  paidBy: string
  amountCents: number
  description?: string
  memberIds?: string[]
  addedBy?: string
}): Promise<Expense> {
  const { data, error } = await supabase.rpc('add_expense_equal', {
    p_group_id: input.groupId,
    p_paid_by: input.paidBy,
    p_amount_cents: input.amountCents,
    p_description: input.description?.trim() ?? '',
    p_member_ids: input.memberIds ?? null,
    p_added_by: input.addedBy ?? null,
  })
  if (error) throw error
  return data as Expense
}

export type Balance = {
  member_id: string
  name: string
  total_paid_cents: number
  total_share_cents: number
  balance_cents: number
}

/** Net position per member from the `balances` view (positive = is owed money). */
export async function loadBalances(groupId: string): Promise<Balance[]> {
  const { data, error } = await supabase
    .from('balances')
    .select('member_id, name, total_paid_cents, total_share_cents, balance_cents')
    .eq('group_id', groupId)
  if (error) throw error
  return data.map((b) => ({
    ...b,
    total_paid_cents: Number(b.total_paid_cents),
    total_share_cents: Number(b.total_share_cents),
    balance_cents: Number(b.balance_cents),
  }))
}
