import {
  ArrowRightIcon,
  FormField,
  IconFrame,
  Input,
  SegmentedInput,
  SegmentedInputHandle,
  SemanticColorKey,
  Toast,
  useIsFocused,
} from '@pluralsh/design-system'
import { Body2P } from 'components/utils/typography/Text'

import {
  ComponentPropsWithRef,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import styled, { useTheme } from 'styled-components'
import { DateParam, formatDateTime, isValidDateTime } from 'utils/datetime'
import { runAfterLayout } from '../pipelines/utils/nodeLayouter'

const EMPTY_DATE_STR = '//'
const EMPTY_TIME_STR = '::'
const DATE_FORMAT = 'M/D/YYYY'
const TIME_FORMAT = 'H:m:s'

export function DateTimeFormInput({
  initialDate,
  setDate,
  setHasErrors,
  clearDTFormRef,
  ...props
}: {
  initialDate?: DateParam
  setDate?: (date?: DateParam) => void
  setHasErrors: (hasErrors: boolean) => void
  clearDTFormRef: RefObject<(() => void) | null>
} & Omit<ComponentPropsWithRef<typeof FormField>, 'caption'>) {
  const { colors, spacing } = useTheme()
  const [isEnteringTimestamp, setIsEnteringTimestamp] = useState(false)
  const [customTimestamp, setCustomTimestamp] = useState('')
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

  // does an imperative clear, and manually sets state accordingly
  // necessary because SegmentedInput component is not fully controlled
  const clearDateTime = useCallback(() => {
    dateInputRef.current?.clear()
    timeInputRef.current?.clear()
    setDateStr(EMPTY_DATE_STR)
    setTimeStr(EMPTY_TIME_STR)
    setDate?.(undefined)
  }, [setDate])

  // a few effects to keep parent in sync, also needed because SegmentedInput is not fully controlled
  useEffect(() => {
    if (!clearDTFormRef.current) clearDTFormRef.current = clearDateTime
  }, [clearDTFormRef, clearDateTime])

  useEffect(() => {
    setHasErrors(dateError || timeError)
  }, [dateError, setHasErrors, timeError])

  useEffect(() => {
    if (isSetToNow) return
    if (dateValid && timeValid) setDate?.(`${dateStr} ${timeStr}`)
    else setDate?.(initialDate)
  }, [dateStr, dateValid, initialDate, isSetToNow, setDate, timeStr, timeValid])

  const setValsFromTimestamp = (val?: string) => {
    const timestamp = handleUnixTS(val ?? customTimestamp)
    if (!isValidDateTime(timestamp)) {
      setTimestampError(true)
      return
    }
    setIsEnteringTimestamp(false)
    const date = formatDateTime(timestamp, DATE_FORMAT, true)
    const time = formatDateTime(timestamp, TIME_FORMAT, true)
    runAfterLayout(() => {
      dateInputRef.current?.setValue(date)
      timeInputRef.current?.setValue(time)
    })
  }

  return (
    <FormField
      hint="All logs displayed will be before this date/time. ISO timestamps can be also be pasted in"
      caption={
        isEnteringTimestamp ? (
          <CaptionTextBtnSC
            $color="text-primary-accent"
            onClick={() => setIsEnteringTimestamp(false)}
          >
            Cancel
          </CaptionTextBtnSC>
        ) : (
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
        )
      }
      {...props}
      {...focusCallbacks}
    >
      {isEnteringTimestamp ? (
        <Input
          style={{ borderColor: timestampError && colors['border-danger'] }}
          endIcon={
            <IconFrame
              clickable
              icon={<ArrowRightIcon />}
              onClick={() => setValsFromTimestamp()}
            />
          }
          placeholder="Paste timestamp"
          onChange={(e) => setCustomTimestamp(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              setValsFromTimestamp()
            }
          }}
        />
      ) : (
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
      )}
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

const CaptionWrapperSC = styled.span(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,
}))

const DateTimeInputWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
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

const handleUnixTS = (val: string) => {
  // parse as a unix timestamp if it's a valid number
  // otherwise keep it as is
  const valNum = Number(val)
  if (!isNaN(valNum)) return val.length === 10 ? valNum * 1000 : valNum
  return val
}
