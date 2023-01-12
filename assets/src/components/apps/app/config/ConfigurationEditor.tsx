import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UPDATE_CONFIGURATION } from 'components/graphql/plural'
import { useMutation } from '@apollo/client'

import { CodeEditor } from '@pluralsh/design-system'

import { ConfigType } from './misc'

export function ConfigurationEditor({ application: { name: repository, configuration: { helm, terraform } }, view }) {
  const navigate = useNavigate()
  const [content, setContent] = useState<any>(helm)
  const onCompleted = useCallback(() => navigate('/'), [navigate])
  const [mutation, { loading }] = useMutation(UPDATE_CONFIGURATION, {
    variables: { repository, content, type: view }, onCompleted,
  })

  return (
    <CodeEditor
      value={view === ConfigType.HELM ? helm : terraform}
      language={view === ConfigType.HELM ? 'yaml' : 'hcl'}
      save
      saving={loading}
      onSave={value => {
        setContent(value)
        mutation()
      }}
      saveLabel="Commit"
    />
  )
}
