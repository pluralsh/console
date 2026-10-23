/**
 * Sidebar navigation for REST API endpoints. Search + section list.
 * Uses Next.js Link for proper navigation and accessibility.
 */

import { useMemo, useState } from 'react'

import { Input, SearchIcon } from '@pluralsh/design-system'
import NextLink from 'next/link'

import isEmpty from 'lodash/isEmpty'
import styled from 'styled-components'

import type { ApiSection, Endpoint } from '@src/lib/openapi-rest'
import { brand } from '@src/theme/docsTheme'
import { MethodBadge } from './MethodBadge'

const Sidebar = styled.aside<{ $overlay?: boolean }>(({ $overlay }) => ({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  width: '100%',
  ...($overlay
    ? {
        flex: 1,
        minHeight: 0,
        position: 'relative',
      }
    : {
        position: 'sticky',
        top: 'var(--top-nav-height)',
        height: 'calc(100vh - var(--top-nav-height))',
        flexShrink: 0,
      }),
}))

const SidebarInner = styled.div<{ $overlay?: boolean }>(
  ({ theme, $overlay }) => ({
    overflowY: 'auto',
    backgroundColor: brand['surface-sidebar'],
    borderRight: $overlay ? 'none' : `1px solid ${brand.line}`,
    paddingBottom: theme.spacing.xlarge,
    paddingLeft: theme.spacing.medium,
    paddingRight: theme.spacing.medium,
    ...($overlay
      ? {
          flex: 1,
          minHeight: 0,
          position: 'relative',
        }
      : {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }),
  })
)

const SearchWrapper = styled.div(({ theme }) => ({
  padding: `${theme.spacing.medium} 0`,
  position: 'sticky',
  top: 0,
  backgroundColor: brand['surface-sidebar'],
  zIndex: 1,
}))

const FilterInput = styled(Input)({
  width: '100%',
})

const SectionGroup = styled.div(({ theme }) => ({
  display: 'block',
  margin: 0,
  padding: 0,
  '&:not(:first-child)': {
    marginTop: theme.spacing.large,
  },
}))

const SectionHeader = styled.h6(({ theme }) => ({
  margin: 0,
  paddingLeft: theme.spacing.medium,
  paddingTop: theme.spacing.xsmall,
  paddingBottom: theme.spacing.xsmall,
  ...theme.partials.marketingText.label,
}))

const EndpointLabel = styled.span(({ theme }) => ({
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  ...theme.partials.text.body2,
  color: theme.colors['text-xlight'],
}))

const EndpointRowLink = styled(NextLink)<{ $active: boolean }>(
  ({ theme, $active }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.small,
    width: '100%',
    padding: `${theme.spacing.xsmall} ${theme.spacing.medium}`,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    textDecoration: 'none',
    color: 'inherit',
    borderRadius: theme.borderRadiuses.medium,
    backgroundColor: $active ? brand['accent-tint'] : 'transparent',
    ...($active && {
      [`& ${EndpointLabel}`]: { color: brand['accent-ink'], fontWeight: 500 },
    }),
    '&:hover': {
      backgroundColor: $active ? brand['accent-tint'] : brand['surface-hover'],
      [`& ${EndpointLabel}`]: {
        color: $active ? brand['accent-ink'] : brand.ink,
      },
    },
  })
)

export const AUTH_PAGE_ID = '__authentication__'

const TopNavItemLink = styled(NextLink)<{ $active: boolean }>(
  ({ theme, $active }) => ({
    fontFamily: theme.fontFamilies.sans,
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.45,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.small,
    width: '100%',
    padding: `${theme.spacing.small} ${theme.spacing.medium}`,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    textDecoration: 'none',
    borderRadius: theme.borderRadiuses.medium,
    backgroundColor: $active ? brand['accent-tint'] : 'transparent',
    color: $active ? brand['accent-ink'] : brand.ink,
    '&:hover': {
      backgroundColor: $active ? brand['accent-tint'] : brand['surface-hover'],
    },
  })
)

const TopNavDivider = styled.hr(({ theme }) => ({
  border: 'none',
  borderTop: theme.borders.default,
  margin: `${theme.spacing.small} ${theme.spacing.medium}`,
}))

export function SidebarNav({
  sections,
  selectedId,
  overlay = false,
}: {
  sections: ApiSection[]
  selectedId: string
  overlay?: boolean
}) {
  const [filter, setFilter] = useState('')

  const filteredSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          endpoints: section.endpoints.filter((ep: Endpoint) => {
            const q = filter.toLowerCase()

            return (
              !q ||
              ep.path.toLowerCase().includes(q) ||
              (ep.name || '').toLowerCase().includes(q) ||
              ep.method.toLowerCase().includes(q)
            )
          }),
        }))
        .filter((s) => !isEmpty(s.endpoints)),
    [sections, filter]
  )

  const showAuthItem = !filter

  return (
    <Sidebar $overlay={overlay}>
      <SidebarInner $overlay={overlay}>
        <SearchWrapper>
          <FilterInput
            placeholder="Filter API"
            startIcon={<SearchIcon />}
            value={filter}
            onChange={(e) => setFilter(e.currentTarget.value)}
            inputProps={{ 'aria-label': 'Filter API endpoints' }}
          />
        </SearchWrapper>
        <nav aria-label="REST API endpoints">
          {showAuthItem && (
            <>
              <TopNavItemLink
                href="/api-reference/rest/authentication"
                $active={selectedId === AUTH_PAGE_ID}
              >
                Authentication
              </TopNavItemLink>
              <TopNavDivider />
            </>
          )}
          {filteredSections.map((section) => (
            <SectionGroup key={section.title}>
              <SectionHeader>{section.title}</SectionHeader>
              {section.endpoints.map((ep) => (
                <EndpointRowLink
                  key={ep.id}
                  href={`/api-reference/rest/${ep.id}`}
                  $active={ep.id === selectedId}
                >
                  <EndpointLabel>{ep.name || ep.path}</EndpointLabel>
                  <MethodBadge method={ep.method} />
                </EndpointRowLink>
              ))}
            </SectionGroup>
          ))}
        </nav>
      </SidebarInner>
    </Sidebar>
  )
}
