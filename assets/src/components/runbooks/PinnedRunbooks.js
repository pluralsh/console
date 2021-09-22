import React, { useContext } from 'react'
import { useQuery } from '@apollo/react-hooks'
import { InstallationContext } from '../Installations'
import { RUNBOOKS_Q } from './queries'
import { Box, Text, ThemeContext } from 'grommet'
import { boxShadow } from '../Builds'
import { useHistory } from 'react-router'
import { chunk } from 'lodash'
import { Book, Pin } from 'grommet-icons'

function RunbookItem({runbook, namespace, width}) {
  let hist = useHistory()
  const theme = useContext(ThemeContext)
  const {name, description} = runbook.spec

  return (
    <Box style={boxShadow(theme)} width={width || '30%'} round='xsmall' 
         background='cardDarkLight' hoverIndicator='sidebar'
         pad='small' gap='small' direction='row' align='center'
         onClick={() => hist.push(`/runbooks/${namespace}/${runbook.name}`)}>
      <Box flex={false} gap='small' direction='row' align='center'>
        <Book size='small' />
        <Text size='small' weight={500}>{name}</Text>
      </Box>
      <Text size='small' color='dark-3' truncate>{description}</Text>
    </Box>
  )
}

export function PinnedRunbooks({border}) {
  const {currentApplication} = useContext(InstallationContext)
  const {data} = useQuery(RUNBOOKS_Q, {
    variables: {namespace: currentApplication.name, pinned: true},
    fetchPolicy: 'cache-and-network'
  })

  if (!data) return null

  const {runbooks} = data

  if (runbooks.length === 0) return null

  return (
    <Box flex={false} style={{overflow: 'auto', maxHeight: '25%'}} fill='horizontal' 
         pad={{horizontal: 'medium', vertical: 'small'}} gap='xsmall' border={border}>
      <Box direction='row' gap='xsmall' align='center'>
        <Pin size='small' />
        <Text size='small'>pinned runbooks</Text>
      </Box>
      <Box flex={false} gap='xsmall'>
        {chunk(runbooks, 3).map((books, ind) => (
          <Box key={`${ind}`} direction='row' gap='small' align='center'>
            {books.map((book) => (
              <RunbookItem 
                key={book.name} 
                runbook={book}
                namespace={currentApplication.name} />
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  )
}