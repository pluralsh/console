import { type ComponentProps, type Ref, forwardRef } from 'react'
import styled from 'styled-components'

import Tooltip from '../components/Tooltip'

import { type SidebarVariant, useSidebar } from './Sidebar'

type SidebarItemProps = ComponentProps<typeof ItemSC> & {
  clickable?: boolean
  tooltip?: string
  expandedLabel?: string
  active?: boolean
}

function SidebarItemRef(
  {
    children,
    tooltip = '',
    expandedLabel = '',
    className,
    ...props
  }: SidebarItemProps,
  ref: Ref<HTMLDivElement>
) {
  const { isExpanded } = useSidebar()

  return (
    <WithTooltip
      ref={ref}
      tooltip={tooltip}
      className={className}
      {...props}
    >
      {children}
      {isExpanded && expandedLabel ? expandedLabel : null}
    </WithTooltip>
  )
}

function WithTooltipRef(
  { children, clickable, tooltip = '', ...props }: SidebarItemProps,
  ref: Ref<HTMLDivElement>
) {
  const { layout, isExpanded } = useSidebar()

  if (!tooltip || isExpanded)
    return (
      <Item
        layout={layout}
        clickable={clickable}
        ref={ref}
        {...props}
      >
        {children}
      </Item>
    )

  return (
    <Tooltip
      arrow
      placement="right"
      label={tooltip}
      whiteSpace="nowrap"
    >
      <Item
        layout={layout}
        clickable={clickable}
        ref={ref}
        {...props}
      >
        {children}
      </Item>
    </Tooltip>
  )
}

const ItemSC = styled.div<{
  $clickable: boolean
  $active: boolean
  $isHorizontal: boolean
  $variant: SidebarVariant
}>(({ theme, $clickable, $active, $isHorizontal, $variant }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: theme.spacing.xsmall,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  width: $isHorizontal ? undefined : '100%',
  height: $isHorizontal ? undefined : 39,
  flexGrow: 0,
  padding: $isHorizontal ? undefined : theme.spacing.small,
  borderRadius: '3px',
  overflow: 'hidden',
  color: theme.colors['icon-light'],
  backgroundColor: $active
    ? theme.mode === 'light'
      ? theme.colors['fill-one-selected']
      : $variant === 'console'
      ? theme.colors['fill-zero-selected']
      : theme.colors['fill-one-selected']
    : 'transparent',
  ...($clickable
    ? {
        cursor: 'pointer',
        ...(!$active
          ? {
              ':hover': {
                backgroundColor:
                  theme.mode === 'light'
                    ? theme.colors['fill-zero-hover']
                    : $variant === 'console'
                    ? theme.colors['fill-zero-hover']
                    : theme.colors['fill-one-hover'],
              },
            }
          : {}),
      }
    : {}),
}))

function ItemRef(
  { children, clickable = false, active = false, ...props }: SidebarItemProps,
  ref: Ref<HTMLDivElement>
) {
  const { layout, variant } = useSidebar()
  const isHorizontal = layout === 'horizontal'

  return (
    <ItemSC
      ref={ref}
      $clickable={clickable}
      $active={active}
      $isHorizontal={isHorizontal}
      $variant={variant}
      {...props}
    >
      {children}
    </ItemSC>
  )
}

const Item = forwardRef(ItemRef)
const WithTooltip = forwardRef(WithTooltipRef)
const SidebarItem = forwardRef(SidebarItemRef)

export default SidebarItem
