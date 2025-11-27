import { type PropsWithChildren, createContext } from 'react'
import { Div, type DivProps } from 'honorable'
import { type AriaRadioGroupProps, useRadioGroup } from 'react-aria'
import { useRadioGroupState } from 'react-stately'

export const RadioContext = createContext(null)

type RadioGroupProps = AriaRadioGroupProps & PropsWithChildren<DivProps>

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
}: RadioGroupProps) {
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
      {...props}
      {...radioGroupProps}
    >
      <RadioContext.Provider value={state}>{children}</RadioContext.Provider>
    </Div>
  )
}

export default RadioGroup
