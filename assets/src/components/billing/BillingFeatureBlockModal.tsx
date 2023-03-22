import { Button, Modal, WarningIcon } from '@pluralsh/design-system'
import { Dispatch } from 'react'
import styled from 'styled-components'

type BillingFeatureBlockModalProps = {
  message?: string
  onClose: Dispatch<void>
}

const Header = styled.div({
  display: 'inline-flex',
  justifyContent: 'center',
})

export default function BillingFeatureBlockModal({ message = 'Upgrade to Plural Professional to use this feature.', onClose }: BillingFeatureBlockModalProps) {
  return (
    <Modal
      BackdropProps={{ zIndex: 20 }}
      header={(
        <Header>
          <WarningIcon
            color="icon-warning"
            marginRight="xsmall"
          />
          Upgrade needed
        </Header>
      )}
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
