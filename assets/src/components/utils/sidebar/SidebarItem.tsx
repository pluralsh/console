import { ComponentPropsWithRef, ReactNode, use } from 'react'
import styled from 'styled-components'

import { Tooltip, WrapWithIf } from '@pluralsh/design-system'
import { SidebarContext } from 'components/layout/Sidebar'
import { Link, LinkProps } from 'react-router-dom'

type SidebarItemProps = ComponentPropsWithRef<'button'> & {
  tooltip?: ReactNode
  expandedLabel?: string
  active?: boolean
} & ({ asLink?: never } | ({ asLink: true } & LinkProps))

export function SidebarItem({
  asLink,
  tooltip,
  expandedLabel,
  active,
  children,
  ...props
}: SidebarItemProps) {
  const { isExpanded } = use(SidebarContext)
  return (
    <WrapWithIf
      condition={!!tooltip && !isExpanded}
      wrapper={
        <Tooltip
          label={tooltip}
          placement="right"
          css={{ whiteSpace: 'nowrap' }}
        />
      }
    >
      <ItemSC
        as={asLink ? Link : 'button'}
        {...props}
        $active={!!active}
        $isExpanded={isExpanded}
      >
        {children}
        {isExpanded && expandedLabel ? expandedLabel : null}
      </ItemSC>
    </WrapWithIf>
  )
}

const ItemSC = styled.button<{
  $active: boolean
  $isExpanded: boolean
}>(({ theme, $active, $isExpanded }) => ({
  ...theme.partials.reset.button,
  display: 'flex',
  alignItems: 'center',
  justifyContent: $isExpanded ? 'flex-start' : 'center',
  gap: theme.spacing.xsmall,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  width: $isExpanded ? '100%' : 40,
  height: 40,
  flexGrow: 0,
  padding: theme.spacing.small,
  borderRadius: '3px',
  overflow: 'hidden',
  color: theme.colors['icon-light'],
  background: $active
    ? theme.mode === 'light'
      ? theme.colors['fill-one-selected']
      : theme.colors['fill-zero-selected']
    : 'transparent',
  cursor: 'pointer',
  '&:hover': {
    background: !$active ? theme.colors['fill-zero-hover'] : undefined,
  },
  '&:focus-visible': {
    outline: theme.borders['outline-focused'],
  },
}))
