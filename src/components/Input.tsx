import { Ref, forwardRef } from 'react'
import { ExtendTheme, Input as HonorableInput, InputProps as HonorableInputProps } from 'honorable'
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
  const extendedTheme = {
    Input: {
      Root: [
        {
          width: '100%',
          borderColor: error ? 'red' : valid ? 'primary' : 'border',
          '&:focus': {
            borderColor: error ? 'red' : valid ? 'primary' : 'border',
          },
        },
      ],
    },
  }

  return (
    <ExtendTheme theme={extendedTheme}>
      <HonorableInput
        ref={ref}
        {...props}
      />
    </ExtendTheme>
  )
}

const Input = forwardRef(InputRef)

Input.propTypes = propTypes

export default Input
