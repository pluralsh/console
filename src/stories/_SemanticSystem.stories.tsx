import styled, { useTheme } from 'styled-components'

import { type FillLevel } from '../components/contexts/FillLevelContext'
import { type styledTheme } from '..'
import Divider from '../components/Divider'

const fillLevelToBGColor: Record<FillLevel, string> = {
  0: 'fill-zero',
  1: 'fill-one',
  2: 'fill-two',
  3: 'fill-three',
}

export default {
  title: 'Semantic System',
  component: null,
}

const ItemLabel = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  marginTop: theme.spacing.xxsmall,
}))

const BlockWrapper = styled.div(({ theme }) => ({
  marginBottom: theme.spacing.large,
}))

const FilledBox = styled.div(({ theme }) => ({
  width: '64px',
  height: '64px',
  backgroundColor: theme.colors['fill-one'],
}))

function Template({ exampleText }: { exampleText?: string }) {
  return (
    <>
      <Divider
        text="Colors"
        marginVertical="xxlarge"
      />
      <Colors />
      <Divider
        text="Shadows"
        marginVertical="xxlarge"
      />
      <Shadows />
      <Divider
        text="Borders"
        marginVertical="xxlarge"
      />
      <BoxBorders />
      <Divider
        text="Scrollbars"
        marginVertical="xxlarge"
      />
      <Scrollbars />
      <Divider
        text="Border radiuses"
        marginVertical="xxlarge"
      />
      <BoxRadiuses />
      <Divider
        text="Spacing"
        marginVertical="xxlarge"
      />
      <Spacing />
      <Divider
        text="Typography"
        marginVertical="xxlarge"
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

const ColorBox = styled(FilledBox)<{ color: string }>(({ theme, color }) => ({
  boxShadow: theme.boxShadows.moderate,
  backgroundColor: (theme.colors as any)[color],
}))

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ColorBoxWrap = styled.div((_p) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '64px',
}))

const FlexWrap = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.large,
}))

function Colors() {
  const theme = useTheme()

  const colors = { ...theme.colors }

  delete colors.blue
  delete colors.grey
  delete colors.green
  delete colors.yellow
  delete colors.red

  return (
    <FlexWrap>
      {Object.entries(colors).map(([key]) => (
        <ColorBoxWrap key={key}>
          <ColorBox color={`${key}`} />
          <ItemLabel>{key}</ItemLabel>
        </ColorBoxWrap>
      ))}
    </FlexWrap>
  )
}

const ShadowedBox = styled(FilledBox)<{ shadow: string }>(
  ({ theme, shadow }) => ({ boxShadow: (theme.boxShadows as any)[shadow] })
)

const ShadowsWrap = styled(FlexWrap)(({ theme }) => ({
  backgroundColor: theme.colors['fill-three'],
  padding: theme.spacing.large,
}))

function Shadows() {
  return (
    <ShadowsWrap>
      {['slight', 'moderate', 'modal', 'focused'].map((key) => (
        <BlockWrapper key={key}>
          <ShadowedBox shadow={key} />
          <ItemLabel>{key}</ItemLabel>
        </BlockWrapper>
      ))}
    </ShadowsWrap>
  )
}

const RadiusedBox = styled(FilledBox)<{ radius: 'medium' | 'large' }>(
  ({ theme, radius }) => ({
    borderRadius: theme.borderRadiuses[radius],
  })
)

function BoxRadiuses() {
  const radii: ('medium' | 'large')[] = ['medium', 'large']

  return (
    <FlexWrap>
      {radii.map((key) => (
        <BlockWrapper key={key}>
          <RadiusedBox radius={key} />
          <ItemLabel>{key}</ItemLabel>
        </BlockWrapper>
      ))}
    </FlexWrap>
  )
}

const BorderedBox = styled(RadiusedBox).attrs(
  () => ({ radius: 'medium' } as any)
)<{
  border?: string
}>(({ theme, border }) => ({ border: (theme.borders as any)[border] }))

function BoxBorders() {
  const { borders } = useTheme()

  return (
    <FlexWrap>
      {Object.keys(borders).map((key) => (
        <BlockWrapper key={key}>
          <BorderedBox border={key} />
          <ItemLabel>{key}</ItemLabel>
        </BlockWrapper>
      ))}
    </FlexWrap>
  )
}

const ScrollbarBox = styled(FilledBox)<{
  fillLevel?: FillLevel
}>(({ theme, fillLevel }) => ({
  ...theme.partials.scrollBar({ fillLevel }),
  ...theme.partials.text.caption,
  backgroundColor: (theme.colors as any)[fillLevelToBGColor[fillLevel]],
  width: '100%',
  height: 'auto',
  padding: theme.spacing.medium,
  maxWidth: '300px',
  overflow: 'auto',
  '&.horizontal .inner': {
    width: '600px',
  },
  '&.vertical': {
    maxHeight: '100px',
  },
  '&.both': {
    maxHeight: '100px',
    '.inner': {
      width: '600px',
    },
  },
}))

function Scrollbars() {
  const fillLevels: FillLevel[] = [0, 1, 2, 3]
  const exampleText =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'

  return (
    <>
      <FlexWrap>
        {fillLevels.map((fillLevel) => (
          <BlockWrapper key={fillLevel}>
            <ScrollbarBox
              className="vertical"
              fillLevel={fillLevel}
            >
              <div className="inner">{exampleText}</div>
            </ScrollbarBox>
            <ItemLabel>vertical - fillLevel={fillLevel}</ItemLabel>
          </BlockWrapper>
        ))}
      </FlexWrap>
      <FlexWrap>
        {fillLevels.map((fillLevel) => (
          <BlockWrapper key={fillLevel}>
            <ScrollbarBox
              className="horizontal"
              fillLevel={fillLevel}
            >
              <div className="inner">{exampleText}</div>
            </ScrollbarBox>
            <ItemLabel>horizontal - fillLevel={fillLevel}</ItemLabel>
          </BlockWrapper>
        ))}
      </FlexWrap>
      <FlexWrap>
        {fillLevels.map((fillLevel) => (
          <BlockWrapper key={fillLevel}>
            <ScrollbarBox
              className="both"
              fillLevel={fillLevel}
            >
              <div className="inner">{exampleText}</div>
            </ScrollbarBox>
            <ItemLabel>vertical + horizontal - fillLevel={fillLevel}</ItemLabel>
          </BlockWrapper>
        ))}
      </FlexWrap>
    </>
  )
}

const SpacingBox = styled.div<{ space: string }>(({ theme, space }) => ({
  borderRadius: 0,
  backgroundColor: theme.colors['action-primary'],
  margin: 0,
  paddingRight: (theme.spacing as any)[space],
  paddingTop: (theme.spacing as any)[space],
  width: 'min-content',
}))

function Spacing() {
  return (
    <>
      {[
        'xxxsmall',
        'xxsmall',
        'xsmall',
        'small',
        'medium',
        'large',
        'xlarge',
        'xxlarge',
        'xxxlarge',
        'xxxxlarge',
        'xxxxxlarge',
      ].map((key) => (
        <BlockWrapper key={key}>
          <SpacingBox space={key} />
          <ItemLabel>{key}</ItemLabel>
        </BlockWrapper>
      ))}
    </>
  )
}

const SemanticText = styled.div<{
  typeStyle?: keyof typeof styledTheme.partials.text
}>(({ theme, typeStyle }) => ({
  ...theme.partials.text[typeStyle],
  marginBottom: theme.spacing.large,
}))

function Typography({
  exampleText: txt = 'Lorem ipsum dolor sit amet',
}: {
  exampleText: string
}) {
  return (
    <>
      <SemanticText typeStyle="h1">H1 - {txt}</SemanticText>
      <SemanticText typeStyle="h2">H2 - {txt}</SemanticText>
      <SemanticText typeStyle="h3">H3 - {txt}</SemanticText>
      <SemanticText typeStyle="h4">H4 - {txt}</SemanticText>
      <SemanticText typeStyle="title1">Title 1 - {txt}</SemanticText>
      <SemanticText typeStyle="title2">Title 2 - {txt}</SemanticText>
      <SemanticText typeStyle="subtitle1">Subtitle 1 - {txt}</SemanticText>
      <SemanticText typeStyle="subtitle2">Subtitle 2 - {txt}</SemanticText>
      <SemanticText typeStyle="body1Bold">Body 1 (Bold) - {txt}</SemanticText>
      <SemanticText typeStyle="body1">Body 1 - {txt}</SemanticText>
      <SemanticText typeStyle="body2Bold">Body 2 (Bold) - {txt}</SemanticText>
      <SemanticText typeStyle="body2">Body 2 - {txt}</SemanticText>
      <SemanticText typeStyle="body2LooseLineHeight">
        Body 2 Loose Line Height - {txt}
      </SemanticText>
      <SemanticText typeStyle="caption">Caption - {txt}</SemanticText>
      <SemanticText typeStyle="badgeLabel">Badge Label - {txt}</SemanticText>
      <SemanticText typeStyle="buttonLarge">Large Button - {txt}</SemanticText>
      <SemanticText typeStyle="buttonSmall">Small Button - {txt}</SemanticText>
      <SemanticText typeStyle="overline">Overline - {txt}</SemanticText>
      <SemanticText typeStyle="code">Code - {txt}</SemanticText>
    </>
  )
}

const MktgText = styled.div<{
  typeStyle?: keyof typeof styledTheme.partials.marketingText
}>(({ theme, typeStyle }) => ({
  ...theme.partials.marketingText[typeStyle],
  display: 'block',
  marginBottom: theme.spacing.large,
}))

const MarketingInlineLink = styled.a(({ theme }) => ({
  ...theme.partials.marketingText.inlineLink,
}))

function MarketingTypography({
  exampleText: txt = 'Lorem ipsum dolor sit amet',
}: {
  exampleText: string
}) {
  return (
    <>
      <MktgText typeStyle="bigHeader">
        Big Header (
        <MarketingInlineLink href="#">Inline link</MarketingInlineLink>) - {txt}
      </MktgText>
      <MktgText typeStyle="hero1">
        Hero 1 (<MarketingInlineLink href="#">Inline link</MarketingInlineLink>)
        - {txt}
      </MktgText>
      <MktgText typeStyle="hero2">
        Hero 2 (<MarketingInlineLink href="#">Inline link</MarketingInlineLink>)
        - {txt}
      </MktgText>
      <MktgText typeStyle="title1">
        Title 1 (<MarketingInlineLink href="#">Inline link</MarketingInlineLink>
        ) - {txt}
      </MktgText>
      <MktgText typeStyle="title2">
        Title 2 (<MarketingInlineLink href="#">Inline link</MarketingInlineLink>
        ) - {txt}
      </MktgText>
      <MktgText typeStyle="subtitle1">
        Subtitle 1 (
        <MarketingInlineLink href="#">Inline link</MarketingInlineLink>) - {txt}
      </MktgText>
      <MktgText typeStyle="subtitle2">
        Subtitle 2 (
        <MarketingInlineLink href="#">Inline link</MarketingInlineLink>) - {txt}
      </MktgText>
      <MktgText typeStyle="body1Bold">
        Body 1 (Bold) (
        <MarketingInlineLink href="#">Inline link</MarketingInlineLink>) - {txt}
      </MktgText>
      <MktgText typeStyle="body1">
        Body 1 (<MarketingInlineLink href="#">Inline link</MarketingInlineLink>)
        - {txt}
      </MktgText>
      <MktgText typeStyle="body2Bold">
        Body 2 (Bold) (
        <MarketingInlineLink href="#">Inline link</MarketingInlineLink>) - {txt}
      </MktgText>
      <MktgText typeStyle="body2">
        Body 2 (<MarketingInlineLink href="#">Inline link</MarketingInlineLink>)
        - {txt}
      </MktgText>
      <MktgText typeStyle="standaloneLink">Standalone link - {txt}</MktgText>
      <MktgText typeStyle="componentText">
        Component text (
        <MarketingInlineLink href="#">Inline link</MarketingInlineLink>) - {txt}
      </MktgText>
      <MktgText typeStyle="componentLink">Component link - {txt}</MktgText>
      <MktgText typeStyle="componentLinkSmall">
        Small component link - {txt}
      </MktgText>
      <MktgText typeStyle="label">
        Label (<MarketingInlineLink href="#">Inline link</MarketingInlineLink>)
        - {txt}
      </MktgText>
      <MktgText typeStyle="navLink">Nav link - {txt}</MktgText>
    </>
  )
}

export const SemanticSystem = Template.bind({})
SemanticSystem.args = {
  exampleText: 'Lorem ipsum dolor sit amet',
}
