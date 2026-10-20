import { useCallback, useEffect, useId, useMemo, useState } from 'react'

import { usePrevious } from '@pluralsh/design-system'
import NextLink from 'next/link'
import { useRouter } from 'next/router'

import styled from 'styled-components'

import { brand, docsText } from '@src/theme/docsTheme'
import type { MarkdocHeading } from '../../pages/_app'
import { exists } from '../utils/typescript'

const Title = styled.h2(({ theme }) => ({
  ...docsText.label,
  marginTop: 36,
  marginBottom: theme.spacing.small,
  '&::after': {
    // Align baseline with Hero 2 without expanding the title box (Safari).
    ...theme.partials.marketingText.hero2,
    display: 'inline-block',
    verticalAlign: 'baseline',
    content: '"\\200b"',
    width: 0,
    height: 0,
    overflow: 'hidden',
    lineHeight: 0,
    fontSize: 0,
  },
}))

const List = styled.ul(({ theme }) => ({
  position: 'relative',
  margin: 0,
  padding: 0,
  listStyle: 'none',
  marginBottom: theme.spacing.medium,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '100%',
    borderLeft: `2px solid ${brand.line}`,
  },
}))

const ListItem = styled.li(() => ({
  margin: 0,
  padding: 0,
  listStyle: 'none',
}))

const StyledLink = styled(NextLink as any)<{ $active: boolean }>(
  ({ theme, $active }) => ({
    position: 'relative',
    display: 'block',
    fontFamily: theme.fontFamilies.sans,
    fontSize: 13,
    lineHeight: 1.45,
    letterSpacing: '0.01em',
    color: brand.muted,
    '&&:any-link': {
      color: brand.muted,
    },
    textDecoration: 'none',
    margin: 0,
    paddingLeft: 12,
    paddingTop: 4,
    paddingBottom: 4,
    paddingRight: theme.spacing.small,
    transition: 'color 0.2s ease-out',
    '&::before': {
      zIndex: 1,
      borderLeft: `2px solid ${brand.accent}`,
      transform: 'scaleX(0)',
      transformOrigin: 'center left',
      transition: 'transform 0.15s ease-in',
    },
    ...($active
      ? {
          color: brand['accent-ink'],
          '&&:any-link': {
            color: brand['accent-ink'],
          },
          '&::before ': {
            zIndex: 1,
            borderLeft: `2px solid ${brand.accent}`,
            transform: 'scaleX(1)',
            transition: 'transform 0.2s ease-out',
          },
        }
      : {}),
    '&:hover, &&:any-link:hover': {
      color: brand.ink,
    },
    '&::before, &::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      right: 0,
    },
    '&:focus, &:focus-visible': {
      boxShadow: 'none',
    },
    '&:focus-visible::after': {
      ...theme.partials.focus.insetAbsolute,
      zIndex: 1,
    },
  })
)

export const ScrollContainer = styled.div(({ theme: _ }) => ({
  overflowY: 'auto',
  minHeight: 0,
  maxHeight: 'calc(100vh - var(--top-nav-height) - 72px)',
}))

const scrollThreshold = 48

export function TableOfContents({
  toc = [],
  ...props
}: {
  toc?: MarkdocHeading[]
}) {
  const items = useMemo(
    () =>
      toc.filter((item) => (item.id && item.level === 1) || item.level === 2),
    [toc]
  )
  const labelId = `nav-label-${useId()}`
  const [isLoaded, setIsLoaded] = useState(false)

  const hashIsInToC = useCallback(
    (hash: string) =>
      !!items.find((item) => `#${item.id}` === hash) || hash === '',
    [items]
  )

  const [headingElements, setHeadingElements] = useState<
    { id: string; top: number }[]
  >([])
  const router = useRouter()

  const { hash } =
    (typeof window !== 'undefined' && window?.location) ||
    new URL(`http://plural.sh${router.asPath}`)
  const previousHash = usePrevious(hash)

  const [highlightedHash, _setHighlightedHash] = useState(
    hashIsInToC(hash) ? hash : ''
  )
  const setHighlightedHash = useCallback(
    (hash) => {
      if (hashIsInToC(hash)) {
        _setHighlightedHash(hash)
      }
    },
    [hashIsInToC, _setHighlightedHash]
  )

  useEffect(() => {
    if (hash !== previousHash && hashIsInToC(hash)) setHighlightedHash(hash)
  }, [hash, hashIsInToC, previousHash, setHighlightedHash])

  const scrollListener = useCallback(() => {
    let scrollToHash = ''
    const offset = headingElements[0]?.top || 0 // accounts for starting in the middle of the page

    headingElements.forEach((elt) => {
      if (elt.top - offset <= scrollThreshold + window.scrollY)
        scrollToHash = `#${elt.id}`
    })

    setHighlightedHash(scrollToHash)
  }, [headingElements, setHighlightedHash])

  // watches document for DOM size changes to account for dynamically rendered chunks (applies to larger pages)
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const [numRendered, numExpected] = [
        headingElements.length,
        items.filter((item) => item.id).length,
      ]

      if (numRendered < numExpected)
        setHeadingElements(getRenderedElementTops(items))
      else {
        observer.disconnect()
        scrollListener() // re-run to update the highlighted hash after dynamic scrolling
        setIsLoaded(true)
      }
    })

    // observe the entire document for changes
    observer.observe(document.body)

    return () => {
      observer.disconnect()
    }
  }, [headingElements, headingElements.length, items, scrollListener])

  useEffect(() => {
    window.addEventListener('scroll', scrollListener)

    return () => window.removeEventListener('scroll', scrollListener)
  }, [scrollListener])

  if (items.length <= 0) {
    return null
  }

  return (
    <WrapperNavSC
      aria-labelledby={labelId}
      {...props}
    >
      <Title id={labelId}>On this page</Title>
      <ScrollContainer>
        <List>
          {items.map((item, i) => {
            const href = `#${item.id}`

            const active =
              isLoaded &&
              (highlightedHash === href || (!highlightedHash && i === 0))

            return (
              <ListItem key={item.title}>
                <StyledLink
                  href={href}
                  $active={active}
                  scroll={false}
                >
                  {item.title}
                </StyledLink>
              </ListItem>
            )
          })}
        </List>
      </ScrollContainer>
    </WrapperNavSC>
  )
}

const getRenderedElementTops = (items: MarkdocHeading[]) =>
  typeof window !== 'undefined'
    ? items
        .map((item) => (!item.id ? null : document.getElementById(item.id)))
        .filter(exists)
        .map((elt) => ({
          id: elt.id,
          top: elt.getBoundingClientRect().top || Infinity,
        }))
    : []

const WrapperNavSC = styled.nav(({ theme: _ }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  minHeight: 0,
}))
