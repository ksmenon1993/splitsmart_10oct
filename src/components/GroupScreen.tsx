import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { buildAvatars } from '../lib/avatars'
import { addMember, groupUrl, type Balance, type Expense, type Group, type Member } from '../lib/groups'
import { getMe, setMe } from '../lib/me'
import { formatCents } from '../lib/money'
import { AddExpenseSheet, type AddExpenseSheetHandle } from './AddExpenseSheet'
import { Avatar } from './Avatar'
import { BalancesScreen } from './BalancesScreen'
import { ExpenseSection } from './ExpenseSection'

type Props = {
  group: Group
  members: Member[]
  expenses: Expense[]
  onMemberAdded: (member: Member) => void
  onExpenseAdded: (expense: Expense) => void
  /** Set for the in-browser sample group: read-only, nothing touches the database. */
  demo?: { balances: Balance[]; onExit: () => void }
}

type Tab = 'balances' | 'expenses' | 'people'

const joinedFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })

function peopleCount(n: number) {
  if (n === 0) return 'No one in this group yet'
  return `${n} ${n === 1 ? 'person' : 'people'} in this group`
}

/** "Asha", "Asha and Ben", "Asha, Ben and Chen", ... "Asha, Ben, Chen and 3 more". */
function nameList(names: string[]) {
  if (names.length <= 1) return names.join('')
  if (names.length <= 4) return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  return `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`
}

/** How many avatars to show in the header stack before "+N". */
const STACK_MAX = 5

const TABS: { id: Tab; label: string }[] = [
  { id: 'balances', label: 'Balances' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'people', label: 'People' },
]

export function GroupScreen({ group, members, expenses, onMemberAdded, onExpenseAdded, demo }: Props) {
  const [tab, setTab] = useState<Tab>('balances')
  const count = (id: Tab) => (id === 'expenses' ? expenses.length : id === 'people' ? members.length : 0)

  const [me, setMeState] = useState<string | null>(() => (demo ? null : getMe(group.id)))
  const sheetRef = useRef<AddExpenseSheetHandle>(null)
  const [toast, setToast] = useState<string | null>(null)
  const canAddExpense = !demo && members.length > 0 && tab !== 'people'
  const avatars = useMemo(() => buildAvatars(group.id, members), [group.id, members])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  function handleMeChange(memberId: string | null) {
    setMe(group.id, memberId)
    setMeState(memberId)
  }

  function handleExpenseAdded(expense: Expense, splitCount: number) {
    onExpenseAdded(expense)
    setToast(`Added ${formatCents(expense.amount_cents)} · split ${splitCount} ${splitCount === 1 ? 'way' : 'ways'}`)
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 pt-6">
        {demo ? (
          <p className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-800">
            <span aria-hidden="true">✨</span> Sample group
          </p>
        ) : (
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Group</p>
        )}
        <h2 className="mt-1 text-2xl font-semibold break-words">{group.name}</h2>
        <button
          type="button"
          onClick={() => setTab('people')}
          className="mt-3 flex items-center gap-3 rounded-full py-1 pr-3 text-left transition hover:bg-slate-50"
        >
          {members.length > 0 && (
            <span className="flex -space-x-2">
              {members.slice(0, STACK_MAX).map((m) => (
                <Avatar key={m.id} look={avatars.get(m.id)} size="md" ring />
              ))}
              {members.length > STACK_MAX && (
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 ring-2 ring-white">
                  +{members.length - STACK_MAX}
                </span>
              )}
            </span>
          )}
          <span className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{peopleCount(members.length)}</span>
            {members.length > 0 && (
              <span className="block text-xs text-slate-500">
                {nameList([
                  ...members.filter((m) => m.id === me).map(() => 'You'),
                  ...members.filter((m) => m.id !== me).map((m) => m.name),
                ])}
              </span>
            )}
          </span>
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Group sections"
        className="sticky top-[61px] z-10 mt-4 flex gap-1 border-b border-slate-100 bg-white/95 px-4 py-2 backdrop-blur"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="group-tabpanel"
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-semibold transition ${
              tab === t.id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
            {count(t.id) > 0 && (
              <span
                className={`rounded-full px-1.5 text-xs tabular-nums ${
                  tab === t.id ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {count(t.id)}
              </span>
            )}
          </button>
        ))}
      </div>

      <div id="group-tabpanel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex flex-col gap-6 px-4 py-6">
        {tab === 'balances' && (
          <BalancesScreen
            groupId={group.id}
            members={members}
            expenses={expenses}
            onGoTo={setTab}
            onAddExpense={demo ? undefined : () => sheetRef.current?.open()}
            demoBalances={demo?.balances}
            avatars={avatars}
          />
        )}

        {tab === 'expenses' && (
          <ExpenseSection members={members} expenses={expenses} avatars={avatars} me={me} />
        )}

        {tab === 'people' && (
          <>
            <section>
              <h3 className="text-lg font-bold">{peopleCount(members.length)}</h3>
              <p className="mb-3 text-xs text-slate-500">Everyone here shares this group’s expenses.</p>
              {members.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                  No one here yet. Add the people who are splitting costs, starting with yourself.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {members.map((m) => {
                    const paidFor = expenses.filter((e) => e.paid_by === m.id).length
                    return (
                      <li
                        key={m.id}
                        className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${
                          m.id === me ? 'border-brand-200 bg-brand-50/60' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <Avatar look={avatars.get(m.id)} size="lg" />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2">
                            <span className="truncate text-base font-semibold">{m.name}</span>
                            {m.id === me && (
                              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            Joined {joinedFormat.format(new Date(m.created_at))}
                            {' · '}
                            {paidFor === 0 ? 'hasn’t paid for anything yet' : `paid for ${paidFor} ${paidFor === 1 ? 'thing' : 'things'}`}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              {demo ? (
                <p className="mt-3 text-xs text-slate-500">
                  In your own group you add people here and share a link so they can see it too.
                </p>
              ) : (
                <AddMemberForm groupId={group.id} onAdded={onMemberAdded} />
              )}
            </section>
            {!demo && <ShareLink url={groupUrl(group.id)} />}
          </>
        )}
      </div>

      {canAddExpense && (
        <div className="sticky bottom-0 z-10 mt-auto bg-gradient-to-t from-white via-white/95 to-white/0 px-4 pt-6 pb-4">
          <button
            type="button"
            onClick={() => sheetRef.current?.open()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-4 text-base font-bold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 active:scale-[0.98]"
          >
            <span className="text-xl leading-none" aria-hidden="true">+</span> Add expense
          </button>
        </div>
      )}

      {!demo && (
        <AddExpenseSheet
          ref={sheetRef}
          groupId={group.id}
          members={members}
          me={me}
          avatars={avatars}
          onMeChange={handleMeChange}
          onAdded={handleExpenseAdded}
        />
      )}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-20 z-30 flex justify-center px-4">
        {toast && (
          <p className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">✓ {toast}</p>
        )}
      </div>

      {demo && (
        <div className="sticky bottom-0 z-10 mt-auto border-t border-amber-200 bg-amber-50/95 px-4 py-3 backdrop-blur">
          <p className="text-xs text-amber-900">
            <span className="font-semibold">This is a demo</span> with made-up people and amounts. Nothing is
            saved.
          </p>
          <button
            type="button"
            onClick={demo.onExit}
            className="mt-2 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Clear demo &amp; start my own group
          </button>
        </div>
      )}
    </div>
  )
}

function AddMemberForm({ groupId, onAdded }: { groupId: string; onAdded: (m: Member) => void }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      onAdded(await addMember(groupId, name))
      setName('')
    } catch {
      setError('Could not add that person. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3">
      <label htmlFor="member-name" className="sr-only">Member name</label>
      <div className="flex gap-2">
        <input
          id="member-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a person, e.g. Priya"
          maxLength={40}
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="shrink-0 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Adding…' : 'Add'}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  )
}

function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked (e.g. non-HTTPS); the link is still selectable below.
    }
  }

  return (
    <section className="rounded-xl bg-brand-50 p-4">
      <p className="text-sm font-semibold text-brand-700">Share this group</p>
      <p className="mt-1 text-xs text-slate-600">Anyone with this link can open the group.</p>
      <div className="mt-3 flex gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Shareable group link"
          className="min-w-0 flex-1 rounded-lg border border-brand-100 bg-white px-3 py-2 text-xs text-slate-700"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </section>
  )
}
