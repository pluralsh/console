import { Div, DivProps, P } from 'honorable'
import PropTypes from 'prop-types'

type AlertProps = DivProps & {
  text?: string
}

const propTypes = {
  text: PropTypes.string,
}

function Divider({ text = 'or', ...props }: AlertProps) {
  return (
    <Div
      xflex="x4"
      {...props}
    >
      <Div
        flexGrow={1}
        height={1}
        backgroundColor="text-light"
      />
      <P
        px={0.5}
        flexShrink={0}
        color="text-light"
        size="small"
      >
        {text}
      </P>
      <Div
        flexGrow={1}
        height={1}
        backgroundColor="text-light"
      />
    </Div>
  )
}

Divider.propTypes = propTypes

export default Divider
