import { type ReactNode, useMemo } from 'react'

import { DocumentIcon } from '@pluralsh/design-system'
import { Button } from 'honorable'
import { useRouter } from 'next/router'

import styled from 'styled-components'

import { useNavMenu } from '../contexts/NavDataContext'
import { getBarePathFromPath, removeTrailingSlashes } from '../utils/text'

import type { NavItem } from '../NavData'

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

export const ArticleList = styled.ul(({ theme }) => ({
  margin: 0,
  padding: 0,
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.small,
  ...theme.partials.marketingText.label,
  marginBottom: theme.spacing.medium,
}))

export const Title = styled.h2(({ theme }) => ({
  ...theme.partials.marketingText.label,
  marginBottom: theme.spacing.medium,
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

  if (!articles || articles.length <= 0) {
    return null
  }

  return (
    <nav
      className={className}
      {...props}
    >
      {title && <Title>{title}:</Title>}
      <ArticleList>
        {articles &&
          articles.map((article) => (
            <li key={article.href}>
              <Button
                floating
                textTransform="none"
                startIcon={article.icon || <DocumentIcon />}
                as="a"
                href={article.href}
              >
                {article.title}
              </Button>
            </li>
          ))}
      </ArticleList>
    </nav>
  )
}

export default styled(ArticlesInSection)(({ theme, hasContent }) => ({
  marginTop: theme.spacing.large,
  paddingBottom: hasContent ? theme.spacing.xlarge : 0,
  borderBottom: hasContent ? theme.borders.default : 'none',
  'ol, li': {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
}))
