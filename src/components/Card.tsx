import { Div, type DivProps } from 'honorable'
import { forwardRef, useMemo } from 'react'

import { styledTheme as theme } from '../theme'

import {
  type FillLevel,
  FillLevelProvider,
  isFillLevel,
  toFillLevel,
  useFillLevel,
} from './contexts/FillLevelContext'

type CornerSize = 'medium' | 'large'
type CardHue = 'default' | 'lighter' | 'lightest'

type CardProps = {
  hue?: CardHue // Deprecated, prefer fillLevel
  fillLevel?: FillLevel
  cornerSize?: CornerSize
  clickable?: boolean
  selected?: boolean
} & DivProps

const fillLevelToBGColor: Record<FillLevel, string> = {
  0: 'fill-one',
  1: 'fill-one',
  2: 'fill-two',
  3: 'fill-three',
}

const fillLevelToBorderColor: Record<FillLevel, string> = {
  0: 'border',
  1: 'border',
  2: 'border-fill-two',
  3: 'border-fill-three',
}

const fillLevelToHoverBGColor: Record<FillLevel, string> = {
  0: 'fill-one-hover',
  1: 'fill-one-hover',
  2: 'fill-two-hover',
  3: 'fill-three-hover',
}

const hueToFillLevel: Record<CardHue, FillLevel> = {
  default: 1,
  lighter: 2,
  lightest: 3,
}

const fillLevelToSelectedBGColor: Record<FillLevel, string> = {
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
    fillLevel = toFillLevel(Math.max(1, fillLevel))
  } else {
    fillLevel = hueToFillLevel[hue]
  }

  const ret = useMemo(
    () =>
      isFillLevel(fillLevel) ? fillLevel : toFillLevel(parentFillLevel + 1),
    [fillLevel, parentFillLevel]
  )

  return ret
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      cornerSize: size = 'large',
      hue, // Deprecated, prefer fillLevel
      fillLevel,
      selected = false,
      clickable = false,
      ...props
    },
    ref
  ) => {
    fillLevel = useDecideFillLevel({ hue, fillLevel })

    return (
      <FillLevelProvider value={fillLevel}>
        <Div
          ref={ref}
          border={`1px solid ${fillLevelToBorderColor[fillLevel]}`}
          borderRadius={cornerSizeToBorderRadius[size]}
          backgroundColor={
            selected
              ? fillLevelToSelectedBGColor[fillLevel]
              : fillLevelToBGColor[fillLevel]
          }
          {...(clickable && {
            cursor: 'pointer',
          })}
          {...(clickable &&
            !selected && {
              _hover: { backgroundColor: fillLevelToHoverBGColor[fillLevel] },
            })}
          {...theme.partials.scrollBar({ fillLevel })}
          {...props}
        />
      </FillLevelProvider>
    )
  }
)

export default Card
export type { CardProps, CornerSize as CardSize, CardHue }
