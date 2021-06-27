import React, { useCallback, useContext, useEffect, useState } from 'react'
import { useParams, useHistory } from 'react-router-dom'
import { useQuery, useMutation } from 'react-apollo'
import { APPLICATION_Q, UPDATE_CONFIGURATION } from './graphql/forge'
import { Button } from 'forge-core'
import { Box, Text } from 'grommet'
import { BreadcrumbsContext } from './Breadcrumbs'
import { BUILD_PADDING } from './Builds'
import { FormNext } from 'grommet-icons'
import AceEditor from "react-ace"
import "ace-builds/src-noconflict/mode-yaml"
import "ace-builds/src-noconflict/theme-terminal"
import { ApplicationIcon, hasIcon, InstallationContext, useEnsureCurrent } from './Installations'
import { TabHeader } from './utils/TabSelector'
import { Loading } from './utils/Loading'

const ConfigType = {
  HELM: 'HELM',
  TERRAFORM: 'TERRAFORM'
}

export function EditConfiguration({onCompleted, application: {name, configuration: {helm, terraform}, ...application}}) {
  const [type, setType] = useState(ConfigType.HELM)
  const [config, setConfig] = useState(helm)
  const [mutation, {loading}] = useMutation(UPDATE_CONFIGURATION, {
    variables: {repository: name, content: config, type},
    onCompleted
  })
  const swap = useCallback((type) => {
    setConfig(type === ConfigType.HELM ? helm : terraform)
    setType(type)
  }, [setConfig, setType])
  useEffect(() => {
    setType(ConfigType.HELM)
    setConfig(helm)
  }, [name])

  return (
    <Box fill>
      <Box gap='small'>
        <Box
          pad={{...BUILD_PADDING}}
          direction='row'
          align='center'
          background='backgroundColor'
          height='80px'>
          <Box fill='horizontal'>
            <Box direction='row' fill='horizontal' gap='small' align='center' pad={{vertical: 'xsmall'}}>
              {hasIcon(application) && <ApplicationIcon application={application} size='30px' />}
              <Text weight='bold' size='small'>Edit {name}</Text>
            </Box>
            <Box direction='row'>
              <TabHeader selected={type === ConfigType.HELM} text='helm' onClick={() => swap(ConfigType.HELM)} />
              <TabHeader selected={type === ConfigType.TERRAFORM} text='terraform' onClick={() => swap(ConfigType.TERRAFORM)} />
            </Box>
          </Box>
          <Box flex={false}>
            <Button flat label='Commit' onClick={mutation} background='brand' loading={loading} />
          </Box>
        </Box>
      </Box>
      <AceEditor
        mode={type === ConfigType.HELM ? 'yaml' : 'terraform'}
        theme='terminal'
        height='calc(100vh - 125px)'
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
  let history = useHistory()
  const {repo} = useParams()
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  const {setOnChange} = useContext(InstallationContext)
  const {data} = useQuery(APPLICATION_Q, {
    variables: {name: repo},
    fetchPolicy: 'cache-and-network'
  })
  const onCompleted = useCallback(() => { history.push('/') }, [history])

  useEffect(() => {
    setBreadcrumbs([
      {text: 'configuration', url: '/config'},
      {text: repo, url: `/config/${repo}`}
    ])
  }, [repo])

  useEffect(() => {
    setOnChange({func: ({name}) => history.push(`/config/${name}`)})
  }, [])

  useEnsureCurrent(repo)

  if (!data) return <Loading />

  return (
    <EditConfiguration 
      application={data.application} 
      onCompleted={onCompleted} />
  )
}