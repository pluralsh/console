import { Modal } from '@pluralsh/design-system'
import { ComponentPropsWithoutRef } from 'react'

export function ChangeMcpConnectionsModal({
  ...props
}: ComponentPropsWithoutRef<typeof Modal>) {
  return <Modal {...props}>change connections</Modal>
}
