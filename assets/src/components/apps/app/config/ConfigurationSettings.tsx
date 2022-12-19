import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'forge-core'
import { useMutation } from 'react-apollo'
import { Box, Text } from 'grommet'
import { LabelledInput } from 'components/utils/LabelledInput'
import { DarkSelect } from 'components/utils/Select'
import { SidebarTab } from 'components/utils/SidebarTab'
import { chunk } from 'lodash'
import yaml from 'js-yaml'

import { deepFetch } from '../../../../utils/graphql'

import { convertType } from '../runbooks/runbook/display/misc'

import { EXECUTE_OVERLAY } from './queries'

function BaseInput({ overlay: { spec }, value, setValue }) {
  return (
    <LabelledInput
      label={spec.name}
      value={`${value || ''}`}
      onChange={setValue}
      color={undefined}
      weight={undefined}
      placeholder={undefined}
      width={undefined}
      type={undefined}
      modifier={undefined}
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

export function OverlayInput({
  overlay, ctx, setCtx, values,
}) {
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
      {createElement(component, { overlay, setValue, value: ctx[name] })}
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

function OverlayEdit({
  overlays, ctx, setCtx, helm,
}: any) {
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
  }, [folders, folder])

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
          {chunk(folders[folder][subfolder], 2).map((chunk: any, ind) => (
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

export function ConfigurationSettings({ overlays, application: { name, configuration: { helm } } }) {
  const navigate = useNavigate()
  const onCompleted = useCallback(() => navigate('/'), [navigate])
  const [ctx, setCtx] = useState({})
  const [mutation, { loading }] = useMutation(EXECUTE_OVERLAY, {
    variables: { name, ctx: JSON.stringify(ctx) },
    onCompleted,
  })

  return (
    <Box fill>
      <Button
        flat
        label="Commit"
        onClick={mutation}
        background="brand"
        loading={loading}
      />
      <OverlayEdit
        overlays={overlays}
        ctx={ctx}
        setCtx={setCtx}
        helm={helm}
      />
    </Box>
  )
}

