import chroma from 'chroma-js'
import { Div, type DivProps } from 'honorable'
import { forwardRef } from 'react'
import { type DefaultTheme, useTheme } from 'styled-components'
import { memoize } from 'lodash-es'

import { type SeverityExt, sanitizeSeverity } from '../types'

import {
  type FillLevel,
  FillLevelProvider,
  isFillLevel,
  toFillLevel,
  useFillLevel,
} from './contexts/FillLevelContext'

const HUES = ['default', 'lighter', 'lightest'] as const

const CARD_SEVERITIES = [
  'info',
  'success',
  'warning',
  'danger',
  'critical',
  'neutral',
] as const satisfies Readonly<SeverityExt[]>

type CornerSize = 'medium' | 'large'
type CardFillLevel = Exclude<FillLevel, 0>
type CardHue = (typeof HUES)[number]
type CardSeverity = Extract<SeverityExt, (typeof CARD_SEVERITIES)[number]>

type BaseCardProps = {
  hue?: CardHue // Deprecated, prefer fillLevel
  fillLevel?: FillLevel
  cornerSize?: CornerSize
  clickable?: boolean
  selected?: boolean
  severity?: SeverityExt
}

type CardProps = DivProps & BaseCardProps

const fillToNeutralBgC = {
  0: 'fill-one',
  1: 'fill-one',
  2: 'fill-two',
  3: 'fill-three',
} as const satisfies Record<FillLevel, keyof DefaultTheme['colors']>

const fillToNeutralBorderC = {
  0: 'border',
  1: 'border',
  2: 'border-fill-two',
  3: 'border-fill-three',
} as const satisfies Record<FillLevel, keyof DefaultTheme['colors']>

const fillToNeutralHoverBgC = {
  0: 'fill-one-hover',
  1: 'fill-one-hover',
  2: 'fill-two-hover',
  3: 'fill-three-hover',
} as const satisfies Record<FillLevel, keyof DefaultTheme['colors']>

const hueToFill = {
  default: 1,
  lighter: 2,
  lightest: 3,
} as const satisfies Record<CardHue, CardFillLevel>

const fillToNeutralSelectedBgC: Record<
  FillLevel,
  keyof DefaultTheme['colors']
> = {
  0: 'fill-one-selected',
  1: 'fill-one-selected',
  2: 'fill-two-selected',
  3: 'fill-three-selected',
}

const cornerSizeToBorderRadius: Record<CornerSize, string> = {
  medium: 'medium',
  large: 'large',
}

function useDecideFillLevel({
  hue,
  fillLevel,
}: {
  hue?: CardHue
  fillLevel?: number
}) {
  const parentFillLevel = useFillLevel()

  if (isFillLevel(fillLevel)) {
    return toFillLevel(Math.max(1, fillLevel)) as CardFillLevel
  }

  return isFillLevel(hueToFill[hue])
    ? hueToFill[hue]
    : (toFillLevel(parentFillLevel + 1) as CardFillLevel)
}

const getFillToLightBgC = memoize(
  (
    theme: DefaultTheme
  ): Record<CardSeverity, Record<CardFillLevel, string>> => ({
    neutral: {
      1: theme.colors[fillToNeutralBgC[1]],
      2: theme.colors[fillToNeutralBgC[2]],
      3: theme.colors[fillToNeutralBgC[3]],
    },
    info: {
      1: `${chroma(theme.colors.semanticBlue).alpha(0.1)}`,
      2: `${chroma(theme.colors.semanticBlue).alpha(0.05)}`,
      3: `${chroma(theme.colors.semanticBlue).alpha(0.2)}`,
    },
    success: {
      1: `${chroma(theme.colors.semanticGreen).alpha(0.1)}`,
      2: `${chroma(theme.colors.semanticGreen).alpha(0.05)}`,
      3: `${chroma(theme.colors.semanticGreen).alpha(0.2)}`,
    },
    warning: {
      1: `${chroma(theme.colors.semanticYellow).alpha(0.1)}`,
      2: `${chroma(theme.colors.semanticYellow).alpha(0.05)}`,
      3: `${chroma(theme.colors.semanticYellow).alpha(0.2)}`,
    },
    danger: {
      1: `${chroma(theme.colors.semanticRedLight).alpha(0.1)}`,
      2: `${chroma(theme.colors.semanticRedLight).alpha(0.05)}`,
      3: `${chroma(theme.colors.semanticRedLight).alpha(0.2)}`,
    },
    critical: {
      1: `${chroma(theme.colors.semanticRedDark).alpha(0.1)}`,
      2: `${chroma(theme.colors.semanticRedDark).alpha(0.05)}`,
      3: `${chroma(theme.colors.semanticRedDark).alpha(0.2)}`,
    },
  })
)

const getLightModeBorderMapper = memoize(
  (theme: DefaultTheme): Record<Exclude<CardSeverity, 'neutral'>, string> => ({
    info: theme.colors['border-info'],
    success: theme.colors['border-success'],
    warning: theme.colors['border-warning'],
    danger: theme.colors['border-danger-light'],
    critical: theme.colors['border-danger'],
  })
)

const getBorderColor = ({
  theme,
  fillLevel,
  severity = 'neutral',
}: {
  theme: DefaultTheme
  fillLevel: CardFillLevel
  severity?: CardSeverity
}) => {
  const fillLevelToLightBorderColor = getLightModeBorderMapper(theme)

  if (theme.mode === 'dark' || severity === 'neutral') {
    return theme.colors[fillToNeutralBorderC[fillLevel]]
  }

  return fillLevelToLightBorderColor[severity]
}

const getBgColor = ({
  theme,
  fillLevel,
  severity = 'neutral',
}: {
  theme: DefaultTheme
  fillLevel: CardFillLevel
  severity?: CardSeverity
}) => {
  const fillToLightBgC = getFillToLightBgC(theme)

  if (theme.mode === 'dark') {
    return theme.colors[fillToNeutralBgC[fillLevel]]
  }

  return fillToLightBgC[severity][fillLevel]
}

const Card = forwardRef(
  (
    {
      cornerSize: size = 'large',
      hue, // Deprecated, prefer fillLevel
      severity = 'neutral',
      fillLevel,
      selected = false,
      clickable = false,
      ...props
    }: CardProps,
    ref
  ) => {
    fillLevel = useDecideFillLevel({ hue, fillLevel })
    const theme = useTheme()
    const cardSeverity = sanitizeSeverity(severity, {
      allowList: CARD_SEVERITIES,
      default: 'neutral',
    })

    return (
      <FillLevelProvider value={fillLevel}>
        <Div
          ref={ref}
          {...theme.partials.reset.button}
          cursor="unset"
          border={`1px solid ${getBorderColor({
            theme,
            fillLevel,
            severity: cardSeverity,
          })}`}
          borderRadius={cornerSizeToBorderRadius[size]}
          backgroundColor={
            selected
              ? fillToNeutralSelectedBgC[fillLevel]
              : getBgColor({ theme, fillLevel, severity: cardSeverity })
          }
          {...{
            '&:focus, &:focus-visible': {
              outline: 'none',
            },
            '&:focus-visible': {
              borderColor: theme.colors['border-outline-focused'],
            },
          }}
          {...(clickable && {
            cursor: 'pointer',
            as: 'button',
          })}
          {...(clickable &&
            !selected &&
            severity === 'neutral' && {
              _hover: { backgroundColor: fillToNeutralHoverBgC[fillLevel] },
            })}
          {...theme.partials.scrollBar({ fillLevel })}
          {...props}
        />
      </FillLevelProvider>
    )
  }
)

export default Card
export type { BaseCardProps, CardProps, CornerSize as CardSize, CardHue }
