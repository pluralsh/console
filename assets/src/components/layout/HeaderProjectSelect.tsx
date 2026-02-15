import {
  CloseIcon,
  ComboBox,
  ListBoxFooter,
  ListBoxFooterPlus,
  ListBoxItem,
  SearchIcon,
  Spinner,
  Toast,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { useDebounce } from '@react-hooks-library/core'
import { useProjectsTinyQuery } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo, useState } from 'react'
import { mapExistingNodes } from '../../utils/graphql'
import { useProjectsContext } from '../contexts/ProjectsContext'

export default function ProjectSelect() {
  const theme = useTheme()
  const { projectId, setProjectId } = useProjectsContext()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 500)

  const { data, loading, error } = useProjectsTinyQuery({
    pollInterval: 60_000,
    fetchPolicy: 'cache-and-network',
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
      style={{
        border: projectId
          ? theme.borders['outline-focused']
          : theme.borders.input,
      }}
    >
      <ComboBox
        aria-label="project"
        label="Project"
        selectedKey={projectId}
        onSelectionChange={(id) => setProjectId(id as string)}
        onInputChange={(value) => setQuery(value)}
        startIcon={<SearchIcon size={12} />}
        dropdownFooter={
          !data && loading ? (
            <ListBoxFooter>
              <Spinner />
            </ListBoxFooter>
          ) : isEmpty(projects) ? (
            <ListBoxFooter>No results</ListBoxFooter>
          ) : undefined
        }
        dropdownFooterFixed={
          projectId && (
            <ListBoxFooterPlus
              onClick={() => setProjectId('')}
              leftContent={<CloseIcon color="icon-info" />}
            >
              Clear selection
            </ListBoxFooterPlus>
          )
        }
        inputProps={{
          placeholder: 'All projects',
          style: { border: 'none', minHeight: 30 },
        }}
      >
        {projects.map((p) => (
          <ListBoxItem
            key={p.id}
            label={p.name}
            textValue={p.name}
            description={p.description}
          />
        ))}
      </ComboBox>
      {error && (
        <Toast
          heading="Error loading projects"
          severity="danger"
          position="bottom"
          closeTimeout={5000}
          margin="large"
        >
          {error.message}
        </Toast>
      )}
    </div>
  )
}
