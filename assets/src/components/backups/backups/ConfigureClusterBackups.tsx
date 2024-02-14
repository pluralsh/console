import { useState } from 'react'
import { Button, Tooltip, WrapWithIf } from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'

import { useOpenTransition } from '../../hooks/suspense/useOpenTransition'
import { ModalMountTransition } from '../../utils/ModalMountTransition'
import { useBackupsEnabled } from '../../cd/utils/useBackupsEnabled'
import { ClustersObjectStoresFragment } from '../../../generated/graphql'

import ConfigureClusterBackupsModal from './ConfigureClusterBackupsModal'

export default function ConfigureClusterBackups({
  clusters,
  refetch,
}: {
  clusters: ClustersObjectStoresFragment[]
  refetch: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { buttonProps } = useOpenTransition(isOpen, setIsOpen)
  const backupsEnabled = useBackupsEnabled()
  const noClustersAvailable = isEmpty(clusters)

  return (
    <>
      <WrapWithIf
        condition={noClustersAvailable}
        wrapper={
          <Tooltip label="All clusters already have backups configured." />
        }
      >
        <div>
          <Button
            primary
            {...buttonProps}
            {...(!backupsEnabled || noClustersAvailable
              ? { disabled: true }
              : {})}
          >
            Add cluster
          </Button>
        </div>
      </WrapWithIf>
      <ModalMountTransition open={isOpen}>
        <ConfigureClusterBackupsModal
          open={isOpen}
          onClose={() => setIsOpen(false)}
          refetch={refetch}
          clusters={clusters}
        />
      </ModalMountTransition>
    </>
  )
}
