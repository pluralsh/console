import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from 'react-apollo'
import { DarkSelect } from 'components/utils/Select'
import { SidebarTab } from 'components/utils/SidebarTab'
import yaml from 'js-yaml'

import {
  Button,
  Card,
  FormField,
  Input,
} from '@pluralsh/design-system'

import { Flex } from 'honorable'

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
  overlay, ctx, setCtx, values, ...props
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
    <Flex {...props}>
      <FormField
        label={overlay.spec.name}
        hint={documentation}
        width="100%"
      >
        {createElement(component, { overlay, setValue, value: ctx[name] })}
      </FormField>
    </Flex>
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

export function ConfigurationSettings({ overlays, application: { name, configuration: { helm } } }) {
  const navigate = useNavigate()
  const onCompleted = useCallback(() => navigate('/'), [navigate])
  const [ctx, setCtx] = useState({})
  const [mutation, { loading }] = useMutation(EXECUTE_OVERLAY, {
    variables: { name, ctx: JSON.stringify(ctx) },
    onCompleted,
  })

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
    <Flex
      direction="column"
      gap="large"
    >
      <Button
        onClick={() => mutation}
        loading={loading}
      >
        Commit
      </Button>
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
      <Card
        display="flex"
        flexWrap="wrap"
        gap="medium"
        overflowY="auto"
        paddingHorizontal={100}
        paddingVertical="large"
      >
        {folders[folder][subfolder].map((overlay: any) => (
          <OverlayInput
            key={overlay.metadata.name}
            overlay={overlay}
            values={values}
            ctx={ctx}
            setCtx={setCtx}
            grow={1}
            shrink={1}
            basis="45%"
          />
        ))}
        <Flex
          grow={1}
          shrink={1}
          basis="45%"
        />
      </Card>
    </Flex>
  )
}

