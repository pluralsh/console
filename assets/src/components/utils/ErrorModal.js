import React, { useCallback, useState } from 'react'
import { Box, Layer } from 'grommet'
import { ModalHeader, GqlError } from 'forge-core'

export function ErrorModal({error, modalHeader, header}) {
  const [open, setOpen] = useState(true)
  const close = useCallback(() => setOpen(false), [setOpen])

  if (!open) return null

  return (
    <Layer modal onEsc={close} onClickOutside={close}>
      <ModalHeader text={modalHeader} setOpen={setOpen} />
      <Box pad='small'>
        <GqlError error={error} header={header} />
      </Box>
    </Layer>
  )
}