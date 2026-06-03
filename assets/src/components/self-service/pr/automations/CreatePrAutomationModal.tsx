import { Button, PrOpenIcon } from '@pluralsh/design-system'
import { usePrAutomationLazyQuery } from 'generated/graphql'
import { ComponentProps, useCallback, useState } from 'react'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
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
  const { popToast } = useSimpleToast()
  const [fetchPrAutomation, { data, loading }] = usePrAutomationLazyQuery()

  const handleOpen = useCallback(async () => {
    onOpen?.()
    if (data?.prAutomation) {
      setOpen(true)
      return
    }

    const result = await fetchPrAutomation({ variables: { id } })
    if (result.error) {
      popToast({ content: result.error.message, severity: 'danger' })
      return
    }
    if (result.data?.prAutomation) setOpen(true)
  }, [data?.prAutomation, fetchPrAutomation, id, onOpen, popToast])

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
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
