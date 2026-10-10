import type { Balance, Expense, Group, Member } from './groups'

/**
 * A made-up sample group that lives only in the browser (nothing is written to
 * Supabase). Balances are computed here with the same rule as the
 * add_expense_equal database function: split equally among all members, leftover
 * cents to the earliest-added members.
 */
export type DemoData = { group: Group; members: Member[]; expenses: Expense[]; balances: Balance[] }

const DAY = 24 * 60 * 60 * 1000

export function buildDemo(now = Date.now()): DemoData {
  const at = (daysAgo: number, hour: number) => {
    const d = new Date(now - daysAgo * DAY)
    d.setHours(hour, 0, 0, 0)
    return d.toISOString()
  }

  const group: Group = { id: 'demo', name: 'Goa Weekend 🌴', created_at: at(4, 9) }
  const names = ['Priya', 'Rahul', 'Ananya', 'Karan']
  const members: Member[] = names.map((name, i) => ({
    id: `demo-${name.toLowerCase()}`,
    group_id: group.id,
    name,
    created_at: at(4, 9 + i),
  }))
  const id = (name: string) => `demo-${name.toLowerCase()}`

  const raw: [description: string, payer: string, rupees: number, daysAgo: number, hour: number, addedBy: string][] = [
    ['Villa for 2 nights', 'Priya', 14000, 3, 11, 'Priya'],
    ['Scooter rentals', 'Rahul', 2400, 3, 13, 'Rahul'],
    ['Groceries & snacks', 'Ananya', 1980, 3, 18, 'Priya'],
    ['Beach shack dinner', 'Ananya', 3650, 2, 21, 'Ananya'],
    ['Parasailing', 'Karan', 6000, 1, 15, 'Karan'],
    ['Club night', 'Karan', 4200, 1, 23, 'Ananya'],
    ['Cab to airport', 'Rahul', 1450, 0, 10, 'Rahul'],
  ]
  const expenses: Expense[] = raw
    .map(([description, payer, rupees, daysAgo, hour, addedBy], i) => ({
      id: `demo-expense-${i}`,
      group_id: group.id,
      paid_by: id(payer),
      amount_cents: rupees * 100,
      description,
      created_at: at(daysAgo, hour),
      added_by: id(addedBy),
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at)) // newest first, like the real list

  const paid = new Map(members.map((m) => [m.id, 0]))
  const share = new Map(members.map((m) => [m.id, 0]))
  for (const e of expenses) {
    paid.set(e.paid_by, paid.get(e.paid_by)! + e.amount_cents)
    const base = Math.floor(e.amount_cents / members.length)
    const extra = e.amount_cents % members.length
    members.forEach((m, i) => share.set(m.id, share.get(m.id)! + base + (i < extra ? 1 : 0)))
  }
  const balances: Balance[] = members.map((m) => ({
    member_id: m.id,
    name: m.name,
    total_paid_cents: paid.get(m.id)!,
    total_share_cents: share.get(m.id)!,
    balance_cents: paid.get(m.id)! - share.get(m.id)!,
  }))

  return { group, members, expenses, balances }
}
