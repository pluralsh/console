import { useState } from 'react'

import { DiscordIcon } from '@pluralsh/design-system'
import NextLink from 'next/link'
import { useRouter } from 'next/router'

import { useKey } from 'rooks'
import styled from 'styled-components'

import { DISCORD_LINK } from '@src/consts'
import { brand, docsText } from '@src/theme/docsTheme'
import { getBarePathFromPath } from '@src/utils/text'
import { BreakpointIsGreaterOrEqual, mqs, useBreakpoint } from './Breakpoints'
import { DocsSearch } from './DocsSearch'
import GithubStars from './GithubStars'
import { Logo } from './Logo'
import MobileMenu from './MobileMenu'
import {
  HamburgerButton,
  HeaderButton,
  SocialLink,
  ThemeToggle,
} from './PageHeaderButtons'

function PageHeaderUnstyled({ ...props }) {
  const [menuIsOpen, setMenuIsOpen] = useState(false)
  const { asPath } = useRouter()
  const thisPath = getBarePathFromPath(asPath)
  const [prevPath, setPrevPath] = useState(thisPath)

  const breakpoint = useBreakpoint()

  if (menuIsOpen && BreakpointIsGreaterOrEqual(breakpoint, 'fullHeader')) {
    setMenuIsOpen(false)
  }

  if (thisPath !== prevPath) {
    setPrevPath(thisPath)
    setMenuIsOpen(false)
  }

  useKey(['Escape'], () => {
    setMenuIsOpen(false)
  })

  return (
    <header {...props}>
      <div className="leftSection">
        <NextLink
          href="/"
          className="brand"
          aria-label="Plural docs home"
        >
          <Logo aria-hidden />
          <span className="docsLabel">docs</span>
        </NextLink>
        <DocsSearch />
      </div>
      <nav
        className="rightSection"
        aria-label="Site"
      >
        <div className="links">
          <MainLink href="https://www.plural.sh/community">Community</MainLink>
          <MainLink
            href={DISCORD_LINK}
            target="_blank"
            rel="noopener noreferrer"
          >
            Discord
          </MainLink>
        </div>
        <div className="socialIcons">
          <SocialLink
            className="discordIcon"
            href={DISCORD_LINK}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Plural on Discord"
          >
            <DiscordIcon size={16} />
          </SocialLink>
          <GithubStars />
        </div>
        <ThemeToggle />
        <div className="buttons">
          <HeaderButton href="https://app.plural.sh/login">
            Sign in
          </HeaderButton>
          <HeaderButton
            $variant="primary"
            href="https://www.plural.sh/contact-sales"
          >
            Get started
          </HeaderButton>
        </div>
        <HamburgerButton
          isOpen={menuIsOpen}
          onClick={() => {
            setMenuIsOpen(!menuIsOpen)
          }}
        />
      </nav>
      <MobileMenu
        isOpen={menuIsOpen}
        setIsOpen={setMenuIsOpen}
      />
    </header>
  )
}

const PageHeader = styled(PageHeaderUnstyled)(({ theme }) => ({
  top: 0,
  position: 'sticky',
  height: 'var(--top-nav-height)',
  width: '100%',
  zIndex: '100',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.medium,
  padding: '0 clamp(16px, 3vw, 28px)',
  borderBottom: `1px solid ${brand.line}`,
  background: `color-mix(in srgb, ${brand.canvas} 88%, transparent)`,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  '.brand': {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
    textDecoration: 'none',
    color: brand.ink,
  },
  '.docsLabel': {
    ...docsText.eyebrow,
    position: 'relative',
    top: 1,
  },
  '.leftSection': {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.large,
    minWidth: 0,
  },
  '.rightSection': {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xsmall,
  },
  '.links': {
    display: 'none',
    [mqs.threeColumn]: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.xxsmall,
      marginRight: theme.spacing.xsmall,
    },
  },
  '.socialIcons': {
    display: 'none',
    [mqs.maxWidth]: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.xsmall,
    },
  },
  '.buttons': {
    display: 'none',
    gap: theme.spacing.xsmall,
    marginLeft: theme.spacing.xxsmall,
    [mqs.fullHeader]: {
      display: 'flex',
      alignItems: 'center',
    },
  },
}))

export const MainLink = styled.a(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  fontFamily: theme.fontFamilies.sans,
  fontSize: 14,
  lineHeight: 1.4,
  letterSpacing: '0.01em',
  borderRadius: 2,
  padding: '8px 10px',
  transition: 'color 0.2s ease-out, background-color 0.2s ease-out',
  '&, &:any-link': {
    color: brand.ink,
    textDecoration: 'none',
  },
  '&:hover': {
    background: brand['surface-hover'],
  },
}))

export { PageHeader }
