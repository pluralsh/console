import { FormField, ListBoxItem, Select } from '@pluralsh/design-system'
import { ObservabilityProviderType } from 'generated/graphql'

import {
  observabilityproviderTypeToIcon,
  observabilityproviderTypeToLabel,
} from './ObservabilityProvidersColumns'

function ObservabilityProviderSelect({
  selectedKey,
  updateSelectedKey,
}: {
  selectedKey: ObservabilityProviderType | undefined
  updateSelectedKey: (key: ObservabilityProviderType | undefined) => void
}) {
  return (
    <FormField
      label="Provider type"
      required
    >
      <Select
        selectedKey={selectedKey}
        leftContent={
          !selectedKey
            ? undefined
            : observabilityproviderTypeToIcon[selectedKey || '']
        }
        label="Select provider type"
        onSelectionChange={(key) =>
          updateSelectedKey(key as ObservabilityProviderType)
        }
      >
        {[
          ObservabilityProviderType.Datadog,
          ObservabilityProviderType.Newrelic,
        ].map((type) => (
          <ListBoxItem
            key={type}
            leftContent={observabilityproviderTypeToIcon[type]}
            label={observabilityproviderTypeToLabel[type]}
          />
        ))}
      </Select>
    </FormField>
  )
}

export default ObservabilityProviderSelect
