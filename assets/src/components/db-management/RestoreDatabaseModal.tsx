import { Flex } from 'honorable'
import {
  FormEvent,
  MouseEvent,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  type ZonedDateTime,
  now,
  toCalendarDateTime,
  toZoned,
} from '@internationalized/date'
import { useRestorePostgresMutation } from 'generated/graphql'
import {
  Button,
  DatePicker,
  FormField,
  Modal,
  usePrevious,
} from '@pluralsh/design-system'
import moment from 'moment-timezone'
import styled from 'styled-components'

import { TimezoneComboBox } from './TimezoneComboBox'

const RESTORE_LIMIT_DAYS = 3

const CorrectDateTimeLink = styled.a(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-danger'],
  a: {
    ...theme.partials.text.inlineLink,
  },
}))

export function RestoreDatabaseModal({
  name,
  namespace,
  setIsOpen,
  refetch,
  isOpen,
}: {
  name: any
  namespace: any
  setIsOpen
  refetch: any
  isOpen: boolean
}) {
  const [timestamp, _] = useState('')
  const [dateRangeError, setDateRangeError] = useState<ReactNode>(null)
  const [selectedTz, setSelectedTz] = useState(moment.tz.guess())
  const roundedNow = now(selectedTz).set({
    second: 0,
    millisecond: 0,
  })
  const [dateTime, setDateTime] = useState<ZonedDateTime>(roundedNow)
  const prevSelectedTz = usePrevious(selectedTz)
  const minDateTime = roundedNow.subtract({
    days: RESTORE_LIMIT_DAYS,
  })
  const maxDateTime = roundedNow

  useEffect(() => {
    if (selectedTz !== prevSelectedTz) {
      setDateTime(toZoned(toCalendarDateTime(dateTime), selectedTz))
    }
  }, [dateTime, prevSelectedTz, selectedTz])

  const [_mutation, { loading }] = useRestorePostgresMutation({
    variables: { name, namespace, timestamp: timestamp as unknown as Date },
    onCompleted: () => {
      setIsOpen(false)
      refetch()
    },
  })

  const onSubmit = useCallback((e?: MouseEvent | FormEvent) => {
    e?.preventDefault()
    // mutation()
  }, [])

  const onClose = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  const correctDateTime = (e) => {
    e.preventDefault?.()
    if (dateTime.compare(maxDateTime) > 0) {
      setDateTime(maxDateTime)
    } else if (dateTime.compare(minDateTime) < 0) {
      setDateTime(minDateTime)
    }
  }

  const modal = (
    <Modal
      header="Restore database from point in time"
      open={isOpen}
      onClose={onClose}
      size="medium"
      portal
      actions={
        <>
          <Button
            secondary
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            type="submit"
            loading={loading}
            disabled={!!dateRangeError}
            marginLeft="medium"
          >
            Restore
          </Button>
        </>
      }
    >
      <Flex
        direction="column"
        gap="large"
      >
        <FormField label="Location">
          <TimezoneComboBox
            selectedTz={selectedTz}
            setSelectedTz={setSelectedTz}
          />
        </FormField>
        <FormField
          label="Date and time"
          hint={
            dateRangeError ? (
              <CorrectDateTimeLink>
                Selection is not within the last {RESTORE_LIMIT_DAYS * 24}{' '}
                hours.{' '}
                <a
                  onClick={correctDateTime}
                  href="#"
                >
                  Fix
                </a>
              </CorrectDateTimeLink>
            ) : (
              `Limited to past ${RESTORE_LIMIT_DAYS * 24} hours`
            )
          }
          error={!!dateRangeError}
        >
          <DatePicker
            value={dateTime}
            onChange={(date) => {
              setDateTime(date as ZonedDateTime)
            }}
            onValidationChange={(v) => {
              setDateRangeError(v === 'invalid')
            }}
            minValue={minDateTime}
            maxValue={maxDateTime}
            elementProps={{}}
          />
        </FormField>
      </Flex>
    </Modal>
  )

  return modal
}
