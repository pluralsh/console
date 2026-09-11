import {
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react'
import { isEmpty, isNil } from 'lodash'
import { mergeProps } from 'react-aria'
import { mergeRefs } from 'react-merge-refs'
import styled, { type DefaultTheme, useTheme } from 'styled-components'

import { useRefResizeObserver } from '../hooks/useRefResizeObserver'
import { simulateInputChange } from '../utils/simulateInputChange'
import {
  resolveSpacersAndSanitizeCss,
  type SpacerProps,
} from '../theme/spacing'

import { FillLevel, useFillLevel } from './contexts/FillLevelContext'
import IconFrame from './IconFrame'
import CloseIcon from './icons/CloseIcon'
import { parentFillLevelToBackground, TitleContent } from './Select'
import Tooltip from './Tooltip'

import { useFormField } from './FormField'
import { lightElevatedSurface } from '../theme/lightElevatedSurface'

const FIELD_LINE_HEIGHT = 22
const TEXTAREA_Y_PAD = 9

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
  raised?: boolean
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
  multiline?: boolean
  minRows?: number
  maxRows?: number
  onEnter?: KeyboardEventHandler<HTMLInputElement>
  onDeleteInputContent?: KeyboardEventHandler<HTMLInputElement>
  onClick?: MouseEventHandler<HTMLDivElement>
}
export type InputPropsFull = InputProps &
  SpacerProps &
  Pick<
    CSSProperties,
    | 'width'
    | 'minWidth'
    | 'height'
    | 'minHeight'
    | 'flex'
    | 'flexGrow'
    | 'flexShrink'
    | 'alignSelf'
  > & {
    className?: string
    style?: CSSProperties
    ref?: Ref<HTMLDivElement>
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
    | 'onKeyUp'
    | 'type'
    | 'name'
    | 'required'
    | 'autoFocus'
    | 'autoComplete'
    | 'maxLength'
    | 'minLength'
    | 'min'
    | 'max'
    | 'step'
    | 'pattern'
    | 'readOnly'
    | 'id'
    | 'inputMode'
    | 'spellCheck'
    | 'tabIndex'
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
  disabled,
  ...props
}: Omit<ComponentProps<typeof IconFrame>, 'clickable' | 'icon' | 'size'> & {
  disabled?: boolean
}) {
  return (
    <ClearButtonSC className={className}>
      <Tooltip
        placement="top"
        label="Clear"
      >
        <IconFrame
          clickable
          icon={<CloseIcon color={disabled ? 'border-disabled' : 'text'} />}
          size="small"
          disabled={disabled}
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
  $raised: boolean
  $parentFillLevel: FillLevel
  $multiline: boolean
}>(({ theme, $error, $size, $raised, $parentFillLevel, $multiline }) => ({
  ...($size === 'small'
    ? theme.partials.text.caption
    : theme.partials.text.body2),
  display: 'flex',
  overflow: theme.mode === 'light' ? 'visible' : 'hidden',
  justifyContent: 'space-between',
  alignItems: $multiline ? 'flex-start' : 'center',
  height: 'auto',
  minHeight: $multiline
    ? 'auto'
    : $size === 'large'
      ? 48
      : $size === 'small'
        ? 32
        : 40,
  width: 'auto',
  padding: 0,
  backgroundColor:
    !$raised || theme.mode === 'light'
      ? theme.colors['fill-zero']
      : theme.colors[parentFillLevelToBackground[$parentFillLevel]],
  border: theme.borders.input,
  borderColor: $error
    ? theme.colors['border-danger']
    : theme.colors['border-input'],
  borderRadius: theme.borderRadiuses.medium,
  ...lightElevatedSurface(theme, { error: $error }),
  '&:focus-within': {
    borderColor: theme.colors['border-outline-focused'],
    boxShadow: 'none',
  },
  '&[aria-disabled=true]': {
    borderColor: theme.colors['border-disabled'],
    boxShadow: 'none',
  },
  '&[aria-disabled=true], &[aria-disabled=true] *': {
    color: theme.colors['text-input-disabled'],
  },
}))

const fieldBaseStyles = ({
  theme,
  $padStart,
  $padEnd,
}: {
  theme: DefaultTheme
  $padStart?: 'xsmall' | 'small' | 'medium' | undefined | null
  $padEnd?: 'xsmall' | 'small' | 'medium' | undefined | null
}) => ({
  ...theme.partials.reset.input,
  width: '100%',
  flex: '1 0',
  alignSelf: 'stretch',
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
})

const InputBaseSC = styled.input<{
  $padStart?: 'xsmall' | 'small' | 'medium' | undefined | null
  $padEnd?: 'xsmall' | 'small' | 'medium' | undefined | null
}>(({ theme, $padStart, $padEnd }) => ({
  ...fieldBaseStyles({ theme, $padStart, $padEnd }),
  minHeight: 22,
  lineHeight: `${FIELD_LINE_HEIGHT}px`,
}))

const TextAreaBaseSC = styled.textarea<{
  $padStart?: 'xsmall' | 'small' | 'medium' | undefined | null
  $padEnd?: 'xsmall' | 'small' | 'medium' | undefined | null
}>(({ theme, $padStart, $padEnd }) => ({
  ...fieldBaseStyles({ theme, $padStart, $padEnd }),
  resize: 'none',
  overflowY: 'auto',
  lineHeight: `${FIELD_LINE_HEIGHT}px`,
  paddingTop: TEXTAREA_Y_PAD,
  paddingBottom: TEXTAREA_Y_PAD,
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

const InputAreaSC = styled.div<{ $multiline: boolean }>(({ $multiline }) => ({
  display: 'flex',
  alignSelf: 'stretch',
  flex: '1 1',
  overflowX: $multiline ? 'hidden' : 'auto',
}))
const InputContentSC = styled.div<{
  $padStart?: keyof DefaultTheme['spacing'] | null
}>(({ theme, $padStart }) => ({
  display: 'flex',
  alignSelf: 'stretch',
  ...($padStart ? { paddingLeft: theme.spacing[$padStart] } : {}),
}))

function textareaHeight(rows: number) {
  return rows * FIELD_LINE_HEIGHT + TEXTAREA_Y_PAD * 2
}

function Input({
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
  medium: _medium,
  large,
  raised = false,
  onEnter,
  onDeleteInputContent,
  inputContent,
  inputProps,
  multiline = false,
  minRows = 2,
  maxRows,
  width,
  minWidth,
  height,
  minHeight,
  flex,
  flexGrow,
  flexShrink,
  alignSelf,
  style,

  // Input props
  disabled,
  value,
  defaultValue,
  error,
  placeholder,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  onKeyUp,
  type,
  name,
  required,
  autoFocus,
  autoComplete,
  maxLength,
  minLength,
  min,
  max,
  step,
  pattern,
  readOnly,
  id,
  inputMode,
  spellCheck,
  tabIndex,
  ...props
}: InputPropsFull) {
  const theme = useTheme()
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
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
      inputAreaRef.current?.scrollTo({
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
  const effectiveValue = inputProps?.value ?? value
  const hasValue = !isNil(effectiveValue) && !isEmpty(String(effectiveValue))

  const hasEndContent = !!suffix
  const hasStartContent = !!prefix || !!titleContent
  const inputPadStart: 'xsmall' | 'small' | 'medium' | null = startIcon
    ? null
    : hasStartContent
      ? 'small'
      : 'medium'
  const inputPadEnd: 'xsmall' | 'small' | 'medium' | null = endIcon
    ? null
    : hasEndContent
      ? 'small'
      : 'medium'

  const wrappedOnChange: NonNullable<InputPropsFull['onChange']> = useCallback(
    (e) => {
      onChange?.(e)
    },
    [onChange]
  )

  const wrappedOnKeyDown: NonNullable<InputPropsFull['onKeyDown']> =
    useCallback(
      (e) => {
        if (!multiline && e.key === 'Enter' && typeof onEnter === 'function') {
          onEnter?.(e)
        }
        if (e.key === 'Backspace' && inputRef?.current?.selectionStart === 0) {
          onDeleteInputContent?.(e)
        }
        if (typeof onKeyDown === 'function') {
          onKeyDown?.(e)
        }
      },
      [multiline, onDeleteInputContent, onEnter, onKeyDown]
    )

  const outerOnClick: NonNullable<InputPropsFull['onClick']> = useCallback(
    (e) => {
      e.preventDefault()
      inputRef?.current?.focus()
    },
    []
  )

  useLayoutEffect(() => {
    if (!multiline) return
    const el = inputRef.current

    if (!(el instanceof HTMLTextAreaElement)) return

    el.style.height = '0px'
    const next = textareaHeight(minRows)
    const maxH = maxRows != null ? textareaHeight(maxRows) : undefined
    const measured = Math.max(el.scrollHeight, next)

    el.style.height = `${maxH != null ? Math.min(measured, maxH) : measured}px`
  }, [effectiveValue, maxRows, minRows, multiline])

  const { rest, css } = resolveSpacersAndSanitizeCss(props, theme)
  const fieldPad = {
    $padStart: (!inputContent ? inputPadStart : 'xsmall') as
      'xsmall' | 'small' | 'medium' | null,
    $padEnd: inputPadEnd,
  }
  const nativeFieldProps = {
    disabled,
    value,
    defaultValue,
    placeholder,
    name,
    required,
    autoFocus,
    autoComplete,
    maxLength,
    minLength,
    min,
    max,
    step,
    pattern,
    readOnly,
    id,
    inputMode,
    spellCheck,
    tabIndex,
    onChange: wrappedOnChange,
    onFocus,
    onBlur,
    onKeyDown: wrappedOnKeyDown,
    onKeyUp,
  }

  return (
    <InputRootSC
      ref={ref}
      $size={size}
      $error={!!error}
      $raised={raised}
      $parentFillLevel={parentFillLevel}
      $multiline={multiline}
      aria-disabled={disabled}
      onClick={outerOnClick}
      style={style}
      css={{
        width,
        minWidth,
        height,
        minHeight,
        flex,
        flexGrow,
        flexShrink,
        alignSelf,
        ...css,
      }}
      {...rest}
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
      <InputAreaSC
        ref={inputAreaRef}
        $multiline={multiline}
      >
        {inputContent && (
          <InputContentSC
            ref={inputContentRefCb}
            $padStart={inputPadStart}
          >
            {inputContent}
          </InputContentSC>
        )}
        {multiline ? (
          <TextAreaBaseSC
            {...fieldPad}
            rows={minRows}
            style={{
              minHeight: textareaHeight(minRows),
              ...(maxRows != null
                ? { maxHeight: textareaHeight(maxRows) }
                : {}),
            }}
            {...(nativeFieldProps as unknown as ComponentProps<
              typeof TextAreaBaseSC
            >)}
            {...(inputProps as unknown as ComponentProps<
              typeof TextAreaBaseSC
            >)}
          />
        ) : (
          <InputBaseSC
            {...fieldPad}
            type={type}
            {...nativeFieldProps}
            {...inputProps}
          />
        )}
      </InputAreaSC>
      {showClearButton && hasValue && (
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

export default Input
