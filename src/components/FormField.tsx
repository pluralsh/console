import { PropsWithChildren, useEffect, useRef, useState } from 'react'
import { Div, DivProps, P } from 'honorable'
import PropTypes from 'prop-types'

type FormFieldProps = DivProps & PropsWithChildren<{
  label?: string
  caption?: string
  valid?: boolean
  error?: boolean
  required?: boolean
}>

const propTypes = {
  label: PropTypes.string,
  caption: PropTypes.string,
  valid: PropTypes.bool,
  error: PropTypes.bool,
  required: PropTypes.bool,
}

function FormField({ children, label, caption, valid, error, required, ...props }: FormFieldProps) {
  const labelRef = useRef<HTMLParagraphElement>()
  const [captionMaxWidth, setCaptionMaxWidth] = useState('auto')

  useEffect(() => {
    if (!labelRef.current) return

    const { width } = labelRef.current.getBoundingClientRect()

    console.log('width', width)
    setCaptionMaxWidth(`calc(100% - ${width + 8}px)`)
  }, [])

  return (
    <Div
      position="relative"
      {...props}
    >
      <P
        truncate
        body2
        position="absolute"
        top={2}
        right={0}
        maxWidth={captionMaxWidth}
        color={error ? 'error' : valid ? 'primary' : 'text-weak'}
      >
        {caption}
      </P>
      <P
        ref={labelRef}
        fontWeight="bold"
        display="inline"
      >
        {label}{required ? '*' : ''}
      </P>
      <Div mt={label || caption ? 0.5 : 0}>
        {children}
      </Div>
    </Div>
  )
}

FormField.propTypes = propTypes

export default FormField
