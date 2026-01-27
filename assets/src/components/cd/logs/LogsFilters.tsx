import {
  Button,
  DropdownArrowIcon,
  Flex,
  Input,
  ListBoxItem,
  SearchIcon,
  Select,
} from '@pluralsh/design-system'
import { useDateFormat } from 'components/hooks/useDateFormat'
import { useOutsideClick } from 'components/hooks/useOutsideClick'
import { SimplePopupMenu } from 'components/layout/HeaderPopupMenu'
import { FillLevelDiv } from 'components/utils/FillLevelDiv'
import { LogFacetInput } from 'generated/graphql'
import { useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { DateParam, formatDateTime } from 'utils/datetime'
import {
  SinceSecondsOptions,
  SinceSecondsSelectOptions,
} from '../cluster/pod/logs/PodLogs'
import { DateTimeFormInput } from './DateTimeFormInput'
import { LogsLabels } from './LogsLabels'

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

export function LogsSearchInput({
  q,
  setQ,
  labels,
  removeLabel,
}: {
  q: string
  setQ: (q: string) => void
  labels: LogFacetInput[]
  removeLabel: (label: string) => void
}) {
  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <Input
        placeholder="Filter logs"
        startIcon={<SearchIcon size={14} />}
        value={q}
        onChange={({ target: { value } }) => setQ(value)}
      />
      <LogsLabels
        labels={labels}
        removeLabel={removeLabel}
      />
    </Flex>
  )
}

export function LogsDateDropdown({
  initialDate,
  setDate,
  setLive,
  disabled = false,
}: {
  initialDate: DateParam
  setDate: (date: DateParam) => void
  setLive: (live: boolean) => void
  disabled?: boolean
}) {
  const { colors, partials } = useTheme()
  const dateOrder = useDateFormat()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  useOutsideClick(menuBtnRef, () => setDropdownOpen(false))

  const [hasDTErrors, setHasDTErrors] = useState(false)
  const [formResetKey, setFormResetKey] = useState(0)
  const [internalDate, setInternalDate] = useState(initialDate)

  const toggleDropdown = (open?: boolean) => {
    setDropdownOpen(open ?? !dropdownOpen)
    setInternalDate(initialDate)
  }
  const handleSubmit = () => {
    setDate(internalDate)
    // by default, logs should be live if no specific date is set, and vice versa
    setLive(!internalDate)
  }

  const resetToNow = () => {
    setInternalDate(null)
    // forces DateTimeFormInput to remount, needed since the component is brittle
    setFormResetKey((k) => k + 1)
  }

  return (
    <div css={{ position: 'relative' }}>
      <Button
        ref={menuBtnRef}
        small
        secondary
        onClick={() => toggleDropdown()}
        endIcon={<DropdownArrowIcon />}
        disabled={disabled}
        style={{
          background: colors['fill-three'],
          color: disabled
            ? colors['text-input-disabled']
            : colors['text-light'],
          ...partials.text.body2,
        }}
      >
        {initialDate
          ? formatDateTime(
              initialDate,
              `[Before ]${dateOrder
                .join('/')
                .replace('M', 'MM')
                .replace('D', 'DD')
                .replace('Y', 'YYYY')}[ - ]HH:mm:ss[ [UTC]]`,
              true,
              true
            )
          : 'Before now'}
      </Button>
      <DateFormSC
        type="fromTopLeft"
        isOpen={dropdownOpen}
        setIsOpen={setDropdownOpen}
      >
        <DateTimeFormInput
          key={`${formResetKey}-${dropdownOpen}`}
          label="Range end date/time"
          initialDate={internalDate}
          setDate={setInternalDate}
          setHasErrors={setHasDTErrors}
        />
        <Button
          flex={1}
          disabled={initialDate === internalDate || hasDTErrors}
          onClick={handleSubmit}
        >
          Apply filter
        </Button>
        <Button
          flex={1}
          floating
          onClick={resetToNow}
        >
          Reset to now
        </Button>
      </DateFormSC>
    </div>
  )
}

export function LogsSinceSecondsSelect({
  sinceSeconds,
  setSinceSeconds,
  disabled = false,
}: {
  sinceSeconds: number
  setSinceSeconds: (sinceSeconds: SinceSecondsOptions) => void
  disabled?: boolean
}) {
  return (
    <FillLevelDiv fillLevel={2}>
      <Select
        size="small"
        selectedKey={`${sinceSeconds}`}
        onSelectionChange={(key) => setSinceSeconds(key as SinceSecondsOptions)}
        isDisabled={disabled}
      >
        {SinceSecondsSelectOptions.map(({ key, label }) => (
          <ListBoxItem
            key={`${key}`}
            label={label}
            selected={key === sinceSeconds}
          />
        ))}
      </Select>
    </FillLevelDiv>
  )
}

const DateFormSC = styled(SimplePopupMenu)(({ theme }) => ({
  width: 350,
  padding: `${theme.spacing.medium}px ${theme.spacing.small}px`,
  gap: theme.spacing.small,
}))
