import { Box, Text } from 'grommet'

import { PodHeader, PodRow } from './Pod'

export function PodList({ pods, namespace, refetch }) {
  return (
    <Box
      flex={false}
      pad="small"
    >
      <Box pad={{ vertical: 'small' }}>
        <Text size="small">Pods</Text>
      </Box>
      <PodHeader />
      {pods.map((pod, ind) => (
        <PodRow
          key={ind}
          pod={pod}
          namespace={namespace}
          refetch={refetch}
        />
      ))}
    </Box>
  )
}
