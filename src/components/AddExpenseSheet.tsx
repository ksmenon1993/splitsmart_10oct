import { useImperativeHandle, useRef, useState, type FormEvent, type Ref } from 'react'
import type { AvatarLook } from '../lib/avatars'
import { addExpense, type Expense, type Member } from '../lib/groups'
import { formatCents, parseAmountToCents } from '../lib/money'

export type AddExpenseSheetHandle = { open: () => void }

type Props = {
  ref: Ref<AddExpenseSheetHandle>
  groupId: string
  members: Member[]
  /** The member this device belongs to, if known. */
  me: string | null
  avatars: Map<string, AvatarLook>
  onMeChange: (memberId: string | null) => void
  onAdded: (expense: Expense, splitCount: number) => void
}

/**
 * Bottom sheet for logging an expense. Defaults: I paid, split equally between
 * everyone, so the common case is "type a number, press Enter". Payer and a subset
 * split are tucked behind one collapsed row.
 */
export function AddExpenseSheet({ ref, groupId, members, me, avatars, onMeChange, onAdded }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [payerOverride, setPayerOverride] = useState<string | null>(null)
  const [sharers, setSharers] = useState<Set<string> | null>(null) // null = everyone
  const [showOptions, setShowOptions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Open synchronously inside the tap handler so mobile browsers raise the keyboard.
  useImperativeHandle(ref, () => ({
    open() {
      setAmount('')
      setDescription('')
      setPayerOverride(null)
      setSharers(null)
      setShowOptions(false)
      setError(null)
      dialogRef.current?.showModal()
      amountRef.current?.focus()
    },
  }))

  const meMember = members.find((m) => m.id === me) ?? null
  const payerId = payerOverride ?? meMember?.id ?? null
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name ?? ''
  const sharerIds = sharers ? members.filter((m) => sharers.has(m.id)).map((m) => m.id) : members.map((m) => m.id)
  const splitCount = sharerIds.length

  const amountCents = parseAmountToCents(amount)
  const amountInvalid = amount.trim() !== '' && amountCents === null
  // Knowing who "I" am is required: it's recorded as who added the expense.
  const canSave = amountCents !== null && meMember !== null && payerId !== null && splitCount > 0 && !saving

  const payerLabel = payerId === null ? 'choose who paid' : payerId === meMember?.id ? 'you' : nameOf(payerId)
  const splitLabel =
    sharers === null || splitCount === members.length
      ? `everyone (${members.length})`
      : splitCount === 1
        ? `just ${nameOf(sharerIds[0])}`
        : `${splitCount} people`

  function toggleSharer(id: string) {
    const next = new Set(sharers ?? members.map((m) => m.id))
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSharers(next.size === members.length ? null : next)
  }

  function chooseMe(id: string) {
    onMeChange(id)
    setPayerOverride(null)
    amountRef.current?.focus()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSave || amountCents === null || payerId === null || !meMember) return
    setSaving(true)
    setError(null)
    try {
      const expense = await addExpense({
        groupId,
        paidBy: payerId,
        amountCents,
        description,
        memberIds: sharers === null ? undefined : sharerIds,
        addedBy: meMember.id,
      })
      onAdded(expense, splitCount)
      dialogRef.current?.close()
    } catch {
      setError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-medium transition ${
      active ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
    }`

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="add-expense-title"
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-slate-900/40 sm:mx-auto sm:max-w-md"
    >
      <form onSubmit={handleSubmit} className="rounded-t-3xl bg-white px-5 pt-4 pb-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 id="add-expense-title" className="text-base font-semibold">Add expense</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="-mr-2 rounded-full p-2 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        {!meMember && (
          <div className="mt-3 rounded-xl bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">Which one is you?</p>
            <p className="text-xs text-amber-800">
              Asked once, so everyone can see who added what. After this, “you paid” is filled in for you.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {members.map((m) => (
                <button key={m.id} type="button" onClick={() => chooseMe(m.id)} className={chip(false)}>
                  <span aria-hidden="true">{avatars.get(m.id)?.emoji} </span>
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <label htmlFor="sheet-amount" className="sr-only">Amount in rupees</label>
        <div className="mt-4 flex items-baseline justify-center gap-1" onClick={() => amountRef.current?.focus()}>
          <span className="text-4xl font-bold text-slate-400" aria-hidden="true">₹</span>
          <input
            ref={amountRef}
            id="sheet-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            aria-invalid={amountInvalid}
            style={{ width: `${Math.max(amount.length, 1) + 0.6}ch` }}
            className="max-w-[16rem] min-w-0 bg-transparent text-left text-5xl font-extrabold tracking-tight tabular-nums text-slate-900 outline-none placeholder:text-slate-300"
          />
        </div>
        <p className={`mt-1 text-center text-sm ${amountInvalid ? 'text-red-600' : 'text-slate-500'}`}>
          {amountInvalid
            ? 'Enter an amount like 450 or 450.50'
            : amountCents !== null && splitCount > 0
              ? `${formatCents(Math.floor(amountCents / splitCount))} each`
              : ' '}
        </p>

        <label htmlFor="sheet-description" className="sr-only">What was it for (optional)</label>
        <input
          id="sheet-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What for? (optional)"
          maxLength={80}
          enterKeyHint="done"
          className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
        />

        <button
          type="button"
          onClick={() => setShowOptions((v) => !v)}
          aria-expanded={showOptions}
          aria-controls="sheet-options"
          className="mt-3 flex w-full items-center justify-between rounded-xl px-1 py-2 text-left text-sm text-slate-600"
        >
          <span>
            Paid by <span className="font-semibold text-slate-900">{payerLabel}</span> · split between{' '}
            <span className="font-semibold text-slate-900">{splitLabel}</span>
          </span>
          <span className="ml-2 shrink-0 font-semibold text-brand-600">{showOptions ? 'Done' : 'Change'}</span>
        </button>

        {showOptions && (
          <div id="sheet-options" className="space-y-4 rounded-xl border border-slate-200 p-3">
            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Paid by</legend>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={payerId === m.id}
                    onClick={() => setPayerOverride(m.id)}
                    className={chip(payerId === m.id)}
                  >
                    <span aria-hidden="true">{avatars.get(m.id)?.emoji} </span>
                    {m.id === meMember?.id ? `${m.name} (you)` : m.name}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Split equally between
              </legend>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const on = sharers === null || sharers.has(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleSharer(m.id)}
                      className={chip(on)}
                    >
                      {/* Fixed-width tick slot so chips don't change size (and jump) when toggled. */}
                      <span aria-hidden="true" className="mr-1 inline-block w-3 text-center">
                        {on ? '✓' : ''}
                      </span>
                      <span aria-hidden="true">{avatars.get(m.id)?.emoji} </span>
                      {m.name}
                    </button>
                  )
                })}
              </div>
              {splitCount === 0 && <p className="mt-2 text-xs text-red-600">Pick at least one person.</p>}
            </fieldset>
            {meMember && (
              <button
                type="button"
                onClick={() => onMeChange(null)}
                className="text-xs font-medium text-slate-500 underline underline-offset-2"
              >
                Not {meMember.name}? Change who you are
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSave}
          className="mt-4 w-full rounded-2xl bg-brand-600 px-4 py-4 text-base font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : amountCents !== null ? `Add ${formatCents(amountCents)}` : 'Add expense'}
        </button>
        {!meMember && amountCents !== null && (
          <p className="mt-2 text-center text-xs text-amber-700">Tap your name above so we know who paid.</p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-center text-sm text-red-600">
            {error}
          </p>
        )}
      </form>
    </dialog>
  )
}
