import {
  Flex,
  FormField,
  ListBoxItem,
  Select,
  Switch,
} from '@pluralsh/design-system'
import { ScmType } from 'generated/graphql'

import { scmTypeToIcon, scmTypeToLabel } from './PrScmConnectionsColumns'

function GitProviderSelect({
  selectedKey,
  updateSelectedKey,
  ghAppAuth,
  setGhAppAuth,
}: {
  selectedKey: ScmType | undefined
  updateSelectedKey: (key: ScmType | undefined) => void
  ghAppAuth: boolean
  setGhAppAuth: (ghAppAuth: boolean) => void
}) {
  return (
    <FormField
      label="Provider type"
      required
    >
      <Flex
        gap="medium"
        width="100%"
      >
        <div css={{ flex: 1 }}>
          <Select
            selectedKey={selectedKey}
            leftContent={
              !selectedKey ? undefined : scmTypeToIcon[selectedKey || '']
            }
            label="Select provider type"
            onSelectionChange={(key) => {
              updateSelectedKey(key as ScmType)
              if (key !== ScmType.Github) setGhAppAuth(false)
            }}
          >
            {[ScmType.Github, ScmType.Gitlab, ScmType.Bitbucket].map((type) => (
              <ListBoxItem
                key={type}
                leftContent={scmTypeToIcon[type]}
                label={scmTypeToLabel[type]}
              />
            ))}
          </Select>
        </div>
        {selectedKey === ScmType.Github && (
          <Switch
            checked={ghAppAuth}
            onChange={setGhAppAuth}
          >
            Use GitHub App Auth
          </Switch>
        )}
      </Flex>
    </FormField>
  )
}

export default GitProviderSelect
