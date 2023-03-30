import { useFocusRing } from '@react-aria/focus'
import { AriaRadioProps, useRadio } from '@react-aria/radio'
import { VisuallyHidden } from '@react-aria/visually-hidden'
import {
  ReactElement,
  cloneElement,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
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
  selected?: boolean
  defaultSelected?: boolean
  checked?: boolean
  name?: string
  onChange?: (e: { target: { checked: boolean } }) => void
}

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({
    icon,
    label,
    value,
    checked: checkedProp,
    defaultSelected,
    'aria-describedby': ariaDescribedBy,
    onChange,
    onBlur,
    onFocus,
    onKeyDown,
    onKeyUp,
    name,
  }) => {
    const [checked, setChecked] = useState(defaultSelected || checkedProp)
    const state = useContext(RadioContext) || {
      setSelectedValue: () => {},
      selectedValue: checkedProp || checked ? value : undefined,
    }

    useEffect(() => {
      setChecked(checkedProp)
    }, [checkedProp])

    const labelId = useId()
    const inputRef = useRef<any>()
    const { isFocusVisible, focusProps } = useFocusRing()
    const { inputProps, isSelected } = useRadio(
      {
        value,
        'aria-describedby': ariaDescribedBy,
        'aria-labelledby': labelId,
        onBlur,
        onFocus,
        onKeyDown,
        onKeyUp,
      },
      state,
      inputRef
    )

    icon = cloneElement(icon, { size: 16 })

    return (
      <SelectItemWrap
        selected={isSelected}
        focused={isFocusVisible}
      >
        {icon}
        {label && <div className="label">{label}</div>}
        <VisuallyHidden>
          <input
            {...inputProps}
            {...focusProps}
            name={inputProps.name || name}
            onChange={(e) => {
              if (typeof onChange === 'function') {
                onChange(e)
              }
              setChecked(!checked)
              inputProps.onChange(e)
            }}
            ref={inputRef}
          />
        </VisuallyHidden>
      </SelectItemWrap>
    )
  }
)

export default SelectItem
