import { Button } from '@pluralsh/design-system'
import { useState } from 'react'

import StackCustomRunModal from './StackCustomRunModal'

export default function StackCustomRun({ stackId }: { stackId: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        floating
        onClick={() => setIsOpen(true)}
      >
        Custom run
      </Button>
      <StackCustomRunModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        stackId={stackId}
      />
    </>
  )
}
