import styled, { useTheme } from 'styled-components'

import { Banner, Callout, Card, InlineCode } from '..'
import type { Meta, StoryObj } from '@storybook/react'

const Link = styled.a(({ theme }) => ({
  ...theme.partials.text.inlineLink,
}))

const Text = styled.p(({ theme }) => ({
  margin: 0,
  ...theme.partials.text.body2LooseLineHeight,
}))

const Heading = styled.h2(({ theme }) => ({
  ...theme.partials.text.subtitle2,
  margin: 0,
  marginBottom: theme.spacing.xxsmall,
}))

const meta = {
  title: 'Inline Code',
  component: InlineCode,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

const kitchenSink = (
  <InlineCode>
    ABCDEFGHIJKLMNOPQRSTUVWXYZ ,.;?!&quot;&quot;&quot;&apos;&apos;
    abcdefghijklmnopqrstuvwxyz 0123456789 / * + () {'{}'}
  </InlineCode>
)

const dummyText = (
  <>
    Here&apos;s some text in which we&apos;d like to see some{' '}
    <InlineCode>inline code</InlineCode>, some{' '}
    <InlineCode>
      inline code with some{' '}
      <Link
        href="#"
        style={{ display: 'inline' }}
      >
        link text
      </Link>{' '}
      in it
    </InlineCode>
    , a{' '}
    <Link
      href="#"
      style={{ display: 'inline' }}
    >
      <InlineCode>code block fully wrapped in a link</InlineCode>
    </Link>
    , and let&apos;s see how the ends look with ascenders/descenders:{' '}
    <InlineCode>p1p</InlineCode>
    <InlineCode>g0g</InlineCode>
    <InlineCode>l2l</InlineCode>
    <InlineCode>131</InlineCode>
    <InlineCode>y3y</InlineCode>
    <InlineCode>q4q</InlineCode>
    <InlineCode>/regex/</InlineCode>
    <InlineCode>brew install stew</InlineCode>
    <InlineCode>Plural.console.warn(&apos;stuff&apos;)</InlineCode>. That is
    all.
  </>
)

function Template() {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: theme.spacing.large,
      }}
    >
      <div>
        <Heading>In text.body2LooseLineHeight:</Heading>
        <Text>
          {dummyText} {kitchenSink}
        </Text>
      </div>
      <div>
        <Heading>In marketingText.body1:</Heading>
        <p css={{ margin: 0, ...theme.partials.marketingText.body1 }}>
          {dummyText}
        </p>
      </div>
      <div>
        <Heading>In marketing body2:</Heading>
        <p css={{ margin: 0, ...theme.partials.marketingText.body2 }}>
          {dummyText}
        </p>
      </div>
      <div>
        <Card
          css={{ padding: theme.spacing.medium }}
          title="In a card (fill-one)"
        >
          <Heading>In a card (fill-one, body2LooseLineHeight):</Heading>
          <Text>{dummyText}</Text>
        </Card>
      </div>
      <div>
        <Callout title="In a callout (fill-two)">{dummyText}</Callout>
      </div>
      <div>
        <Callout
          title="In a callout (fill-three)"
          fillLevel={3}
        >
          {dummyText}
        </Callout>
      </div>
      <div>
        <Banner heading="In a banner">{dummyText}</Banner>
      </div>
    </div>
  )
}

export const Default: Story = {
  render: Template,
  args: {},
}
