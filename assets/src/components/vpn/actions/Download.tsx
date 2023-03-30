import { Dispatch, ReactElement, useEffect } from 'react'
import { Layer } from 'grommet'
import { useQuery } from '@apollo/client'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { WireguardPeer } from '../graphql/queries'
import {
  RootQueryType,
  RootQueryTypeWireguardPeerArgs,
} from '../../../generated/graphql'
import { downloadAsFile } from '../../../utils/file'

interface DownloadConfigProps {
  name: string
  onClose: Dispatch<void>
}

function DownloadConfig({ name, onClose }: DownloadConfigProps): ReactElement {
  const { data: { wireguardPeer } = {}, loading } = useQuery<
    Pick<RootQueryType, 'wireguardPeer'>,
    RootQueryTypeWireguardPeerArgs
  >(WireguardPeer, {
    variables: { name },
  })

  useEffect(() => {
    if (wireguardPeer?.config)
      downloadAsFile(wireguardPeer?.config, `${name}.conf`)
    if (!loading) onClose()
  }, [loading, name, onClose, wireguardPeer?.config])

  return (
    <Layer background="transparent">
      <LoadingIndicator />
    </Layer>
  )
}

export { DownloadConfig }
