import { useMemo } from 'react'

import NextLink from 'next/link'
import { useRouter } from 'next/router'
import styled from 'styled-components'

import { useNavMenu } from '../contexts/NavDataContext'
import { getBarePathFromPath, removeTrailingSlashes } from '../utils/text'

import type { NavItem } from '../NavData'

export type DocsBreadcrumb = {
  label: string
  url?: string
}

function findCrumbs(path, sections: NavItem[]): DocsBreadcrumb[] {
  path = removeTrailingSlashes(path)

  for (const { title: label, href: url, sections: sects } of sections) {
    if (removeTrailingSlashes(url) === path) {
      return [{ label, url }]
    }
    const tailCrumbs = findCrumbs(path, sects || [])

    if (tailCrumbs.length > 0) {
      return [{ label, url }, ...tailCrumbs]
    }
  }

  return []
}

export default function Breadcrumbs({
  breadcrumbs: breadcrumbsProp,
}: {
  breadcrumbs?: DocsBreadcrumb[]
}) {
  const { asPath } = useRouter()
  const path = getBarePathFromPath(asPath)
  const navData = useNavMenu()

  const crumbs = useMemo(
    () =>
      breadcrumbsProp ?? [
        { label: 'Docs', url: '/' },
        ...findCrumbs(path, navData),
      ],
    [breadcrumbsProp, navData, path]
  )

  if (crumbs.length === 0) {
    return null
  }

  return (
    <Nav aria-label="breadcrumbs">
      <List>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1

          return (
            <Item key={`${crumb.label}-${crumb.url ?? index}`}>
              {index > 0 && <Separator aria-hidden>/</Separator>}
              {isLast || !crumb.url ? (
                <Current aria-current="page">{crumb.label}</Current>
              ) : (
                <CrumbLink href={crumb.url}>{crumb.label}</CrumbLink>
              )}
            </Item>
          )
        })}
      </List>
    </Nav>
  )
}

const Nav = styled.nav({
  minWidth: 0,
})

const List = styled.ol(({ theme }) => ({
  ...theme.partials.reset.list,
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: theme.spacing.xsmall,
  minWidth: 0,
}))

const Item = styled.li(({ theme }) => ({
  ...theme.partials.reset.li,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  minWidth: 0,
}))

const Separator = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-input-disabled'],
  userSelect: 'none',
}))

const crumbText = ({ theme }) => ({
  ...theme.partials.text.body2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const CrumbLink = styled(NextLink)(({ theme }) => ({
  ...crumbText({ theme }),
  color: theme.colors['text-xlight'],
  textDecoration: 'none',
  '&:hover': {
    color: theme.colors.text,
  },
}))

const Current = styled.span(({ theme }) => ({
  ...crumbText({ theme }),
  color: theme.colors.text,
  fontWeight: 600,
}))
