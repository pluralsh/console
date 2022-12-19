import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from 'react-apollo'
import { SidebarTab } from 'components/utils/SidebarTab'
import yaml from 'js-yaml'

import { Button, Card } from '@pluralsh/design-system'

import { Flex } from 'honorable'

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
          <ConfigurationSettingsField
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

