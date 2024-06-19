import { Input, ListBoxItem, Select, Switch } from '@pluralsh/design-system'
import { ConfigurationType, PrConfiguration } from 'generated/graphql'

import { parseToBool } from 'utils/parseToBool'

export function PrConfigurationInput({
  config,
  value,
  setValue,
}: {
  config: Nullable<PrConfiguration>
  setValue: (value: string) => void
  value: string
}) {
  if (!config) return null

  const { type } = config
  let configBoolVal = false

  if (type === ConfigurationType.Bool) {
    configBoolVal = parseToBool(value)
  }

  switch (type) {
    case ConfigurationType.Bool:
      return (
        <Switch
          checked={!!configBoolVal}
          onChange={(isChecked) => {
            setValue(isChecked.toString())
          }}
        />
      )
    case ConfigurationType.Enum:
      return (
        <Select
          selectedKey={value}
          onSelectionChange={(key) => setValue(key as string)}
        >
          {(config?.values || [])?.map((val, index) => (
            <ListBoxItem
              key={`${index}`}
              label={val}
              textValue={val ?? ''}
            />
          ))}
        </Select>
      )
    default:
      return (
        <Input
          value={value}
          placeContent={config.placeholder}
          onChange={(e) => {
            setValue(e.currentTarget.value)
          }}
        />
      )
  }
}
