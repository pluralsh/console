import {
  ListBoxItem,
  ProjectIcon,
  Select,
  SelectPropsSingle,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { useProjectsTinyQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { RectangleSkeleton } from './SkeletonLoaders'
import { isEmpty } from 'lodash'

export const AllProjectsOption = { id: 'all', name: 'All projects' }

export function ProjectSelect({
  selectedProject,
  setSelectedProject,
  selectionValueType = 'id',
  allowSelectAll = false,
  ...props
}: {
  selectedProject: string
  setSelectedProject: (value: string) => void
  selectionValueType?: 'id' | 'name'
  allowSelectAll?: boolean
} & Omit<SelectPropsSingle, 'onSelectionChange' | 'selectedKey' | 'children'>) {
  const { colors } = useTheme()

  const { data, previousData, loading } = useProjectsTinyQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: 60_000,
  })
  const projects = useMemo(
    () => mapExistingNodes(data?.projects || previousData?.projects),
    [data, previousData]
  )
  const isLoading = isEmpty(projects) && loading

  // can't just render the "all" listbox item conditionally because the Select children type is too restrictive
  // TODO: should fix this in DS at some point
  const options = [...projects, ...(allowSelectAll ? [AllProjectsOption] : [])]

  return (
    <Select
      selectionMode="single"
      titleContent={<ProjectIcon color={colors['icon-light']} />}
      label="Select project"
      onSelectionChange={(value) => setSelectedProject(value as string)}
      selectedKey={selectedProject}
      {...(isLoading && {
        isDisabled: true,
        triggerButton: (
          <RectangleSkeleton
            $height={38}
            $width={300}
          />
        ),
      })}
      {...props}
    >
      {options.map((p) => (
        <ListBoxItem
          key={selectionValueType === 'id' ? p.id : p.name}
          label={p.name}
        />
      ))}
    </Select>
  )
}
