import { PropsWithChildren, createContext, forwardRef } from 'react'
import { Div, DivProps } from 'honorable'
import { AriaRadioGroupProps, useRadioGroup } from '@react-aria/radio'
import { useRadioGroupState } from '@react-stately/radio'

export const RadioContext = createContext(null)

type RadioGroupProps = AriaRadioGroupProps & PropsWithChildren<DivProps>

function RadioGroup(
  {
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
  ref: any
) {
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

export default forwardRef(RadioGroup)
