import { Flex, Tooltip } from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import { ReactNode } from 'react'

export function MetadataIcons({
  items,
  maxVisibleItems = 5,
}: {
  items: Array<{ id: string; label: string; icon: ReactNode }>
  maxVisibleItems?: number
}) {
  const visibleItems = items.slice(0, maxVisibleItems)
  const hiddenItems = items.slice(maxVisibleItems)
  const hiddenItemsLabel = hiddenItems.map(({ label }) => label).join(', ')

  return (
    <Flex
      align="center"
      gap="xsmall"
      wrap="nowrap"
      css={{ minWidth: 0 }}
    >
      {visibleItems.map((item) => (
        <Tooltip
          key={item.id}
          label={item.label}
          placement="bottom"
        >
          <span css={{ lineHeight: 0 }}>{item.icon}</span>
        </Tooltip>
      ))}
      {!!hiddenItems.length && (
        <Tooltip
          css={{ maxWidth: 500 }}
          label={hiddenItemsLabel || `${hiddenItems.length} more`}
          placement="bottom"
        >
          <CaptionP $color="text-xlight">+{hiddenItems.length}</CaptionP>
        </Tooltip>
      )}
    </Flex>
  )
}
