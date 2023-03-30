import { FlexProps, H3, P } from 'honorable'
import PropTypes from 'prop-types'
import { Ref, forwardRef } from 'react'

type FormTitleProps = FlexProps & {
  title?: string
  message?: string
}

const propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
}

function FormTitleRef(
  { title, message, ...props }: FormTitleProps,
  ref: Ref<any>
) {
  return (
    <H3
      ref={ref}
      body1
      bold
      color="text"
      {...props}
    >
      {title}
      <P
        marginTop="xxsmall"
        body2LooseLineHeight
        color="text-light"
      >
        {message}
      </P>
    </H3>
  )
}

const FormTitle = forwardRef(FormTitleRef)

FormTitle.propTypes = propTypes

export default FormTitle
