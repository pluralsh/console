import { Button as HonorableButton } from 'honorable'
import type { ButtonProps as HonorableButtonProps } from 'honorable'
import { keyframes } from '@emotion/react'
import { MutableRefObject, forwardRef } from 'react'

export type ButtonProps = HonorableButtonProps & {pulse?: boolean}

const pulseKeyframes = keyframes`
  0% { box-shadow: 0 0 7px 2px #fff1; }
  70% { box-shadow: 0 0 7px 4px #fff2; }
  100% { box-shadow: 0 0 7px 2px #fff1; }
`

function ButtonRef({ pulse = false, ...props }: ButtonProps, ref:MutableRefObject<any>) {
  return (
    <HonorableButton
      ref={ref}
      animationIterationCount="infinite"
      animationDuration="4s"
      animationName={pulse ? pulseKeyframes : undefined}
      boxShadow={pulse ? '0 0 7px 2px #fff1' : undefined}
      _hover={{ animationPlayState: 'paused' }}
      {...props}
    />
  )
}

const Button = forwardRef(ButtonRef)

export default Button
