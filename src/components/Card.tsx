import { Div, DivProps } from 'honorable'
import { forwardRef, useMemo } from 'react'

import { styledTheme as theme } from '../theme'

import {
  FillLevel,
  FillLevelProvider,
  isFillLevel,
  toFillLevel,
  useFillLevel,
} from './contexts/FillLevelContext'

type CardSize = 'medium' | 'large' | string
type CardHue = 'default' | 'lighter' | 'lightest' | string

type CardProps = {
  hue?: CardHue
  cornerSize?: CardSize
  clickable?: boolean
  selected?: boolean
} & DivProps

const fillLevelToBGColor: { [key in CardHue]: string } = {
  0: 'fill-one',
  1: 'fill-one',
  2: 'fill-two',
  3: 'fill-three',
}

const fillLevelToBorderColor: {
  [key in CardHue]: string
} = {
  0: 'border',
  1: 'border',
  2: 'border-fill-two',
  3: 'border-fill-three',
}

const fillLevelToHoverBGColor: {
  [key in CardHue]: string
} = {
  0: 'fill-one-hover',
  1: 'fill-one-hover',
  2: 'fill-two-hover',
  3: 'fill-three-hover',
}

const hueToFillLevel: { [key in CardHue]: FillLevel } = {
  default: 1,
  lighter: 2,
  lightest: 3,
}

const fillLevelToSelectedBGColor: {
  [key in CardHue]: string
} = {
  0: 'fill-one-selected',
  1: 'fill-one-selected',
  2: 'fill-two-selected',
  3: 'fill-three-selected',
}

const cornerSizeToBorderRadius: {
  [key in CardSize]: string
} = {
  medium: 'medium',
  large: 'large',
}

const fillLevelToScroll: {
  [key in CardHue]: Record<string, any>
} = {
  0: theme.partials.scrollBar({ hue: 'default' }),
  1: theme.partials.scrollBar({ hue: 'default' }),
  2: theme.partials.scrollBar({ hue: 'lighter' }),
  3: theme.partials.scrollBar({ hue: 'lighter' }),
}

function useDecideFillLevel(hue: CardHue | null | undefined) {
  const fillLevel = hueToFillLevel[hue]
  const parentFillLevel = useFillLevel()

  const ret = useMemo(() => (isFillLevel(fillLevel) ? fillLevel : toFillLevel(parentFillLevel + 1)),
    [fillLevel, parentFillLevel])

  return ret
}

const Card = forwardRef<HTMLDivElement, CardProps>(({
  cornerSize: size = 'large',
  hue,
  selected = false,
  clickable = false,
  ...props
},
ref) => {
  const fillLevel = useDecideFillLevel(hue)

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
        {...(clickable
            && !selected && {
          _hover: { backgroundColor: fillLevelToHoverBGColor[fillLevel] },
        })}
        {...fillLevelToScroll[fillLevel]}
        {...props}
      />
    </FillLevelProvider>
  )
})

export default Card
export { CardProps, CardSize, CardHue }
