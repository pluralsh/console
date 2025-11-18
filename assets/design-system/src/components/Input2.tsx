import {
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type ReactNode,
  type RefObject,
  useCallback,
  useRef,
} from 'react'
import { mergeProps } from 'react-aria'
import { mergeRefs } from 'react-merge-refs'
import styled, { type DefaultTheme } from 'styled-components'

import { useRefResizeObserver } from '../hooks/useRefResizeObserver'
import { simulateInputChange } from '../utils/simulateInputChange'

import { useFillLevel } from './contexts/FillLevelContext'
import IconFrame from './IconFrame'
import CloseIcon from './icons/CloseIcon'
import { TitleContent } from './Select'
import Tooltip from './Tooltip'

import { useFormField } from './FormField'

export type InputProps = {
  suffix?: ReactNode
  prefix?: ReactNode
  titleContent?: ReactNode
  startContent?: ReactNode[]
  showClearButton?: boolean
  startIcon?: ReactNode
  endIcon?: ReactNode
  dropdownButton?: ReactNode
  inputContent?: ReactNode
  inputProps?: ComponentProps<typeof InputBaseSC>
  /**
   * @deprecated use `size`
   */
  small?: boolean
  /**
   * @deprecated use `size`
   */
  medium?: boolean
  /**
   * @deprecated use `size`
   */
  large?: boolean
  size?: 'small' | 'medium' | 'large'
  error?: boolean
  onEnter?: KeyboardEventHandler<HTMLInputElement>
  onDeleteInputContent?: KeyboardEventHandler<HTMLInputElement>
  onClick?: MouseEventHandler<HTMLDivElement>
}
export type InputPropsFull = InputProps & {
  className?: string
  ref?: RefObject<HTMLDivElement>
} & Pick<
    ComponentPropsWithoutRef<'input'>,
    | 'value'
    | 'disabled'
    | 'defaultValue'
    | 'placeholder'
    | 'onChange'
    | 'onFocus'
    | 'onBlur'
    | 'onKeyDown'
  >

const PrefixSuffix = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  alignSelf: 'stretch',
  paddingLeft: theme.spacing.small,
  paddingRight: theme.spacing.small,
  backgroundColor:
    theme.mode === 'light'
      ? theme.colors['fill-three']
      : theme.colors['fill-two'],
}))

const ClearButtonSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  alignSelf: 'stretch',
  paddingRight: theme.spacing.xsmall,
}))

function ClearButton({
  className,
  ...props
}: Omit<ComponentProps<typeof IconFrame>, 'clickable' | 'icon' | 'size'>) {
  return (
    <ClearButtonSC className={className}>
      <Tooltip
        placement="top"
        label="Clear"
      >
        <IconFrame
          clickable
          icon={<CloseIcon />}
          size="small"
          {...props}
        />
      </Tooltip>
    </ClearButtonSC>
  )
}

const InputTitleContent = styled(TitleContent)((_) => ({
  alignSelf: 'stretch',
}))

const InputRootSC = styled.div<{
  $error: boolean
  $size: InputProps['size']
}>(({ theme, $error, $size }) => ({
  ...($size === 'small'
    ? theme.partials.text.caption
    : theme.partials.text.body2),
  display: 'flex',
  overflow: 'hidden',
  justifyContent: 'space-between',
  alignItems: 'center',
  height: 'auto',
  minHeight: $size === 'large' ? 48 : $size === 'small' ? 32 : 40,
  width: 'auto',
  padding: 0,
  border: theme.borders.input,
  borderColor: $error
    ? theme.colors['border-danger']
    : theme.colors['border-input'],
  borderRadius: theme.borderRadiuses.medium,
  '&:focus-within': {
    borderColor: theme.colors['border-outline-focused'],
  },
  '&[aria-disabled=true]': {
    borderColor: theme.colors['border-disabled'],
  },
  '&[aria-disabled=true], &[aria-disabled=true] *': {
    color: theme.colors['text-input-disabled'],
  },
}))
const InputBaseSC = styled.input<{
  $padStart?: 'xsmall' | 'small' | 'medium' | undefined | null
  $padEnd?: 'xsmall' | 'small' | 'medium' | undefined | null
}>(({ theme, $padStart, $padEnd }) => ({
  ...theme.partials.reset.input,
  width: '100%',
  flex: '1 0',
  alignSelf: 'stretch',
  minHeight: 22,
  lineHeight: '22px',
  color: theme.colors.text,
  ...($padStart ? { paddingLeft: theme.spacing[$padStart] } : {}),
  ...($padEnd ? { paddingRight: theme.spacing[$padEnd] } : {}),
  '&::placeholder': {
    color: theme.colors['text-xlight'],
  },
  '&[disabled]': {
    '&, &::placeholder': {
      color: theme.colors['text-disabled'],
    },
  },
}))

const BaseIcon = styled.div((_) => ({
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'small',
  margin: 0,
  padding: 0,
}))
const StartIcon = styled(BaseIcon)<{ $hasStartContent: boolean }>(
  ({ theme, $hasStartContent }) => ({
    paddingLeft: $hasStartContent ? theme.spacing.small : theme.spacing.medium,
    paddingRight: $hasStartContent
      ? theme.spacing.xsmall
      : theme.spacing.medium,
    zIndex: 1,
  })
)
const EndIcon = styled(BaseIcon)<{
  $hasEndContent: boolean
  $hasDropdownButton: boolean
}>(({ theme, $hasEndContent, $hasDropdownButton }) => ({
  paddingRight: $hasEndContent
    ? theme.spacing.small
    : $hasDropdownButton
      ? 0
      : theme.spacing.medium,
  paddingLeft: $hasEndContent ? theme.spacing.xsmall : theme.spacing.medium,
}))

const InputAreaSC = styled.div((_) => ({
  display: 'flex',
  alignSelf: 'stretch',
  flex: '1 1',
  overflowX: 'auto',
}))
const InputContentSC = styled.div<{ $padStart: keyof DefaultTheme['spacing'] }>(
  ({ theme, $padStart }) => ({
    display: 'flex',
    alignSelf: 'stretch',
    paddingLeft: theme.spacing[$padStart],
  })
)

function Input2({
  ref,
  startIcon,
  endIcon,
  dropdownButton,
  suffix,
  prefix,
  showClearButton,
  titleContent,
  size,
  small,
  large,
  onEnter,
  onDeleteInputContent,
  inputContent,
  inputProps,

  // Input props
  disabled,
  value,
  error,
  placeholder,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: InputPropsFull) {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputAreaRef = useRef<HTMLDivElement>(null)
  const inputContentRef = useRef<HTMLDivElement>(null)
  const inputContentWidthRef = useRef<number>(0)
  const onInputContentResize = useCallback<
    Parameters<typeof useRefResizeObserver>[1]
  >((entry) => {
    const prevWidth = inputContentWidthRef.current

    inputContentWidthRef.current = entry.contentRect.width
    if (entry.contentRect.width <= prevWidth) {
      return
    }
    const scrollDiff =
      (inputAreaRef.current?.scrollWidth ?? 0) -
      (inputAreaRef.current?.getBoundingClientRect().width ?? 0)

    if (scrollDiff > 0) {
      inputAreaRef.current.scrollTo({
        left: scrollDiff + 1,
        behavior: 'smooth',
      })
    }
  }, [])
  const inputContentRefCb = useRefResizeObserver(
    inputContentRef,
    onInputContentResize
  )

  inputProps = {
    ...(inputProps ?? {}),
    ref: mergeRefs([inputRef, ...(inputProps?.ref ? [inputProps.ref] : [])]),
  }

  const parentFillLevel = useFillLevel()

  size = size || (large ? 'large' : small ? 'small' : 'medium')

  inputProps = mergeProps(useFormField()?.fieldProps ?? {}, inputProps)

  const hasEndContent = !!suffix
  const hasStartContent = !!prefix || !!titleContent
  const hasClearButton = showClearButton && value
  const inputPadStart = startIcon ? null : hasStartContent ? 'small' : 'medium'
  const inputPadEnd = endIcon ? null : hasEndContent ? 'small' : 'medium'

  const wrappedOnChange: InputPropsFull['onChange'] = useCallback(
    (e) => {
      onChange?.(e)
    },
    [onChange]
  )

  const wrappedOnKeyDown: InputPropsFull['onKeyDown'] = useCallback(
    (e) => {
      if (e.key === 'Enter' && typeof onEnter === 'function') {
        onEnter?.(e)
      }
      if (e.key === 'Backspace' && inputRef?.current?.selectionStart === 0) {
        onDeleteInputContent?.(e)
      }
      if (typeof onKeyDown === 'function') {
        onKeyDown?.(e)
      }
    },
    [onDeleteInputContent, onEnter, onKeyDown]
  )

  const outerOnClick: InputPropsFull['onClick'] = useCallback((e) => {
    e.preventDefault()
    inputRef?.current?.focus()
  }, [])

  return (
    <InputRootSC
      ref={ref}
      $size={size}
      $error={!!error}
      aria-disabled={disabled}
      onClick={outerOnClick}
      {...props}
    >
      {(titleContent && (
        <InputTitleContent
          $size={size}
          $parentFillLevel={parentFillLevel}
        >
          {titleContent}
        </InputTitleContent>
      )) ||
        (prefix && <PrefixSuffix>{prefix}</PrefixSuffix>)}

      {startIcon && (
        <StartIcon $hasStartContent={hasStartContent}>{startIcon}</StartIcon>
      )}
      <InputAreaSC ref={inputAreaRef}>
        {inputContent && (
          <InputContentSC
            ref={inputContentRefCb}
            $padStart={inputPadStart}
          >
            {inputContent}
          </InputContentSC>
        )}
        <InputBaseSC
          $padStart={!inputContent ? inputPadStart : 'xsmall'}
          $padEnd={inputPadEnd}
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          onChange={wrappedOnChange}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={wrappedOnKeyDown}
          {...inputProps}
        />
      </InputAreaSC>
      {hasClearButton && (
        <ClearButton
          disabled={disabled}
          onClick={() => {
            const input = inputRef?.current

            if (input) {
              simulateInputChange(input, '')
              input.focus()
            }
          }}
        />
      )}
      {!!endIcon && (
        <EndIcon
          $hasEndContent={hasEndContent}
          $hasDropdownButton={!!dropdownButton}
        >
          {endIcon}
        </EndIcon>
      )}
      {!!suffix && <PrefixSuffix>{suffix}</PrefixSuffix>}
      {dropdownButton}
    </InputRootSC>
  )
}

export default Input2
