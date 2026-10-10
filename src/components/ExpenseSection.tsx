import type { AvatarLook } from '../lib/avatars'
import type { Expense, Member } from '../lib/groups'
import { formatCents } from '../lib/money'
import { Avatar } from './Avatar'

type Props = {
  members: Member[]
  expenses: Expense[]
  avatars: Map<string, AvatarLook>
  me?: string | null
}

const whenFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

export function ExpenseSection({ members, expenses, avatars, me }: Props) {
  const nameOf = (id: string, { lower = false } = {}) =>
    id === me ? (lower ? 'you' : 'You') : (members.find((m) => m.id === id)?.name ?? 'Someone')

  function byline(e: Expense) {
    const payer = nameOf(e.paid_by)
    if (!e.added_by) return `${payer} paid`
    if (e.added_by === e.paid_by) return `${payer} paid and added it`
    return `${payer} paid · added by ${nameOf(e.added_by, { lower: true })}`
  }

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Expenses</h3>

      {expenses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          {members.length === 0
            ? 'Add people first, then log what they paid for.'
            : 'Nothing logged yet. Tap “Add expense” below.'}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {expenses.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar look={avatars.get(e.paid_by)} />
              <div className="min-w-0 flex-1">
                <p className={`truncate font-semibold ${e.description ? '' : 'text-slate-500'}`}>
                  {e.description || 'Expense'}
                </p>
                <p className="truncate text-xs text-slate-600">{byline(e)}</p>
                <p className="text-xs text-slate-400">{whenFormat.format(new Date(e.created_at))}</p>
              </div>
              <span className="shrink-0 text-base font-bold tabular-nums">{formatCents(e.amount_cents)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
