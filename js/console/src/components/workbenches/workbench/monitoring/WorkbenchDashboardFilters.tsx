import {
  Button,
  Flex,
  Input,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import {
  DashboardInputType,
  DashboardTimeRangeAttributes,
  useWorkbenchDashboardInputQuery,
  WorkbenchDashboardInput,
} from 'generated/graphql'
import { omit } from 'lodash'
import { useEffect } from 'react'
import { isNonNullable } from 'utils/isNonNullable'

export type DashboardFilterValue = string
const BOOLEAN_OPTIONS = ['true', 'false']

export function defaultDashboardFilter(
  input: WorkbenchDashboardInput
): DashboardFilterValue | undefined {
  if (input.default == null || input.default === '') return undefined
  return input.default
}

export function WorkbenchDashboardFilters({
  dashboardId,
  inputs,
  values,
  variables,
  timeRange,
  onChange,
  onClear,
  onReadyChange,
}: {
  dashboardId: string
  inputs: WorkbenchDashboardInput[]
  values: Record<string, DashboardFilterValue | undefined>
  variables: Record<string, string>
  timeRange: DashboardTimeRangeAttributes
  onChange: (name: string, value: DashboardFilterValue | undefined) => void
  onClear: () => void
  onReadyChange: (name: string, ready: boolean) => void
}) {
  if (inputs.length === 0) return null

  const dirty = inputs.some(
    (input) => values[input.name] !== defaultDashboardFilter(input)
  )

  return (
    <Flex
      direction="column"
      gap="xsmall"
    >
      <CaptionP $color="text-light">Filter by</CaptionP>
      <Flex
        gap="small"
        wrap="wrap"
        align="center"
      >
        {inputs.map((input) => (
          <DashboardInputControl
            key={input.name}
            dashboardId={dashboardId}
            input={input}
            value={values[input.name]}
            variables={variables}
            timeRange={timeRange}
            onChange={(value) => onChange(input.name, value)}
            onReadyChange={onReadyChange}
          />
        ))}
        {dirty && (
          <Button
            small
            tertiary
            onClick={onClear}
          >
            Clear
          </Button>
        )}
      </Flex>
    </Flex>
  )
}

function DashboardInputControl({
  dashboardId,
  input,
  value,
  variables,
  timeRange,
  onChange,
  onReadyChange,
}: {
  dashboardId: string
  input: WorkbenchDashboardInput
  value: DashboardFilterValue | undefined
  variables: Record<string, string>
  timeRange: DashboardTimeRangeAttributes
  onChange: (value: DashboardFilterValue | undefined) => void
  onReadyChange: (name: string, ready: boolean) => void
}) {
  const hasDatasource = !!input.datasource
  const { data, loading } = useWorkbenchDashboardInputQuery({
    variables: {
      id: dashboardId,
      identifier: input.name,
      input: JSON.stringify(omit(variables, input.name)),
      timeRange,
    },
    skip: !hasDatasource,
    fetchPolicy: 'cache-and-network',
  })
  const dynamicOptions =
    data?.workbenchDashboard?.input?.filter(isNonNullable) ?? []
  const staticOptions = input.options?.filter(isNonNullable) ?? []
  const options =
    hasDatasource && dynamicOptions.length > 0 ? dynamicOptions : staticOptions
  const placeholder = input.label ?? input.name
  const optionInput =
    input.type === DashboardInputType.Select ||
    input.type === DashboardInputType.Boolean ||
    (input.type === DashboardInputType.TimeRange &&
      (hasDatasource || staticOptions.length > 0))
  const booleanInput = input.type === DashboardInputType.Boolean
  const hasValidValue =
    !!value &&
    (!optionInput ||
      (booleanInput
        ? BOOLEAN_OPTIONS.includes(value)
        : options.includes(value)))
  const firstOption = booleanInput ? BOOLEAN_OPTIONS[0] : options[0]
  const ready =
    (!hasDatasource || !loading) &&
    (!optionInput || hasValidValue) &&
    (!input.required || !!value)

  useEffect(() => {
    onReadyChange(input.name, ready)
    return () => onReadyChange(input.name, false)
  }, [input.name, onReadyChange, ready])

  useEffect(() => {
    if (
      optionInput &&
      (!hasDatasource || !loading) &&
      !hasValidValue &&
      firstOption
    ) {
      onChange(firstOption)
    }
  }, [
    firstOption,
    hasDatasource,
    hasValidValue,
    loading,
    onChange,
    optionInput,
  ])

  switch (input.type) {
    case DashboardInputType.Text:
    case DashboardInputType.Number:
      return (
        <Input
          size="small"
          width={240}
          placeholder={placeholder}
          aria-label={placeholder}
          value={value ?? ''}
          onChange={(e) => onChange(e.currentTarget.value || undefined)}
        />
      )
    case DashboardInputType.Boolean:
      return (
        <Select
          size="small"
          width={240}
          label={placeholder}
          aria-label={placeholder}
          selectedKey={value ?? null}
          onSelectionChange={(key) =>
            onChange(key == null ? undefined : String(key))
          }
        >
          <ListBoxItem
            key="true"
            label="True"
          />
          <ListBoxItem
            key="false"
            label="False"
          />
        </Select>
      )
    case DashboardInputType.TimeRange:
      // The global range control owns the query time range; a time-range
      // input only customizes its own template variable.
      if (staticOptions.length === 0 && !hasDatasource)
        return (
          <Input
            size="small"
            width={240}
            placeholder={placeholder}
            aria-label={placeholder}
            value={value ?? ''}
            onChange={(e) => onChange(e.currentTarget.value || undefined)}
          />
        )
      break
    case DashboardInputType.Select:
      break
  }

  return (
    <Select
      size="small"
      width={240}
      label={placeholder}
      aria-label={placeholder}
      selectedKey={value ?? null}
      onSelectionChange={(key) =>
        onChange(key == null ? undefined : String(key))
      }
      isDisabled={loading && options.length === 0}
    >
      {options.map((option) => (
        <ListBoxItem
          key={option}
          label={option}
        />
      ))}
    </Select>
  )
}
