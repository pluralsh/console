import { AppIcon, Flex } from '@pluralsh/design-system'
import type { SearchDropdownItem } from './useSelfServiceCatalogSearch'
import { KeyboardEvent, ReactElement, ReactNode } from 'react'
import { useTheme } from 'styled-components'
import { isEmpty } from 'lodash'
import { iconUrl } from 'utils/icon'
import { StackedText } from 'components/utils/table/StackedText'

export function SelfServiceSearchDropdownGroup({
  label,
  items,
  icon,
  clickable,
  onClick,
  renderRightContent,
}: {
  label: string
  items: SearchDropdownItem[]
  icon: ReactElement
  clickable?: boolean
  onClick?: (item: SearchDropdownItem) => void
  renderRightContent?: (item: SearchDropdownItem) => ReactNode
}) {
  const theme = useTheme()

  if (isEmpty(items)) return null

  return (
    <Flex
      direction="column"
      gap="xxsmall"
    >
      <Flex
        align="center"
        justify="space-between"
        css={{
          color: theme.colors['text-xlight'],
          padding: `${theme.spacing.xxsmall}px ${theme.spacing.xsmall}px`,
          textTransform: 'uppercase',
          ...theme.partials.text.caption,
        }}
      >
        {label}
        <span>{items.length}</span>
      </Flex>
      {items.map((item) => (
        <div
          key={item.id}
          role={clickable ? 'button' : undefined}
          tabIndex={clickable ? 0 : undefined}
          onClick={clickable && onClick ? () => onClick(item) : undefined}
          onKeyDown={
            clickable && onClick
              ? (e: KeyboardEvent<HTMLDivElement>) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onClick(item)
                  }
                }
              : undefined
          }
          css={{
            alignItems: 'center',
            borderRadius: theme.borderRadiuses.medium,
            cursor: clickable ? 'pointer' : undefined,
            display: 'grid',
            gap: theme.spacing.small,
            gridTemplateColumns: 'auto minmax(0, 1fr) auto',
            padding: theme.spacing.xsmall,
            ...(clickable && {
              '&:hover': {
                background: theme.colors['fill-one-hover'],
              },
            }),
          }}
        >
          <AppIcon
            size="xxxsmall"
            url={iconUrl(item.icon, item.darkIcon, theme.mode)}
            icon={icon}
            css={{
              backgroundColor: theme.colors['fill-two'],
              border: theme.borders['fill-two'],
              borderRadius: '50%',
            }}
          />
          <StackedText
            truncate
            first={item.name}
            second={item.description}
            firstPartialType="caption"
            secondPartialType="caption"
            css={{ minWidth: 0, width: '100%' }}
          />
          {renderRightContent?.(item)}
        </div>
      ))}
    </Flex>
  )
}
