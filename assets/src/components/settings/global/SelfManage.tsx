import { CodeEditor, useSetBreadcrumbs } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useSelfManageMutation } from 'generated/graphql'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ConsolePageTitle from 'components/utils/layout/ConsolePageTitle'
import { GridTableWrapper } from 'components/utils/layout/ResponsiveGridLayouts'

import { ListWrapperSC } from '../usermanagement/users/UsersList'

import { getGlobalSettingsBreadcrumbs } from './GlobalSettings'

const INTRO_TEXT =
  '# Paste your helm values file here\n' +
  '# this will create a service that will auto-update your instance\n' +
  '# with these values persisted throughout'

const breadcrumbs = getGlobalSettingsBreadcrumbs('auto-update')

export default function SelfManage() {
  useSetBreadcrumbs(breadcrumbs)
  const navigate = useNavigate()
  const [values, setValues] = useState(INTRO_TEXT)
  const [mutation, { loading, error }] = useSelfManageMutation({
    variables: { values },
    onCompleted: () => navigate('/cd/services'),
  })

  return (
    <ListWrapperSC>
      <ConsolePageTitle heading="Configure Automatic Upgrades" />

      {error && (
        <GqlError
          error={error}
          header="Failed to update service"
        />
      )}
      <GridTableWrapper>
        <CodeEditor
          value={INTRO_TEXT}
          language="yaml"
          save
          saving={loading}
          onChange={setValues}
          onSave={() => mutation()}
          saveLabel="Configure"
        />
      </GridTableWrapper>
    </ListWrapperSC>
  )
}
