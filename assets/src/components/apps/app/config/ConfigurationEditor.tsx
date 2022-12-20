import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UPDATE_CONFIGURATION } from 'components/graphql/plural'
import { Button } from 'forge-core'
import { useMutation } from 'react-apollo'
import { Box } from 'grommet'
import AceEditor from 'react-ace'

import 'ace-builds/src-noconflict/mode-yaml'
import 'ace-builds/src-noconflict/theme-terminal'

import { ConfigType } from './misc'

export function ConfigurationEditor({ application: { name, configuration: { helm, terraform } }, view }) {
  const navigate = useNavigate()
  const [config, setConfig] = useState<any>(helm)
  const onCompleted = useCallback(() => navigate('/'), [navigate])
  const [mutation, { loading }] = useMutation(UPDATE_CONFIGURATION, {
    variables: { repository: name, content: config, type: view },
    onCompleted,
  })

  useEffect(() => setConfig(view === ConfigType.HELM ? helm : terraform), [view, helm, terraform])

  return (
    <Box fill>
      <Button
        flat
        label="Commit"
        onClick={mutation}
        background="brand"
        loading={loading}
      />
      <AceEditor
        mode={view === ConfigType.HELM ? 'yaml' : 'terraform'}
        theme="terminal"
        height="calc(100vh - 125px)"
        width="100%"
        name={name}
        value={config}
        showGutter
        showPrintMargin
        highlightActiveLine
        editorProps={{ $blockScrolling: true }}
        onChange={setConfig}
      />
    </Box>
  )
}
