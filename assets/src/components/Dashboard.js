import React from 'react'
import { useQuery } from 'react-apollo'
import { Loading } from 'forge-core'
import yaml from 'js-yaml'
import AceEditor from "react-ace"
import "ace-builds/src-noconflict/mode-yaml"
import "ace-builds/src-noconflict/theme-terminal"
import { DASHBOARD_Q } from './graphql/dashboards'
import { Box } from 'grommet'

export default function Dashboard({repo, name}) {
  const {data} = useQuery(DASHBOARD_Q, {variables: {repo, name}})

  if (!data) return <Loading />
  const {dashboard} = data

  return (
    <Box fill>
      <AceEditor
        mode='yaml'
        theme='terminal'
        height='calc(100vh - 105px)'
        width='100%'
        name={name}
        value={yaml.safeDump(dashboard)}
        showGutter
        showPrintMargin
        highlightActiveLine
        editorProps={{ $blockScrolling: true }} />
    </Box>
  )
}