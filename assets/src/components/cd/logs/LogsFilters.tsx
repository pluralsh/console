import {
  Button,
  FillLevelContext,
  FiltersIcon,
  Flex,
  Flyover,
  FormField,
  Input,
  ListBoxItem,
  SearchIcon,
  Select,
  Toast,
} from '@pluralsh/design-system'
import { useUpdateState } from 'components/hooks/useUpdateState'
import { LogFacetInput } from 'generated/graphql'
import { clamp, isEqual } from 'lodash'
import { FormEvent, useState, useRef } from 'react'
import styled, { useTheme } from 'styled-components'
import { DateParam } from 'utils/datetime'
import {
  SinceSecondsOptions,
  SinceSecondsSelectOptions,
} from '../cluster/pod/logs/Logs'
import { DateTimeFormInput } from './DateTimeFormInput'
import { LogsLabels } from './LogsLabels'

const MAX_QUERY_LENGTH = 250

export type LogsFlyoverFiltersT = {
  date?: DateParam
  sinceSeconds: SinceSecondsOptions
  queryLength: number
}

export const DEFAULT_LOG_FLYOVER_FILTERS: LogsFlyoverFiltersT = {
  date: undefined,
  sinceSeconds: SinceSecondsOptions.QuarterHour,
  queryLength: 100,
}

export function LogsFilters({
  q,
  setQ,
  filters,
  setFilters,
  labels,
  removeLabel,
  setLive,
}: {
  q: string
  setQ: (q: string) => void
  filters: LogsFlyoverFiltersT
  setFilters: (filters: LogsFlyoverFiltersT) => void
  labels: LogFacetInput[]
  removeLabel: (label: string) => void
  setLive: (live: boolean) => void
}) {
  const { colors } = useTheme()
  const [open, setOpen] = useState(false)
  const hasCustomFilters = !isEqual(filters, DEFAULT_LOG_FLYOVER_FILTERS)

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <Flex gap="small">
        <Input
          placeholder="Filter logs"
          startIcon={<SearchIcon size={14} />}
          value={q}
          onChange={({ target: { value } }) => setQ(value)}
          flex={1}
        />
        <Button
          css={{ borderColor: hasCustomFilters && colors['border-primary'] }}
          floating
          startIcon={<FiltersIcon />}
          onClick={() => setOpen(true)}
        >
          <Flex
            align="center"
            gap="small"
          >
            Filters
            {hasCustomFilters && <FilterIndicatorSC />}
          </Flex>
        </Button>
        <Flyover
          open={open}
          onClose={() => setOpen(false)}
          header="Log filters"
        >
          <FiltersForm
            initialForm={filters}
            onSubmit={setFilters}
            setLive={setLive}
          />
        </Flyover>
      </Flex>
      <LogsLabels
        labels={labels}
        removeLabel={removeLabel}
      />
    </Flex>
  )
}

function FiltersForm({
  initialForm,
  onSubmit,
  setLive,
}: {
  initialForm: LogsFlyoverFiltersT
  onSubmit: (form: LogsFlyoverFiltersT) => void
  setLive: (live: boolean) => void
}) {
  const { spacing } = useTheme()
  const [hasDTErrors, setHasDTErrors] = useState(false)
  const clearDTFormRef = useRef<() => void>(null)
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  const { state, update, initialState, hasUpdates } =
    useUpdateState(initialForm)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(state)
    // by default, logs should be live if no specific date is set, and vice versa
    setLive(!state.date)
    setShowSuccessToast(true)
  }

  const resetToDefault = () => {
    update(DEFAULT_LOG_FLYOVER_FILTERS)
    clearDTFormRef.current?.()
  }

  return (
    <FillLevelContext value={0}>
      <WrapperFormSC onSubmit={handleSubmit}>
        <DateTimeFormInput
          label="Range end date/time"
          initialDate={initialState.date}
          setDate={(date) => update({ date })}
          setHasErrors={setHasDTErrors}
          clearDTFormRef={clearDTFormRef}
        />
        <FormField
          label="Range duration"
          hint="How far back to search from the selected date/time"
        >
          <Select
            selectedKey={`${state.sinceSeconds}`}
            onSelectionChange={(key) =>
              update({ sinceSeconds: key as SinceSecondsOptions })
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
              update({
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
            onClick={resetToDefault}
          >
            Reset to default
          </Button>
          <Button
            flex={1}
            disabled={!hasUpdates || hasDTErrors}
            type="submit"
          >
            Apply filters
          </Button>
        </Flex>
      </WrapperFormSC>
      <Toast
        show={showSuccessToast}
        closeTimeout={2000}
        onClose={() => setShowSuccessToast(false)}
        margin={spacing.xlarge}
      >
        Filters applied
      </Toast>
    </FillLevelContext>
  )
}

const WrapperFormSC = styled.form(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xlarge,
}))

const FilterIndicatorSC = styled.div(({ theme }) => ({
  height: 12,
  width: 12,
  backgroundColor: theme.colors['border-primary'],
  borderRadius: '50%',
}))
