import {
  CloseIcon,
  Input,
  ListBoxFooterPlus,
  ListBoxItem,
  SearchIcon,
  Toast,
} from '@pluralsh/design-system'

import { useProjectsTinyQuery } from 'generated/graphql'
import { useMemo, useState } from 'react'
import styled from 'styled-components'
import { mapExistingNodes } from '../../utils/graphql'
import { useSelectedProjectContext } from '../contexts/ProjectsContext'
import { CrumbSelect } from './CrumbSelect'

const EMPTY_SEARCH_RESULT_KEY = '__empty__'

export function HeaderProjectSelect() {
  const { projectId, setProjectId } = useSelectedProjectContext()
  const [query, setQuery] = useState('')

  const { data, error } = useProjectsTinyQuery({
    pollInterval: 60_000,
    fetchPolicy: 'cache-and-network',
  })

  const projects = useMemo(
    () => mapExistingNodes(data?.projects),
    [data?.projects]
  )
  const selected = projects.find(({ id }) => id === projectId)
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredProjects = normalizedQuery
    ? projects.filter(({ name, description }) =>
        `${name} ${description ?? ''}`
          .toLocaleLowerCase()
          .includes(normalizedQuery)
      )
    : projects

  return (
    <>
      <CrumbSelect
        ariaLabel="Project"
        label={selected?.name ?? 'all projects'}
        selectedKey={projectId}
        onOpenChange={(isOpen) => {
          if (!isOpen) setQuery('')
        }}
        onSelectionChange={setProjectId}
        dropdownHeaderFixed={
          <ProjectSearchHeaderSC>
            <Input
              small
              showClearButton
              startIcon={<SearchIcon size={12} />}
              placeholder="Search projects"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              inputProps={{ ref: (node) => node?.focus() }}
            />
          </ProjectSearchHeaderSC>
        }
        dropdownFooterFixed={
          projectId ? (
            <ListBoxFooterPlus
              onClick={() => {
                setProjectId('')
                setQuery('')
              }}
              leftContent={<CloseIcon color="icon-info" />}
            >
              Clear selection
            </ListBoxFooterPlus>
          ) : undefined
        }
      >
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <ListBoxItem
              key={project.id}
              label={project.name}
              textValue={project.name}
              description={project.description}
            />
          ))
        ) : (
          <ListBoxItem
            key={EMPTY_SEARCH_RESULT_KEY}
            label="No projects found"
            textValue=""
            disabled
          />
        )}
      </CrumbSelect>
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
    </>
  )
}

const ProjectSearchHeaderSC = styled.div(({ theme }) => ({
  padding: `${theme.spacing.small} ${theme.spacing.medium}`,
}))
