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
import { isNonNullable } from 'utils/isNonNullable'

export type DashboardFilterValue = string | string[]

export function defaultDashboardFilter(
  input: WorkbenchDashboardInput
): DashboardFilterValue | undefined {
  if (input.default == null || input.default === '') return undefined
  return input.type === DashboardInputType.MultiSelect
    ? [input.default]
    : input.default
}

function filterEquals(
  a: DashboardFilterValue | undefined,
  b: DashboardFilterValue | undefined
) {
  if (Array.isArray(a) || Array.isArray(b))
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((value, i) => value === b[i])
    )
  return (a ?? undefined) === (b ?? undefined)
}

export function WorkbenchDashboardFilters({
  dashboardId,
  inputs,
  values,
  variables,
  timeRange,
  onChange,
  onClear,
}: {
  dashboardId: string
  inputs: WorkbenchDashboardInput[]
  values: Record<string, DashboardFilterValue | undefined>
  variables: Record<string, string | string[]>
  timeRange: DashboardTimeRangeAttributes
  onChange: (name: string, value: DashboardFilterValue | undefined) => void
  onClear: () => void
}) {
  if (inputs.length === 0) return null

  const dirty = inputs.some(
    (input) => !filterEquals(values[input.name], defaultDashboardFilter(input))
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
}: {
  dashboardId: string
  input: WorkbenchDashboardInput
  value: DashboardFilterValue | undefined
  variables: Record<string, string | string[]>
  timeRange: DashboardTimeRangeAttributes
  onChange: (value: DashboardFilterValue | undefined) => void
}) {
  const hasDatasource = !!input.datasource
  const { data, loading } = useWorkbenchDashboardInputQuery({
    variables: {
      id: dashboardId,
      identifier: input.name,
      // Absinthe :json only accepts string-encoded JSON, not raw objects.
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
  const singleValue = typeof value === 'string' ? value : undefined

  switch (input.type) {
    case DashboardInputType.MultiSelect:
      return (
        <Select
          size="small"
          width={240}
          label={placeholder}
          aria-label={placeholder}
          selectionMode="multiple"
          selectedKeys={new Set(Array.isArray(value) ? value : [])}
          onSelectionChange={(keys) => {
            const next = Array.from(keys).map((key) => String(key))
            onChange(next.length > 0 ? next : undefined)
          }}
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
    case DashboardInputType.Text:
    case DashboardInputType.Number:
      return (
        <Input
          size="small"
          width={240}
          placeholder={placeholder}
          aria-label={placeholder}
          value={singleValue ?? ''}
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
          selectedKey={singleValue ?? null}
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
            value={singleValue ?? ''}
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
      selectedKey={singleValue ?? null}
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
