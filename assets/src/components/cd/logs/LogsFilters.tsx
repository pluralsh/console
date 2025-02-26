import {
  Button,
  FillLevelContext,
  FiltersIcon,
  Flex,
  Flyover,
  FormField,
  Input,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'

import { DateTimeFormInput } from 'components/cd/logs/DateTimeFormInput'
import { useUpdateState } from 'components/hooks/useUpdateState'
import { clamp } from 'lodash'
import { FormEvent, useState } from 'react'
import styled from 'styled-components'
import { DateParam } from 'utils/datetime'
import {
  SinceSecondsOptions,
  SinceSecondsSelectOptions,
} from '../cluster/pod/logs/Logs'
const MAX_QUERY_LENGTH = 250

export type LogsFiltersT = {
  date?: DateParam
  sinceSeconds: SinceSecondsOptions
  queryLength: number
}

export const DEFAULT_LOG_FILTERS: LogsFiltersT = {
  date: undefined,
  sinceSeconds: SinceSecondsOptions.QuarterHour,
  queryLength: 100,
}

export function LogsFilters({
  curFilters,
  setCurFilters,
}: {
  curFilters: LogsFiltersT
  setCurFilters: (filters: LogsFiltersT) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        floating
        startIcon={<FiltersIcon />}
        onClick={() => setOpen(true)}
      >
        Filters
      </Button>
      <Flyover
        open={open}
        onClose={() => setOpen(false)}
        header="Log filters"
      >
        <LogsFiltersForm
          initialForm={curFilters}
          onSubmit={setCurFilters}
        />
      </Flyover>
    </>
  )
}

function LogsFiltersForm({
  initialForm,
  onSubmit,
}: {
  initialForm: LogsFiltersT
  onSubmit: (form: LogsFiltersT) => void
}) {
  const {
    state,
    update: updateState,
    initialState,
    hasUpdates,
  } = useUpdateState(initialForm)
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(state)
  }
  console.log(state)

  return (
    <FillLevelContext value={0}>
      <WrapperFormSC onSubmit={handleSubmit}>
        <DateTimeFormInput
          label="Range end date/time"
          initialDate={initialState.date}
          setDate={(date) => updateState({ date })}
        />
        <FormField
          label="Range duration"
          hint="How far back to searchfrom the selected date/time"
        >
          <Select
            selectedKey={`${state.sinceSeconds}`}
            onSelectionChange={(key) =>
              updateState({ sinceSeconds: key as SinceSecondsOptions })
            }
          >
            {SinceSecondsSelectOptions.map((opts) => (
              <ListBoxItem
                key={`${opts.key}`}
                label={opts.label}
                selected={opts.key === state.sinceSeconds}
              />
            ))}
          </Select>
        </FormField>
        <FormField
          label="Query length"
          hint="The number of lines loaded at a time — min: 10, max: 250"
        >
          <Input
            inputProps={{
              css: {
                '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                  WebkitAppearance: 'none',
                },
              },
            }}
            type="number"
            value={state.queryLength || ''}
            onChange={({ target: { value } }) =>
              updateState({
                queryLength: clamp(Number(value), 10, MAX_QUERY_LENGTH),
              })
            }
          />
        </FormField>
        <Flex
          gap="medium"
          width="100%"
        >
          <Button
            flex={1}
            floating
            onClick={() => updateState(DEFAULT_LOG_FILTERS)}
          >
            Reset to default
          </Button>
          <Button
            flex={1}
            disabled={!hasUpdates}
            type="submit"
          >
            Apply filters
          </Button>
        </Flex>
      </WrapperFormSC>
    </FillLevelContext>
  )
}

const WrapperFormSC = styled.form(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xlarge,
}))
