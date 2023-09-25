import { useRef } from 'react'
import { useToggleState } from 'react-stately'
import {
  type AriaSwitchProps,
  VisuallyHidden,
  useFocusRing,
  useSwitch,
} from 'react-aria'
import styled from 'styled-components'

const SwitchSC = styled.label<{
  $checked: boolean
  $disabled: boolean
  $readOnly: boolean
}>(({ $checked, $disabled, $readOnly, theme }) => ({
  display: 'flex',
  columnGap: theme.spacing.xsmall,
  alignItems: 'center',
  ...theme.partials.text.body2,
  cursor: $disabled ? 'not-allowed' : $readOnly ? 'default' : 'pointer',
  color: theme.colors['text-light'],
  ...($disabled || $readOnly
    ? {}
    : {
        '&:hover': {
          color: theme.colors.text,
          [SwitchToggleSC]: {
            backgroundColor: $checked
              ? theme.colors['action-primary-hover']
              : theme.colors['action-input-hover'],
            borderColor: $checked
              ? theme.colors['action-primary-hover']
              : theme.colors['action-input-hover'],
          },
          [SwitchHandleSC]: {
            backgroundColor: $checked
              ? theme.colors['action-always-white']
              : theme.colors['action-link-active'],
          },
        },
      }),
}))

const SwitchToggleSC = styled.div<{
  $disabled: boolean
  $focused: boolean
  $checked: boolean
}>(({ $checked, $focused, $disabled, theme }) => ({
  position: 'relative',
  width: 42,
  height: 24,
  borderRadius: 12,
  backgroundColor: $checked
    ? $disabled
      ? theme.colors['action-primary-disabled']
      : theme.colors['action-primary']
    : 'transparent',
  outlineWidth: 1,
  outlineStyle: 'solid',
  outlineOffset: -1,
  outlineColor:
    $disabled && $checked
      ? theme.colors['action-primary-disabled']
      : $disabled
      ? theme.colors['border-disabled']
      : $focused
      ? theme.colors['border-outline-focused']
      : $checked
      ? theme.colors['action-primary']
      : theme.colors['border-input'],
  transition: 'all 0.15s ease',
}))

const SwitchHandleSC = styled.div<{ $checked: boolean; $disabled: boolean }>(
  ({ $checked, $disabled, theme }) => ({
    backgroundColor: $disabled
      ? theme.colors['border-disabled']
      : $checked
      ? theme.colors['action-always-white']
      : theme.colors['action-link-inactive'],
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: '50%',
    top: 4,
    left: 4,
    transform: `translateX(${$checked ? `${42 - 4 * 2 - 16}px` : 0})`,
    transition: 'transform 0.15s ease',
  })
)

export function Switch({
  children,
  checked,
  disabled,
  readOnly,
  ...props
}: Omit<
  AriaSwitchProps & Parameters<typeof useToggleState>[0],
  'isDisabled' | 'isReadonly' | 'isSelected'
> & { checked?: boolean; disabled?: boolean; readOnly?: boolean }) {
  const ariaProps: AriaSwitchProps = {
    isSelected: checked,
    isDisabled: disabled,
    isReadOnly: readOnly,
    ...props,
  }
  const state = useToggleState(ariaProps)
  const ref = useRef<HTMLInputElement>(null)
  const { inputProps, isSelected, isDisabled, isReadOnly } = useSwitch(
    { ...ariaProps },
    state,
    ref
  )
  const { focusProps, isFocusVisible } = useFocusRing()

  return (
    <SwitchSC
      $disabled={isDisabled}
      $checked={isSelected}
      $readOnly={isReadOnly}
    >
      <VisuallyHidden>
        <input
          {...inputProps}
          {...focusProps}
          ref={ref}
        />
      </VisuallyHidden>
      <SwitchToggleSC
        $focused={isFocusVisible}
        $disabled={isDisabled}
        $checked={isSelected}
      >
        <SwitchHandleSC
          $disabled={isDisabled}
          $checked={isSelected}
        />
      </SwitchToggleSC>
      <div className="label">{children}</div>
    </SwitchSC>
  )
}
