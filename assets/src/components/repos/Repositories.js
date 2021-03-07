import React from 'react'
import { Box } from 'grommet'

const ICON_WIDTH = '50px'

export function RepoIcon({repo: {icon}}) {
  return (
    <Box flex={false} align='center' justify='center' width={ICON_WIDTH}>
      <img alt='' width='50px' height='50px' src={icon} />
    </Box>
  )
}