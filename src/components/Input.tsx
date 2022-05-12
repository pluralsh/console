import { Ref, forwardRef } from 'react'
import { Input as HonorableInput, InputProps as HonorableInputProps } from 'honorable'
import PropTypes from 'prop-types'

type InputProps = HonorableInputProps & {
  valid?: boolean
  error?: boolean
}

const propTypes = {
  valid: PropTypes.bool,
  error: PropTypes.bool,
}

function InputRef({ valid = false, error = false, ...props }: InputProps, ref: Ref<any>) {
  const style = {
    width: '100%',
    borderColor: error ? 'red' : valid ? 'primary' : 'border',
    '&:focus': {
      borderColor: error ? 'red' : valid ? 'primary' : 'border',
    },
  }

  return (
    <HonorableInput
      ref={ref}
      {...style}
      {...props}
    />
  )
}

const Input = forwardRef(InputRef)

Input.propTypes = propTypes

export default Input
