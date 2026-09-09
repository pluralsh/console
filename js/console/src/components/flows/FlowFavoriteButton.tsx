import { StarIcon, Tooltip } from '@pluralsh/design-system'
import { MouseEvent } from 'react'
import styled from 'styled-components'

const STAR_SIZE = 14

export function FlowFavoriteStar({ size = 16 }: { size?: number }) {
  return (
    <FilledStarSC $size={size}>
      <StarIcon
        size={size}
        color="icon-warning"
      />
    </FilledStarSC>
  )
}

export function FlowFavoriteButton({
  favorited,
  onToggle,
}: {
  favorited: boolean
  onToggle: () => void
}) {
  const label = favorited ? 'Unfavorite' : 'Favorite'

  return (
    <Tooltip
      label={label}
      placement="top"
    >
      <StarButtonSC
        type="button"
        aria-label={label}
        $favorited={favorited}
        onClick={(e: MouseEvent) => {
          e.preventDefault()
          e.stopPropagation()
          onToggle()
        }}
      >
        <StarIcon
          size={STAR_SIZE}
          color={favorited ? 'icon-warning' : 'icon-light'}
        />
      </StarButtonSC>
    </Tooltip>
  )
}

const filledStarStyles = (color: string) => ({
  '& svg path': {
    fill: color,
    stroke: 'none',
  },
})

const FilledStarSC = styled.span<{ $size: number }>(({ $size, theme }) => ({
  display: 'inline-flex',
  width: $size,
  height: $size,
  ...filledStarStyles(theme.colors['icon-warning']),
}))

const StarButtonSC = styled.button<{ $favorited: boolean }>(
  ({ $favorited, theme }) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: $favorited
      ? theme.colors['icon-warning']
      : theme.colors['icon-light'],
    ...($favorited && filledStarStyles(theme.colors['icon-warning'])),
  })
)
