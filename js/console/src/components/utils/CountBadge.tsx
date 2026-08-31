import styled, { DefaultTheme } from 'styled-components'

export type CountBadgeVariant = 'danger' | 'warning'

function countBadgeVariantStyles(
  theme: DefaultTheme,
  variant: CountBadgeVariant
) {
  switch (variant) {
    case 'warning':
      return {
        color: 'black',
        backgroundColor: theme.colors.yellow[400],
      }
    case 'danger':
    default:
      return {
        color: 'white',
        backgroundColor: theme.colors.red[500],
      }
  }
}

const CountBadgeSC = styled.div<{
  $size?: 'small' | 'medium'
  $label?: string
  $variant?: CountBadgeVariant
}>(({ $label = '', $size = 'medium', $variant = 'danger', theme }) => {
  const width =
    $size === 'small'
      ? $label.length > 1
        ? 16
        : 12
      : $label.length > 1
        ? 16
        : 14
  const fontSize = $size === 'small' ? 9 : $label.length > 1 ? 9 : 10

  return {
    ...theme.partials.text.badgeLabel,
    ...countBadgeVariantStyles(theme, $variant),
    letterSpacing: 0,
    fontSize,
    width,
    height: width,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
  }
})

export function CountBadge({
  count,
  size = 'medium',
  variant = 'danger',
  ...props
}: {
  count?: number
  size?: 'small' | 'medium'
  variant?: CountBadgeVariant
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
      $variant={variant}
      {...props}
    >
      {badgeLabel}
    </CountBadgeSC>
  )
}
