import styled, { useTheme } from 'styled-components'

import { type FillLevel } from '../components/contexts/FillLevelContext'
import Divider from '../components/Divider'
import { baseSpacing } from '../theme/spacing'

import { ItemLabel } from './ItemLabel'
import { FilledBox } from './FilledBox'
import { FlexWrap } from './FlexWrap'

export default {
  title: 'Semantic System',
  component: null,
}

const fillLevelToBGColor: Record<FillLevel, string> = {
  0: 'fill-zero',
  1: 'fill-one',
  2: 'fill-two',
  3: 'fill-three',
}

const BlockWrapper = styled.div(({ theme }) => ({
  marginBottom: theme.spacing.large,
}))

function Template() {
  return (
    <>
      <Divider
        text="Shadows"
        marginBottom="xxlarge"
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
    </>
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
  const theme = useTheme()

  return (
    <ShadowsWrap>
      {[
        'slight',
        'moderate',
        'modal',
        ...(theme.mode === 'light'
          ? ['slightPurple', 'moderatePurple', 'modalPurple']
          : []),
        'focused',
      ].map((key) => (
        <BlockWrapper key={key}>
          <ShadowedBox shadow={key} />
          <ItemLabel>{key}</ItemLabel>
        </BlockWrapper>
      ))}
    </ShadowsWrap>
  )
}

const RadiusedBox = styled(FilledBox)<{ $radius: 'medium' | 'large' }>(
  ({ theme, $radius: radius }) => ({
    borderRadius: theme.borderRadiuses[radius],
  })
)

function BoxRadiuses() {
  const radii: ('medium' | 'large')[] = ['medium', 'large']
  const theme = useTheme()

  return (
    <FlexWrap>
      {radii.map((key) => (
        <BlockWrapper key={key}>
          <RadiusedBox
            $radius={key}
            $bgColor={theme.colors['fill-three']}
          />
          <ItemLabel>{key}</ItemLabel>
        </BlockWrapper>
      ))}
    </FlexWrap>
  )
}

const BorderedBox = styled(RadiusedBox).attrs(
  () => ({ radius: 'medium' }) as any
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

const SpacingBox = styled.div<{ $space: number }>(({ theme, $space }) => ({
  borderRadius: 0,
  backgroundColor: theme.colors['action-primary'],
  margin: 0,
  paddingRight: $space,
  paddingTop: $space,
  width: 'min-content',
}))

function Spacing() {
  return (
    <>
      {Object.entries(baseSpacing).map(([key, val]) => (
        <BlockWrapper key={key}>
          <SpacingBox $space={val} />
          <ItemLabel>
            {key}: {val}px
          </ItemLabel>
        </BlockWrapper>
      ))}
    </>
  )
}

export const Miscellaneous = Template.bind({})
Miscellaneous.args = {}

export { default as Colors } from './Colors'
export { default as Typography } from './Typography'
