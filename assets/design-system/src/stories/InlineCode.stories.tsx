import { A, P } from 'honorable'
import styled, { useTheme } from 'styled-components'

import { Banner, Callout, Card, InlineCode } from '..'

export default {
  title: 'Inline Code',
  component: InlineCode,
}

const FlexWrap = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.large,
}))

const kitchenSink = (
  <InlineCode>
    ABCDEFGHIJKLMNOPQRSTUVWXYZ ,.;?!“”"'’ abcdefghijklmnopqrstuvwxyz 0123456789
    / * + () {'{}'}
  </InlineCode>
)

const dummyText = (
  <>
    Here's some text in which we'd like to see some{' '}
    <InlineCode>inline code</InlineCode>, some{' '}
    <InlineCode>
      inline code with some{' '}
      <A
        inline
        display="inline"
        href="#"
      >
        link text
      </A>{' '}
      in it
    </InlineCode>
    , a{' '}
    <A
      inline
      display="inline"
      href="#"
    >
      <InlineCode>code block fully wrapped in a link</InlineCode>
    </A>
    , and let's see how the ends look with ascenders/descenders:{' '}
    <InlineCode>p1p</InlineCode>
    <InlineCode>g0g</InlineCode>
    <InlineCode>l2l</InlineCode>
    <InlineCode>131</InlineCode>
    <InlineCode>y3y</InlineCode>
    <InlineCode>q4q</InlineCode>
    <InlineCode>/regex/</InlineCode>
    <InlineCode>brew install stew</InlineCode>
    <InlineCode>Plural.console.warn('stuff')</InlineCode>. That is all.
  </>
)

const MyH = styled.h2(({ theme }) => ({
  ...theme.partials.text.subtitle2,
  margin: 0,
  marginBottom: theme.spacing.xxsmall,
}))

function Template() {
  const theme = useTheme()

  return (
    <FlexWrap>
      <div>
        <MyH>In text.body2LooseLineHeight:</MyH>
        <P body2LooseLineHeight>
          {dummyText} {kitchenSink}
        </P>
      </div>
      <div>
        <MyH>In marketingText.body1:</MyH>
        <P {...(theme.partials.marketingText.body1 as any)}>{dummyText}</P>
      </div>
      <div>
        <MyH>In marketing body2:</MyH>
        <P {...(theme.partials.marketingText.body2 as any)}>{dummyText}</P>
      </div>
      <div>
        <Card
          hue="default"
          padding={theme.spacing.medium}
          title="In a card (fill-one)"
        >
          <MyH>In a card (fill-one, body2LooseLineHeight):</MyH>
          <P body2LooseLineHeight>{dummyText}</P>
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
    </FlexWrap>
  )
}

export const Default = Template.bind({})
Default.args = {}
