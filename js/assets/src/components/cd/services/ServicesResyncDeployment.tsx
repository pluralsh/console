import { IconFrame, ReloadIcon } from '@pluralsh/design-system'
import {
  ServiceDeploymentsRowFragment,
  useKickServiceMutation,
} from 'generated/graphql'
import { useState } from 'react'

import { Confirm } from 'components/utils/Confirm'

export function ServicesResyncDeployment({
  serviceDeployment,
}: {
  serviceDeployment: ServiceDeploymentsRowFragment
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [mutation, { loading, error }] = useKickServiceMutation({
    variables: { id: serviceDeployment.id },
    onCompleted: () => {
      setIsOpen(false)
    },
  })

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      <IconFrame
        clickable
        type="floating"
        tooltip="Resync"
        icon={<ReloadIcon />}
        onClick={() => {
          setIsOpen(true)
        }}
      />
      <Confirm
        open={isOpen}
        text={
          <>
            Are you sure you want to resync the <b>{serviceDeployment.name}</b>{' '}
            service?
          </>
        }
        close={() => setIsOpen(false)}
        label="Resync service"
        submit={() => mutation()}
        loading={loading}
        error={error}
      />
    </div>
  )
}
