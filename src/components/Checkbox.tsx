import { type MutableRefObject, forwardRef, memo, useId, useRef } from 'react'
import { type InputProps, Label } from 'honorable'
import classNames from 'classnames'
import styled from 'styled-components'
import { useToggleState } from '@react-stately/toggle'
import { useCheckbox } from '@react-aria/checkbox'
import { VisuallyHidden } from '@react-aria/visually-hidden'
import { useFocusRing } from '@react-aria/focus'

const CheckedIcon = memo(({ small }: { small: boolean }) => {
  const width = small ? 16 : 24

  return (
    <svg
      width={width}
      height={width}
      fill="none"
      viewBox={`0 0 ${width} ${width}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={small ? 'm11 6-4 4-2-2' : 'm17 9-6 6-3-3'}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
})

const IndeterminateIcon = memo(({ small }: { small: boolean }) => {
  const width = small ? 6 : 8
  const height = small ? 2 : 3

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx={0.5}
        fill="currentColor"
      />
    </svg>
  )
})

const HonorableLabelStyled = styled(Label)<{
  $small: boolean
  $isFocusVisible: boolean
  $disabled: boolean
}>(({ $small = false, $disabled = false, $isFocusVisible, theme }) => ({
  // Makes sure visually hidden <input> is positioned relative to <label> as to
  // avoid overflow issues when cropped by Accordions, etc.
  position: 'relative',
  ...theme.partials.text.body2,
  gap: theme.spacing.small,
  alignItems: 'center',
  padding: theme.spacing.xxsmall,
  color: $disabled
    ? theme.colors['text-input-disabled']
    : theme.colors['text-light'],
  cursor: $disabled ? 'not-allowed' : 'pointer',
  margin: 0,
  ':focus': {
    outline: 'none',
  },
  '.box': {
    width: $small ? theme.spacing.medium : theme.spacing.large,
    height: $small ? theme.spacing.medium : theme.spacing.large,
    position: 'relative',
    ...($isFocusVisible
      ? { ...theme.partials.focus.outline, border: 'none' }
      : {}),
    '::before, .icon': {
      position: 'absolute',
      content: '""',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    },
    '::before, &': {
      borderRadius: theme.borderRadiuses.medium,
    },
    /* before for the border */
    '::before': {
      zIndex: 0,
      border: theme.borders.input,
      ...($disabled
        ? {
            borderColor: theme.colors['border-disabled'],
            backgroundColor: theme.colors['action-primary-disabled'],
          }
        : {}),
    },
    '.icon': {
      zIndex: 2,
      display: 'flex',
      flexShrink: 0,
      flexGrow: 0,
      alignItems: 'center',
      justifyContent: 'center',
      color: !$disabled
        ? theme.colors['icon-default']
        : theme.colors['icon-disabled'],
    },
  },
  ...(!$disabled
    ? {
        ':hover': {
          color: theme.colors.text,
          '> span': {
            backgroundColor: theme.colors['action-input-hover'],
          },
        },
        '&.checked': {
          color: theme.colors.text,
        },
        '&.checked, &.indeterminate': {
          '.box::before': {
            border: 'none',
            backgroundColor: theme.colors['action-primary'],
          },
        },
        ':hover.checked, :hover.indeterminate': {
          '.box::before': {
            border: 'none',
            backgroundColor: theme.colors['action-primary-hover'],
          },
        },
      }
    : {}),
}))

export type CheckboxProps = {
  checked?: boolean
  name?: string
  small?: boolean
  indeterminate?: boolean
  disabled?: boolean
  defaultSelected?: boolean
  onChange?: (e: { target: { checked: boolean } }) => any
  onFocusChange?: (isFocused: boolean) => void
  tabIndex?: number | string
} & Omit<InputProps, 'onChange'>

function Checkbox(
  {
    small,
    onChange,
    checked: checkedProp,
    indeterminate,
    disabled,
    defaultSelected,
    onFocus,
    onBlur,
    onFocusChange,
    onKeyDown,
    onKeyUp,
    tabIndex,
    ...props
  }: CheckboxProps,
  ref: MutableRefObject<any>
) {
  const toggleStateProps = {
    ...(checkedProp !== undefined ? { isSelected: checkedProp } : {}),
    defaultSelected: !!defaultSelected,
  }
  const labelId = useId()
  const toggleState = useToggleState(toggleStateProps)
  const inputRef = useRef<any>()
  const { isFocusVisible, focusProps } = useFocusRing()
  const { inputProps } = useCheckbox(
    {
      ...toggleStateProps,
      isDisabled: disabled,
      onFocus,
      onBlur,
      onFocusChange,
      onKeyDown,
      onKeyUp,
      'aria-labelledby': labelId,
      value: props.value,
      name: props.name,
    },
    toggleState,
    inputRef
  )

  const icon = indeterminate ? (
    <IndeterminateIcon small={small} />
  ) : toggleState.isSelected ? (
    <CheckedIcon small={small} />
  ) : null

  return (
    <HonorableLabelStyled
      htmlFor={inputProps.id}
      id={labelId}
      ref={ref}
      className={classNames({
        checked: toggleState.isSelected,
        indeterminate,
      })}
      $isFocusVisible={isFocusVisible}
      $small={small}
      $disabled={disabled}
      display="flex"
      marginBottom="0"
      {...props}
    >
      <VisuallyHidden>
        <input
          {...inputProps}
          {...focusProps}
          tabIndex={tabIndex}
          onChange={(e) => {
            if (typeof onChange === 'function') {
              onChange(e)
            }
            inputProps.onChange(e)
          }}
          ref={inputRef}
        />
      </VisuallyHidden>
      <div className="box">
        <div className="icon">{icon}</div>
      </div>
      <div className="label"> {props.children}</div>
    </HonorableLabelStyled>
  )
}

export default forwardRef(Checkbox)
