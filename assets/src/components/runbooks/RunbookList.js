import React, { useContext } from 'react'
import { useQuery } from '@apollo/react-hooks'
import { InstallationContext } from '../Installations'
import { RUNBOOKS_Q } from './queries'
import { Box, Text, ThemeContext } from 'grommet'
import { boxShadow, HEADER_HEIGHT } from '../Builds'
import { useHistory } from 'react-router'

function RunbookRow({runbook, namespace}) {
  let hist = useHistory()
  const theme = useContext(ThemeContext)
  const {name, description} = runbook.spec

  return (
    <Box style={boxShadow(theme)} round='xsmall' background='cardDarkLight' 
         pad='small' gap='xsmall' hoverIndicator='cardDark'
         onClick={() => hist.push(`/runbooks/${namespace}/${runbook.name}`)}>
      <Text size='small' weight={500}>{name}</Text>
      <Text size='small'>{description}</Text>
    </Box>
  )
}

export function RunbookList({width, border}) {
  const {currentApplication} = useContext(InstallationContext)
  const {data} = useQuery(RUNBOOKS_Q, {
    variables: {namespace: currentApplication.name},
    fetchPolicy: 'cache-and-network'
  })

  if (!data) return null

  const {runbooks} = data

  if (runbooks.length === 0) return null

  return (
    <Box flex={false} fill='vertical' width={width} pad='small' gap='xsmall' border={border}>
      <Box height={HEADER_HEIGHT}>
        <Text size='small' weight='bold'>Pinned Runbooks</Text>
        <Text size='small' color='dark-3'>a curated list of operational tools we think you'll need</Text>
      </Box>
      <Box fill gap='xsmall'>
        {runbooks.map((book) => (
          <RunbookRow 
            key={book.name} 
            runbook={book}
            namespace={currentApplication.name} />
        ))}
      </Box>
    </Box>
  )
}