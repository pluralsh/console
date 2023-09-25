import { type ComponentProps, type Ref, forwardRef } from 'react'
import styled from 'styled-components'

import Tooltip from '../components/Tooltip'

import { type SidebarVariant, useSidebar } from './Sidebar'

type SidebarItemProps = ComponentProps<typeof ItemSC> & {
  clickable?: boolean
  tooltip?: string
  active?: boolean
}

function SidebarItemRef(
  { children, clickable = false, tooltip = '', ...props }: SidebarItemProps,
  ref: Ref<any>
) {
  return (
    <WithTooltip tooltip={tooltip}>
      <Item
        clickable={clickable}
        ref={ref}
        {...props}
      >
        {children}
      </Item>
    </WithTooltip>
  )
}

function WithTooltipRef(
  { children, clickable, tooltip = '', ...props }: SidebarItemProps,
  ref: Ref<any>
) {
  const { layout } = useSidebar()

  if (!tooltip) return <> {children}</>

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
  justifyContent: 'center',
  width: $isHorizontal ? undefined : 32,
  height: 32,
  flexGrow: 0,
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
  ref: Ref<any>
) {
  const { layout, variant } = useSidebar()
  const isHorizontal = layout === 'horizontal'

  return (
    <ItemSC
      $clickable={clickable}
      $active={active}
      $isHorizontal={isHorizontal}
      $variant={variant}
      ref={ref}
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
