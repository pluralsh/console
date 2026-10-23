import {
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { DocumentIcon } from '@pluralsh/design-system'
import { useRouter } from 'next/router'

import styled from 'styled-components'

import { brand, docsText } from '@src/theme/docsTheme'
import { useNavMenu } from '../contexts/NavDataContext'
import type { NavItem } from '../NavData'
import { getBarePathFromPath, removeTrailingSlashes } from '../utils/text'

function findArticlesIn(
  routerPathname,
  sections: NavItem[] | undefined,
  depth = 0
): NavItem[] | undefined {
  routerPathname = removeTrailingSlashes(routerPathname)
  for (const section of sections || []) {
    if (routerPathname === removeTrailingSlashes(section.href)) {
      return section.sections
    }
    const res = findArticlesIn(routerPathname, section.sections, depth + 1)

    if (res) {
      return res
    }
  }

  return undefined
}

const COLLAPSED_ROWS = 2
const ARTICLE_GAP = 8

export const ArticleList = styled.ul({
  margin: 0,
  padding: 0,
  display: 'flex',
  flexWrap: 'wrap',
  gap: ARTICLE_GAP,
  overflow: 'hidden',
})

const ExpandButton = styled.button(({ theme }) => ({
  ...docsText.label,
  marginTop: theme.spacing.small,
  padding: 0,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  '&:hover': { color: brand.ink },
}))

const ArticleChip = styled.a(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  padding: `6px ${theme.spacing.small}`,
  border: `1px solid ${brand['line-strong']}`,
  borderRadius: 4,
  background: brand.surface,
  color: brand.ink,
  fontSize: 13,
  lineHeight: 1.4,
  textDecoration: 'none',
  '.icon, svg': { color: brand.muted, flexShrink: 0 },
  '&:hover': { borderColor: brand.ink },
}))

export const Title = styled.h2(({ theme }) => ({
  ...docsText.label,
  margin: 0,
  marginBottom: theme.spacing.small,
}))

function ArticlesInSection({
  className,
  hasContent: _hasContent,
  title,
  ...props
}: {
  className?: string
  hasContent: boolean
  title?: ReactNode
}) {
  const pathname = getBarePathFromPath(useRouter().asPath)
  const navData = useNavMenu()

  const articles = useMemo(
    () =>
      findArticlesIn(pathname, navData)?.filter(
        (article) => article.href !== pathname
      ),
    [navData, pathname]
  )

  const listRef = useRef<HTMLUListElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [clip, setClip] = useState<{ height: number; firstHidden: number }>()

  useLayoutEffect(() => {
    const list = listRef.current

    if (!list) return
    const measure = () => {
      const items = Array.from(list.children) as HTMLElement[]
      const rowTops = [...new Set(items.map((item) => item.offsetTop))]

      if (rowTops.length <= COLLAPSED_ROWS) {
        setClip(undefined)

        return
      }
      const cutoffTop = rowTops[COLLAPSED_ROWS]

      setClip({
        height: cutoffTop - rowTops[0] - ARTICLE_GAP,
        firstHidden: items.findIndex((item) => item.offsetTop >= cutoffTop),
      })
    }
    const observer = new ResizeObserver(measure)

    measure()
    observer.observe(list)

    return () => observer.disconnect()
  }, [articles])

  if (!articles || articles.length <= 0) {
    return null
  }

  const collapsed = !!clip && !expanded

  return (
    <nav
      className={className}
      {...props}
    >
      {title && <Title>{title}</Title>}
      <ArticleList
        ref={listRef}
        style={collapsed ? { maxHeight: clip.height } : undefined}
      >
        {articles &&
          articles.map((article, i) => (
            <li
              key={article.href}
              style={
                collapsed && i >= clip.firstHidden
                  ? { visibility: 'hidden' }
                  : undefined
              }
            >
              <ArticleChip href={article.href}>
                {article.icon || <DocumentIcon size={14} />}
                {article.title}
              </ArticleChip>
            </li>
          ))}
      </ArticleList>
      {clip && (
        <ExpandButton
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded
            ? 'Show less'
            : `Show ${articles.length - clip.firstHidden} more`}
        </ExpandButton>
      )}
    </nav>
  )
}

export default styled(ArticlesInSection)(({ theme, hasContent }) => ({
  marginTop: theme.spacing.large,
  paddingBottom: hasContent ? theme.spacing.xlarge : 0,
  borderBottom: hasContent ? `1px solid ${brand.line}` : 'none',
  'ol, li': {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
}))
