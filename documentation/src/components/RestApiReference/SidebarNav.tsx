/**
 * Sidebar navigation for REST API endpoints. Search + section list.
 * Uses Next.js Link for proper navigation and accessibility.
 */

import { useMemo, useState } from 'react'

import NextLink from 'next/link'

import isEmpty from 'lodash/isEmpty'
import styled from 'styled-components'

import { MethodBadge } from './MethodBadge'

import type { ApiSection, Endpoint } from '@src/lib/openapi-rest'

const Sidebar = styled.aside(({ theme: _theme }) => ({
  position: 'sticky',
  top: 'var(--top-nav-height)',
  height: 'calc(100vh - var(--top-nav-height))',
  width: 300,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}))

const SidebarInner = styled.div(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  overflowY: 'auto',
  backgroundColor: theme.colors['fill-one'],
  borderRight: theme.borders.default,
  paddingBottom: theme.spacing.xlarge,
}))

const SearchWrapper = styled.div(({ theme }) => ({
  padding: `${theme.spacing.medium}px ${theme.spacing.medium}px`,
  position: 'sticky',
  top: 0,
  backgroundColor: theme.colors['fill-one'],
  zIndex: 1,
}))

const SearchInput = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  background: theme.colors['fill-two'] ?? theme.colors['fill-zero'],
  border: theme.borders.default,
  borderRadius: theme.borderRadiuses.medium,
  padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
  '&:focus-within': {
    borderColor: theme.colors['border-primary'],
  },
  '.icon': {
    color: theme.colors['text-xlight'],
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: theme.colors.text,
    ...theme.partials.text.body2,
    '::placeholder': { color: theme.colors['text-xlight'] },
  },
}))

const SectionGroup = styled.div(({ theme }) => ({
  display: 'block',
  margin: 0,
  padding: 0,
  ':not(:first-child)': {
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
  color: theme.colors['text-light'],
}))

const EndpointRowLink = styled(NextLink)<{ $active: boolean }>(
  ({ theme, $active }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.small,
    width: '100%',
    padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    textDecoration: 'none',
    color: 'inherit',
    borderStartStartRadius: theme.borderRadiuses.medium,
    borderEndStartRadius: theme.borderRadiuses.medium,
    borderStartEndRadius: 0,
    borderEndEndRadius: 0,
    backgroundColor: $active ? theme.colors['action-primary'] : 'transparent',
    '&:hover': {
      backgroundColor: $active
        ? theme.colors['action-primary-hover']
        : theme.colors['fill-one-hover'],
      [`& ${EndpointLabel}`]: {
        color: theme.colors.text,
      },
    },
  })
)

function SearchIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="7"
        cy="7"
        r="5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M10.5 10.5 14 14"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export const AUTH_PAGE_ID = '__authentication__'

const TopNavItemLink = styled(NextLink)<{ $active: boolean }>(
  ({ theme, $active }) => ({
    ...theme.partials.text.body1Bold,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.small,
    width: '100%',
    padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    textDecoration: 'none',
    borderStartStartRadius: theme.borderRadiuses.medium,
    borderEndStartRadius: theme.borderRadiuses.medium,
    borderStartEndRadius: 0,
    borderEndEndRadius: 0,
    backgroundColor: $active ? theme.colors['action-primary'] : 'transparent',
    color: $active ? theme.colors.text : theme.colors['text-light'],
    '&:hover': {
      backgroundColor: $active
        ? theme.colors['action-primary-hover']
        : theme.colors['fill-one-hover'],
      color: theme.colors.text,
    },
  })
)

const TopNavDivider = styled.hr(({ theme }) => ({
  border: 'none',
  borderTop: theme.borders.default,
  margin: `${theme.spacing.small}px ${theme.spacing.medium}px`,
}))

export function SidebarNav({
  sections,
  selectedId,
}: {
  sections: ApiSection[]
  selectedId: string
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
    <Sidebar>
      <SidebarInner>
        <SearchWrapper>
          <SearchInput>
            <span
              className="icon"
              aria-hidden
            >
              <SearchIcon />
            </span>
            <input
              type="search"
              placeholder="Filter API"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter API endpoints"
            />
          </SearchInput>
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
