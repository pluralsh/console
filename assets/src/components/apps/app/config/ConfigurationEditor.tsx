import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UPDATE_CONFIGURATION } from 'components/graphql/plural'
import { useMutation } from '@apollo/client'

import { CodeEditor } from '@pluralsh/design-system'

import { ConfigType } from './misc'

export function ConfigurationEditor({ application: { name: repository, configuration: { helm, terraform } }, type }) {
  const navigate = useNavigate()
  const [content, setContent] = useState<string>(helm)
  const onCompleted = useCallback(() => navigate('/builds'), [navigate])
  const [mutation, { loading }] = useMutation(UPDATE_CONFIGURATION, {
    variables: { repository, content, type }, onCompleted,
  })

  return (
    <CodeEditor
      value={type === ConfigType.HELM ? helm : terraform}
      language={type === ConfigType.HELM ? 'yaml' : 'hcl'}
      save
      saving={loading}
      onChange={setContent}
      onSave={() => mutation()}
      saveLabel="Commit"
    />
  )
}
