import { CodeEditor } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useUpdateDeploymentSettingsMutation } from 'generated/graphql'
import { useState } from 'react'

import { GridTableWrapper } from 'components/utils/layout/ResponsiveGridLayouts'

import ConsolePageTitle from 'components/utils/layout/ConsolePageTitle'

import { ListWrapperSC } from '../usermanagement/users/UsersList'

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
    <ListWrapperSC>
      <ConsolePageTitle heading="Manage Agent Configuration" />
      {error && (
        <GqlError
          error={error}
          header="Failed to update agent settings"
        />
      )}
      <GridTableWrapper>
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
      </GridTableWrapper>
    </ListWrapperSC>
  )
}
