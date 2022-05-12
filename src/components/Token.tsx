import { Ref, forwardRef } from 'react'
import { Flex, FlexProps, P } from 'honorable'
import PropTypes from 'prop-types'

import CloseIcon from './icons/CloseIcon'

type TokenProps = FlexProps & {
  onClose?: () => void
}

const propTypes = {
  onClose: PropTypes.func,
}

function TokenRef({ children, onClose = () => {}, ...props }: TokenProps, ref: Ref<any>) {
  return (
    <Flex
      ref={ref}
      pl={0.5}
      display="inline-flex"
      minHeight={28}
      borderRadius={4}
      backgroundColor="background-middle"
      overflow="hidden"
      {...props}
    >
      <P
        body2
        xflex="x4"
      >
        {children}
      </P>
      <Flex
        px={0.5}
        ml={0.5}
        align="center"
        justify="center"
        cursor="pointer"
        hoverIndicator="background-top"
        onClick={onClose}
      >
        <CloseIcon size={8} />
      </Flex>
    </Flex>
  )
}

const Token = forwardRef(TokenRef)

Token.propTypes = propTypes

export default Token
