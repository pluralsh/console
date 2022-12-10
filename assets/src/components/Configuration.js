import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { useMutation, useQuery } from 'react-apollo'

import { Button, GqlError } from 'forge-core'

import { Box, Text } from 'grommet'

import { FormNext } from 'grommet-icons'

import AceEditor from 'react-ace'

import gql from 'graphql-tag'

import { chunk } from 'lodash'

import yaml from 'js-yaml'

import { deepFetch } from '../utils/graphql'

import { APPLICATION_Q, UPDATE_CONFIGURATION } from './graphql/plural'

import { BreadcrumbsContext } from './Breadcrumbs'
import { BUILD_PADDING } from './Builds'

import 'ace-builds/src-noconflict/mode-yaml'
import 'ace-builds/src-noconflict/theme-terminal'
import { ApplicationIcon, InstallationContext, hasIcon, useEnsureCurrent } from './Installations'
import { TabHeader } from './utils/TabSelector'
import { LoopingLogo } from './utils/AnimatedLogo'

import { BuildFragment } from './graphql/builds'
import { LabelledInput } from './utils/LabelledInput'
import { convertType } from './runbooks/Display'
import { DarkSelect } from './utils/Select'

import { COMPONENT_LABEL } from './kubernetes/constants'
import { SidebarTab } from './utils/SidebarTab'

const ConfigType = {
  HELM: 'HELM',
  TERRAFORM: 'TERRAFORM',
  OVERLAY: 'OVERLAY',
}

export const EXECUTE_OVERLAY = gql`
  mutation Execute($name: String!, $ctx: Map!) {
    overlayConfiguration(namespace: $name, context: $ctx) { ...BuildFragment }
  }
  ${BuildFragment}
`

function BaseInput({ overlay: { spec }, value, setValue }) {
  return (
    <LabelledInput
      name={spec.name}
      label={spec.name}
      value={`${value || ''}`}
      onChange={setValue}
    />
  )
}

function SelectInput({ overlay: { spec }, value, setValue }) {
  const values = useMemo(() => spec.inputValues?.map(v => ({ label: v, value: v })), [spec])

  return (
    <DarkSelect
      options={values}
      value={values.find(({ val }) => val === value)}
      onChange={({ value }) => setValue(value)}
    />
  )
}

const INPUT_COMPONENTS = {
  enum: SelectInput,
}

export function OverlayInput({ overlay, ctx, setCtx, values }) {
  const { name } = overlay.spec
  const setValue = useCallback(val => {
    setCtx({ ...ctx, [name]: convertType(val, overlay.spec.inputType) })
  }, [name, overlay.spec, ctx, setCtx])

  useEffect(() => {
    const update = overlay.spec.updates[0].path
    const val = deepFetch(values, update)
    if (val && !ctx[name]) {
      setValue(val) 
    }
  }, [ctx])

  const component = INPUT_COMPONENTS[overlay.spec.inputType] || BaseInput

  return (
    <Box gap="xsmall">
      {React.createElement(component, { overlay, setValue, value: ctx[name] })}
      <Text
        size="small"
        color="dark-3"
      ><i>{overlay.spec.documentation}</i>
      </Text>
    </Box>
  )
}

function organizeOverlays(overlays) {
  return overlays.reduce((acc, overlay) => {
    const folder = overlay.spec.folder || 'general'
    const sf = overlay.spec.subfolder || 'all'
    const subfolders = acc[folder] || {}
    subfolders[sf] = [overlay, ...(subfolders[sf] || [])]
    acc[folder] = subfolders

    return acc
  }, {})
}

function OverlayEdit({ overlays, ctx, setCtx, helm }) {
  const values = useMemo(() => yaml.load(helm), [helm])
  const folders = useMemo(() => organizeOverlays(overlays), [overlays])
  const [folder, setFolder] = useState(Object.keys(folders)[0])
  const [subfolder, setSubfolder] = useState(Object.keys(folders[folder] || ['all'])[0])

  useEffect(() => {
    if (!folders[folder]) {
      const f = Object.keys(folders)[0]
      setFolder(f)
      setSubfolder(Object.keys(folders[f] || ['all'])[0])
    }
  }, [folders])

  if (!folders[folder]) return null

  return (
    <Box
      direction="row"
      fill
    >
      <Box
        flex={false}
        fill="vertical"
        style={{ overflow: 'auto', minWidth: '150px' }} 
        border={{ side: 'right' }}
      >
        <Box flex={false}>
          {Object.keys(folders).map((f, i) => (
            <SidebarTab 
              tab={folder}
              subtab={subfolder}
              setTab={setFolder}
              setSubTab={setSubfolder}
              name={f}
              subnames={Object.keys(folders[f])}
              key={i}
            />
          ))}
        </Box>
      </Box>
      <Box
        style={{ overflow: 'auto' }}
        fill
      >
        <Box
          flex={false}
          pad="medium"
          gap="medium"
        >
          {chunk(folders[folder][subfolder], 2).map((chunk, ind) => (
            <Box
              key={`${ind}`}
              direction="row"
              align="center"
              gap="medium"
            >
              {chunk.map(overlay => (
                <Box
                  key={overlay.metadata.name}
                  width="50%"
                >
                  <OverlayInput
                    overlay={overlay}
                    values={values}
                    ctx={ctx}
                    setCtx={setCtx}
                  />
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

export function EditConfiguration({ onCompleted, overlays, application: { name, configuration: { helm, terraform }, ...application } }) {
  const hasOverlays = overlays.length > 0
  const [type, setType] = useState(hasOverlays ? ConfigType.OVERLAY : ConfigType.HELM)
  const [config, setConfig] = useState(helm)
  const [mutation, { loading }] = useMutation(UPDATE_CONFIGURATION, {
    variables: { repository: name, content: config, type },
    onCompleted,
  })
  const swap = useCallback(type => {
    setConfig(type === ConfigType.HELM ? helm : terraform)
    setType(type)
  }, [setConfig, setType])
  useEffect(() => {
    if (!hasOverlays) setType(ConfigType.HELM)
    setConfig(helm)
  }, [hasOverlays, name])

  const [ctx, setCtx] = useState({})
  const [oMutation, { loading: oLoading }] = useMutation(EXECUTE_OVERLAY, {
    variables: { name, ctx: JSON.stringify(ctx) },
    onCompleted,
  })

  return (
    <Box
      fill
      background="backgroundColor"
    >
      <Box
        flex={false}
        gap="small"
      >
        <Box
          pad={BUILD_PADDING}
          direction="row"
          align="center"
          height="80px"
        >
          <Box fill="horizontal">
            <Box
              direction="row"
              fill="horizontal"
              gap="small"
              align="center"
              pad={{ vertical: 'xsmall' }}
            >
              {hasIcon(application) && (
                <ApplicationIcon
                  application={application}
                  size="30px"
                  dark
                />
              )}
              <Text
                weight="bold"
                size="small"
              >Edit {name}
              </Text>
            </Box>
            <Box direction="row">
              {hasOverlays > 0 && (
                <TabHeader 
                  selected={type === ConfigType.OVERLAY} 
                  text="Configure" 
                  onClick={() => setType(ConfigType.OVERLAY)}
                />
              )}
              <TabHeader
                selected={type === ConfigType.HELM}
                text="helm"
                onClick={() => swap(ConfigType.HELM)}
              />
              <TabHeader
                selected={type === ConfigType.TERRAFORM}
                text="terraform"
                onClick={() => swap(ConfigType.TERRAFORM)}
              />
            </Box>
          </Box>
          <Box flex={false}>
            <Button 
              flat 
              label="Commit" 
              onClick={type === ConfigType.OVERLAY ? oMutation : mutation} 
              background="brand" 
              loading={type === ConfigType.OVERLAY ? oLoading : loading}
            />
          </Box>
        </Box>
      </Box>
      {type === ConfigType.OVERLAY && (
        <OverlayEdit 
          overlays={overlays}
          ctx={ctx}
          setCtx={setCtx}
          helm={helm}
        />
      )}
      {type !== ConfigType.OVERLAY && (
        <AceEditor
          mode={type === ConfigType.HELM ? 'yaml' : 'terraform'}
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
      )}
    </Box>
  )
}

export function RepositoryChoice({ config: { name, icon, description }, link }) {
  const history = useHistory()

  return (
    <Box
      onClick={() => history.push(link)}
      width="50%"
      hoverIndicator="backgroundDark"
      background="cardDetailLight"
      direction="row"
      align="center"
      justify="center"
      round="xsmall"
      pad="medium"
    >
      <Box
        direction="row"
        fill="horizontal"
        gap="small"
        align="center"
      >
        {icon && (
          <img
            alt=""
            src={icon}
            height="40px"
            width="40px"
          />
        )}
        <Box>
          <Text
            size="small"
            style={{ fontWeight: 500 }}
          >{name}
          </Text>
          <Text
            size="small"
            color="dark-6"
          >{description}
          </Text>
        </Box>
      </Box>
      <Box flex={false}>
        <FormNext size="25px" />
      </Box>
    </Box>
  )
}

export default function Configuration() {
  const history = useHistory()
  const { repo } = useParams()
  const { setBreadcrumbs } = useContext(BreadcrumbsContext)
  const { setOnChange } = useContext(InstallationContext)
  const { data, error } = useQuery(APPLICATION_Q, {
    variables: { name: repo },
    fetchPolicy: 'network-only',
  })
  const onCompleted = useCallback(() => {
    history.push('/') 
  }, [history])

  useEffect(() => {
    setBreadcrumbs([
      { text: 'configuration', url: '/config' },
      { text: repo, url: `/config/${repo}` },
    ])
  }, [repo])

  useEffect(() => {
    setOnChange({ func: ({ name }) => history.push(`/config/${name}`) })
  }, [])

  useEnsureCurrent(repo)

  if (error) {
    return (
      <Box fill>
        <GqlError 
          error={error} 
          header="Cannot access configuration for this app"
        />
      </Box>
    )
  }

  if (!data) {
    return (
      <LoopingLogo
        scale="0.75"
        dark
      />
    )
  }

  return (
    <EditConfiguration
      application={data.application} 
      overlays={data.configurationOverlays.map(({ metadata, ...rest }) => {
        const labels = metadata.labels.reduce((acc, { name, value }) => ({ ...acc, [name]: value }), {})

        return { ...rest, metadata: { ...metadata, labels } }
      }).filter(({ metadata: { labels } }) => !labels[COMPONENT_LABEL])}
      onCompleted={onCompleted}
    />
  )
}
