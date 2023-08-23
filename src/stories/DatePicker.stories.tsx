import {
  type CalendarDate,
  type CalendarDateTime,
  type ZonedDateTime,
  getLocalTimeZone,
  now,
} from '@internationalized/date'
import { type ComponentProps, useState } from 'react'
import styled from 'styled-components'

import { DatePicker, FormField } from '..'

export default {
  title: 'Date Picker',
  component: DatePicker,
}

const TemplateSC = styled.div((_) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
  columnGap: 48,
  rowGap: 500,
}))

function Template() {
  const nowTime = now(getLocalTimeZone())
  const [date, setDate] = useState<
    ZonedDateTime | CalendarDate | CalendarDateTime | null
  >(null)
  const [isInvalid, setIsInvalid] = useState(false)
  const minDate = nowTime.subtract({ months: 4 })
  const maxDate = nowTime
  const props: ComponentProps<typeof DatePicker> = {
    onChange: setDate,
    onValidationChange: (validationState) => {
      setIsInvalid(validationState === 'invalid')
    },
    value: date,
    minValue: minDate,
    maxValue: maxDate,
    placeholderValue: nowTime,
  }

  const picker = (
    <FormField
      label="Choose a date"
      hint={
        !date
          ? 'Date has not been set'
          : isInvalid
          ? 'Date must be in the last 4 months'
          : undefined
      }
      error={isInvalid}
    >
      <DatePicker {...props} />
    </FormField>
  )

  return (
    <TemplateSC>
      {picker}
      {picker}
    </TemplateSC>
  )
}

export const Default = Template.bind({})

Default.args = {}
