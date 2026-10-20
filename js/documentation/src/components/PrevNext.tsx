import { useMemo } from 'react'

import NextLink from 'next/link'
import { useRouter } from 'next/router'

import styled from 'styled-components'

import { brand, docsText } from '@src/theme/docsTheme'
import routes from '../../generated/routes.json'
import { useNavMenu } from '../contexts/NavDataContext'
import type { NavItem } from '../NavData'
import { getBarePathFromPath, removeTrailingSlashes } from '../utils/text'

const routeIndex: Record<string, { relPath: string | null }> = routes

// Leaf routes without markdown (e.g. /api-reference/rest) are custom Next
// pages, so only headings that group children can lack a page.
const isPagelessHeading = (href: string, sections?: NavItem[]) =>
  !!sections?.length && routeIndex[href]?.relPath === null

// Sidebar order, depth-first, so prev/next walks the docs the way the nav reads.
function flattenNav(items: NavItem[], out: { title: string; href: string }[]) {
  for (const { title, href, sections } of items) {
    if (
      title &&
      href &&
      !href.startsWith('http') &&
      !isPagelessHeading(href, sections)
    ) {
      out.push({ title, href: removeTrailingSlashes(href) })
    }
    if (sections) flattenNav(sections, out)
  }

  return out
}

export default function PrevNext() {
  const path = removeTrailingSlashes(getBarePathFromPath(useRouter().asPath))
  const navData = useNavMenu()

  const [prev, next] = useMemo(() => {
    const flat = flattenNav(navData, []).filter(
      (item, i, arr) => arr.findIndex((x) => x.href === item.href) === i
    )
    const idx = flat.findIndex((item) => item.href === path)

    return idx < 0 ? [] : [flat[idx - 1], flat[idx + 1]]
  }, [navData, path])

  if (!prev && !next) return null

  return (
    <Wrap aria-label="Previous and next pages">
      {prev ? (
        <Card href={prev.href}>
          <span className="dir">← Previous</span>
          <span className="title">{prev.title}</span>
        </Card>
      ) : (
        <span />
      )}
      {next && (
        <Card
          href={next.href}
          className="next"
        >
          <span className="dir">Next →</span>
          <span className="title">{next.title}</span>
        </Card>
      )}
    </Wrap>
  )
}

const Wrap = styled.nav(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: theme.spacing.small,
}))

const Card = styled(NextLink)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '14px 16px',
  borderRadius: 4,
  border: `1px solid ${brand['line-strong']}`,
  background: brand.surface,
  textDecoration: 'none',
  transition: 'border-color 0.2s ease-out',
  '&.next': {
    textAlign: 'right',
  },
  '.dir': {
    ...docsText.eyebrow,
    fontSize: 11,
  },
  '.title': {
    fontFamily: theme.fontFamilies.sans,
    fontSize: 15,
    fontWeight: 500,
    color: brand.ink,
    transition: 'color 0.2s ease-out',
  },
  '&:hover': {
    borderColor: brand['accent-line'],
    '.title': { color: brand['accent-ink'] },
  },
  '&:focus-visible': {
    outline: `2px solid ${brand.accent}`,
    outlineOffset: 2,
  },
}))
