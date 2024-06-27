import { Button } from '@pluralsh/design-system'
import { useState } from 'react'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { StackFragment } from '../../../generated/graphql'

import StackCustomRunModal from './StackCustomRunModal'

export default function StackCustomRun({ stack }: { stack: StackFragment }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Create manual run</Button>
      <ModalMountTransition open={isOpen}>
        <StackCustomRunModal
          open={isOpen}
          onClose={() => setIsOpen(false)}
          stack={stack}
        />
      </ModalMountTransition>
    </>
  )
}
