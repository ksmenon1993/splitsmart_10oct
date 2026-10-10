import { useState, type FormEvent } from 'react'
import { createGroup, type Group } from '../lib/groups'

type Props = { onCreated: (group: Group) => void; onTryDemo: () => void }

export function CreateGroupForm({ onCreated, onTryDemo }: Props) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      onCreated(await createGroup(name))
    } catch {
      setError('Could not create the group. Check your connection and try again.')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-brand-50 text-3xl" aria-hidden="true">
        🧾
      </div>
      <h2 className="text-2xl font-bold tracking-tight">Split costs, not friendships</h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
        Trips, flatmates, dinners out. Log who paid for what and SplitSmart works out
        exactly who owes whom.
      </p>

      <button
        type="button"
        onClick={onTryDemo}
        className="group mt-8 flex w-full max-w-xs items-center gap-4 rounded-2xl border-2 border-brand-600 bg-brand-50 px-5 py-4 text-left shadow-sm transition hover:bg-brand-100 active:scale-[0.98]"
      >
        <span className="text-3xl" aria-hidden="true">👀</span>
        <span className="flex-1">
          <span className="block text-lg font-bold text-brand-700">See how it works</span>
          <span className="block text-xs text-slate-600">Opens a sample trip. Nothing to set up.</span>
        </span>
        <span className="text-xl text-brand-600 transition group-hover:translate-x-0.5" aria-hidden="true">→</span>
      </button>

      <div className="my-6 flex w-full max-w-xs items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or start your own
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3 text-left">
        <label htmlFor="group-name" className="block text-sm font-medium text-slate-700">
          Group name
        </label>
        <input
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Flat 4B bills"
          maxLength={60}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Creating…' : 'Create group'}
        </button>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  )
}
