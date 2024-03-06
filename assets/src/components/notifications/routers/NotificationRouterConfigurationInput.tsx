import { Input, Switch } from '@pluralsh/design-system'
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

  return type === ConfigurationType.Bool ? (
    <Switch
      checked={!!configBoolVal}
      onChange={(isChecked) => {
        setValue(isChecked.toString())
      }}
    />
  ) : (
    <Input
      value={value}
      placeContent={config.placeholder}
      onChange={(e) => {
        setValue(e.currentTarget.value)
      }}
    />
  )
}
