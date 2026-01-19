import {
  Banner,
  CheckRoundedIcon,
  ComboBox,
  ListBoxFooter,
  ListBoxItem,
  ProjectIcon,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { isEmpty } from 'lodash'
import { useMemo, useState } from 'react'
import { mapExistingNodes } from '../../utils/graphql'
import { useProjectsContext } from '../contexts/ProjectsContext'
import { ApolloError } from '@apollo/client/core'
import { useProjectsTinyQuery } from 'generated/graphql'
import { useDebounce } from '@react-hooks-library/core'

export default function ProjectSelect() {
  const theme = useTheme()
  const { projectId, setProjectId } = useProjectsContext()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 500)
  const [error, setError] = useState<ApolloError>()

  const { data, loading } = useProjectsTinyQuery({
    pollInterval: 60_000,
    fetchPolicy: 'cache-and-network',
    onError: (error) => {
      setError(error)
      setTimeout(() => setError(undefined), 5000)
    },
    variables: { q: debouncedQuery },
  })

  const projects = useMemo(
    () => mapExistingNodes(data?.projects),
    [data?.projects]
  )

  return (
    <div
      css={{
        width: 280,
        borderRadius: theme.borderRadiuses.medium,
        marginLeft: theme.spacing.large,
      }}
      style={{ border: projectId ? theme.borders['outline-focused'] : 'none' }}
    >
      <ComboBox
        aria-label="project"
        label="Project"
        selectedKey={projectId}
        onSelectionChange={(id) => setProjectId(id as string)}
        onInputChange={(value) => setQuery(value)}
        titleContent={<ProjectIcon color={theme.colors['icon-light']} />}
        dropdownFooter={
          !data && loading ? (
            <ListBoxFooter>Loading</ListBoxFooter>
          ) : isEmpty(projects) ? (
            <ListBoxFooter>No results</ListBoxFooter>
          ) : undefined
        }
        dropdownFooterFixed={
          <ListBoxFooter
            onClick={() => setProjectId('')}
            leftContent={<CheckRoundedIcon color="icon-info" />}
          >
            <span css={{ color: theme.colors['text-primary-accent'] }}>
              Select all projects
            </span>
          </ListBoxFooter>
        }
      >
        {projects.map((p) => (
          <ListBoxItem
            key={p.id}
            label={p.name}
            textValue={p.name}
            description={p.description}
            selected={isEmpty(projectId)} // Show checkboxes next to all projects if that option is selected.
          />
        ))}
      </ComboBox>
      {error && (
        <Banner
          heading="Failed to fetch projects"
          severity="error"
          position="fixed"
          bottom={24}
          right={100}
          zIndex={1000}
          onClose={() => setError(undefined)}
        >
          {error.message}
        </Banner>
      )}
    </div>
  )
}
