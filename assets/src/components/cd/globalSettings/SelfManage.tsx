import { CodeEditor } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useSelfManageMutation } from 'generated/graphql'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const INTRO_TEXT =
  '# Paste your helm values file here\n' +
  '# this will create a service that will auto-update your instance\n' +
  '# with these values persisted throughout'

export default function SelfManage() {
  const navigate = useNavigate()
  const [values, setValues] = useState(INTRO_TEXT)
  const [mutation, { loading, error }] = useSelfManageMutation({
    variables: { values },
    onCompleted: () => navigate('/cd/services'),
  })

  return (
    <ScrollablePage
      heading="Configure Automatic Upgrades"
      gap="medium"
      scrollable={false}
    >
      {error && (
        <GqlError
          error={error}
          header="Failed to update service"
        />
      )}
      <CodeEditor
        value={INTRO_TEXT}
        language="yaml"
        save
        saving={loading}
        onChange={setValues}
        onSave={() => mutation()}
        saveLabel="Configure"
      />
    </ScrollablePage>
  )
}
