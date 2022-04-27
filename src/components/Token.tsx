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
      px={0.5}
      xflex="x4"
      display="inline-flex"
      minHeight={28}
      borderRadius={4}
      backgroundColor="background-light"
      {...props}
    >
      <P size="small">
        {children}
      </P>
      <Span
        p={0.5}
        ml={0.5}
        mr={-0.333}
        xflex="x5"
        borderRadius={1000}
        cursor="pointer"
        hoverIndicator="background-contrast"
        onClick={onClose}
      >
        <CloseIcon size={8} />
      </Span>
    </Div>
  )
}

Token.propTypes = propTypes

export default Token
