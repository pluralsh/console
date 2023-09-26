import { type ComponentProps, useMemo, useRef } from 'react'
import { useToggleState } from 'react-stately'
import {
  type AriaSwitchProps,
  VisuallyHidden,
  useSwitch as useAriaSwitch,
  useFocusRing,
} from 'react-aria'
import styled from 'styled-components'

export type SwitchStyleProps = {
  $checked: boolean
  $disabled: boolean
  $readOnly: boolean
  $focused: boolean
}

type UseSwitchProps = Omit<
  AriaSwitchProps & Parameters<typeof useToggleState>[0],
  'isDisabled' | 'isReadOnly' | 'isSelected' | 'defaultSelected' | 'isRequired'
> & {
  checked?: boolean
  defaultChecked?: boolean
  disabled?: boolean
  readOnly?: boolean
}

export type SwitchProps = UseSwitchProps &
  Pick<ComponentProps<typeof SwitchSC>, 'as'> & { className?: string }

const SwitchSC = styled.label<SwitchStyleProps>(
  ({ $checked, $disabled, $readOnly, theme }) => ({
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
            },
            [SwitchHandleSC]: {
              backgroundColor: $checked
                ? theme.colors['action-always-white']
                : theme.colors['action-link-active'],
            },
          },
        }),
  })
)

const SwitchToggleSC = styled.div<SwitchStyleProps>(
  ({ $checked, $focused, $disabled, theme }) => ({
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
        ? 'transparent'
        : theme.colors['border-input'],
    transition: 'all 0.15s ease',
  })
)

const SwitchHandleSC = styled.div<SwitchStyleProps>(
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

export const useSwitch = ({
  checked,
  defaultChecked,
  disabled,
  readOnly,
  ...props
}: UseSwitchProps) => {
  const ariaProps: AriaSwitchProps = {
    isSelected: checked,
    isDisabled: disabled,
    isReadOnly: readOnly,
    defaultSelected: defaultChecked,
    ...props,
  }
  const state = useToggleState({
    ...ariaProps,
  })
  const ref = useRef<HTMLInputElement>(null)
  const { inputProps, isSelected, isDisabled, isReadOnly } = useAriaSwitch(
    { ...ariaProps },
    state,
    ref
  )
  const { focusProps, isFocusVisible } = useFocusRing()

  return useMemo(
    () => ({
      inputProps: { ...inputProps, ...focusProps, ref },
      styleProps: {
        $focused: isFocusVisible,
        $disabled: isDisabled,
        $checked: isSelected,
        $readOnly: isReadOnly,
      },
      state,
    }),
    [
      focusProps,
      inputProps,
      isDisabled,
      isFocusVisible,
      isReadOnly,
      isSelected,
      state,
    ]
  )
}

export function Switch({ children, as, className, ...props }: SwitchProps) {
  const { inputProps, styleProps } = useSwitch(props)

  return (
    <SwitchSC
      as={as}
      className={className}
      {...styleProps}
    >
      <VisuallyHidden>
        <input {...inputProps} />
      </VisuallyHidden>
      <SwitchToggleSC {...styleProps}>
        <SwitchHandleSC {...styleProps} />
      </SwitchToggleSC>
      <div className="label">{children}</div>
    </SwitchSC>
  )
}
