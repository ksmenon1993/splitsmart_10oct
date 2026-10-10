const MAX_CENTS = 2_147_483_647 // Postgres integer limit

/** "450", "450.5", "1,200.50" → cents. Returns null if not a positive amount with ≤ 2 decimals. */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[,\s₹]/g, '')
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned)
  if (!match) return null
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  return cents > 0 && cents <= MAX_CENTS ? cents : null
}

const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

export function formatCents(cents: number): string {
  return formatter.format(cents / 100)
}
