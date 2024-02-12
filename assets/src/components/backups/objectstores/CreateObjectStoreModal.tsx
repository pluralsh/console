import { useState } from 'react'

import { ListBoxItem, Select } from '@pluralsh/design-system'

import ModalAlt from '../../cd/ModalAlt'
import { ProviderCloud } from '../../cd/clusters/create/types'

import { SUPPORTED_CLOUDS } from './ObjectStoreCloudSettings'

export default function CreateObjectStoreModal({
  open,
  onClose,
  refetch,
}: {
  open: boolean
  onClose: Nullable<() => void>
  refetch: () => void
}) {
  const [selectedCloud, setSelectedCloud] = useState<ProviderCloud>(
    ProviderCloud.AWS
  )

  return (
    <ModalAlt
      header="Add object store"
      size="large"
      style={{ padding: 0, position: 'absolute' }}
      open={open}
      portal
      onClose={() => {
        onClose?.()
      }}
    >
      <Select
        selectedKey={selectedCloud}
        // TODO
        // @ts-ignore
        onSelectionChange={setSelectedCloud}
      >
        {SUPPORTED_CLOUDS.map((t) => (
          <ListBoxItem
            key={t}
            label={t}
            textValue={t}
          />
        ))}
      </Select>
    </ModalAlt>
  )
}
