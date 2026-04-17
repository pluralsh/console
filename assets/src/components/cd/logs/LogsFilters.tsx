import {
  Button,
  CaretDownIcon,
  CloseIcon,
  ComboBox,
  Flex,
  FlexProps,
  ListBoxFooterPlus,
  ListBoxItem,
  Select,
  SelectButton,
} from '@pluralsh/design-system'
import { useDateFormat } from 'components/hooks/useDateFormat'
import { useOutsideClick } from 'components/hooks/useOutsideClick'
import { SimplePopupMenu } from 'components/layout/HeaderPopupMenu'
import { FillLevelDiv } from 'components/utils/FillLevelDiv'
import {
  LogFacetInput,
  LogLineFragment,
  LogQueryOperator,
  LogTimeRange,
  useLogLabelsQuery,
} from 'generated/graphql'
import { useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { DateParam, formatDateTime } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import {
  SinceSecondsOptions,
  SinceSecondsSelectOptions,
} from '../cluster/pod/logs/PodLogs'
import { DateTimeFormInput } from './DateTimeFormInput'
import { isEmpty } from 'lodash'

export type LogsFiltersT = {
  date?: DateParam
  sinceSeconds: SinceSecondsOptions
  queryLength: number
  queryOperator: LogQueryOperator
}

export const DEFAULT_LOG_FILTERS: LogsFiltersT = {
  date: undefined,
  sinceSeconds: SinceSecondsOptions.QuarterHour,
  queryLength: 100,
  queryOperator: LogQueryOperator.Or,
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
        endIcon={<CaretDownIcon />}
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

export function LogsQueryOperatorSelect({
  operator,
  setOperator,
  disabled = false,
  ...props
}: {
  operator: LogQueryOperator
  setOperator: (operator: LogQueryOperator) => void
  disabled?: boolean
} & FlexProps) {
  return (
    <Flex {...props}>
      <FillLevelDiv fillLevel={1}>
        <Select
          // size="small"
          titleContent="Operator"
          selectedKey={operator}
          onSelectionChange={(key) => setOperator(key as LogQueryOperator)}
          isDisabled={disabled}
        >
          {Object.values(LogQueryOperator).map((op) => (
            <ListBoxItem
              key={op}
              label={op}
              selected={op === operator}
            />
          ))}
        </Select>
      </FillLevelDiv>
    </Flex>
  )
}

export function LogsLabelsPicker({
  logs,
  clusterId,
  serviceId,
  query,
  time,
  addLabel,
  selectedLabels,
  ...props
}: {
  logs: LogLineFragment[]
  clusterId?: string
  serviceId?: string
  query?: string
  time?: LogTimeRange
  addLabel: (key: string, value: string) => void
  selectedLabels: LogFacetInput[]
} & FlexProps) {
  const [field, setField] = useState('')
  const [comboBoxInput, setComboBoxInput] = useState('')

  const facetKeys = useMemo(() => {
    const allKeys = new Set<string>()
    logs.forEach(({ facets }) =>
      facets?.forEach((facet) => facet?.key && allKeys.add(facet.key))
    )
    const selectedSet = new Set<string>(selectedLabels.map(({ key }) => key))
    return Array.from(allKeys.difference(selectedSet))
  }, [logs, selectedLabels])

  const { data, loading } = useLogLabelsQuery({
    variables: { field, clusterId, serviceId, query, time },
    skip: !field,
    fetchPolicy: 'cache-and-network',
  })

  const filteredLabelOptions = useMemo(() => {
    const value = comboBoxInput.trim().toLowerCase()
    const labelOptions = data?.logLabels?.filter(isNonNullable) ?? []

    if (!value) return labelOptions

    return labelOptions.filter(({ label }) =>
      label.toLowerCase().includes(value)
    )
  }, [comboBoxInput, data?.logLabels])

  const clearSelections = () => {
    setField('')
    setComboBoxInput('')
  }

  return (
    <Flex {...props}>
      <FillLevelDiv fillLevel={1}>
        <Select
          width={240}
          isDisabled={isEmpty(facetKeys)}
          selectedKey={field}
          onSelectionChange={(key) => {
            setField(String(key ?? ''))
            setComboBoxInput('')
          }}
          triggerButton={
            <LabelsFieldSelectButtonSC isDisabled={isEmpty(facetKeys)}>
              {field || 'Field'}
            </LabelsFieldSelectButtonSC>
          }
          dropdownFooterFixed={
            field && (
              <ListBoxFooterPlus
                leftContent={<CloseIcon />}
                onClick={clearSelections}
              >
                Clear selection
              </ListBoxFooterPlus>
            )
          }
        >
          {facetKeys.map((key) => (
            <ListBoxItem
              key={key}
              label={key}
              css={{ wordBreak: 'break-word' }}
            />
          ))}
        </Select>
      </FillLevelDiv>
      <div css={{ flex: 1 }}>
        <ComboBox
          isDisabled={!field}
          startIcon={null}
          showArrow={false}
          allowsEmptyCollection
          loading={loading}
          inputValue={comboBoxInput}
          onInputChange={setComboBoxInput}
          onSelectionChange={(key) => {
            if (!field || !key) return
            addLabel(field, `${key}`)
            clearSelections()
          }}
          inputProps={{
            placeholder: 'Value',
            style: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
          }}
        >
          {filteredLabelOptions.map(({ label }) => (
            <ListBoxItem
              key={label}
              label={label}
              textValue={label}
            />
          ))}
        </ComboBox>
      </div>
    </Flex>
  )
}

const DateFormSC = styled(SimplePopupMenu)(({ theme }) => ({
  width: 350,
  padding: `${theme.spacing.medium}px ${theme.spacing.small}px`,
  gap: theme.spacing.small,
}))

const LabelsFieldSelectButtonSC = styled(SelectButton)({
  borderTopRightRadius: 0,
  borderBottomRightRadius: 0,
  borderRight: 'none',
})
