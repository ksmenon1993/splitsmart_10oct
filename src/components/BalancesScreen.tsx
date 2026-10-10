import { useEffect, useMemo, useState } from 'react'
import type { AvatarLook } from '../lib/avatars'
import { loadBalances, type Balance, type Expense, type Member } from '../lib/groups'
import { formatCents } from '../lib/money'
import { settleUp } from '../lib/settle'
import { Avatar } from './Avatar'

type Props = {
  groupId: string
  members: Member[]
  expenses: Expense[]
  onGoTo: (tab: 'expenses' | 'people') => void
  onAddExpense?: () => void
  /** Precomputed balances for the sample group; skips the database. */
  demoBalances?: Balance[]
  avatars: Map<string, AvatarLook>
}

export function BalancesScreen({
  groupId,
  members,
  expenses,
  onGoTo,
  onAddExpense,
  demoBalances,
  avatars,
}: Props) {
  const [balances, setBalances] = useState<Balance[] | null>(demoBalances ?? null)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)

  // Re-read the view whenever members or expenses change (or on retry).
  useEffect(() => {
    if (demoBalances) return
    let cancelled = false
    loadBalances(groupId)
      .then((rows) => {
        if (cancelled) return
        setBalances(rows)
        setError(false)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [groupId, members, expenses, retry, demoBalances])

  const transfers = useMemo(
    () => (balances ? settleUp(new Map(balances.map((b) => [b.member_id, b.balance_cents]))) : []),
    [balances],
  )

  if (members.length === 0) {
    return (
      <EmptyCard
        emoji="👋"
        title="Add people first"
        body="Balances appear once your group has members and expenses."
        action="Add people"
        onAction={() => onGoTo('people')}
      />
    )
  }

  if (error && !balances) {
    return (
      <EmptyCard
        emoji="⚠️"
        title="Couldn't load balances"
        body="Check your connection and try again."
        action="Try again"
        onAction={() => setRetry((n) => n + 1)}
      />
    )
  }

  if (!balances) {
    return <p className="py-12 text-center text-sm text-slate-500">Loading balances…</p>
  }

  if (expenses.length === 0) {
    return (
      <EmptyCard
        emoji="🧾"
        title="No expenses yet"
        body="Log what someone paid for and everyone's share shows up here."
        action="Add an expense"
        onAction={onAddExpense ?? (() => onGoTo('expenses'))}
      />
    )
  }

  const nameOf = (id: string) => balances.find((b) => b.member_id === id)?.name ?? 'Someone'
  const sorted = [...balances].sort((a, b) => b.balance_cents - a.balance_cents)
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount_cents, 0)

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="settle-heading">
        <h3 id="settle-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Settle up
        </h3>
        {transfers.length === 0 ? (
          <div className="rounded-2xl bg-brand-50 px-5 py-8 text-center">
            <p className="text-4xl" aria-hidden="true">🎉</p>
            <p className="mt-2 text-xl font-bold text-brand-700">All settled up</p>
            <p className="mt-1 text-sm text-slate-600">Nobody owes anybody.</p>
          </div>
        ) : (
          <>
            <ol className="flex flex-col gap-3">
              {transfers.map((t) => (
                <li key={`${t.from}-${t.to}`} className="rounded-2xl border-2 border-slate-200 bg-white px-5 py-4">
                  <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-base text-slate-700">
                    <Avatar look={avatars.get(t.from)} size="sm" />
                    <span className="font-semibold text-red-600">{nameOf(t.from)}</span>
                    <span className="text-slate-500">pays</span>
                    <Avatar look={avatars.get(t.to)} size="sm" />
                    <span className="font-semibold text-emerald-700">{nameOf(t.to)}</span>
                  </p>
                  <p className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums text-slate-900">
                    {formatCents(t.amountCents)}
                  </p>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-slate-500">
              {transfers.length === 1 ? 'This one payment clears' : `These ${transfers.length} payments clear`} every debt in
              the group.
            </p>
          </>
        )}
      </section>

      <section aria-labelledby="balances-heading">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 id="balances-heading" className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Balances
          </h3>
          <p className="text-xs text-slate-500">
            Group spent <span className="font-semibold text-slate-700">{formatCents(totalSpent)}</span>
          </p>
        </div>
        <ul className="flex flex-col gap-3">
          {sorted.map((b) => (
            <BalanceRow key={b.member_id} balance={b} look={avatars.get(b.member_id)} />
          ))}
        </ul>
      </section>
    </div>
  )
}

function BalanceRow({ balance, look }: { balance: Balance; look: AvatarLook | undefined }) {
  const cents = balance.balance_cents
  const tone =
    cents > 0
      ? { box: 'border-emerald-200 bg-emerald-50', num: 'text-emerald-700', label: 'gets back', sign: '+' }
      : cents < 0
        ? { box: 'border-red-200 bg-red-50', num: 'text-red-600', label: 'owes', sign: '−' }
        : { box: 'border-slate-200 bg-slate-50', num: 'text-slate-400', label: 'settled up', sign: '' }

  return (
    <li className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-4 ${tone.box}`}>
      <Avatar look={look} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-semibold text-slate-900">{balance.name}</p>
        <p className="text-xs text-slate-500">
          Paid {formatCents(balance.total_paid_cents)} · Share {formatCents(balance.total_share_cents)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-3xl font-extrabold tracking-tight tabular-nums ${tone.num}`}>
          {tone.sign}
          {formatCents(Math.abs(cents))}
        </p>
        <p className={`text-xs font-semibold uppercase tracking-wide ${tone.num}`}>{tone.label}</p>
      </div>
    </li>
  )
}

function EmptyCard(props: { emoji: string; title: string; body: string; action: string; onAction: () => void }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-brand-50 text-3xl" aria-hidden="true">
        {props.emoji}
      </div>
      <h3 className="text-lg font-semibold">{props.title}</h3>
      <p className="mt-1 max-w-xs text-sm text-slate-500">{props.body}</p>
      <button
        type="button"
        onClick={props.onAction}
        className="mt-6 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
      >
        {props.action}
      </button>
    </div>
  )
}
