import type { Member } from './groups'

export type AvatarLook = { emoji: string; bg: string }

// Friendly animals only (no pigs/snakes/etc. that could read as an insult).
const ANIMALS = [
  '🦊', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐧', '🦉', '🐙',
  '🦄', '🐢', '🐬', '🦒', '🐘', '🦔', '🐰', '🐻', '🐱', '🐶',
  '🐹', '🦦', '🦥', '🐳', '🦜', '🐝', '🦩', '🐞', '🦋', '🐿️',
]

// Full class names so Tailwind picks them up.
const BACKGROUNDS = [
  'bg-amber-100', 'bg-sky-100', 'bg-rose-100', 'bg-lime-100', 'bg-violet-100',
  'bg-orange-100', 'bg-teal-100', 'bg-fuchsia-100', 'bg-yellow-100', 'bg-indigo-100',
]

function hash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * Animal + colour per member. Assigned by join order (members are never removed),
 * so everyone in a group gets a different animal and keeps it; the starting animal
 * varies by group so every group doesn't open with the same fox.
 */
export function buildAvatars(groupId: string, members: Member[]): Map<string, AvatarLook> {
  const offset = hash(groupId)
  return new Map(
    members.map((m, i) => [
      m.id,
      {
        emoji: ANIMALS[(offset + i) % ANIMALS.length],
        bg: BACKGROUNDS[(offset + i * 3) % BACKGROUNDS.length],
      },
    ]),
  )
}

export const FALLBACK_AVATAR: AvatarLook = { emoji: '🙂', bg: 'bg-slate-100' }
