import { Button } from '@pluralsh/design-system'
import { PrOpenIcon } from '@pluralsh/design-system'
import { usePrAutomationLazyQuery } from 'generated/graphql'
import { ComponentProps, useCallback, useRef, useState } from 'react'
import { CreatePrModal } from './CreatePrModal'

export function CreatePrAutomationModal({
  id,
  buttonProps,
  onOpen,
}: {
  id: string
  buttonProps?: Omit<ComponentProps<typeof Button>, 'onClick' | 'loading'>
  onOpen?: () => void
}) {
  const [open, setOpen] = useState(false)
  const pendingRef = useRef(false)
  const [fetchPrAutomation, { data, loading }] = usePrAutomationLazyQuery()

  const handleOpen = useCallback(async () => {
    onOpen?.()
    if (data?.prAutomation) {
      setOpen(true)
      return
    }
    pendingRef.current = true
    const result = await fetchPrAutomation({ variables: { id } })
    if (!pendingRef.current) return
    pendingRef.current = false
    if (result.data?.prAutomation) setOpen(true)
  }, [data?.prAutomation, fetchPrAutomation, id, onOpen])

  const handleClose = useCallback(() => {
    setOpen(false)
    pendingRef.current = false
  }, [])

  return (
    <>
      <Button
        secondary
        startIcon={<PrOpenIcon />}
        loading={loading}
        onClick={handleOpen}
        {...buttonProps}
      >
        Create PR
      </Button>
      {data?.prAutomation && (
        <CreatePrModal
          prAutomation={data.prAutomation}
          open={open}
          onClose={handleClose}
        />
      )}
    </>
  )
}
