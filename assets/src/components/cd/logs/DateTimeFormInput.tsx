import {
  FormField,
  SegmentedInput,
  SegmentedInputHandle,
  Toast,
  useIsFocused,
} from '@pluralsh/design-system'
import {
  DateOrderChar,
  DateOrderString,
  useDateFormat,
} from 'components/hooks/useDateFormat'
import { Body2P } from 'components/utils/typography/Text'

import { ComponentPropsWithRef, useEffect, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import {
  DateParam,
  dayjsExtended,
  formatDateTime,
  isValidDateTime,
} from 'utils/datetime'
import { runAfterBrowserLayout } from 'utils/runAfterBrowserLayout'

const EMPTY_DATE_STR = '//'
const EMPTY_TIME_STR = '::'
const TIME_FORMAT = 'H:m:s'

const DATE_FORMATS: Record<DateOrderString, { label: string; format: string }> =
  {
    MDY: { label: 'MM/DD/YYYY', format: 'M/D/YYYY' },
    DMY: { label: 'DD/MM/YYYY', format: 'D/M/YYYY' },
    YMD: { label: 'YYYY/MM/DD', format: 'YYYY/M/D' },
  }

export function DateTimeFormInput({
  initialDate,
  setDate,
  setHasErrors,
  ...props
}: {
  initialDate?: DateParam
  setDate?: (date?: DateParam) => void
  setHasErrors?: (hasErrors: boolean) => void
} & Omit<ComponentPropsWithRef<typeof FormField>, 'caption'>) {
  const { colors, spacing } = useTheme()
  const [timestampError, setTimestampError] = useState(false)
  const [isFocused, focusCallbacks] = useIsFocused({})

  const dateOrder = useDateFormat()
  const { label: dateLabel, format: dateFormat } =
    DATE_FORMATS[dateOrder.join('') as DateOrderString]

  const initDateStr = formatDateTime(initialDate, dateFormat) || EMPTY_DATE_STR
  const initTimeStr = formatDateTime(initialDate, TIME_FORMAT) || EMPTY_TIME_STR
  const [initDateA, initDateB, initDateC] = initDateStr.split('/')
  const [initTimeH, initTimeM, initTimeS] = initTimeStr.split(':')

  const [dateStr, setDateStr] = useState(initDateStr)
  const [timeStr, setTimeStr] = useState(initTimeStr)
  const isSetToNow = dateStr === EMPTY_DATE_STR && timeStr === EMPTY_TIME_STR

  const dateValid = isValidDateTime(dateStr, dateFormat, true)
  const dateError = !isSetToNow && !dateValid
  const timeValid = isValidDateTime(timeStr, TIME_FORMAT)
  const timeError = !isSetToNow && !timeValid

  const dateInputRef = useRef<SegmentedInputHandle>(null)
  const timeInputRef = useRef<SegmentedInputHandle>(null)

  // sync error state with parent
  useEffect(() => {
    setHasErrors?.(dateError || timeError)
  }, [dateError, setHasErrors, timeError])

  // sync date value with parent when inputs change
  // always output in ISO format so parsing is unambiguous regardless of locale
  useEffect(() => {
    if (isSetToNow) setDate?.(undefined)
    else if (dateValid && timeValid)
      setDate?.(
        dayjsExtended(
          `${dateStr} ${timeStr}`,
          `${dateFormat} ${TIME_FORMAT}`,
          true
        )
          .utc(true)
          .toISOString()
      )
  }, [dateFormat, dateStr, dateValid, isSetToNow, setDate, timeStr, timeValid])

  const setValsFromTimestamp = (val?: string) => {
    const timestamp = handleUnixTS(val ?? '')
    if (!isValidDateTime(timestamp)) {
      setTimestampError(true)
      return
    }
    const date = formatDateTime(timestamp, dateFormat, true)
    const time = formatDateTime(timestamp, TIME_FORMAT, true)
    runAfterBrowserLayout(() => {
      dateInputRef.current?.setValue(date)
      timeInputRef.current?.setValue(time)
    })
  }

  return (
    <FormField
      hint="All logs displayed will be before this date/time. ISO timestamps can be also be pasted in"
      {...props}
      {...focusCallbacks}
    >
      <DateTimeInputWrapperSC
        onPaste={(e) => {
          e.preventDefault()
          setValsFromTimestamp(e.clipboardData.getData('text'))
        }}
      >
        <SegmentedInput
          ref={dateInputRef}
          {...(isSetToNow && !isFocused && { value: 'Today' })}
          style={{ borderColor: dateError && colors['border-danger'] }}
          prefix="Date"
          endIcon={<Body2P $color="text-xlight">{dateLabel}</Body2P>}
          onChange={setDateStr}
          separator="/"
          segments={[
            { ...charToDateSegment(dateOrder[0]), initialVal: initDateA },
            { ...charToDateSegment(dateOrder[1]), initialVal: initDateB },
            { ...charToDateSegment(dateOrder[2]), initialVal: initDateC },
          ]}
        />
        <SegmentedInput
          ref={timeInputRef}
          {...(isSetToNow && !isFocused && { value: 'Now' })}
          style={{ borderColor: timeError && colors['border-danger'] }}
          prefix="Time"
          endIcon={<Body2P $color="text-xlight">UTC</Body2P>}
          onChange={setTimeStr}
          separator=":"
          segments={[
            { length: 2, max: 23, name: 'HH', initialVal: initTimeH },
            { length: 2, max: 59, name: 'MM', initialVal: initTimeM },
            { length: 2, max: 59, name: 'SS', initialVal: initTimeS },
          ]}
        />
      </DateTimeInputWrapperSC>
      <Toast
        show={timestampError}
        closeTimeout={2000}
        severity="danger"
        onClose={() => setTimestampError(false)}
        margin={spacing.xlarge}
      >
        Invalid timestamp
      </Toast>
    </FormField>
  )
}

const DateTimeInputWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
}))

const handleUnixTS = (val: string) => {
  // parse as a unix timestamp if it's a valid number
  // otherwise keep it as is
  const valNum = Number(val)
  if (!isNaN(valNum)) return val.length === 10 ? valNum * 1000 : valNum
  return val
}

const charToDateSegment = (char: DateOrderChar) => {
  switch (char) {
    case 'Y':
      return { length: 4, max: 9999, name: 'YYYY' }
    case 'M':
      return { length: 2, max: 12, name: 'MM' }
    case 'D':
      return { length: 2, min: 1, max: 31, name: 'DD' }
  }
}
