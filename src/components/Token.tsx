import { Ref, forwardRef } from 'react'
import { Flex, FlexProps } from 'honorable'
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
      paddingVertical="xxsmall"
      paddingLeft="small"
      display="inline-flex"
      align="center"
      borderRadius="medium"
      backgroundColor="fill-one"
      border="1px solid border"
      overflow="hidden"
      {...props}
    >
      {children}
      <Flex
        padding="xsmall"
        marginHorizontal="xxsmall"
        borderRadius="medium"
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
