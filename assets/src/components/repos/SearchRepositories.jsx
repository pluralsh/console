import { useState } from 'react'
import { Box, Text, TextInput } from 'grommet'
import { ModalHeader } from 'forge-core'
import { useQuery } from '@apollo/client'

import { SearchIcon } from 'components/utils/SearchIcon'

import { SEARCH_REPOS } from '../graphql/plural'

import { MODAL_WIDTH } from './constants'

export function Repository({ repo, setRepo }) {
  return (
    <Box
      flex={false}
      direction="row"
      align="center"
      gap="small"
      pad="small"
      border={{ side: 'bottom', color: 'light-3' }}
      onClick={setRepo && (() => setRepo(repo))}
      hoverIndicator="tone-light"
    >
      <Box
        height="50px"
        width="50px"
        flex={false}
      >
        <img
          src={repo.icon}
          alt={repo.name}
          height="50px"
          width="50px"
        />
      </Box>
      <Box fill="horizontal">
        <Text
          size="small"
          weight={500}
        >{repo.name}
        </Text>
        <Text size="small"><i>{repo.description}</i></Text>
      </Box>
    </Box>
  )
}

export function SearchRepos({ setOpen, setRepo }) {
  const [query, setQuery] = useState('')
  const { data } = useQuery(SEARCH_REPOS, {
    variables: { query },
    fetchPolicy: 'cache-and-network',
  })

  return (
    <Box
      animation="fadeIn"
      width={MODAL_WIDTH}
    >
      <ModalHeader
        text="Search for a repository"
        setOpen={setOpen}
      />
      <Box
        fill
        gap="small"
        style={{ maxHeight: '80vh', minHeight: '300px' }}
      >
        <Box
          flex={false}
          pad="small"
        >
          <TextInput
            icon={(
              <SearchIcon
                size={16}
                border="tone-medium"
              />
            )}
            reverse
            value={query}
            placeholder="search for a repo by name"
            onChange={({ target: { value } }) => setQuery(value)}
          />
        </Box>
        <Box
          fill
          style={{ overflow: 'auto' }}
        >
          <Box flex={false}>
            {data && data.repositories && data.repositories.edges.map(({ node: repo }) => (
              <Repository
                key={repo.id}
                repo={repo}
                setRepo={setRepo}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
