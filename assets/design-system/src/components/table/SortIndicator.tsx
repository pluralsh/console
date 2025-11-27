import type { SortDirection } from '@tanstack/react-table'

import ArrowRightIcon from '../icons/ArrowRightIcon'

export function SortIndicator({
  direction = false,
}: {
  direction: false | SortDirection
}) {
  switch (direction) {
    case 'asc':
      return (
        <ArrowRightIcon
          size={12}
          transform="rotate(-90deg)"
        />
      )
    case 'desc':
      return (
        <ArrowRightIcon
          size={12}
          transform="rotate(90deg)"
        />
      )
    case false:
      return null
  }
}
