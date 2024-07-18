import { FormField, ListBoxItem, Select } from '@pluralsh/design-system'
import { ScmType } from 'generated/graphql'

import { scmTypeToIcon, scmTypeToLabel } from './PrScmConnectionsColumns'

function GitProviderSelect({
  selectedKey,
  updateSelectedKey,
}: {
  selectedKey: ScmType | undefined
  updateSelectedKey: (key: ScmType | undefined) => void
}) {
  return (
    <FormField
      label="Provider type"
      required
    >
      <Select
        selectedKey={selectedKey}
        leftContent={
          !selectedKey ? undefined : scmTypeToIcon[selectedKey || '']
        }
        label="Select provider type"
        onSelectionChange={(key) => updateSelectedKey(key as ScmType)}
      >
        {[ScmType.Github, ScmType.Gitlab, ScmType.Bitbucket].map((type) => (
          <ListBoxItem
            key={type}
            leftContent={scmTypeToIcon[type]}
            label={scmTypeToLabel[type]}
          />
        ))}
      </Select>
    </FormField>
  )
}

export default GitProviderSelect
