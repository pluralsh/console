import {
  type ComponentProps,
  cloneElement,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from 'react'

import {
  BookIcon,
  ClipboardChecked,
  IconFrame,
  ListIcon,
  MagicWandIcon,
  markdocComponents,
  ProtectedClusterIcon,
  ShieldLockIcon,
} from '@pluralsh/design-system'
import Link, { type LinkProps } from 'next/link'

import styled, { useTheme } from 'styled-components'

import { mqs } from '@src/components/Breakpoints'
import { brand, docsText } from '@src/theme/docsTheme'
import { brandTokens } from '@src/theme/palette'

const { Heading: MarkdocHeading } = markdocComponents

// The hero art is a dark product shot, so like the marketing site's product
// mocks it stays dark in both color modes.
const Hero = styled.div(({ theme }) => ({
  background: 'url(/images/landing/hero-bg-sm.png)',
  backgroundSize: '100% 100%',
  borderRadius: theme.borderRadiuses.large,
  border: `1px solid ${brand.line}`,
  overflow: 'hidden',
  h1: {
    margin: 0,
    marginBottom: theme.spacing.xsmall,
    color: brandTokens.dark.ink,
  },
  '.contentWrap': {
    width: '100%',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  '.content': {
    padding: `${theme.spacing.xlarge}px ${theme.spacing.large}px `,
    p: {
      ...theme.partials.marketingText.body1,
      color: brandTokens.dark.body,
      margin: 0,
    },
  },
  picture: {
    display: 'contents',
  },
  '.bgImgLg': {
    display: 'none',
  },
  [mqs.md]: {
    display: 'flex',
    '& > *': { flexShrink: 0 },
    h1: {
      ...docsText.pageTitle,
      color: brandTokens.dark.ink,
    },
    '.content': {
      maxWidth: '48.2%',
      textWrap: 'balance',
    },
    background: 'none',
    '.bgImgLg': {
      display: 'block',
      width: '100%',
      transform: 'translateX(-100%)',
      zIndex: 0,
    },
  },
}))

function CardLinkUnstyled({
  heading,
  children,
  icon,
  ...props
}: PropsWithChildren<
  LinkProps &
    Omit<ComponentProps<'a'>, 'ref'> & {
      icon: ReactElement<{ color?: string }>
      heading: ReactNode
    }
>) {
  const theme = useTheme()
  const colorIcon = cloneElement(icon, { color: theme.colors['icon-info'] })

  return (
    <Link {...props}>
      <IconFrame
        type="floating"
        size="xlarge"
        icon={colorIcon}
        className="icon"
      />
      <div className="content">
        <h3 className="heading">{heading}</h3>
        <p>{children}</p>
      </div>
    </Link>
  )
}

const CardLink = styled(CardLinkUnstyled)(({ theme }) => ({
  display: 'flex',
  columnGap: theme.spacing.large,
  padding: theme.spacing.large,
  alignItems: 'flex-start',
  backgroundColor: brand.surface,
  border: `1px solid ${brand['line-strong']}`,
  borderRadius: 4,
  textDecoration: 'none',
  transition: 'border-color 0.2s ease-out',
  '&:hover': {
    borderColor: brand['accent-line'],
    '.heading': { color: brand['accent-ink'] },
  },
  '.icon': {
    flexShrink: 0,
  },
  '.content': {
    alignSelf: 'center',
  },
  '.heading': {
    margin: 0,
    ...theme.partials.marketingText.body2Bold,
    color: brand.ink,
    transition: 'color 0.2s ease-out',
  },
  p: {
    margin: 0,
    ...theme.partials.marketingText.componentText,
    textWrap: 'pretty',
    color: brand.muted,
  },
}))

const CardLinkGrid = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
  gap: theme.spacing.large,
  marginTop: theme.spacing.large,
}))

const Heading = styled(MarkdocHeading).attrs(() => ({
  level: 2,
}))((_) => ({
  marginBottom: 0,
}))

const Body2 = styled.p(({ theme }) => ({
  ...theme.partials.marketingText.body2,
  margin: 0,
}))

const Section = styled.section((_) => ({
  height: 'auto',
}))

const SectionHeading = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  marginBottom: theme.spacing.large,
}))

function Index() {
  return (
    <>
      <Hero id={tableOfContents[0].id}>
        <div className="contentWrap">
          <div className="content">
            <MarkdocHeading level={1}>
              {tableOfContents[0].title}
            </MarkdocHeading>
            <p>
              Get Started with Plural: the agentic platform engineering toolkit.
            </p>
          </div>
        </div>
        <picture>
          <source
            type="image/avif"
            srcSet="/images/landing/docs-hero.avif"
          />
          <img
            className="bgImgLg"
            aria-hidden="true"
            alt=""
            src="/images/landing/docs-hero.png"
          />
        </picture>
      </Hero>
      <Section>
        <SectionHeading>
          <Heading
            id={tableOfContents[1].id}
            level={2}
          >
            {tableOfContents[1].title}
          </Heading>
          <Body2>Find what's most relevant to you</Body2>
        </SectionHeading>
        <CardLinkGrid>
          <CardLink
            heading="Introduction"
            icon={<BookIcon />}
            href="/overview/introduction"
          >
            Learn more about Plural before diving in
          </CardLink>
          <CardLink
            heading="Architecture"
            icon={<ProtectedClusterIcon />}
            href="/overview/architecture"
          >
            Explore Plural's underlying architecture
          </CardLink>
          <CardLink
            heading="First steps"
            icon={<MagicWandIcon />}
            href="/getting-started/first-steps"
          >
            Get started with the Plural CLI
          </CardLink>
          <CardLink
            heading="Guided walkthrough"
            icon={<ClipboardChecked />}
            href="/getting-started/how-to-use"
          >
            Learn how to get the most out of Plural
          </CardLink>
          <CardLink
            heading="Security"
            icon={<ShieldLockIcon />}
            href="/faq/security"
          >
            Plural is built with enterprise-grade security
          </CardLink>
          <CardLink
            heading="Release notes"
            icon={<ListIcon />}
            href="resources/release-notes"
          >
            Stay in the know with Plural's recent releases
          </CardLink>
        </CardLinkGrid>
      </Section>
    </>
  )
}

const tableOfContents = [
  {
    level: 2,
    id: 'documentation',
    title: 'Documentation',
  },
  {
    level: 2,
    id: 'explore-topics',
    title: 'Explore Topics',
  },
]

export async function getStaticProps() {
  return {
    props: { tableOfContents },
  }
}

export default Index
