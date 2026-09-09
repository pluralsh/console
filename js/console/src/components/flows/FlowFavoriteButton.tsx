import { IconFrame, StarIcon } from '@pluralsh/design-system'
import { MouseEvent } from 'react'
import styled from 'styled-components'

export function FlowFavoriteButton({
  favorited,
  onToggle,
}: {
  favorited: boolean
  onToggle: () => void
}) {
  return (
    <StarFrameSC
      clickable
      size="small"
      type="tertiary"
      textValue={favorited ? 'Unfavorite' : 'Favorite'}
      tooltip={favorited ? 'Unfavorite' : 'Favorite'}
      $favorited={favorited}
      icon={<StarIcon color={favorited ? 'icon-warning' : 'icon-light'} />}
      onClick={(e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle()
      }}
    />
  )
}

const StarFrameSC = styled(IconFrame)<{ $favorited: boolean }>(
  ({ $favorited }) => ({
    ...($favorited && {
      '& svg path': { fill: 'currentColor' },
    }),
  })
)
