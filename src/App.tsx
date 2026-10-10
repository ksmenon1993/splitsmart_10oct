import { useEffect, useState, type ReactNode } from 'react'
import { CreateGroupForm } from './components/CreateGroupForm'
import { buildDemo, type DemoData } from './lib/demo'
import { GroupScreen } from './components/GroupScreen'
import {
  getGroupIdFromUrl,
  groupUrl,
  loadGroup,
  type Expense,
  type Group,
  type Member,
} from './lib/groups'

type View =
  | { kind: 'create' }
  | { kind: 'loading'; groupId: string }
  | { kind: 'not-found' }
  | { kind: 'error'; groupId: string }
  | { kind: 'group'; group: Group; members: Member[]; expenses: Expense[] }
  | { kind: 'demo'; demo: DemoData }

function viewFromUrl(): View {
  const params = new URLSearchParams(window.location.search)
  if (params.has('demo')) return { kind: 'demo', demo: buildDemo() }
  const hasParam = params.has('g')
  const groupId = getGroupIdFromUrl()
  if (groupId) return { kind: 'loading', groupId }
  return hasParam ? { kind: 'not-found' } : { kind: 'create' }
}

function App() {
  const [view, setView] = useState<View>(viewFromUrl)
  const loadingId = view.kind === 'loading' ? view.groupId : null

  // Back/forward buttons change ?g=, so re-read the URL.
  useEffect(() => {
    const onPopState = () => setView(viewFromUrl())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (!loadingId) return
    let cancelled = false
    loadGroup(loadingId)
      .then((result) => {
        if (cancelled) return
        setView(result ? { kind: 'group', ...result } : { kind: 'not-found' })
      })
      .catch(() => {
        if (!cancelled) setView({ kind: 'error', groupId: loadingId })
      })
    return () => {
      cancelled = true
    }
  }, [loadingId])

  function handleCreated(group: Group) {
    window.history.pushState(null, '', groupUrl(group.id))
    setView({ kind: 'group', group, members: [], expenses: [] })
  }

  function openDemo() {
    window.history.pushState(null, '', `${window.location.pathname}?demo`)
    setView({ kind: 'demo', demo: buildDemo() })
    window.scrollTo(0, 0)
  }

  function exitDemo() {
    window.history.pushState(null, '', window.location.pathname)
    setView({ kind: 'create' })
    window.scrollTo(0, 0)
  }

  function handleMemberAdded(member: Member) {
    setView((v) => (v.kind === 'group' ? { ...v, members: [...v.members, member] } : v))
  }

  function handleExpenseAdded(expense: Expense) {
    setView((v) => (v.kind === 'group' ? { ...v, expenses: [expense, ...v.expenses] } : v))
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-white shadow-sm sm:border-x sm:border-slate-200">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur">
        <a href={window.location.pathname} className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            S
          </div>
          <h1 className="text-lg font-semibold tracking-tight">
            Split<span className="text-brand-600">Smart</span>
          </h1>
        </a>
      </header>

      <main className="flex flex-1 flex-col">
        {view.kind === 'create' && <CreateGroupForm onCreated={handleCreated} onTryDemo={openDemo} />}
        {view.kind === 'loading' && <Message title="Loading group…" />}
        {view.kind === 'not-found' && (
          <Message title="Group not found" body="This link may be mistyped or the group no longer exists." showNewLink />
        )}
        {view.kind === 'error' && (
          <Message title="Couldn't load the group" body="Check your connection and try again.">
            <button
              type="button"
              onClick={() => setView({ kind: 'loading', groupId: view.groupId })}
              className="mt-6 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Try again
            </button>
          </Message>
        )}
        {view.kind === 'demo' && (
          <GroupScreen
            group={view.demo.group}
            members={view.demo.members}
            expenses={view.demo.expenses}
            onMemberAdded={() => {}}
            onExpenseAdded={() => {}}
            demo={{ balances: view.demo.balances, onExit: exitDemo }}
          />
        )}
        {view.kind === 'group' && (
          <GroupScreen
            key={view.group.id}
            group={view.group}
            members={view.members}
            expenses={view.expenses}
            onMemberAdded={handleMemberAdded}
            onExpenseAdded={handleExpenseAdded}
          />
        )}
      </main>

      <footer className="px-4 py-4 text-center text-xs text-slate-400">
        Split fairly. Settle simply.
      </footer>
    </div>
  )
}

function Message({
  title,
  body,
  showNewLink,
  children,
}: {
  title: string
  body?: string
  showNewLink?: boolean
  children?: ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {body && <p className="mt-2 max-w-xs text-sm text-slate-500">{body}</p>}
      {children}
      {showNewLink && (
        <a href={window.location.pathname} className="mt-6 text-sm font-semibold text-brand-600 hover:underline">
          Start a new group
        </a>
      )}
    </div>
  )
}

export default App
