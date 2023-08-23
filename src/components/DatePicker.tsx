import {
  type ComponentProps,
  type ReactNode,
  type RefObject,
  forwardRef,
  useEffect,
  useRef,
} from 'react'
import {
  type AriaButtonProps,
  type AriaDatePickerProps,
  type AriaDialogProps,
  type DateValue,
  useButton,
  useDatePicker,
  useDialog,
} from 'react-aria'
import {
  type DatePickerState,
  type DatePickerStateOptions,
  useDatePickerState,
} from 'react-stately'
import styled from 'styled-components'
import { type Merge } from 'type-fest'

import {} from '@internationalized/date'
import { useFloatingCornerScale } from '../hooks/useFloatingCornerScale'

import { Calendar } from './Calendar'
import { DateField } from './DateField'
import { PopoverCalendar as PopoverCornerScale } from './PopoverCornerScale'
import CalendarIcon from './icons/CalendarIcon'
import IconFrame from './IconFrame'
import Card from './Card'

const CalendarButton = forwardRef(
  (
    { selected, ...props }: AriaButtonProps & { selected: boolean },
    ref: RefObject<any>
  ) => {
    const { buttonProps: buttonEltProps } = useButton(props, ref)

    return (
      <IconFrame
        {...buttonEltProps}
        type="floating"
        clickable
        size="medium"
        icon={<CalendarIcon clickable />}
        selected={selected}
        ref={ref}
      />
    )
  }
)

const FieldWrapSC = styled.div<{ $invalid: boolean }>(
  ({ $invalid, theme }) => ({
    display: 'flex',
    columnGap: theme.spacing.medium,
    padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
    borderRadius: theme.borderRadiuses.medium,
    border: theme.borders.input,
    ...($invalid ? { borderColor: theme.colors['border-danger'] } : {}),
    '& > :first-child': {
      flexGrow: 1,
    },
  })
)

const DatePickerSC = styled.div(({ theme: _ }) => ({}))

export function DatePicker({
  elementProps = {},
  onValidationChange,
  ...props
}: Merge<
  AriaDatePickerProps<any> & DatePickerStateOptions<DateValue>,
  {
    elementProps: ComponentProps<typeof DatePickerSC>
    onValidationChange?: (
      validationState: DatePickerState['validationState']
    ) => void
  }
>) {
  const state = useDatePickerState(props)
  const ref = useRef(null)
  const { groupProps, fieldProps, buttonProps, dialogProps, calendarProps } =
    useDatePicker(
      {
        granularity: 'minute',
        hourCycle: 24,
        hideTimeZone: false,
        ...props,
      },
      state,
      ref
    )
  const { floating, triggerRef } = useFloatingCornerScale({
    triggerRef: ref,
    placement: 'bottom-end',
  })

  useEffect(() => {
    onValidationChange?.(state.validationState)
  }, [state.validationState, onValidationChange])

  return (
    <DatePickerSC {...elementProps}>
      <FieldWrapSC
        {...groupProps}
        $invalid={state.validationState === 'invalid'}
        ref={triggerRef}
      >
        <DateField {...fieldProps} />
        <CalendarButton
          {...buttonProps}
          selected={state.isOpen}
        />
      </FieldWrapSC>
      <PopoverCornerScale
        isOpen={state.isOpen}
        onClose={state.close}
        floating={floating}
      >
        <CalendarDialog {...dialogProps}>
          <Calendar {...calendarProps} />
        </CalendarDialog>
      </PopoverCornerScale>
    </DatePickerSC>
  )
}

interface DialogProps extends AriaDialogProps {
  title?: ReactNode
  children: ReactNode
}

const CalendarDialogSC = styled(Card)(({ theme }) => ({
  justifySelf: 'end',
  flexGrow: 0,
  backgroundColor: theme.colors['fill-one'],
  padding: theme.spacing.medium,
}))

function CalendarDialog({ title, children, ...props }: DialogProps) {
  const ref = useRef(null)
  const { dialogProps, titleProps } = useDialog(props, ref)

  return (
    <CalendarDialogSC
      fillLevel={2}
      {...dialogProps}
      ref={ref}
    >
      {title && (
        <h3
          {...titleProps}
          style={{ marginTop: 0 }}
        >
          {title}
        </h3>
      )}
      {children}
    </CalendarDialogSC>
  )
}
