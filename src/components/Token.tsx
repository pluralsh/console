import { Flex, FlexProps } from 'honorable'
import PropTypes from 'prop-types'
import { Ref, forwardRef } from 'react'

import CloseIcon from './icons/CloseIcon'

type TokenHue = 'default' | 'lighter' | 'lightest' | string

type TokenProps = FlexProps & {
  onClose?: () => void
  hue?: TokenHue
}

const propTypes = {
  onClose: PropTypes.func,
  hue: PropTypes.string,
}

const hueToBGColor: { [key in TokenHue]: string } = {
  default: 'fill-one',
  lighter: 'fill-two',
  lightest: 'fill-three',
}

const hueToHoverBGColor: {
  [key in TokenHue]: string
} = {
  default: 'fill-one-hover',
  lighter: 'fill-two-hover',
  lightest: 'fill-three-hover',
}

function TokenRef({
  children, hue = hueToBGColor.default, onClose = () => {}, ...props
}: TokenProps, ref: Ref<any>) {
  const background = hueToBGColor[hue]
  const hover = hueToHoverBGColor[hue]

  return (
    <Flex
      ref={ref}
      paddingVertical="xxsmall"
      paddingHorizontal="small"
      display="inline-flex"
      align="center"
      borderRadius="medium"
      backgroundColor={background}
      overflow="hidden"
      cursor="pointer"
      _hover={{ backgroundColor: hover }}
      onClick={onClose}
      {...props}
    >
      {children}
      <CloseIcon
        size={8}
        marginLeft="small"
      />
    </Flex>
  )
}

const Token = forwardRef(TokenRef)

Token.propTypes = propTypes

export default Token
