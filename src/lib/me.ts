/**
 * Which member "I" am in a group, remembered on this device only. There is no
 * sign-in, so this is just a convenience for pre-selecting "I paid". Storage can be
 * unavailable (private mode, blocked site data); everything still works without it.
 */
const key = (groupId: string) => `splitsmart:me:${groupId}`

export function getMe(groupId: string): string | null {
  try {
    return localStorage.getItem(key(groupId))
  } catch {
    return null
  }
}

export function setMe(groupId: string, memberId: string | null): void {
  try {
    if (memberId) localStorage.setItem(key(groupId), memberId)
    else localStorage.removeItem(key(groupId))
  } catch {
    // Not persisted; the choice still applies for this visit.
  }
}
