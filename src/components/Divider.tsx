import { Ref, forwardRef } from 'react'
import { Div, Flex, FlexProps, P } from 'honorable'
import PropTypes from 'prop-types'

type AlertProps = FlexProps & {
  text?: string
}

const propTypes = {
  text: PropTypes.string,
}

function DividerRef({ text = 'or', ...props }: AlertProps, ref: Ref<any>) {
  return (
    <Flex
      ref={ref}
      align="center"
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
    </Flex>
  )
}

const Divider = forwardRef(DividerRef)

Divider.propTypes = propTypes

export default Divider
