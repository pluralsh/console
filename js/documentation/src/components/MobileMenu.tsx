import { DiscordIcon } from '@pluralsh/design-system'

import styled from 'styled-components'
import { useIsomorphicLayoutEffect } from 'usehooks-ts'

import { DISCORD_LINK } from '@src/consts'

import { FullNav, type NavContextValue } from './FullNav'
import GithubStars from './GithubStars'
import useScrollLock from './hooks/useScrollLock'
import { MainLink } from './PageHeader'
import { SocialLink } from './PageHeaderButtons'
import { TopHeading } from './SideNav'

type MobileMenuProps = NavContextValue & {
  className?: string
}

const SocialIcons = styled.div(({ theme }) => ({
  display: 'flex',
  marginTop: theme.spacing.xlarge,
  gap: theme.spacing.medium,
}))

function PluralMenuContent({
  hide: _,
  ...props
}: {
  hide?: boolean
  className?: string
}) {
  return (
    <div {...props}>
      <TopHeading>Plural Menu</TopHeading>
      <MainLink href="https://plural.sh/marketplace">Marketplace</MainLink>
      <MainLink href="https://plural.sh/community">Community</MainLink>
      <MainLink href="https://app.plural.sh/signup">Get started</MainLink>
      <MainLink href="https://app.plural.sh/login">Sign in</MainLink>
      <SocialIcons>
        <SocialLink
          href={DISCORD_LINK}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={0}
        >
          <DiscordIcon size={16} />
        </SocialLink>
        <GithubStars />
      </SocialIcons>
    </div>
  )
}

export const PluralMenu = styled(PluralMenuContent)(
  ({ hide = false, theme }) => ({
    display: hide ? 'none' : 'block',
    paddingLeft: theme.spacing.xlarge,
    paddingRight: theme.spacing.xlarge,
    overflow: 'auto',
    paddingBottom: `calc(${theme.spacing.xlarge}px + var(--menu-extra-bpad))`,

    [TopHeading]: {
      paddingLeft: 0,
    },
    [MainLink]: {
      paddingLeft: 0,
      paddingRight: 0,
      paddingTop: theme.spacing.xsmall,
      paddingBottom: theme.spacing.xsmall,
      marginBottom: theme.spacing.xsmall,
      width: '100%',
    },
  })
)

const Content = styled.div(({ theme }) => ({
  pointerEvents: 'all',
  position: 'absolute',
  left: 0,
  right: 0,
  top: 'var(--top-nav-height)',
  bottom: 0,
  paddingRight: 0,
  background: theme.colors['fill-one'],
  display: 'flex',
  flexDirection: 'column',
}))

function MobileMenu({ isOpen, setIsOpen, className }: MobileMenuProps) {
  const [, setScrollLock] = useScrollLock(false)

  useIsomorphicLayoutEffect(() => {
    setScrollLock(isOpen)
  }, [isOpen, setScrollLock])

  return (
    <div className={className}>
      <Content>
        <FullNav
          desktop={false}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
        />
      </Content>
    </div>
  )
}

export default styled(MobileMenu)(({ isOpen, theme }) => ({
  '--menu-extra-bpad': '90px',
  position: 'fixed',
  top: 0,
  left: 0,
  height: '100vh',
  width: '100%',
  display: isOpen ? 'block' : 'none',
  zIndex: theme.zIndexes.modal,
  pointerEvents: 'none',
}))
