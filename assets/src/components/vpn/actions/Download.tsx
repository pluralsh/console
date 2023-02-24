import { Dispatch, ReactElement, useEffect } from 'react'
import { Layer } from 'grommet'
import { LoopingLogo } from '@pluralsh/design-system'
import { useQuery } from '@apollo/client'

import { WireguardPeer } from '../graphql/queries'
import { RootQueryType, RootQueryTypeWireguardPeerArgs } from '../../../generated/graphql'
import { downloadAsFile } from '../../../utils/file'

interface DownloadConfigProps {
  name: string
  onClose: Dispatch<void>
}

function DownloadConfig({ name, onClose }: DownloadConfigProps): ReactElement {
  const { data: { wireguardPeer } = {}, loading } = useQuery<Pick<RootQueryType, 'wireguardPeer'>, RootQueryTypeWireguardPeerArgs>(WireguardPeer, {
    variables: { name },
  })

  useEffect(() => {
    if (wireguardPeer?.config) downloadAsFile(wireguardPeer?.config, `${name}.conf`)
    if (!loading) onClose()
  }, [loading, name, onClose, wireguardPeer?.config])

  return (
    <Layer background="transparent">
      <LoopingLogo />
    </Layer>
  )
}

export { DownloadConfig }
