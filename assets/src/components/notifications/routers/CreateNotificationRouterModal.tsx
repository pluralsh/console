import { ComponentProps } from 'react'
import { Button, Modal } from '@pluralsh/design-system'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { Body1P } from 'components/utils/typography/Text'

function CreatePrModalBase({
  open,
  onClose,
}: {
  open: boolean
  onClose: Nullable<() => void>
}) {
  return (
    <Modal
      portal
      asForm
      onSubmit={(e) => {
        e.preventDefault()
        onClose?.()
      }}
      open={open}
      onClose={onClose || undefined}
      header="New router"
      actions={
        <Button
          primary
          type="submit"
        >
          Done
        </Button>
      }
    >
      <Body1P>
        To create a new notification router, you can set up a router in your
        configuration files.{' '}
        <a
          href="https://docs.plural.sh/TODO"
          target="_blank"
          rel="noreferrer"
        >
          Read the docs
        </a>{' '}
        for more information on how to do this.
      </Body1P>
    </Modal>
  )
}

export function CreatePrModal(props: ComponentProps<typeof CreatePrModalBase>) {
  return (
    <ModalMountTransition open={props.open}>
      <CreatePrModalBase {...props} />
    </ModalMountTransition>
  )
}
