import { Button, Modal } from '@pluralsh/design-system'
import { Dispatch } from 'react'

type BillingFeatureBlockModalProps = {
  message?: string
  onClose: Dispatch<void>
}

export default function BillingFeatureBlockModal({ message = 'Upgrade to Plural Professional to use this feature.', onClose }: BillingFeatureBlockModalProps) {
  return (
    <Modal
      BackdropProps={{ zIndex: 20 }}
      header="Upgrade needed"
      open
      onClose={() => onClose()}
      size="large"
      style={{ padding: 0 }}
    >
      {message}
      <Button
        as="a"
        href="https://app.plural.sh/account/billing"
        target="_blank"
        rel="noopener noreferrer"
        width="max-content"
        marginTop="large"
        onClick={() => onClose()}
      >
        Review plans
      </Button>
    </Modal>
  )
}
