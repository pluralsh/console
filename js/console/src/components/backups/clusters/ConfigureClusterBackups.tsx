import { useMemo, useState } from 'react'
import { Button, Tooltip, WrapWithIf } from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'

import { useOpenTransition } from '../../hooks/suspense/useOpenTransition'
import { ModalMountTransition } from '../../utils/ModalMountTransition'
import { useBackupsEnabled } from '../../cd/utils/useBackupsEnabled'

import {
  ClustersObjectStoresFragment,
  useClustersObjectStoresQuery,
} from '../../../generated/graphql'

import ConfigureClusterBackupsModal from './ConfigureClusterBackupsModal'

const QUERY_PAGE_SIZE = 100

export default function ConfigureClusterBackups({
  refetch,
}: {
  refetch: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { buttonProps } = useOpenTransition(isOpen, setIsOpen)
  const backupsEnabled = useBackupsEnabled()

  const { data, loading, error } = useClustersObjectStoresQuery({
    variables: { backups: false, first: QUERY_PAGE_SIZE },
    fetchPolicy: 'cache-and-network',
  })

  const clusters = (data?.clusters?.edges || [])
    .map((e) => e?.node)
    .filter((c): c is ClustersObjectStoresFragment => !!c)
  const noClusters = isEmpty(clusters)
  const disabled = !backupsEnabled || noClusters || !!error || loading

  const tooltip = useMemo(() => {
    if (loading) return 'Loading...'
    if (error) return `An error occured: ${error.message}`
    if (noClusters) return 'All clusters already have backups configured.'
    if (!backupsEnabled) return 'Backups are not available.'

    return undefined
  }, [loading, error, noClusters, backupsEnabled])

  return (
    <>
      <WrapWithIf
        condition={disabled}
        wrapper={<Tooltip label={tooltip} />}
      >
        <div>
          <Button
            primary
            {...buttonProps}
            {...(disabled ? { disabled: true } : {})}
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
