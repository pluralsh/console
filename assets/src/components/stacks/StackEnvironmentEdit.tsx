import React, { useState } from 'react'
import { GearTrainIcon, IconFrame } from '@pluralsh/design-system'

import { StackEnvironment } from '../../generated/graphql'
import { ModalMountTransition } from '../utils/ModalMountTransition'

import StackEnvironmentApplyModal from './StackEnvironmentApplyModal'

export default function StackEnvironmentEdit({
  env,
}: {
  env: StackEnvironment
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="icon">
        <IconFrame
          tooltip="Edit"
          clickable
          icon={<GearTrainIcon />}
          onClick={() => setOpen(true)}
        />
      </div>
      <ModalMountTransition open={open}>
        <StackEnvironmentApplyModal
          open={open}
          onClose={() => setOpen(false)}
          mode="edit"
          initialValue={env}
        />
      </ModalMountTransition>
    </>
  )
}
