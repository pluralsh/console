import styled from 'styled-components'

import Divider from '../components/Divider'

import { type styledTheme } from '..'

const SemanticText = styled.div<{
  $typeStyle?: keyof typeof styledTheme.partials.text
}>(({ theme, $typeStyle: typeStyle }) => ({
  ...theme.partials.text[typeStyle],
  marginBottom: theme.spacing.large,
}))

export function Typography({
  exampleText: txt = 'Lorem ipsum dolor sit amet',
}: {
  exampleText: string
}) {
  return (
    <>
      <SemanticText $typeStyle="h1">H1 - {txt}</SemanticText>
      <SemanticText $typeStyle="h2">H2 - {txt}</SemanticText>
      <SemanticText $typeStyle="h3">H3 - {txt}</SemanticText>
      <SemanticText $typeStyle="h4">H4 - {txt}</SemanticText>
      <SemanticText $typeStyle="title1">Title 1 - {txt}</SemanticText>
      <SemanticText $typeStyle="title2">Title 2 - {txt}</SemanticText>
      <SemanticText $typeStyle="subtitle1">Subtitle 1 - {txt}</SemanticText>
      <SemanticText $typeStyle="subtitle2">Subtitle 2 - {txt}</SemanticText>
      <SemanticText $typeStyle="body1Bold">Body 1 (Bold) - {txt}</SemanticText>
      <SemanticText $typeStyle="body1">Body 1 - {txt}</SemanticText>
      <SemanticText $typeStyle="body2Bold">Body 2 (Bold) - {txt}</SemanticText>
      <SemanticText $typeStyle="body2">Body 2 - {txt}</SemanticText>
      <SemanticText $typeStyle="body2LooseLineHeight">
        Body 2 Loose Line Height - {txt}
      </SemanticText>
      <SemanticText $typeStyle="caption">Caption - {txt}</SemanticText>
      <SemanticText $typeStyle="badgeLabel">Badge Label - {txt}</SemanticText>
      <SemanticText $typeStyle="buttonLarge">Large Button - {txt}</SemanticText>
      <SemanticText $typeStyle="buttonSmall">Small Button - {txt}</SemanticText>
      <SemanticText $typeStyle="overline">Overline - {txt}</SemanticText>
      <SemanticText $typeStyle="code">Code - {txt}</SemanticText>
    </>
  )
}
const MktgText = styled.div<{
  $typeStyle?: keyof typeof styledTheme.partials.marketingText
}>(({ theme, $typeStyle: typeStyle }) => ({
  ...theme.partials.marketingText[typeStyle],
  display: 'block',
  marginBottom: theme.spacing.large,
}))
const MarketingInlineLink = styled.a(({ theme }) => ({
  ...theme.partials.marketingText.inlineLink,
}))

export function MarketingTypography({
  exampleText: txt = 'Lorem ipsum dolor sit amet',
}: {
  exampleText: string
}) {
  return (
    <>
      <MktgText $typeStyle="bigHeader">
        Big Header (
        <MarketingInlineLink href="#">Inline link</MarketingInlineLink>) - {txt}
      </MktgText>
      <MktgText $typeStyle="hero1">
        Hero 1 (<MarketingInlineLink href="#">Inline link</MarketingInlineLink>)
        - {txt}
      </MktgText>
      <MktgText $typeStyle="hero2">
        Hero 2 (<MarketingInlineLink href="#">Inline link</MarketingInlineLink>)
        - {txt}
      </MktgText>
      <MktgText $typeStyle="title1">
        Title 1 (<MarketingInlineLink href="#">Inline link</MarketingInlineLink>
        ) - {txt}
      </MktgText>
      <MktgText $typeStyle="title2">
        Title 2 (<MarketingInlineLink href="#">Inline link</MarketingInlineLink>
        ) - {txt}
      </MktgText>
      <MktgText $typeStyle="subtitle1">
        Subtitle 1 (
        <MarketingInlineLink href="#">Inline link</MarketingInlineLink>) - {txt}
      </MktgText>
      <MktgText $typeStyle="subtitle2">
        Subtitle 2 (
        <MarketingInlineLink href="#">Inline link</MarketingInlineLink>) - {txt}
      </MktgText>
      <MktgText $typeStyle="body1Bold">
        Body 1 (Bold) (
        <MarketingInlineLink href="#">Inline link</MarketingInlineLink>) - {txt}
      </MktgText>
      <MktgText $typeStyle="body1">
        Body 1 (<MarketingInlineLink href="#">Inline link</MarketingInlineLink>)
        - {txt}
      </MktgText>
      <MktgText $typeStyle="body2Bold">
        Body 2 (Bold) (
        <MarketingInlineLink href="#">Inline link</MarketingInlineLink>) - {txt}
      </MktgText>
      <MktgText $typeStyle="body2">
        Body 2 (<MarketingInlineLink href="#">Inline link</MarketingInlineLink>)
        - {txt}
      </MktgText>
      <MktgText $typeStyle="standaloneLink">Standalone link - {txt}</MktgText>
      <MktgText $typeStyle="componentText">
        Component text (
        <MarketingInlineLink href="#">Inline link</MarketingInlineLink>) - {txt}
      </MktgText>
      <MktgText $typeStyle="componentLink">Component link - {txt}</MktgText>
      <MktgText $typeStyle="componentLinkSmall">
        Small component link - {txt}
      </MktgText>
      <MktgText $typeStyle="label">
        Label (<MarketingInlineLink href="#">Inline link</MarketingInlineLink>)
        - {txt}
      </MktgText>
      <MktgText $typeStyle="navLink">Nav link - {txt}</MktgText>
    </>
  )
}

function Template({ exampleText }: { exampleText?: string }) {
  return (
    <>
      <Divider
        text="Typography"
        marginBottom="xxlarge"
      />
      <Typography exampleText={exampleText} />
      <Divider
        text="Marketing Typography"
        marginVertical="xxlarge"
      />
      <MarketingTypography exampleText={exampleText} />
    </>
  )
}

const Exp = Template.bind({})

export default Exp
Exp.args = {
  exampleText: 'Lorem ipsum dolor sit amet',
}
