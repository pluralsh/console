import {
  type ComponentProps,
  ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  type AriaRadioGroupProps,
  type AriaRadioProps,
  useRadio,
  useRadioGroup,
} from 'react-aria'
import { useRadioGroupState } from 'react-stately'

import { useSpring } from '@react-spring/web'
import classNames from 'classnames'
import { VisuallyHidden, useFocusRing } from 'react-aria'
import styled from 'styled-components'

import { type SetRequired } from 'type-fest'

import { AnimatedDiv } from './AnimatedDiv'

type TextSwitchSize = 'small'
type TextSwitchOption = { value: string } & (
  | {
      label: ReactElement<any> | Iterable<ReactNode>
      textValue: string
    }
  | { label: string }
)
type TextSwitchOptions = TextSwitchOption[]

export type TextSwitchProps = SetRequired<
  Omit<AriaRadioGroupProps, 'orientation'>,
  'value'
> & {
  size: TextSwitchSize
  options: TextSwitchOptions
  labelPosition?: 'start' | 'end'
} & ComponentPropsWithRef<'div'>

const sizeToHeight = { small: 22 } as const satisfies Record<
  TextSwitchSize,
  number
>

const TextSwitchSC = styled.div<{ $size: TextSwitchSize }>(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xxsmall,
  alignItems: 'center',
  ...theme.partials.text.overline,
  color: theme.colors['text-light'],
}))
const SwitchSC = styled.div<{ $size: TextSwitchSize }>(({ theme, $size }) => ({
  contain: 'paint',
  position: 'relative',
  display: 'flex',
  border: theme.borders.input,
  borderRadius: sizeToHeight[$size] / 2,
  height: sizeToHeight[$size],
  '&:focus-within': {
    ...theme.partials.focus.outline,
  },
  '@supports selector(:has(*))': {
    '&:focus-within': {
      outline: 'none',
    },
    '&:has(:focus-visible)': {
      ...theme.partials.focus.outline,
    },
  },
}))

export const TextSwitchContext = createContext(null)

const SwitchHandleSC = styled(AnimatedDiv)<{
  $size: TextSwitchSize
  $disabled: boolean
}>(({ theme, $disabled, $size }) => {
  const height = sizeToHeight[$size as TextSwitchSize]

  return {
    position: 'absolute',
    backgroundColor: $disabled
      ? theme.colors['action-link-active-disabled']
      : theme.colors['action-primary'],
    top: 0,
    bottom: 0,
    left: 0,
    width: 10,
    borderRadius: (height - 2) / 2,
    zIndex: -1,
  }
})

function TextSwitch({
  name,
  label,
  labelPosition = 'start',
  description,
  errorMessage,
  isDisabled = false,
  isReadOnly = false,
  value,
  defaultValue,
  onChange,
  isRequired,
  options,
  size,
  ...props
}: TextSwitchProps) {
  const switchRef = useRef<HTMLDivElement>(null)
  const selectedElt = useRef<HTMLElement>(null)

  const [selectedLeft, setSelectedLeft] = useState<number | undefined>(
    undefined
  )
  const [selectedWidth, setSelectedWidth] = useState<number | undefined>(
    undefined
  )

  useLayoutEffect(() => {
    selectedElt.current = switchRef?.current?.querySelector(
      `[data-value="${value}"]`
    )

    const parentLeft = switchRef.current?.getBoundingClientRect()?.left
    const selectedR = selectedElt.current?.getBoundingClientRect()

    setSelectedLeft(
      !selectedR.left ? undefined : selectedR.left - parentLeft - 1
    )
    setSelectedWidth(!selectedR?.width ? undefined : selectedR?.width)
  }, [value])
  const stateProps: AriaRadioGroupProps = {
    name,
    label,
    description,
    errorMessage,
    isDisabled,
    isReadOnly,
    value,
    defaultValue,
    onChange,
    isRequired,
    orientation: 'horizontal',
  }
  const state = useRadioGroupState(stateProps)
  const { radioGroupProps, labelProps } = useRadioGroup(stateProps, state)

  const springs = useSpring({
    to: { left: selectedLeft, width: selectedWidth },
    config: {
      clamp: true,
      mass: 0.6,
      tension: 420,
      velocity: 0.1,
    },
  })

  return (
    <TextSwitchSC
      $size={size}
      {...props}
      {...radioGroupProps}
    >
      {label && labelPosition === 'start' && (
        <LabelTextSC {...labelProps}>{label}</LabelTextSC>
      )}
      <TextSwitchContext.Provider value={state}>
        <SwitchSC
          ref={switchRef}
          $size={size}
        >
          {options.map((option) => (
            <TextSwitchOption
              key={option.value}
              size={size}
              isDisabled={isDisabled}
              {...option}
            />
          ))}
          <SwitchHandleSC
            $disabled={isDisabled}
            $size={size}
            style={{ ...springs }}
          />
        </SwitchSC>
      </TextSwitchContext.Provider>
      {label && labelPosition === 'end' && (
        <LabelTextSC {...labelProps}>{label}</LabelTextSC>
      )}
    </TextSwitchSC>
  )
}

const LabelTextSC = styled.div(({ theme }) => ({
  ...theme.partials.text.overline,
  position: 'relative',
  top: 0.5,
}))

const TextSwitchOptionSC = styled.label<{
  $size: TextSwitchSize
  $disabled: boolean
}>(({ $size, $disabled = false, theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  userSelect: 'none',
  display: 'flex',
  flexShrink: 0,
  flexGrow: 0,
  gap: theme.spacing.small,
  alignItems: 'center',
  padding: `${0} ${8}px`,
  color: $disabled
    ? theme.colors['text-input-disabled']
    : theme.colors['text-xlight'],
  cursor: $disabled ? 'not-allowed' : 'pointer',
  margin: 0,
  justifyContent: 'center',
  borderRadius: (sizeToHeight[$size] - 2) / 2,
  transition: 'all 0.1s ease',
  '&::before': {
    position: 'absolute',
    content: '""',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    backgroundColor: 'transparent',
  },
  '&:not(:last-of-type)': {
    marginRight: -2,
  },
  '&:not(:first-of-type)': {
    marginRight: -2,
  },
  '&:focus': {
    outline: 'none',
  },
  ...(!$disabled
    ? {
        '&:hover': {
          color: theme.colors.text,
          '&::before': {
            backgroundColor: theme.colors['action-input-hover'],
          },
          '.icon': {
            color: theme.colors['action-primary-hover'],
          },
        },
        '&.selected': {
          color: theme.colors['action-always-white'],
        },
      }
    : {
        '&.selected': {
          color: theme.colors['text-primary-disabled'],
        },
      }),
}))

export type TextSwitchOptionProps = AriaRadioProps & {
  size?: 'small'
  disabled?: boolean
  defaultSelected?: boolean
  selected?: boolean
  name?: string
  label?: ReactNode
  onChange?: ComponentProps<'input'>['onChange']
} & ComponentProps<'label'>

function TextSwitchOption({
  size,
  value,
  selected: selectedProp,
  disabled,
  defaultSelected,
  'aria-describedby': ariaDescribedBy,
  onChange,
  onBlur,
  onFocus,
  onKeyDown,
  onKeyUp,
  name,
  label,
  ...props
}: TextSwitchOptionProps) {
  const [selected, setSelected] = useState(defaultSelected || selectedProp)
  const state = useContext(TextSwitchContext) || {
    setSelectedValue: () => {},
    selectedValue: selectedProp || selected ? value : undefined,
  }

  useEffect(() => {
    setSelected(selectedProp)
  }, [selectedProp])

  const labelId = useId()
  const inputRef = useRef<any>(undefined)
  const { focusProps } = useFocusRing()
  const { inputProps, isSelected, isDisabled } = useRadio(
    {
      value,
      'aria-describedby': ariaDescribedBy,
      'aria-labelledby': labelId,
      isDisabled: disabled,
      onBlur,
      onFocus,
      onKeyDown,
      onKeyUp,
    },
    state,
    inputRef
  )

  return (
    <TextSwitchOptionSC
      htmlFor={inputProps.id}
      id={labelId}
      className={classNames({ selected: isSelected })}
      $size={size}
      $disabled={isDisabled}
      data-value={value}
      {...props}
    >
      <VisuallyHidden>
        <input
          {...inputProps}
          {...focusProps}
          name={inputProps.name || name}
          onChange={(e) => {
            if (typeof onChange === 'function') {
              onChange(e)
            }
            setSelected(!selected)
            inputProps.onChange(e)
          }}
          ref={inputRef}
        />
      </VisuallyHidden>
      <LabelTextSC className="label">{label}</LabelTextSC>
    </TextSwitchOptionSC>
  )
}

export default TextSwitch
