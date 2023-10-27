import { createColumnHelper } from '@tanstack/react-table'
import {
  GitHubLogoIcon,
  GlobeIcon,
  ListBoxItem,
  PeopleIcon,
  Tooltip,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { ServiceDeploymentsRowFragment } from 'generated/graphql'
import { Edge } from 'utils/graphql'
import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import { useTheme } from 'styled-components'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import { getProviderIconURL } from 'components/utils/Provider'
import { toDateOrUndef } from 'utils/date'

import { useState } from 'react'

import { MoreMenu } from 'components/utils/MoreMenu'

import { isSha1 } from '../../../utils/sha'

import { ServicePermissionsModal } from './ServicePermissions'

import { ServiceStatusChip } from './ServiceStatusChip'
import { ServicesRollbackDeployment } from './ServicesRollbackDeployment'
import DecoratedName from './DecoratedName'
import { DeleteService } from './DeleteService'
import { ServiceErrors } from './ServiceErrors'
import { ServiceDeprecations } from './ServiceDeprecations'
import { CreateGlobalService } from './CreateGlobalService'

const columnHelper = createColumnHelper<Edge<ServiceDeploymentsRowFragment>>()

export const ColServiceDeployment = columnHelper.accessor(({ node }) => node, {
  id: 'deployment',
  header: 'Deployment',
  enableSorting: true,
  cell: ({ getValue }) => {
    const node = getValue()

    return (
      node && (
        <DecoratedName deletedAt={node.deletedAt}>{node.name}</DecoratedName>
      )
    )
  },
})

export const ColCluster = columnHelper.accessor(
  ({ node }) => node?.cluster?.name,
  {
    id: 'clusterName',
    header: 'Cluster',
    enableSorting: true,
    cell: ({ getValue, row: { original } }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()
      const cloud = original?.node?.cluster?.provider?.cloud || ''
      const clusterName = getValue()

      return (
        <ColWithIcon icon={getProviderIconURL(cloud, theme.mode === 'dark')}>
          {clusterName}
        </ColWithIcon>
      )
    },
  }
)

export const ColRepo = columnHelper.accessor(
  ({ node }) => node?.repository?.url,
  {
    id: 'repository',
    header: 'Repository',
    enableSorting: true,
    meta: { truncate: true },
    cell: ({ getValue }) => (
      <Tooltip
        placement="top-start"
        label={getValue()}
      >
        <div>
          <ColWithIcon
            truncateLeft
            icon={<GitHubLogoIcon />}
          >
            <span>{getValue()}</span>
          </ColWithIcon>
        </div>
      </Tooltip>
    ),
  }
)

export const ColRef = columnHelper.accessor(({ node }) => node, {
  id: 'gitLocation',
  header: 'Git Location',
  enableSorting: true,
  // meta: { truncate: true },
  cell: ({ getValue }) => {
    const svc = getValue()

    if (!svc) return null
    const {
      git: { ref, folder },
      message,
    } = svc

    const refStr = isSha1(ref)
      ? `${ref.slice(0, 5)}…${ref.slice(ref.length - 5)}`
      : ref

    return (
      <Tooltip
        placement="top"
        label={<div css={{ maxWidth: 400 }}>{message || ''}</div>}
      >
        <span>
          {refStr}@{folder}
        </span>
      </Tooltip>
    )
  },
})

export const ColLastActivity = columnHelper.accessor(
  ({ node }) => {
    const updatedAt = toDateOrUndef(node?.updatedAt)
    const insertedAt = toDateOrUndef(node?.insertedAt)

    return updatedAt || insertedAt || undefined
  },
  {
    id: 'lastActivity',
    header: 'Activity ',
    enableSorting: true,
    sortingFn: 'datetime',
    cell: ({ getValue }) => (
      <DateTimeCol dateString={getValue()?.toISOString()} />
    ),
  }
)

export const ColStatus = columnHelper.accessor(({ node }) => node?.status, {
  id: 'status',
  header: 'Status',
  enableSorting: true,
  enableColumnFilter: true,
  filterFn: 'equalsString',
  cell: ({
    row: {
      original: { node },
    },
  }) => (
    <ServiceStatusChip
      status={node?.status}
      componentStatus={node?.componentStatus}
    />
  ),
})

export const ColErrors = columnHelper.accessor(
  ({ node }) => node?.errors?.length ?? 0,
  {
    id: 'errors',
    header: 'Errors',
    enableSorting: true,
    enableColumnFilter: true,
    filterFn: 'equalsString',
    cell: ({
      row: {
        original: { node },
      },
    }) => (
      <>
        <ServiceErrors service={node} />
        <ServiceDeprecations service={node} />
      </>
    ),
  }
)

enum MenuItemKey {
  MakeGlobal = 'makeGlobal',
  Permissions = 'permissions',
  Delete = 'delete',
}

export const ColActions = columnHelper.accessor(({ node }) => node?.id, {
  id: 'actions',
  header: '',
  cell: function ActionColumn({
    table,
    row: {
      original: { node },
    },
  }) {
    const theme = useTheme()
    const [menuKey, setMenuKey] = useState<Nullable<string>>('')
    const serviceDeployment = node

    if (serviceDeployment?.name === 'helmexample') {
      console.log('menuKey', menuKey)
      console.log('meta', table.options.meta)
    }
    const { refetch } = table.options.meta as { refetch?: () => void }

    return (
      serviceDeployment && (
        <div
          onClick={(e) => e.stopPropagation()}
          css={{
            display: 'flex',
            gap: theme.spacing.large,
            alignItems: 'center',
          }}
        >
          <ServicesRollbackDeployment
            refetch={refetch}
            serviceDeployment={serviceDeployment}
          />
          <MoreMenu onSelectionChange={(newKey) => setMenuKey(newKey)}>
            <ListBoxItem
              key={MenuItemKey.MakeGlobal}
              leftContent={<GlobeIcon />}
              label="Make global"
            />
            <ListBoxItem
              key={MenuItemKey.Permissions}
              leftContent={<PeopleIcon />}
              label="Permissions"
            />
            <ListBoxItem
              key={MenuItemKey.Delete}
              leftContent={<TrashCanIcon color={theme.colors['icon-danger']} />}
              label="Delete service"
            />
          </MoreMenu>
          {/* Modals */}
          <DeleteService
            serviceDeployment={serviceDeployment}
            open={menuKey === MenuItemKey.Delete}
            onClose={() => {
              console.log('onClose - DeleteService')
              setMenuKey('')
            }}
            refetch={refetch}
          />
          <ServicePermissionsModal
            serviceDeployment={serviceDeployment}
            open={menuKey === MenuItemKey.Permissions}
            onClose={() => {
              console.log('onClose - ServicePermissionsModal')

              setMenuKey('')
            }}
          />
          <CreateGlobalService
            serviceDeployment={serviceDeployment}
            open={menuKey === MenuItemKey.MakeGlobal}
            onClose={() => {
              console.log('onClose - CreateGlobalService')

              setMenuKey('')
            }}
            refetch={refetch}
          />
        </div>
      )
    )
  },
})
