import { Flex, FlexProps } from 'honorable'
import { Ref, forwardRef } from 'react'

import Tooltip from '../components/Tooltip'

import { SidebarLayout } from './Sidebar'

type SidebarItemProps = FlexProps & {
  clickable?: boolean
  tooltip?: string
  href?: string
  layout?: SidebarLayout
}

function SidebarItemRef(
  {
    layout = 'vertical',
    children,
    clickable = false,
    tooltip = '',
    href = '',
    ...props
  }: SidebarItemProps,
  ref: Ref<any>
) {
  return (
    <WithTooltip
      layout={layout}
      tooltip={tooltip}
    >
      <WithLink
        layout={layout}
        href={href}
      >
        <Item
          layout={layout}
          clickable={clickable}
          ref={ref}
          {...props}
        >
          {children}
        </Item>
      </WithLink>
    </WithTooltip>
  )
}

function withTooltipRef(
  {
    layout = 'vertical',
    children,
    clickable,
    tooltip = '',
    ...props
  }: SidebarItemProps,
  ref: Ref<any>
) {
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

function withLinkRef(
  {
    layout = 'vertical',
    children,
    clickable,
    href = '',
    ...props
  }: SidebarItemProps,
  ref: Ref<any>
) {
  if (!href) return <> {children}</>

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      <Item
        layout={layout}
        clickable={clickable}
        ref={ref}
        {...props}
      >
        {children}
      </Item>
    </a>
  )
}

function ItemRef(
  {
    layout = 'vertical',
    children,
    clickable = false,
    ...props
  }: SidebarItemProps,
  ref: Ref<any>
) {
  const isHorizontal = layout === 'horizontal'

  return (
    <Flex
      grow={0}
      justify="center"
      alignItems="center"
      width={isHorizontal ? '32' : ''}
      height={32}
      _hover={
        clickable && {
          backgroundColor: 'fill-one-hover',
          borderRadius: '3px',
          cursor: 'pointer',
          overflow: 'hidden',
        }
      }
      color="text"
      ref={ref}
      {...props}
    >
      {children}
    </Flex>
  )
}

const SidebarItem = forwardRef(SidebarItemRef)
const Item = forwardRef(ItemRef)
const WithTooltip = forwardRef(withTooltipRef)
const WithLink = forwardRef(withLinkRef)

export default SidebarItem
