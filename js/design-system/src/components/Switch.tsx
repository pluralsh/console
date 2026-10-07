import { ComponentPropsWithRef, useMemo, useRef } from 'react'
import {
  type AriaSwitchProps,
  VisuallyHidden,
  useSwitch as useAriaSwitch,
  useFocusRing,
} from 'react-aria'
import { type ToggleState, useToggleState } from 'react-stately'
import { green } from '../theme/colors-base'
import styled from 'styled-components'

const GREEN_VARIANT_BASE = green[600]
const GREEN_VARIANT_HOVER = green[500]

type SwitchSize = 'small' | 'medium'

const switchDimensions = {
  small: { width: 32, height: 18, handle: 12, inset: 3 },
  medium: { width: 42, height: 24, handle: 16, inset: 4 },
} as const satisfies Record<
  SwitchSize,
  { width: number; height: number; handle: number; inset: number }
>

export type SwitchStyleProps = {
  $checked: boolean
  $disabled: boolean
  $readOnly: boolean
  $focused: boolean
  $variant: 'default' | 'green'
  $size: SwitchSize
}

type UseSwitchProps = Omit<
  AriaSwitchProps & Parameters<typeof useToggleState>[0],
  'isDisabled' | 'isReadOnly' | 'isSelected' | 'defaultSelected' | 'isRequired'
> & {
  checked?: boolean
  defaultChecked?: boolean
  disabled?: boolean
  readOnly?: boolean
  variant?: 'default' | 'green'
  size?: SwitchSize
}

export type SwitchProps = UseSwitchProps & { className?: string }

const SwitchSC = styled.label<SwitchStyleProps>(
  ({ $checked, $disabled, $readOnly, $variant, theme }) => ({
    position: 'relative',
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
                ? $variant === 'green'
                  ? GREEN_VARIANT_HOVER
                  : theme.colors['action-primary-hover']
                : theme.colors['action-input-hover'],
            },
            [SwitchHandleSC]: {
              backgroundColor: $checked
                ? theme.colors['action-link-active-hover']
                : theme.colors['action-link-inactive-hover'],
            },
          },
        }),
  })
)

const SwitchToggleSC = styled.div<SwitchStyleProps>(
  ({ $checked, $focused, $disabled, $variant, $size, theme }) => {
    const { width, height } = switchDimensions[$size]

    return {
      position: 'relative',
      width,
      height,
      borderRadius: height / 2,
      backgroundColor: $checked
        ? $disabled
          ? theme.colors['action-primary-disabled']
          : $variant === 'green'
            ? GREEN_VARIANT_BASE
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
    }
  }
)

const SwitchHandleSC = styled.div<SwitchStyleProps>(
  ({ $checked, $disabled, $size, theme }) => {
    const { width, handle, inset } = switchDimensions[$size]

    return {
      backgroundColor: $disabled
        ? $checked
          ? theme.colors['action-link-active-disabled']
          : theme.colors['action-link-inactive-disabled']
        : $checked
          ? theme.colors['action-link-active']
          : theme.colors['action-link-inactive'],
      position: 'absolute',
      width: handle,
      height: handle,
      borderRadius: '50%',
      top: inset,
      left: inset,
      transform: `translateX(${$checked ? `${width - inset * 2 - handle}px` : 0})`,
      transition: 'transform 0.15s ease',
    }
  }
)

export const useSwitch = ({
  checked,
  defaultChecked,
  disabled,
  readOnly,
  variant,
  size,
  ...props
}: UseSwitchProps): {
  inputProps: ComponentPropsWithRef<'input'>
  styleProps: SwitchStyleProps
  state: ToggleState
} => {
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
        $variant: variant ?? 'default',
        $size: size ?? 'medium',
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
      size,
      state,
      variant,
    ]
  )
}

export function Switch({ children, className, ...props }: SwitchProps) {
  const { inputProps, styleProps } = useSwitch(props)

  return (
    <SwitchSC
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
