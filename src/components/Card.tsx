import { Div, DivProps } from 'honorable'
import { forwardRef } from 'react'

type CardSize = 'medium' | 'large' | string
type CardHue = 'default' | 'lighter' | 'lightest' | string

type CardProps = {
  hue?: CardHue
  cornerSize?: CardSize
  clickable?: boolean
  selected?: boolean
} & DivProps

const hueToBGColor: { [key in CardHue]: string } = {
  default: 'fill-one',
  lighter: 'fill-two',
  lightest: 'fill-three',
}

const hueToBorderColor: {
  [key in CardHue]: string
} = {
  default: 'border',
  lighter: 'border-fill-two',
  lightest: 'border-input',
}

const hueToHoverBGColor: {
  [key in CardHue]: string
} = {
  default: 'fill-one-hover',
  lighter: 'fill-two-hover',
  lightest: 'fill-three',
}

const hueToSelectedBGColor: {
  [key in CardHue]: string
} = {
  default: 'fill-one-selected',
  lighter: 'fill-two-selected',
  lightest: 'fill-three',
}

const cornerSizeToBorderRadius: {
  [key in CardSize]: string
} = {
  medium: 'medium',
  large: 'large',
}

const Card = forwardRef<HTMLDivElement, CardProps>(({
  cornerSize: size = 'large', hue = 'default', selected = false, clickable = false, ...props
}, ref) => (
  <Div
    ref={ref}
    border={`1px solid ${hueToBorderColor[hue]}`}
    borderRadius={cornerSizeToBorderRadius[size]}
    backgroundColor={selected ? hueToSelectedBGColor[hue] : hueToBGColor[hue]}
    {...(clickable && {
      cursor: 'pointer',
    })}
    {...(clickable && !selected && {
      _hover: { backgroundColor: hueToHoverBGColor[hue] },
    })}
    {...props}
  />
))

export default Card
export { CardProps, CardSize, CardHue }
