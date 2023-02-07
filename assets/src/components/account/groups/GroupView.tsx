import { Modal } from '@pluralsh/design-system'

import GroupMembers from './GroupMembers'

export default function GroupView({ group, view, setView }: any) {
  return (
    <Modal
      header="View group"
      open={view}
      onClose={() => setView(false)}
      portal
    >
      <GroupMembers group={group} />
    </Modal>
  )
}
