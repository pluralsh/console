import { Modal } from '@pluralsh/design-system'

import GroupMembers from './GroupMembers'

export default function GroupView({ group, open, onClose }: any) {
  return (
    <Modal
      header="View group"
      open={open}
      onClose={onClose}
      portal
    >
      <GroupMembers group={group} />
    </Modal>
  )
}
