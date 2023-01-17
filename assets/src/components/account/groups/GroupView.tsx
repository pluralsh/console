import { Box } from 'grommet'

import GroupMembers from './GroupMembers'

export default function GroupView({ group }: any) {
  return (
    <Box
      fill
      pad={{ bottom: 'small' }}
      gap="small"
    >
      <GroupMembers group={group} />
    </Box>
  )
}
