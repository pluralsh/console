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

function Input({ valid = false, error = false, ...props }: InputProps) {
  const style = {
    width: '100%',
    borderColor: error ? 'red' : valid ? 'primary' : 'border',
    '&:focus': {
      borderColor: error ? 'red' : valid ? 'primary' : 'border',
    },
  }

  return (
    <HonorableInput
      {...style}
      {...props}
    />
  )
}

Input.propTypes = propTypes

export default Input
