import styled from 'styled-components'

const CountBadgeSC = styled.div<{
  $size?: 'small' | 'medium'
  $label?: string
}>(({ $label = '', $size = 'medium', theme }) => {
  const width =
    $size === 'small'
      ? $label.length > 1
        ? 18
        : 14
      : $label.length > 1
        ? 18
        : 16
  const fontSize = $size === 'small' ? 10.5 : $label.length > 1 ? 10.5 : 12

  return {
    ...theme.partials.text.badgeLabel,
    color: theme.colors.grey[25],
    letterSpacing: 1,
    fontSize,
    width,
    height: width,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.red[500],
    borderRadius: '50%',
  }
})

export function CountBadge({
  count,
  size = 'medium',
  ...props
}: {
  count?: number
  size?: 'small' | 'medium'
}) {
  if (!count) {
    return null
  }
  let badgeLabel: string = count.toString()

  if (count > 99) {
    badgeLabel = '!'
  }

  return (
    <CountBadgeSC
      $label={badgeLabel}
      $size={size}
      {...props}
    >
      {badgeLabel}
    </CountBadgeSC>
  )
}
