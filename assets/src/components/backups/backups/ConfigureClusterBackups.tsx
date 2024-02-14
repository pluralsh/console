import { useState } from 'react'
import { Button } from '@pluralsh/design-system'

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

  return (
    <>
      <Button
        primary
        {...buttonProps}
        {...(!backupsEnabled ? { disabled: true } : {})}
      >
        Add cluster
      </Button>
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
