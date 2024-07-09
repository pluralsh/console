import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { useUpdateDeploymentSettingsMutation } from 'generated/graphql'
import { GqlError } from 'components/utils/Alert'
import { CodeEditor } from '@pluralsh/design-system'
import { useState } from 'react'

import { useGlobalSettingsContext } from './GlobalSettings'

const INTRO_TEXT =
  '# Add any agent helm values here\n' +
  '# this will reconfigure all agents to use these default values.\n' +
  '# please double-check before modifying'

export function GlobalSettingsAgents() {
  const { deploymentSettings } = useGlobalSettingsContext()
  const intro = deploymentSettings?.agentHelmValues || INTRO_TEXT
  const [values, setValues] = useState(intro)
  const [updateSettings, { loading, error }] =
    useUpdateDeploymentSettingsMutation()

  return (
    <ScrollablePage
      heading="Manage Agent Configuration"
      gap="medium"
      scrollable={false}
    >
      {error && (
        <GqlError
          error={error}
          header="Failed to update agent settings"
        />
      )}
      <CodeEditor
        value={intro}
        language="yaml"
        save
        saving={loading}
        onChange={setValues}
        onSave={() =>
          updateSettings({
            variables: { attributes: { agentHelmValues: values } },
          })
        }
        saveLabel="Configure"
      />
    </ScrollablePage>
  )
}
