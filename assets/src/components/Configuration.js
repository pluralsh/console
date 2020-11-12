import React, { useCallback, useContext, useEffect, useState } from 'react'
import { useParams, useHistory } from 'react-router-dom'
import { useQuery, useMutation } from 'react-apollo'
import { APPLICATION_Q, CONFIGURATIONS_Q, UPDATE_CONFIGURATION } from './graphql/forge'
import { Loading, Button } from 'forge-core'
import { Box, Text } from 'grommet'
import { BreadcrumbsContext } from './Breadcrumbs'
import { BUILD_PADDING } from './Builds'
import { FormNext } from 'grommet-icons'
import AceEditor from "react-ace"
import "ace-builds/src-noconflict/mode-yaml"
import "ace-builds/src-noconflict/theme-terminal"
import { ApplicationIcon, hasIcon, InstallationContext, useEnsureCurrent } from './Installations'
import { TabHeader } from './utils/TabSelector'

const ConfigType = {
  HELM: 'HELM',
  TERRAFORM: 'TERRAFORM'
}

export function EditConfiguration({refetch, application: {name, configuration: {helm, terraform}, ...application}}) {
  const [type, setType] = useState(ConfigType.HELM)
  const [config, setConfig] = useState(helm)
  const [mutation, {loading}] = useMutation(UPDATE_CONFIGURATION, {
    variables: {repository: name, content: config, type},
    onCompleted: refetch
  })
  const swap = useCallback((type) => {
    setConfig(type === ConfigType.HELM ? helm : terraform)
    setType(type)
  })

  return (
    <Box height='calc(100vh - 45px)'>
      <Box gap='small'>
        <Box
          pad={{vertical: 'small', ...BUILD_PADDING}}
          direction='row'
          align='center'
          background='backgroundColor'
          height='60px'>
          <Box fill='horizontal'>
            <Box direction='row' fill='horizontal' gap='small' align='center'>
              {hasIcon(application) && <ApplicationIcon application={application} />}
              <Text weight='bold' size='small'>Edit {name}</Text>
            </Box>
            <Box direction='row'>
              <TabHeader selected={type === ConfigType.HELM} text='helm' onClick={() => swap(ConfigType.HELM)} />
              <TabHeader selected={type === ConfigType.TERRAFORM} text='terraform' onClick={() => swap(ConfigType.TERRAFORM)} />
            </Box>
          </Box>
          <Box flex={false}>
            <Button label='Commit' onClick={mutation} loading={loading} />
          </Box>
        </Box>
      </Box>
      <AceEditor
        mode={type === ConfigType.HELM ? 'yaml' : 'terraform'}
        theme='terminal'
        height='calc(100vh - 105px)'
        width='100%'
        name={name}
        value={config}
        showGutter
        showPrintMargin
        highlightActiveLine
        editorProps={{ $blockScrolling: true }}
        onChange={setConfig} />
    </Box>
  )
}

export function RepositoryChoice({config: {name, icon, description}, link}) {
  let history = useHistory()

  return (
    <Box
      onClick={() => history.push(link)}
      width='50%'
      hoverIndicator='backgroundDark'
      background='cardDetailLight'
      direction='row'
      align='center'
      justify='center'
      round='xsmall'
      pad='medium'>
      <Box direction='row' fill='horizontal' gap='small' align='center'>
        {icon && <img alt='' src={icon} height='40px' width='40px' />}
        <Box>
          <Text size='small' style={{fontWeight: 500}}>{name}</Text>
          <Text size='small' color='dark-6'>{description}</Text>
        </Box>
      </Box>
      <Box flex={false}>
        <FormNext size='25px' />
      </Box>
    </Box>
  )
}

export default function Configuration() {
  const {repo} = useParams()
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  const {setOnChange} = useContext(InstallationContext)
  let history = useHistory()
  const {data, refetch} = useQuery(APPLICATION_Q, {
    variables: {name: repo},
    fetchPolicy: 'cache-and-network'
  })
  useEffect(() => {
    setBreadcrumbs([
      {text: 'configuration', url: '/config'},
      {text: repo, url: `/config/${repo}`}
    ])
  }, [repo])
  useEffect(() => {
    setOnChange({func: ({name}) => history.push(`/dashboards/${name}`)})
  }, [])
  useEnsureCurrent(repo)

  if (!data) return <Loading />

  return <EditConfiguration application={data.application} refetch={refetch} />
}