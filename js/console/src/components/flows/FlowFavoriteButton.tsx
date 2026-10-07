import { StarIcon, Tooltip } from '@pluralsh/design-system'
import { MouseEvent } from 'react'
import styled, { useTheme } from 'styled-components'

const STAR_SIZE = 14

function FavoriteStarGlyph({
  size = STAR_SIZE,
  color,
}: {
  size?: number
  color: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14.72 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.36 0L5.085 4.61L0 5.345L3.68 8.935L2.81 14L7.36 11.61L11.91 14L11.04 8.935L14.72 5.35L9.635 4.61L7.36 0Z"
        fill={color}
      />
    </svg>
  )
}

export function FlowFavoriteStar({ size = 16 }: { size?: number }) {
  const theme = useTheme()

  return (
    <FavoriteStarGlyph
      size={size}
      color={theme.colors['icon-warning']}
    />
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
        onClick={(e: MouseEvent) => {
          e.preventDefault()
          e.stopPropagation()
          onToggle()
        }}
      >
        {favorited ? (
          <FlowFavoriteStar size={STAR_SIZE} />
        ) : (
          <StarIcon
            size={STAR_SIZE}
            color="icon-light"
          />
        )}
      </StarButtonSC>
    </Tooltip>
  )
}

const StarButtonSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  lineHeight: 0,
}))
