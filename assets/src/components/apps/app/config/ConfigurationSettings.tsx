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
import { Box } from 'grommet'
import { DarkSelect } from 'components/utils/Select'
import { SidebarTab } from 'components/utils/SidebarTab'
import { chunk } from 'lodash'
import yaml from 'js-yaml'

import { FormField, Input } from '@pluralsh/design-system'

import { deepFetch } from '../../../../utils/graphql'

import { convertType } from '../runbooks/runbook/display/misc'

import { EXECUTE_OVERLAY } from './queries'

function ConfigurationSettingsInput({ value = '', setValue }) {
  return (
    <Input
      value={value}
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

export function OverlayInput({
  overlay, ctx, setCtx, values,
}) {
  const {
    name, documentation, updates, inputType,
  } = overlay.spec
  const setValue = useCallback(val => setCtx({ ...ctx, [name]: convertType(val, inputType) }), [name, inputType, ctx, setCtx])

  useEffect(() => {
    const val = deepFetch(values, updates[0].path)

    if (val && !ctx[name]) setValue(val)
  }, [name, updates, values, setValue, ctx])

  const component = INPUT_COMPONENTS[inputType] || ConfigurationSettingsInput

  return (
    <FormField
      label={overlay.spec.name}
      hint={documentation}
    >
      {createElement(component, { overlay, setValue, value: ctx[name] })}
    </FormField>
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

