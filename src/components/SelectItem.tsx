import { VisuallyHidden, useFocusRing } from 'react-aria'
import { type AriaRadioProps, useRadio } from 'react-aria'
import {
  type ReactElement,
  cloneElement,
  forwardRef,
  useContext,
  useRef,
} from 'react'
import styled from 'styled-components'

import { RadioContext } from './RadioGroup'

type SelectItemWrapProps = {
  selected?: boolean
  focused?: boolean
  width?: number | string
}

const SelectItemWrap = styled.label<SelectItemWrapProps>(
  ({ theme, selected = false, focused = false, width }) => ({
    ...theme.partials.text.buttonSmall,
    display: 'flex',
    height: 32,
    width,
    padding: `${theme.spacing.xxsmall}px ${theme.spacing.small}px`,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: selected
      ? theme.colors['fill-two-selected']
      : 'transparent',
    border: theme.borders.default,
    borderColor: selected
      ? theme.colors['border-selected']
      : theme.colors['border-input'],
    borderRadius: theme.borderRadiuses.medium,
    color: selected ? theme.colors.text : theme.colors['text-light'],
    cursor: 'pointer',
    '&:hover': { backgroundColor: theme.colors['action-input-hover'] },
    '.label': { marginLeft: theme.spacing.small },
    ...(focused ? { ...theme.partials.focus.button } : {}),
  })
)

type SelectItemProps = AriaRadioProps & {
  icon: ReactElement
  label?: string
  name?: string
  className?: string
}

const SelectItem = forwardRef<any, SelectItemProps>(
  ({ icon, label, value, name, className, ...props }, ref) => {
    const state = useContext(RadioContext)
    const inputRef = useRef<any>()
    const { isFocusVisible, focusProps } = useFocusRing()
    const { inputProps, isSelected } = useRadio(
      {
        value,
        ...props,
      },
      state,
      inputRef
    )

    icon = cloneElement(icon, { size: 16 })

    return (
      <SelectItemWrap
        selected={isSelected}
        focused={isFocusVisible}
        className={className}
        ref={ref}
      >
        {icon}
        {label && <div className="label">{label}</div>}
        <VisuallyHidden>
          <input
            {...inputProps}
            {...focusProps}
            name={inputProps.name || name}
            ref={inputRef}
          />
        </VisuallyHidden>
      </SelectItemWrap>
    )
  }
)

export default SelectItem
