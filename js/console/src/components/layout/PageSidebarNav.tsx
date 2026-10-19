import {
  getBarePathFromPath,
  removeTrailingSlashes,
} from '@pluralsh/design-system'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Link, useLocation } from 'react-router-dom'
import styled from 'styled-components'

import { Directory } from './SideNavEntries'

const SKELETON_COUNT = 6

// Full-bleed nav list for a PageSidebarSC. The active row is accented on the
// sidebar's own right border rather than drawing a nested nav column.
export function PageSidebarNav({
  directory,
  pathPrefix = '',
  loading = false,
}: {
  directory: Directory
  pathPrefix?: string
  loading?: boolean
}) {
  const { pathname } = useLocation()
  const currentPath = removeTrailingSlashes(getBarePathFromPath(pathname)) || ''

  if (loading)
    return (
      <NavSC>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <SkeletonRowSC key={i}>
            <RectangleSkeleton
              $height="small"
              $width={`${80 - (i % 3) * 15}%`}
            />
          </SkeletonRowSC>
        ))}
      </NavSC>
    )

  return (
    <NavSC>
      {directory.map((entry) => {
        if (!entry || entry.enabled === false) return null
        const fullPath = pathPrefix
          ? `${pathPrefix}/${removeTrailingSlashes(entry.path) || ''}`
          : entry.path
        const active =
          currentPath === fullPath || currentPath.startsWith(`${fullPath}/`)

        return (
          <NavItemSC
            key={fullPath}
            to={fullPath}
            $active={active}
            aria-current={active ? 'page' : undefined}
          >
            {entry.label}
          </NavItemSC>
        )
      })}
    </NavSC>
  )
}

const NavSC = styled.nav(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: `${theme.spacing.xsmall}px 0`,
}))

const SkeletonRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  height: 36,
  padding: `0 ${theme.spacing.medium}px`,
}))

const NavItemSC = styled(Link)<{ $active: boolean }>(({ theme, $active }) => ({
  ...theme.partials.text.body2,
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
  height: 36,
  padding: `0 ${theme.spacing.medium}px`,
  textDecoration: 'none',
  color: $active ? theme.colors.text : theme.colors['text-light'],
  backgroundColor: $active ? theme.colors['fill-zero-selected'] : undefined,
  boxShadow: $active
    ? `inset -2px 0 0 ${theme.colors['border-primary']}`
    : undefined,
  ...($active && { fontWeight: 600 }),
  '&:hover': {
    color: theme.colors.text,
    backgroundColor: $active
      ? theme.colors['fill-zero-selected']
      : theme.colors['fill-zero-hover'],
  },
  '&:focus-visible': {
    outline: theme.borders['outline-focused'],
    outlineOffset: -1,
  },
}))
