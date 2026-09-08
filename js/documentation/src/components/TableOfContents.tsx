import { useCallback, useEffect, useId, useMemo, useState } from 'react'

import { usePrevious } from '@pluralsh/design-system'
import NextLink from 'next/link'
import { useRouter } from 'next/router'

import styled from 'styled-components'

import { exists } from '../utils/typescript'

import type { MarkdocHeading } from '../../pages/_app'

const Title = styled.h2(({ theme }) => ({
  ...theme.partials.marketingText.label,
  marginTop: theme.spacing.large,
  marginBottom: theme.spacing.medium,
  '&::after': {
    // Use to align baseline with Hero 2 text
    ...theme.partials.marketingText.hero2,
    display: 'inline',
    verticalAlign: 'baseline',
    content: '"​"',
    width: '0',
    overflow: 'hidden',
    position: 'relative',
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
    borderLeft: theme.borders.default,
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
    ...theme.partials.marketingText.componentLinkSmall,
    color: theme.colors['text-xlight'],
    textDecoration: 'none',
    margin: 0,
    paddingLeft: theme.spacing.medium,
    paddingTop: theme.spacing.xxsmall,
    paddingBottom: theme.spacing.xxsmall,
    paddingRight: theme.spacing.small,
    '&::before': {
      zIndex: 1,
      borderLeft: `3px solid ${theme.colors['border-primary']}`,
      transform: 'scaleX(0)',
      transformOrigin: 'center left',
      transition: 'transform 0.15s ease-in',
    },
    ...($active
      ? {
          color: theme.colors.text,
          '&::before ': {
            zIndex: 1,
            borderLeft: `3px solid ${theme.colors['border-primary']}`,
            transform: 'scaleX(1)',
            transition: 'transform 0.2s ease-out',
          },
        }
      : {}),
    '&:hover': {
      textDecoration: 'underline',
      color: theme.colors.text,
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
  maxHeight: '-webkit-fill-available',
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
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: '100%',
}))
