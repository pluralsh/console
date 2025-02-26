import {
  Flex,
  FormField,
  SegmentedInput,
  SegmentedInputHandle,
  SemanticColorKey,
} from '@pluralsh/design-system'
import { Body2P } from 'components/utils/typography/Text'

import { ComponentPropsWithRef, useEffect, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { DateParam, formatDateTime, isValidDateTime } from 'utils/datetime'

const EMPTY_DATE_STR = '//'
const EMPTY_TIME_STR = '::'

export function DateTimeFormInput({
  initialDate,
  setDate,
  ...props
}: {
  initialDate?: DateParam
  setDate?: (date?: DateParam) => void
} & Omit<ComponentPropsWithRef<typeof FormField>, 'caption'>) {
  const { colors } = useTheme()
  const [isEnteringTimestamp, setIsEnteringTimestamp] = useState(false)

  const initDateStr = formatDateTime(initialDate, 'M/D/YYYY') || EMPTY_DATE_STR
  const initTimeStr = formatDateTime(initialDate, 'H:m:s') || EMPTY_TIME_STR
  const [initDateM, initDateD, initDateY] = initDateStr.split('/')
  const [initTimeH, initTimeM, initTimeS] = initTimeStr.split(':')

  const [dateStr, setDateStr] = useState(initDateStr)
  const [timeStr, setTimeStr] = useState(initTimeStr)
  const isSetToNow = dateStr === EMPTY_DATE_STR && timeStr === EMPTY_TIME_STR

  const dateValid = isValidDateTime(dateStr, 'M/D/YYYY', true)
  const dateError = !isSetToNow && !dateValid
  const timeValid = isValidDateTime(timeStr, 'H:m:s')
  const timeError = !isSetToNow && !timeValid

  const dateInputRef = useRef<SegmentedInputHandle>(null)
  const timeInputRef = useRef<SegmentedInputHandle>(null)

  // does an imperative clear, and manually sets state accordingly
  // necessary because SegmentedInput component is not fully controlled
  const clearDateTime = () => {
    dateInputRef.current?.clear()
    timeInputRef.current?.clear()
    setDateStr(EMPTY_DATE_STR)
    setTimeStr(EMPTY_TIME_STR)
    setDate?.(undefined)
  }

  // keep parent in sync
  useEffect(() => {
    if (isSetToNow) return
    if (dateValid && timeValid) setDate?.(`${dateStr} ${timeStr}`)
    else setDate?.(initialDate)
  }, [dateStr, setDate, timeStr, initialDate, dateValid, timeValid])

  if (isEnteringTimestamp)
    // TODO: implement
    return (
      <button
        onClick={() => {
          setIsEnteringTimestamp(false)
          dateInputRef.current?.setValue('1/1/1970')
          timeInputRef.current?.setValue('12:00:00')
        }}
      >
        enter timestamp
      </button>
    )

  return (
    <FormField
      hint="All logs displayed will be before this date/time"
      caption={
        <CaptionWrapperSC>
          <CaptionTextBtnSC
            $disabled={isSetToNow}
            onClick={isSetToNow ? undefined : clearDateTime}
          >
            Set to now
          </CaptionTextBtnSC>
          <CaptionTextBtnSC
            $color="text-primary-accent"
            onClick={() => setIsEnteringTimestamp(true)}
          >
            Enter timestamp
          </CaptionTextBtnSC>
        </CaptionWrapperSC>
      }
      {...props}
    >
      <Flex
        gap="xsmall"
        direction="column"
      >
        <SegmentedInput
          ref={dateInputRef}
          {...(isSetToNow && { value: 'Today' })}
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
          {...(isSetToNow && { value: 'Now' })}
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
      </Flex>
    </FormField>
  )
}

const CaptionWrapperSC = styled.span(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,
}))

const CaptionTextBtnSC = styled.span<{
  $color?: SemanticColorKey
  $disabled?: boolean
}>(({ theme, $color = 'text-xlight', $disabled = false }) => ({
  color: theme.colors[$color],
  cursor: $disabled ? 'default' : 'pointer',
  opacity: $disabled ? 0.4 : 1,
  '&:hover': { textDecoration: $disabled ? 'none' : 'underline' },
}))
