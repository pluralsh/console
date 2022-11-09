import {
  ComponentProps,
  PropsWithChildren,
  createContext,
  forwardRef,
} from 'react'
import { Div } from 'honorable'
// import styled from 'styled-components'
import { AriaRadioGroupProps, useRadioGroup } from '@react-aria/radio'
import { useRadioGroupState } from '@react-stately/radio'

export const RadioContext = createContext(null)

type RadioGroupProps = AriaRadioGroupProps &
  PropsWithChildren<ComponentProps<'div'>>

function RadioGroup({
  name,
  label,
  description,
  errorMessage,
  orientation,
  isDisabled = false,
  isReadOnly = false,
  value,
  defaultValue,
  onChange,
  validationState,
  isRequired,
  children,
  ...props
}: RadioGroupProps,
ref: any) {
  const stateProps = {
    name,
    label,
    description,
    errorMessage,
    orientation,
    isDisabled,
    isReadOnly,
    value,
    defaultValue,
    onChange,
    validationState,
    isRequired,
  }
  const state = useRadioGroupState(stateProps)
  const { radioGroupProps } = useRadioGroup(stateProps, state)

  return (
    <Div
      ref={ref}
      {...props}
      {...radioGroupProps}
    >
      <RadioContext.Provider value={state}>{children}</RadioContext.Provider>
    </Div>
  )
}

RadioGroup.propTypes = {}

export default forwardRef(RadioGroup)
