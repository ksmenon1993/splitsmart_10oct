export type Transfer = { from: string; to: string; amountCents: number }

/** Above this many people with a non-zero balance, fall back to the greedy plan. */
const EXACT_LIMIT = 15

/**
 * Fewest payments that bring every balance to zero.
 * `balances` maps member id → net cents (positive = is owed, negative = owes); must sum to 0.
 *
 * Minimum payments = (people with non-zero balance) − (most groups they can be split into
 * where each group's balances sum to zero), because each zero-sum group of k people can
 * settle with k − 1 payments. Finding that split is exponential, so it is done exactly
 * for up to EXACT_LIMIT people (a bitmask search) and greedily beyond that.
 */
export function settleUp(balances: Map<string, number>): Transfer[] {
  const people = [...balances].filter(([, cents]) => cents !== 0)
  if (people.length === 0) return []
  const groups = people.length <= EXACT_LIMIT ? zeroSumGroups(people) : [people]
  return groups.flatMap(greedySettle)
}

/** Within one zero-sum group: biggest debtor pays biggest creditor, repeat. Gives k − 1 payments. */
function greedySettle(group: [string, number][]): Transfer[] {
  const creditors = group.filter(([, c]) => c > 0).map(([id, c]) => ({ id, c }))
  const debtors = group.filter(([, c]) => c < 0).map(([id, c]) => ({ id, c: -c }))
  const transfers: Transfer[] = []
  while (creditors.length && debtors.length) {
    creditors.sort((a, b) => b.c - a.c)
    debtors.sort((a, b) => b.c - a.c)
    const cr = creditors[0]
    const db = debtors[0]
    const amount = Math.min(cr.c, db.c)
    transfers.push({ from: db.id, to: cr.id, amountCents: amount })
    cr.c -= amount
    db.c -= amount
    if (cr.c === 0) creditors.shift()
    if (db.c === 0) debtors.shift()
  }
  return transfers
}

/** Split people into the largest number of groups whose balances each sum to zero. */
function zeroSumGroups(people: [string, number][]): [string, number][][] {
  const n = people.length
  const full = (1 << n) - 1
  const sum = new Array<number>(full + 1).fill(0)
  const best = new Array<number>(full + 1).fill(0) // most zero-sum groups that `mask` can be ordered into
  const removed = new Array<number>(full + 1).fill(-1) // which person to take out last to achieve it

  for (let mask = 1; mask <= full; mask++) {
    const low = mask & -mask
    sum[mask] = sum[mask ^ low] + people[31 - Math.clz32(low)][1]
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) continue
      const rest = mask ^ (1 << i)
      if (removed[mask] === -1 || best[rest] > best[mask]) {
        best[mask] = best[rest]
        removed[mask] = i
      }
    }
    if (sum[mask] === 0) best[mask] += 1
  }

  // Walk back from everyone; each time the remaining set sums to zero, the people
  // peeled off since the previous zero point form one self-contained group.
  const groups: [string, number][][] = []
  let current: [string, number][] = []
  let mask = full
  while (mask) {
    if (sum[mask] === 0 && current.length) {
      groups.push(current)
      current = []
    }
    const i = removed[mask]
    current.push(people[i])
    mask ^= 1 << i
  }
  groups.push(current)
  return groups
}
