import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  GearTrainIcon,
  GitHubLogoIcon,
  GlobeIcon,
  ListBoxItem,
  PeopleIcon,
  Tooltip,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { ServiceDeploymentsRowFragment } from 'generated/graphql'
import { Edge } from 'utils/graphql'
import { toDateOrUndef } from 'utils/date'
import { shortenSha1 } from 'utils/sha'

import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import { getProviderIconURL } from 'components/utils/Provider'
import { MoreMenu } from 'components/utils/MoreMenu'

import { ProtectBadge } from '../clusters/ProtectBadge'

import { ServicePermissions } from './ServicePermissions'
import { ServiceStatusChip } from './ServiceStatusChip'
import { ServicesRollbackDeployment } from './ServicesRollbackDeployment'
import DecoratedName from './DecoratedName'
import { DeleteService } from './DeleteService'
import { ServiceErrors } from './ServiceErrors'
import { ServiceDeprecations } from './ServiceDeprecations'
import { CreateGlobalService } from './CreateGlobalService'
import { DeleteGlobalService } from './DeleteGlobalService'
import { ServiceSettings } from './ServiceSettings'

const columnHelper = createColumnHelper<Edge<ServiceDeploymentsRowFragment>>()

export const ColServiceDeployment = columnHelper.accessor(({ node }) => node, {
  id: 'deployment',
  header: 'Deployment',
  enableSorting: true,
  cell: function Cell({ getValue }) {
    const serviceDeployment = getValue()

    return (
      serviceDeployment && (
        <DecoratedName
          suffix={
            <ProtectBadge
              isProtected={serviceDeployment?.protect}
              resource="service"
            />
          }
          deletedAt={serviceDeployment.deletedAt}
        >
          {serviceDeployment.name}
        </DecoratedName>
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

export const ColRepo = columnHelper.accessor(({ node }) => node, {
  id: 'repository',
  header: 'Repository',
  enableSorting: true,
  meta: { truncate: true, gridTemplate: 'minmax(180px,1fr)' },
  cell: ({ getValue }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const theme = useTheme()
    const svc = getValue()
    const git = svc?.repository
    const helm = svc?.helmRepository
    const url = git?.url || helm?.spec?.url || ''

    return (
      <Tooltip
        placement="top-start"
        label={url}
      >
        <div>
          <ColWithIcon
            truncateLeft
            icon={
              git ? (
                <GitHubLogoIcon />
              ) : (
                getProviderIconURL('byok', theme.mode === 'dark')
              )
            }
          >
            <span>{url}</span>
          </ColWithIcon>
        </div>
      </Tooltip>
    )
  },
})

export const ColRef = columnHelper.accessor(({ node }) => node, {
  id: 'gitLocation',
  header: 'Reference',
  enableSorting: true,
  // meta: { truncate: true },
  cell: ({ getValue }) => {
    const svc = getValue()

    if (!svc) return null
    const { message } = svc

    const refStr = shortenSha1(svc.git?.ref || '')

    return (
      <>
        {svc.helm && (
          <span>
            {svc.helm?.chart}@{svc.helm?.version}
          </span>
        )}
        {svc.git && (
          <Tooltip
            placement="top"
            label={<div css={{ maxWidth: 400 }}>{message || ''}</div>}
          >
            <span>
              {refStr}@{svc.git?.folder}
            </span>
          </Tooltip>
        )}
      </>
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
  DeleteGlobal = 'deleteGlobal',
  Permissions = 'permissions',
  Settings = 'settings',
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
    const { refetch } = table.options.meta as { refetch?: () => void }
    const globalService = node?.globalService

    return (
      serviceDeployment && (
        <div
          onClick={(e) => e.stopPropagation()}
          css={{
            width: '100%',
            display: 'flex',
            gap: theme.spacing.large,
            alignItems: 'center',
            justifyContent: 'end',
          }}
        >
          {globalService && (
            <Tooltip
              placement="top"
              label={`Global service: ${globalService?.name}`}
            >
              <GlobeIcon color={theme.colors['icon-light']} />
            </Tooltip>
          )}
          <ServicesRollbackDeployment
            refetch={refetch}
            serviceDeployment={serviceDeployment}
          />
          <MoreMenu onSelectionChange={(newKey) => setMenuKey(newKey)}>
            {!node?.globalService?.id && (
              <ListBoxItem
                key={MenuItemKey.MakeGlobal}
                leftContent={<GlobeIcon />}
                label="Make global"
              />
            )}
            <ListBoxItem
              key={MenuItemKey.Permissions}
              leftContent={<PeopleIcon />}
              label="Permissions"
            />
            <ListBoxItem
              key={MenuItemKey.Settings}
              leftContent={<GearTrainIcon />}
              label="Settings"
            />
            {node?.globalService?.id && (
              <ListBoxItem
                key={MenuItemKey.DeleteGlobal}
                leftContent={<GlobeIcon color={theme.colors['icon-danger']} />}
                label="Delete global service"
              />
            )}
            {!node.protect && (
              <ListBoxItem
                key={MenuItemKey.Delete}
                leftContent={
                  <TrashCanIcon color={theme.colors['icon-danger']} />
                }
                label="Delete service"
              />
            )}
          </MoreMenu>
          {/* Modals */}
          <DeleteService
            serviceDeployment={serviceDeployment}
            open={menuKey === MenuItemKey.Delete}
            onClose={() => {
              setMenuKey('')
            }}
            refetch={refetch}
          />
          <ServicePermissions
            serviceDeployment={serviceDeployment}
            open={menuKey === MenuItemKey.Permissions}
            onClose={() => {
              setMenuKey('')
            }}
          />
          <ServiceSettings
            serviceDeployment={serviceDeployment}
            open={menuKey === MenuItemKey.Settings}
            onClose={() => {
              setMenuKey('')
            }}
            refetch={refetch}
          />
          <CreateGlobalService
            serviceDeployment={serviceDeployment}
            open={menuKey === MenuItemKey.MakeGlobal}
            onClose={() => {
              setMenuKey('')
            }}
            refetch={refetch}
          />
          {serviceDeployment.globalService && (
            <DeleteGlobalService
              globalService={serviceDeployment.globalService}
              open={menuKey === MenuItemKey.DeleteGlobal}
              onClose={() => {
                setMenuKey('')
              }}
              refetch={refetch}
            />
          )}
        </div>
      )
    )
  },
})
