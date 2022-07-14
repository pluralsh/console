import { Loading as LoadingInner } from 'forge-core'
import { Box } from 'grommet'

export function Loading({ background }) {
  return (
    <Box
      fill
      background={background}
      justify="center"
      align="center"
    >
      <LoadingInner />
    </Box>
  )
}
