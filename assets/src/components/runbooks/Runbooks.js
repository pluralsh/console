import React, { useContext } from 'react'
import { Box, Text, ThemeContext } from 'grommet'
import { Book } from 'grommet-icons'
import { useQuery } from '@apollo/react-hooks'
import { ApplicationIcon, hasIcon, InstallationContext } from '../Installations'
import { RUNBOOKS_Q } from './queries'
import { boxShadow, HEADER_HEIGHT } from '../Builds'
import { useHistory } from 'react-router'

function RunbookRow({runbook, namespace}) {
  let hist = useHistory()
  const theme = useContext(ThemeContext)
  const {name, description} = runbook.spec

  return (
    <Box style={boxShadow(theme)} pad='small' gap='xsmall' round='xsmall' 
         background='cardDarkLight' hoverIndicator='sidebar'
         onClick={() => hist.push(`/runbooks/${namespace}/${runbook.name}`)}>
      <Box flex={false} gap='small' direction='row' align='center'>
        <Book size='small' />
        <Text size='small' weight={500}>{name}</Text>
      </Box>
      <Text size='small' color='dark-3' truncate>{description}</Text>
    </Box>
  )
}

export function Runbooks() {
  const {currentApplication} = useContext(InstallationContext)
  const {data} = useQuery(RUNBOOKS_Q, {
    variables: {namespace: currentApplication.name},
    fetchPolicy: 'cache-and-network'
  })

  const namespace = currentApplication.name

  return (
    <Box fill pad='small' background='backgroundColor'>
      <Box flex={false} direction='row' align='center' height={HEADER_HEIGHT}>
        <Box direction='row' fill='horizontal' gap='small' align='center' margin={{bottom: 'small'}}>
          {hasIcon(currentApplication) && <ApplicationIcon application={currentApplication} size='40px' dark />}
          <Box>
            <Text weight='bold' size='small'>{currentApplication.name}</Text>
            <Text size='small'>a collection of runbooks to help operate this application</Text>
          </Box>
        </Box>
      </Box>
      <Box fill gap='xsmall'>
        {data && data.runbooks.map((book) => <RunbookRow key={book.name} runbook={book} namespace={namespace} />)}
      </Box>
    </Box>
  )
}