import styled from 'styled-components'

const CountBadgeSC = styled.div<{
  $size?: 'small' | 'medium'
  $count?: number
}>(({ $count = 0, $size = 'medium', theme }) => {
  const width =
    $size === 'small' ? ($count >= 10 ? 18 : 14) : $count >= 10 ? 18 : 16
  const fontSize = $size === 'small' ? 10.5 : $count >= 10 ? 10.5 : 12

  return {
    ...theme.partials.text.badgeLabel,
    color: theme.colors.text,
    letterSpacing: 0,
    fontSize,
    width,
    height: width,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors['icon-danger-critical'],
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
  return (
    <CountBadgeSC
      $count={count}
      $size={size}
      {...props}
    >
      {count}
    </CountBadgeSC>
  )
}
