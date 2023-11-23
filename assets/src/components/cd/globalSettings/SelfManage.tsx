import { Callout, CodeEditor } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useSelfManageMutation } from 'generated/graphql'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SelfManage() {
  const navigate = useNavigate()
  const [values, setValues] = useState('')
  const [mutation, { loading, error }] = useSelfManageMutation({
    variables: { values },
    onCompleted: () => navigate('/cd/services'),
  })

  return (
    <ScrollablePage heading="Configure Automatic Upgrades">
      {error && (
        <GqlError
          error={error}
          header="Failed to update service"
        />
      )}
      <Callout
        severity="info"
        title="Auto-Upgrading"
      >
        This will configure CD to fully manage itself, accepting updates from
        our upstream helm charts. You should post your current values file in
        the text editor below to ensure current settings remain preserved, and
        these can be managed in the future via our API or the service interface
        here.
      </Callout>
      <CodeEditor
        value={values}
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
