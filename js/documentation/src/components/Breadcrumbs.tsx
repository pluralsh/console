import { Fragment, useMemo } from 'react'

import NextLink from 'next/link'
import { useRouter } from 'next/router'

import styled from 'styled-components'

import { brand, docsText } from '@src/theme/docsTheme'
import { useNavMenu } from '../contexts/NavDataContext'
import type { NavItem } from '../NavData'
import { getBarePathFromPath, removeTrailingSlashes } from '../utils/text'

function findCrumbs(path, sections: NavItem[]) {
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

export default function Breadcrumbs() {
  const { asPath } = useRouter()

  const path = getBarePathFromPath(asPath)
  const navData = useNavMenu()

  const crumbs = useMemo(
    () => [{ label: 'Docs', url: '/' }, ...findCrumbs(path, navData)],
    [navData, path]
  )

  if (crumbs.length <= 1) {
    return null
  }

  return <BreadcrumbTrail crumbs={crumbs} />
}

export function BreadcrumbTrail({
  crumbs,
}: {
  crumbs: { label?: string; url?: string }[]
}) {
  return (
    <CrumbsNav aria-label="Breadcrumb">
      <ol>
        {crumbs.map(({ label, url }, i) => {
          const isLast = i === crumbs.length - 1

          return (
            <Fragment key={`${url}-${label}`}>
              <li>
                {isLast || !url ? (
                  <span aria-current={isLast ? 'page' : undefined}>
                    {label}
                  </span>
                ) : (
                  <NextLink href={url}>{label}</NextLink>
                )}
              </li>
              {!isLast && (
                <li
                  aria-hidden
                  className="sep"
                >
                  /
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
    </CrumbsNav>
  )
}

const CrumbsNav = styled.nav((_) => ({
  ...docsText.eyebrow,
  ol: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  'a, a:any-link': {
    color: brand.muted,
    textDecoration: 'none',
    transition: 'color 0.2s ease-out',
  },
  'a:any-link:hover': { color: brand['accent-ink'] },
  '[aria-current="page"]': {
    color: brand.ink,
  },
  '.sep': {
    color: brand.subtle,
  },
}))
