import { Div, DivProps, P, Span } from 'honorable'
import PropTypes from 'prop-types'

import CloseIcon from './icons/CloseIcon'

type TokenProps = DivProps & {
  onClose?: () => void
}

const propTypes = {
  onClose: PropTypes.func,
}

function Token({ children, onClose = () => {}, ...props }: TokenProps) {
  return (
    <Div
      pl={0.5}
      xflex="x4s"
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
      <Span
        px={0.5}
        ml={0.5}
        xflex="x5"
        cursor="pointer"
        hoverIndicator="background-top"
        onClick={onClose}
      >
        <CloseIcon size={8} />
      </Span>
    </Div>
  )
}

Token.propTypes = propTypes

export default Token
