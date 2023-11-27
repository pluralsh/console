import { SERVICE_PARAM_ID } from 'routes/cdRoutesConsts'
import {
  useServiceDeploymentSecretsQuery,
  useUpdateServiceDeploymentMutation,
} from 'generated/graphql'
import { useNavigate, useParams } from 'react-router-dom'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useEffect, useState } from 'react'
import { CodeEditor } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'

function EmptyState({ error }) {
  return (
    error && (
      <GqlError
        error={error}
        header="Cannot read helm configuration"
      />
    )
  )
}

export default function ServiceHelm() {
  const navigate = useNavigate()
  const serviceId = useParams()[SERVICE_PARAM_ID]
  const [values, setValues] = useState('')

  const [mutation, { loading, error }] = useUpdateServiceDeploymentMutation({
    variables: {
      id: serviceId || '',
      attributes: {
        helm: { values },
      },
    },
    onCompleted: () => navigate('/cd/services'),
  })
  const { data, error: fetchError } = useServiceDeploymentSecretsQuery({
    variables: { id: serviceId || '' },
  })

  useEffect(() => {
    if (data?.serviceDeployment?.helm?.values) {
      setValues(data?.serviceDeployment?.helm?.values)
    }
  }, [data])

  if (!data?.serviceDeployment?.helm) return <EmptyState error={fetchError} />

  return (
    <ScrollablePage
      heading="Helm"
      scrollable={false}
    >
      {error && (
        <GqlError
          error={error}
          header="Failed to update service"
        />
      )}
      <CodeEditor
        value={data?.serviceDeployment?.helm?.values || ''}
        language="yaml"
        save
        saving={loading}
        onChange={setValues}
        onSave={() => mutation()}
        saveLabel="Save"
      />
    </ScrollablePage>
  )
}
