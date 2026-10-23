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
import { WorkbenchMock } from '@src/components/WorkbenchMock'
import { brand, docsText } from '@src/theme/docsTheme'
import { brandTokens } from '@src/theme/palette'

const { Heading: MarkdocHeading } = markdocComponents

const HERO_FILL = [
  'url(/images/landing/hero-lines.svg) center / cover no-repeat',
  'linear-gradient(95deg, #1e2749 0%, #1f2f4a 40%, #224443 100%)',
].join(', ')

// The hero art is a dark product shot, so like the marketing site's product
// mocks it stays dark in both color modes.
const Hero = styled.div(({ theme }) => ({
  position: 'relative',
  background: HERO_FILL,
  borderRadius: theme.borderRadiuses.large,
  border: `1px solid ${brand.line}`,
  overflow: 'hidden',
  // Hero stays dark in both modes; selection must stay light-on-dark.
  '& ::selection': {
    background: brandTokens.dark['accent-tint'],
    color: brandTokens.dark.ink,
  },
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
    padding: `${theme.spacing.xlarge} ${theme.spacing.large} `,
    p: {
      ...theme.partials.marketingText.body1,
      color: brandTokens.dark.body,
      margin: 0,
    },
  },
  '.shot': {
    display: 'none',
  },
  [mqs.md]: {
    display: 'flex',
    minHeight: 320,
    '& > *': { flexShrink: 0 },
    h1: {
      ...docsText.pageTitle,
      color: brandTokens.dark.ink,
    },
    '.content': {
      maxWidth: '46%',
      textWrap: 'balance',
    },
    // The mock renders at a fixed size and is scaled down; it sits in the
    // right half and bleeds off the right and bottom edges.
    '.shot': {
      display: 'block',
      position: 'absolute',
      top: 64,
      left: '48%',
      zIndex: 0,
      transform: 'scale(0.62)',
      transformOrigin: 'top left',
      borderTopLeftRadius: 16,
      overflow: 'hidden',
      boxShadow:
        '0 0 0 1px rgb(255 255 255 / 0.12), 0 30px 80px rgb(8 10 40 / 0.6)',
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
        <div className="shot">
          <WorkbenchMock />
        </div>
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
