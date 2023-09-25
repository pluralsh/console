import { useEffect, useRef, useState } from 'react'
import { useToggleState } from 'react-stately'
import {
  type AriaSwitchProps,
  VisuallyHidden,
  useFocusRing,
  useSwitch,
} from 'react-aria'
import styled, { keyframes, useTheme } from 'styled-components'

import usePrevious from '../hooks/usePrevious'

const HANDLE_SIZE = 16
const HANDLE_MARGIN = 4
const SWITCH_WIDTH = 42
const SWITCH_OFFSET = SWITCH_WIDTH / 2 - (HANDLE_SIZE - HANDLE_MARGIN)

const slideOnAnim = keyframes`
  0% {
    width: ${HANDLE_SIZE}px; 
    transform: translateX(${-SWITCH_OFFSET}px);
    animation-timing-function: ease-in;
  }
  50% {
    width: ${HANDLE_SIZE + 10}px; 
    transform: translateX(0);
    animation-timing-function: ease-out;
  }
  100% {
    width: ${HANDLE_SIZE}px; 
    transform: translateX(${SWITCH_OFFSET}px);
  }
`

const slideOffAnim = keyframes`
  0% {
    width: ${HANDLE_SIZE}px; 
    transform: translateX(${SWITCH_OFFSET}px);
    animation-timing-function: ease-in;
  }
  50% {
    width: ${HANDLE_SIZE + 10}px; 
    transform: translateX(0);
    animation-timing-function: ease-out;
  }
  100% {
    width: ${HANDLE_SIZE}px; 
    transform: translateX(${-SWITCH_OFFSET}px);
  }
`

const MoonSC = styled.svg<{ $selected: boolean }>(({ $selected }) => ({
  position: 'absolute',
  top: 6,
  left: 24,
  width: 12,
  zIndex: 1,
  '&, & > *': {
    transition: 'all 0.15s ease 0.1s',
  },
  '.moonFill': {
    opacity: $selected ? 1 : 0,
    zIndex: 0,
  },
  '.moonOutline': {
    opacity: $selected ? 0 : 1,
    zIndex: 1,
  },
}))

function Moon({ selected }: { selected: boolean }) {
  const theme = useTheme()

  return (
    <MoonSC
      $selected={selected}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 12 12"
    >
      <path
        className="moonFill"
        d="m6.21924 11c-1.34309 0-2.60588-.52205-3.55361-1.46923-.94876-.9477-1.46922-2.20667-1.46561-3.54514.00721-2.53641 2.00099-4.7159 4.53943-4.96257.53951-.05231 1.0821-.01538 1.61233.10821.24968.05846.43346.25179.47824.50359.04582.25744-.06692.51692-.28776.66154-.94465.61897-1.48724 1.66-1.44966 2.78564.03964 1.22154.83551 2.33949 2.02725 2.84821.45971.19641.91685.2759 1.39818.24205.24864-.01743.49368.11795.61105.34821.11789.2318.08701.50821-.07927.70462-.95649 1.1282-2.35312 1.77487-3.83057 1.77487z"
        fill={theme.colors['action-always-white']}
      />
      <path
        className="moonOutline"
        d="m6.21924 11c-1.34309 0-2.60588-.52205-3.55361-1.46923-.94876-.9477-1.46922-2.20667-1.46561-3.54514.00721-2.53641 2.00099-4.7159 4.53943-4.96257.53951-.05231 1.0821-.01538 1.61233.10821.24968.05846.43346.25179.47824.50359.04582.25744-.06692.51692-.28776.66154-.94465.61897-1.48724 1.66-1.44966 2.78564.03964 1.22154.83551 2.33949 2.02725 2.84821.45971.19641.91685.2759 1.39818.24205.24864-.01743.49368.11795.61105.34821.11789.2318.08701.50821-.07927.70462-.95649 1.1282-2.35312 1.77487-3.83057 1.77487zm-.00103-9.23078c-.13487 0-.26924.00667-.40411.01949-2.14823.2082-3.83572 2.05283-3.84189 4.19897-.00309 1.13283.43757 2.19796 1.23962 3.00001.80307.80154 1.87075 1.24308 3.00741 1.24308 1.15005 0 2.24243-.46411 3.04036-1.28257-.49111-.00666-.97553-.11077-1.44348-.31077-1.46664-.62564-2.44629-2.01128-2.49622-3.53026-.04221-1.29795.53641-2.50564 1.55982-3.28513-.2193-.03487-.43963-.05282-.66151-.05282z"
        fill={theme.colors['text-primary-disabled']}
      />
    </MoonSC>
  )
}

const SunSC = styled.svg<{ $selected: boolean }>((_) => ({
  position: 'absolute',
  top: 6,
  left: 6,
  width: 12,
  zIndex: 1,
  '&, & > *': {
    transition: 'all 0.15s ease 0.1s',
  },
}))

function Sun({ selected }: { selected: boolean }) {
  const theme = useTheme()
  const color = selected
    ? theme.colors.yellow[500]
    : theme.colors['text-primary-disabled']

  return (
    <SunSC
      $selected={selected}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 12 12"
    >
      <g
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeMiterlimit="10"
      >
        <path d="m6 1v1" />
        <path d="m6 1v1" />
        <path d="m6 1v1" />
        <path d="m6 1v1" />
        <path d="m6 11v-1" />
        <path d="m11 6h-1" />
        <path d="m1 6h1" />
        <path d="m9.53553 2.46447-.70711.70711" />
        <path d="m2.46447 9.53553.70711-.70711" />
        <path d="m9.53553 9.53553-.70711-.70711" />
        <path d="m2.46447 2.46447.70711.70711" />
      </g>
      <circle
        cx="6"
        cy="6"
        r="2.4"
        fill={color}
      />
    </SunSC>
  )
}

const SwitchSC = styled.label<{
  $checked: boolean
  $disabled: boolean
  $readOnly: boolean
}>(({ $disabled, $readOnly, theme }) => ({
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
            backgroundColor: theme.colors['action-input-hover'],
          },
        },
      }),
}))

const SwitchToggleSC = styled.div<{
  $disabled: boolean
  $focused: boolean
  $checked: boolean
}>(({ $focused, $disabled, theme }) => ({
  position: 'relative',
  width: 42,
  height: 24,
  borderRadius: 12,
  backgroundColor: 'transparent',
  outlineWidth: 1,
  outlineStyle: 'solid',
  outlineOffset: -1,
  outlineColor: $disabled
    ? theme.colors['border-disabled']
    : $focused
    ? theme.colors['border-outline-focused']
    : theme.colors['border-input'],
  transition: 'all 0.15s ease',
}))

const SwitchHandleSC = styled(
  styled.div<{ $checked: boolean; $disabled: boolean; $animate: boolean }>(
    ({ $checked, $disabled, theme }) => ({
      position: 'absolute',
      width: '100%',
      transform: `translate(${-HANDLE_SIZE / 2}px, ${-HANDLE_SIZE / 2}px)`,
      transition: 'transform 0.15s ease',
      '&::before': {
        position: 'absolute',
        content: '""',
        backgroundColor: theme.colors['fill-primary'],
        border: `1px solid ${$disabled ? '#C5C9D3' : '#3C42CC'}`,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        top: HANDLE_SIZE / 2 + HANDLE_MARGIN,
        left: '50%',
        borderRadius: `${HANDLE_SIZE / 2}px`,
        transform: `translateX(${
          $checked
            ? SWITCH_WIDTH / 2 - (HANDLE_SIZE - HANDLE_MARGIN)
            : -(SWITCH_WIDTH / 2 - (HANDLE_SIZE - HANDLE_MARGIN))
        }px)`,
      },
    })
  )
)`
  &::before {
    animation-name: ${(p) =>
      p.$animate ? (p.$checked ? slideOnAnim : slideOffAnim) : 'none'};
    animation-duration: 0.2s;
    animation-iteration-count: 1;
  }
`

export function LightDarkSwitch({
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
  const wasSelected = usePrevious(isSelected) ?? isSelected
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    if (isSelected !== wasSelected) {
      setAnimate(true)
    }
  }, [isSelected, wasSelected])

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
        <Sun selected={!isSelected} />
        <Moon selected={isSelected} />
        <SwitchHandleSC
          $disabled={isDisabled}
          $checked={isSelected}
          $animate={animate}
        />
      </SwitchToggleSC>
      <div className="label">{children}</div>
    </SwitchSC>
  )
}
