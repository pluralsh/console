import { type FlexProps, H3, P } from 'honorable'
import { type Ref, forwardRef } from 'react'

type FormTitleProps = FlexProps & {
  title?: string
  message?: string
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

export default FormTitle
