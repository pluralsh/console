import { Flex, FlexProps } from 'honorable'
import PropTypes from 'prop-types'
import { Ref, forwardRef } from 'react'

import Tooltip from '../components/Tooltip'

type SidebarItemProps = FlexProps & {
  clickable?: boolean
  tooltip?: string
  href?: string
}

const propTypes = {
  clickable: PropTypes.bool,
  tooltip: PropTypes.string,
  href: PropTypes.string,
}

const styles = {
  ':first-of-type': {
    marginTop: 0,
  },
}

function SidebarItemRef({
  children,
  clickable = false,
  tooltip = '',
  href = '',
  ...props
}: SidebarItemProps, ref: Ref<any>) {
  return (
    <WithTooltip tooltip={tooltip}>
      <WithLink href={href}>
        <Item
          clickable={clickable}
          ref={ref}
          {...props}
        >{children}
        </Item>
      </WithLink>
    </WithTooltip>
  )
}

function withTooltipRef({
  children,
  clickable,
  tooltip = '',
  ...props
}: SidebarItemProps, ref: Ref<any>) {
  if (!tooltip) return (<> {children}</>)

  return (
    <Tooltip
      arrow
      placement="right"
      label={tooltip}
      whiteSpace="nowrap"
    >
      <Item
        clickable={clickable}
        ref={ref}
        {...props}
      >
        {children}
      </Item>
    </Tooltip>
  )
}

function withLinkRef({
  children, clickable, href = '', ...props
}: SidebarItemProps, ref: Ref<any>) {
  if (!href) return (<> {children}</>)

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      <Item
        clickable={clickable}
        ref={ref}
        {...props}
      >
        {children}
      </Item>
    </a>
  )
}

function ItemRef({ children, clickable = false, ...props }: SidebarItemProps, ref: Ref<any>) {
  return (
    <Flex
      grow={0}
      justify="center"
      alignItems="center"
      marginTop="xsmall"
      width={32}
      height={32}
      _hover={clickable && {
        backgroundColor: 'fill-one-hover',
        borderRadius: '3px',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
      color="text"
      ref={ref}
      {...styles}
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

SidebarItem.propTypes = propTypes

export default SidebarItem
