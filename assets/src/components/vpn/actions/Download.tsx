import { Dispatch, ReactElement, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { Modal } from '@pluralsh/design-system'

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
  const { data: { wireguardPeer } = {} } = useQuery<
    Pick<RootQueryType, 'wireguardPeer'>,
    RootQueryTypeWireguardPeerArgs
  >(WireguardPeer, {
    variables: { name },
  })

  useEffect(() => {
    if (wireguardPeer?.config) {
      downloadAsFile(wireguardPeer?.config, `${name}.conf`)
      onClose()
    }
  }, [name, wireguardPeer?.config, onClose])

  return (
    <Modal
      open
      background="transparent"
    >
      <LoadingIndicator />
    </Modal>
  )
}

export { DownloadConfig }
