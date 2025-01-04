import { H3, type H3Props, P } from 'honorable'

type FormTitleProps = H3Props & {
  title?: string
  message?: string
}

function FormTitle({ title, message, ...props }: FormTitleProps) {
  return (
    <H3
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

export default FormTitle
