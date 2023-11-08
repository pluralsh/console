import { Input, ListBoxItem, Select, Switch } from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'
import { AddOnConfigurationFragment } from 'generated/graphql'

import { parseToBool } from 'utils/parseToBool'

import { ConfigurationType } from './configurationUtils'

export function ConfigurationInput({
  config,
  value,
  setValue,
}: {
  config: AddOnConfigurationFragment
  setValue: (value: string) => void
  value: string
}) {
  const { name, type, values } = config
  let configBoolVal = false

  if (type === ConfigurationType.Boolean) {
    configBoolVal = parseToBool(value)
  }

  return type === ConfigurationType.Boolean ? (
    <Switch
      checked={!!configBoolVal}
      onChange={(isChecked) => {
        setValue(isChecked.toString())
      }}
    />
  ) : type === ConfigurationType.Select && !isEmpty(values) ? (
    <Select
      label={`Select ${name}`}
      selectedKey={value}
      onSelectionChange={(key) => {
        setValue(key as string)
      }}
    >
      {values?.map((value) => (
        <ListBoxItem
          key={value as string}
          label={value}
        />
      )) || []}
    </Select>
  ) : (
    <Input
      value={value}
      onChange={(e) => {
        setValue(e.currentTarget.value)
      }}
    />
  )
}
