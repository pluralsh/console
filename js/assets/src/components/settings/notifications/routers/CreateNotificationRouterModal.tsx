import { Button, Modal } from '@pluralsh/design-system'

import { Body1P } from 'components/utils/typography/Text'
import { InlineLink } from 'components/utils/typography/InlineLink'

export function CreateNotificationRouterModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: Nullable<() => void>
}) {
  return (
    <Modal
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
        <InlineLink
          href="https://docs.plural.sh/deployments/notifications"
          target="_blank"
          rel="noreferrer"
        >
          Read the docs
        </InlineLink>{' '}
        for more information on how to do this.
      </Body1P>
    </Modal>
  )
}
