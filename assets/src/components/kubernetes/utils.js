import React from 'react'
import { Box, Text } from 'grommet'

export function Container({header, children}) {
  return (
    <Box flex={false} pad={{vertical: 'xsmall', horizontal: 'small'}} round='xsmall'
         gap='xsmall' margin='xsmall'>
      <Box>
        <Text size='small'>{header}</Text>
      </Box>
      {children}
    </Box>
  )
}