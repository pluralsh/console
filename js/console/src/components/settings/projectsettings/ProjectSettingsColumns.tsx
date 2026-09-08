import {
  GearTrainIcon,
  ListBoxItem,
  PeopleIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Info } from 'components/utils/Info'
import { ProjectFragment } from 'generated/graphql'
import { useState } from 'react'
import { useTheme } from 'styled-components'

import { MoreMenu } from 'components/utils/MoreMenu'

import { ProjectDeleteModal } from './ProjectDelete'
import { ProjectEditModal } from './ProjectEdit'
import { ProjectPermissionsModal } from './ProjectPermissions'

const columnHelper = createColumnHelper<ProjectFragment>()
const ColInfo = columnHelper.accessor((project) => project, {
  id: 'info',
  meta: { gridTemplate: '1fr' },
  cell: function Cell({ getValue }) {
    const project = getValue()

    return (
      <Info
        text={project?.name}
        description={project?.description || 'no description'}
      />
    )
  },
})

enum MenuItemKey {
  Permissions = 'permissions',
  Settings = 'settings',
  Delete = 'delete',
}

const ColActions = columnHelper.accessor((project) => project, {
  id: 'actions',
  header: '',
  cell: function Cell({ getValue }) {
    const project = getValue()
    const theme = useTheme()
    const [menuKey, setMenuKey] = useState<MenuItemKey | ''>('')

    if (!project) {
      return null
    }

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        css={{ alignItems: 'center', alignSelf: 'end', display: 'flex' }}
      >
        <MoreMenu onSelectionChange={(newKey) => setMenuKey(newKey)}>
          <ListBoxItem
            key={MenuItemKey.Permissions}
            leftContent={<PeopleIcon />}
            label="Permissions"
            textValue="Permissions"
          />
          <ListBoxItem
            key={MenuItemKey.Settings}
            leftContent={<GearTrainIcon />}
            label="Settings"
            textValue="Settings"
          />
          <ListBoxItem
            key={MenuItemKey.Delete}
            leftContent={
              <TrashCanIcon color={theme.colors['icon-danger-critical']} />
            }
            label="Delete project"
            textValue="Delete project"
          />
        </MoreMenu>
        {/* Modals */}
        <ProjectPermissionsModal
          project={project}
          open={menuKey === MenuItemKey.Permissions}
          onClose={() => setMenuKey('')}
        />
        <ProjectEditModal
          project={project}
          open={menuKey === MenuItemKey.Settings}
          onClose={() => setMenuKey('')}
        />
        <ProjectDeleteModal
          project={project}
          open={menuKey === MenuItemKey.Delete}
          onClose={() => setMenuKey('')}
        />
      </div>
    )
  },
})

export const projectSettingsCols = [ColInfo, ColActions]
