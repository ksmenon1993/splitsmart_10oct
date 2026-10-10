import { FALLBACK_AVATAR, type AvatarLook } from '../lib/avatars'

const SIZES = {
  sm: 'size-7 text-base',
  md: 'size-10 text-xl',
  lg: 'size-14 text-3xl',
}

/** Decorative animal avatar; the person's name is always shown as text next to it. */
export function Avatar({
  look,
  size = 'md',
  ring = false,
}: {
  look: AvatarLook | undefined
  size?: keyof typeof SIZES
  ring?: boolean
}) {
  const { emoji, bg } = look ?? FALLBACK_AVATAR
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full leading-none select-none ${bg} ${SIZES[size]} ${
        ring ? 'ring-2 ring-white' : ''
      }`}
    >
      {emoji}
    </span>
  )
}
