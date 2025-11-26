import {
  FormField,
  SegmentedInput,
  SegmentedInputHandle,
  Toast,
  useIsFocused,
} from '@pluralsh/design-system'
import { Body2P } from 'components/utils/typography/Text'

import { ComponentPropsWithRef, useEffect, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { DateParam, formatDateTime, isValidDateTime } from 'utils/datetime'
import { runAfterBrowserLayout } from 'utils/runAfterBrowserLayout'

const EMPTY_DATE_STR = '//'
const EMPTY_TIME_STR = '::'
const DATE_FORMAT = 'M/D/YYYY'
const TIME_FORMAT = 'H:m:s'

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

  const initDateStr = formatDateTime(initialDate, DATE_FORMAT) || EMPTY_DATE_STR
  const initTimeStr = formatDateTime(initialDate, TIME_FORMAT) || EMPTY_TIME_STR
  const [initDateM, initDateD, initDateY] = initDateStr.split('/')
  const [initTimeH, initTimeM, initTimeS] = initTimeStr.split(':')

  const [dateStr, setDateStr] = useState(initDateStr)
  const [timeStr, setTimeStr] = useState(initTimeStr)
  const isSetToNow = dateStr === EMPTY_DATE_STR && timeStr === EMPTY_TIME_STR

  const dateValid = isValidDateTime(dateStr, DATE_FORMAT, true)
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
  useEffect(() => {
    if (isSetToNow) setDate?.(undefined)
    else if (dateValid && timeValid) setDate?.(`${dateStr} ${timeStr}`)
  }, [dateStr, dateValid, isSetToNow, setDate, timeStr, timeValid])

  const setValsFromTimestamp = (val?: string) => {
    const timestamp = handleUnixTS(val ?? '')
    if (!isValidDateTime(timestamp)) {
      setTimestampError(true)
      return
    }
    const date = formatDateTime(timestamp, DATE_FORMAT, true)
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
          endIcon={<Body2P $color="text-xlight">MM/DD/YYYY</Body2P>}
          onChange={setDateStr}
          separator="/"
          segments={[
            { length: 2, max: 12, name: 'MM', initialVal: initDateM },
            { length: 2, min: 1, max: 31, name: 'DD', initialVal: initDateD },
            { length: 4, max: 9999, name: 'YYYY', initialVal: initDateY },
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
