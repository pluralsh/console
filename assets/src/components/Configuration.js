import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useParams, useHistory } from 'react-router-dom'
import { useQuery, useMutation } from 'react-apollo'
import { APPLICATION_Q, UPDATE_CONFIGURATION } from './graphql/plural'
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
import { LoopingLogo } from './utils/AnimatedLogo'
import gql from 'graphql-tag'
import { BuildFragment } from './graphql/builds'
import { LabelledInput } from './utils/LabelledInput'
import { convertType } from './runbooks/Display'
import { DarkSelect } from './utils/Select'
import { chunk } from 'lodash'
import yaml from 'js-yaml'
import { deepFetch } from '../utils/graphql'

const ConfigType = {
  HELM: 'HELM',
  TERRAFORM: 'TERRAFORM',
  OVERLAY: 'OVERLAY',
}

const EXECUTE_OVERLAY = gql`
  mutation Execute($name: String!, $ctx: Map!) {
    overlayConfiguration(namespace: $name, context: $ctx) { ...BuildFragment }
  }
  ${BuildFragment}
`;

function BaseInput({overlay: {spec}, value, setValue}) {
  return (
    <LabelledInput
      name={spec.name}
      label={spec.name}
      value={`${value || ''}`}
      onChange={setValue} />
  )
}

function SelectInput({overlay: {spec}, value, setValue}) {
  const values = useMemo(() => spec.inputValues?.map((v) => ({label: v, value: v})), [spec])

  return (
    <DarkSelect
      options={values}
      value={values.find(({val}) => val === value)}
      onChange={({value}) => setValue(value)} />
  )
}

const INPUT_COMPONENTS = {
  enum: SelectInput
}

function OverlayInput({overlay, ctx, setCtx, values}) {
  const name = overlay.spec.name
  const setValue = useCallback((val) => {
    setCtx({...ctx, [name]: convertType(val, overlay.spec.inputType)})
  }, [name, overlay.spec, ctx, setCtx])

  useEffect(() => {
    const update = overlay.spec.updates[0].path
    const val = deepFetch(values, update)
    if (val && !ctx[name]) { setValue(val) }
  }, [ctx])

  const component = INPUT_COMPONENTS[overlay.spec.inputType] || BaseInput

  return (
    <Box gap='xsmall'>
      {React.createElement(component, {overlay, setValue, value: ctx[name]})}
      <Text size='small' color='dark-3'><i>{overlay.spec.documentation}</i></Text>
    </Box>
  )
}

function OverlayEdit({overlays, ctx, setCtx, helm}) {
  const values = useMemo(() => yaml.load(helm), [helm])

  return (
    <Box style={{overflow: 'auto'}} fill>
      <Box flex={false} pad='medium' gap='medium'>
        {chunk(overlays, 2).map((chunk, ind) => (
          <Box key={`${ind}`} direction='row' align='center' gap='medium'>
            {chunk.map((overlay) => (
              <Box key={overlay.metadata.name}  width='50%'>
                <OverlayInput 
                  overlay={overlay} 
                  values={values}
                  ctx={ctx} 
                  setCtx={setCtx} />
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export function EditConfiguration({onCompleted, overlays, application: {name, configuration: {helm, terraform}, ...application}}) {
  const hasOverlays = overlays.length > 0
  const [type, setType] = useState(hasOverlays ? ConfigType.OVERLAY : ConfigType.HELM)
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
    if (!hasOverlays) setType(ConfigType.HELM)
    setConfig(helm)
  }, [hasOverlays, name])

  const [ctx, setCtx] = useState({})
  const [oMutation, {loading: oLoading}] = useMutation(EXECUTE_OVERLAY, {
    variables: {name, ctx: JSON.stringify(ctx)},
    onCompleted
  })

  return (
    <Box fill background='backgroundColor'>
      <Box flex={false} gap='small'>
        <Box pad={BUILD_PADDING} direction='row' align='center' height='80px'>
          <Box fill='horizontal'>
            <Box direction='row' fill='horizontal' gap='small' align='center' pad={{vertical: 'xsmall'}}>
              {hasIcon(application) && <ApplicationIcon application={application} size='30px' dark />}
              <Text weight='bold' size='small'>Edit {name}</Text>
            </Box>
            <Box direction='row'>
              {hasOverlays > 0 && (
                <TabHeader 
                  selected={type === ConfigType.OVERLAY} 
                  text='Configure' 
                  onClick={() => setType(ConfigType.OVERLAY)} />
              )}
              <TabHeader selected={type === ConfigType.HELM} text='helm' onClick={() => swap(ConfigType.HELM)} />
              <TabHeader selected={type === ConfigType.TERRAFORM} text='terraform' onClick={() => swap(ConfigType.TERRAFORM)} />
            </Box>
          </Box>
          <Box flex={false}>
            <Button 
              flat 
              label='Commit' 
              onClick={type === ConfigType.OVERLAY ? oMutation : mutation} 
              background='brand' 
              loading={type === ConfigType.OVERLAY ? oLoading : loading} />
          </Box>
        </Box>
      </Box>
      {type === ConfigType.OVERLAY && (
        <OverlayEdit 
          overlays={overlays}
          ctx={ctx}
          setCtx={setCtx}
          helm={helm} />
      )}
      {type !== ConfigType.OVERLAY && (
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
      )}
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

  if (!data) return <LoopingLogo scale='0.75' dark />

  return (
    <EditConfiguration 
      application={data.application} 
      overlays={data.configurationOverlays}
      onCompleted={onCompleted} />
  )
}