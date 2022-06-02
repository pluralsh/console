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
      py={0.25}
      pl={0.75}
      display="inline-flex"
      align="center"
      minHeight={36}
      borderRadius={18}
      backgroundColor="fill-one"
      overflow="hidden"
      {...props}
    >
      {children}
      <Flex
        p={0.5}
        ml={0.25}
        mr={0.25}
        borderRadius="50%"
        align="center"
        justify="center"
        cursor="pointer"
        hoverIndicator="fill-one-hover"
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
