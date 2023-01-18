import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import yaml from 'js-yaml'

import {
  Button,
  Card,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'

import { Div, Flex, P } from 'honorable'

import isEqualWith from 'lodash/isEqualWith'

import { omitBy } from 'lodash'

import { EXECUTE_OVERLAY } from './queries'
import ConfigurationSettingsField from './ConfigurationSettingsField'

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
  const [init, setInit] = useState({})
  const [mutation, { loading }] = useMutation(EXECUTE_OVERLAY, {
    variables: { name, ctx: JSON.stringify(ctx) },
    onCompleted,
  })

  const values = useMemo(() => yaml.load(helm), [helm])
  const folders = useMemo(() => organizeOverlays(overlays), [overlays])
  const [folder, setFolder] = useState<any>(Object.keys(folders)[0])
  const [subfolder, setSubfolder] = useState<any>(Object.keys(folders[folder] || ['all'])[0])
  const changed = !isEqualWith(omitBy(ctx, v => v === ''), init)

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
      <Flex
        gap="medium"
        align="center"
      >
        <Div width={240}>
          <Select
            aria-label="folder"
            label="Folder"
            selectedKey={folder}
            onSelectionChange={setFolder}
          >
            {Object.keys(folders).map(f => (
              <ListBoxItem
                key={f}
                label={f}
                textValue={f}
              />
            ))}
          </Select>
        </Div>
        <Div width={240}>
          <Select
            aria-label="subfolder"
            label="Sub-folder"
            selectedKey={subfolder}
            onSelectionChange={setSubfolder}
          >
            {Object.keys(folders[folder]).map(s => (
              <ListBoxItem
                key={s}
                label={s}
                textValue={s}
              />
            ))}
          </Select>
        </Div>
        <Flex grow={1} />
        {changed && (
          <P
            body2
            color="text-xlight"
          >
            Unsaved changes
          </P>
        )}
        <Button
          onClick={() => mutation}
          loading={loading}
        >
          Commit
        </Button>
      </Flex>
      <Card
        display="flex"
        flexWrap="wrap"
        gap="medium"
        overflowY="auto"
        paddingHorizontal={100}
        paddingVertical="large"
      >
        {folders[folder][subfolder].map((overlay: any) => (
          <ConfigurationSettingsField
            key={overlay.metadata.name}
            overlay={overlay}
            values={values}
            ctx={ctx}
            setCtx={setCtx}
            init={init}
            setInit={setInit}
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

