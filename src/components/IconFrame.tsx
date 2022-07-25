import { DivProps, Flex, Img } from 'honorable'
import PropTypes from 'prop-types'
import { Ref, forwardRef } from 'react'

type IconFrameProps = DivProps & {
  size?: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | string
  spacing?: 'none' | 'padding' | string
  hue?: 'default' | 'lighter' | 'lightest' | string
  clickable?: boolean
  url?: string
  alt?: string
}

const propTypes = {
  size: PropTypes.oneOf(['xsmall', 'small', 'medium', 'large', 'xlarge']),
  spacing: PropTypes.oneOf(['none', 'padding']),
  hue: PropTypes.oneOf(['default', 'lighter', 'lightest']),
  clickable: PropTypes.bool,
  url: PropTypes.string,
  alt: PropTypes.string,
}

const sizeToWidth: { [key in 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge']: number } = {
  xsmall: 40,
  small: 64,
  medium: 96,
  large: 140,
  xlarge: 160,
}

const sizeToIconWidth: { [key in 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge']: number } = {
  xsmall: 24,
  small: 48,
  medium: 64,
  large: 76,
  xlarge: 96,
}

const hueToColor: { [key in 'default' | 'lighter' | 'lightest']: string } = {
  default: 'fill-one',
  lighter: 'fill-two',
  lightest: 'fill-three',
}

const hueToBorderColor: { [key in 'default' | 'lighter' | 'lightest']: string } = {
  default: 'border',
  lighter: 'border-fill-two',
  lightest: 'border-input',
}

function IconFrameRef({
  size = 'medium',
  spacing = 'padding',
  hue = 'lighter',
  clickable = false,
  url,
  alt,
  onClose,
  ...props
}: IconFrameProps, ref: Ref<any>) {
  const boxSize = sizeToWidth[size]
  const iconSize = spacing === 'padding' ? sizeToIconWidth[size] : sizeToWidth[size] + 1
  const color = hueToColor[hue]
  const borderColor = hueToBorderColor[hue]

  return (
    <Flex
      backgroundColor={color}
      borderRadius="medium"
      border={spacing === 'padding' ? '1px solid border' : 'none'}
      borderColor={borderColor}
      width={boxSize}
      height={boxSize}
      minWidth={boxSize}
      minHeight={boxSize}
      align="center"
      justify="center"
      cursor={clickable ? 'pointer' : 'auto'}
      overflow="hidden"
      _hover={clickable ? { backgroundColor: borderColor } : null}
      onClick={clickable ? onClose : null}
    >
      <Img
        ref={ref}
        src={url}
        alt={alt}
        width={iconSize}
        height={iconSize}
        {...props}
      />
    </Flex>
  )
}

const IconFrame = forwardRef(IconFrameRef)

IconFrame.propTypes = propTypes

export default IconFrame
