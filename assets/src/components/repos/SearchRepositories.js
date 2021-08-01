import React, { useState } from 'react'
import { Box, Layer, Text, TextInput } from 'grommet'
import { ModalHeader } from 'forge-core'
import { useQuery } from 'react-apollo'
import { SEARCH_REPOS } from '../graphql/plural'
import { MODAL_WIDTH } from './constants'
import { SearchIcon } from '../users/utils'

function RepositoryList({edges}) {
  return edges.map(({node: repo}) => (
    <Box flex={false} direction='row' align='center' gap='small' 
         pad='small' border={{side: 'bottom', color: 'light-3'}}>
      <Box height='50px' width='50px' flex={false}>
        <img src={repo.icon} alt={repo.name} height='50px' width='50px' />
      </Box>
      <Box fill='horizontal'>
        <Text size='small' weight={500}>{repo.name}</Text>
        <Text size='small'><i>{repo.description}</i></Text>
      </Box>
    </Box>
  ))
}

export function SearchRepos({setOpen}) {
  const [query, setQuery] = useState('')
  const {data} = useQuery(SEARCH_REPOS, {
    variables: {query},
    fetchPolicy: 'cache-and-network'
  })

  return (
    <Layer modal onEsc={() => setOpen(false)} 
           onClickOutside={() => setOpen(false)}>
      <Box width={MODAL_WIDTH}>
        <ModalHeader text='Search for a repository' setOpen={setOpen} />
        <Box fill pad='small' gap='small'>
          <Box flex={false}>
            <TextInput
              icon={<SearchIcon />}
              reverse
              value={query}
              placeholder='search for a repo by name'
              onChange={({target: {value}}) => setQuery(value)} />
          </Box>
          <Box flex={false} fill style={{overflow: 'auto'}}>
            <Box flex={false}>
              {data && data.repositories && (
                <RepositoryList edges={data.repositories.edges} />
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Layer>
  )
}