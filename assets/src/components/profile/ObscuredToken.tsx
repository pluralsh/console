import { useTheme } from 'styled-components'

export function ObscuredToken({
  token,
  showFirst,
  showLast,
  length,
  reveal,
}: {
  token: string | null | undefined
  showFirst?: number
  showLast?: number
  length?: number
  reveal?: boolean
}) {
  length = length || 0 > 0 ? length || 0 : (token || '').length

  const firstCount = Math.min(length, (showFirst || 0) > 0 ? showFirst ?? 0 : 0)
  const lastCount = Math.min(
    (showLast || 0) > 0 ? showLast ?? 0 : 0,
    Math.max(length - firstCount, 0)
  )
  const theme = useTheme()

  if (typeof token !== 'string') {
    return null
  }
  const prefix = token.substring(0, firstCount)
  const suffix = token.substring(-1, lastCount)

  return (
    <span css={{ ...theme.partials.text.code }}>
      {reveal ? (
        token
      ) : (
        <>
          {prefix}
          <span css={{ opacity: 0.5 }}>
            {'·'.repeat(length - firstCount - lastCount)}
          </span>
          {suffix}
        </>
      )}
    </span>
  )
}
