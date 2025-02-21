import {
  DryRunIcon,
  GearTrainIcon,
  GitHubLogoIcon,
  GlobeIcon,
  ListBoxItem,
  ListIcon,
  PeopleIcon,
  ReturnIcon,
  Tooltip,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useState } from 'react'
import { useTheme } from 'styled-components'

import { ServiceDeploymentsRowFragment } from 'generated/graphql'
import { toDateOrUndef } from 'utils/datetime'
import { Edge } from 'utils/graphql'
import { shortenSha1 } from 'utils/sha'

import { MoreMenu } from 'components/utils/MoreMenu'
import {
  getClusterIconUrl,
  getProviderIconUrl,
} from 'components/utils/Provider'
import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'

import { ProtectBadge } from '../clusters/ProtectBadge'

import { AiInsightSummaryIcon } from 'components/utils/AiInsights'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { CreateGlobalService } from './CreateGlobalService'
import DecoratedName from './DecoratedName'
import { DeleteGlobalService } from './DeleteGlobalService'
import { DeleteService } from './DeleteService'
import { DetachService } from './DetachService'
import { ServiceDeprecations } from './ServiceDeprecations'
import { ServicePermissions } from './ServicePermissions'
import { ServiceSettings } from './ServiceSettings'
import { ServiceStatusChip } from './ServiceStatusChip'
import { ServiceUpdateHelmValues } from './ServiceUpdateHelmValues'
import { ServicesResyncDeployment } from './ServicesResyncDeployment'
import { ServicesRollbackDeployment } from './ServicesRollbackDeployment'
import { ServicesTableErrors } from './ServicesTableErrors'

const columnHelper = createColumnHelper<Edge<ServiceDeploymentsRowFragment>>()

export const ColServiceDeployment = columnHelper.accessor(({ node }) => node, {
  id: 'deployment',
  header: 'Deployment',
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
    cell: ({ getValue, row: { original } }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()
      const clusterName = getValue()

      return (
        <ColWithIcon
          icon={getClusterIconUrl({
            cluster: original?.node?.cluster,
            mode: theme.mode,
          })}
        >
          {clusterName}
        </ColWithIcon>
      )
    },
  }
)

export const ColRepo = columnHelper.accessor(({ node }) => node, {
  id: 'repository',
  header: 'Repository',
  meta: { truncate: true, gridTemplate: 'minmax(180px,0.65fr)' },
  cell: function Cell({ getValue }) {
    const theme = useTheme()
    const svc = getValue()
    const git = svc?.repository
    const helmUrl = svc?.helm?.url || svc?.helmRepository?.spec?.url
    const url = helmUrl || git?.url || ''

    return (
      <Tooltip
        placement="top-start"
        label={url}
      >
        <div>
          <ColWithIcon
            truncateLeft
            icon={
              helmUrl ? (
                getProviderIconUrl('byok', theme.mode)
              ) : (
                <GitHubLogoIcon />
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
  // meta: { truncate: true },
  cell: ({ getValue }) => {
    const svc = getValue()

    if (!svc) return null
    const { message } = svc

    const refStr = shortenSha1(svc.git?.ref || '')

    return (
      <>
        {svc.helm?.chart && svc.helm?.version && (
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
    sortingFn: 'datetime',
    cell: ({ getValue }) => <DateTimeCol date={getValue()?.toISOString()} />,
  }
)

export const ColStatus = columnHelper.accessor(({ node }) => node?.status, {
  id: 'status',
  header: 'Status',
  meta: { gridTemplate: 'auto' },
  enableColumnFilter: true,
  filterFn: 'equalsString',
  cell: ({
    row: {
      original: { node },
    },
  }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const theme = useTheme()

    return (
      <div
        css={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: theme.spacing.xxsmall,
          alignItems: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        <ServiceStatusChip
          status={node?.status}
          componentStatus={node?.componentStatus}
        />
      </div>
    )
  },
})

export const ColErrors = columnHelper.accessor(
  ({ node }) => node?.errors?.length ?? 0,
  {
    id: 'errors',
    header: 'Errors',
    enableColumnFilter: true,
    filterFn: 'equalsString',
    cell: ({
      row: {
        original: { node },
      },
    }) => (
      <div>
        <ServicesTableErrors service={node} />
        <ServiceDeprecations service={node} />
      </div>
    ),
  }
)

enum MenuItemKey {
  MakeGlobal = 'makeGlobal',
  DeleteGlobal = 'deleteGlobal',
  Permissions = 'permissions',
  Settings = 'settings',
  HelmValues = 'helmValues',
  Delete = 'delete',
  Detach = 'detach',
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
            gap: theme.spacing.small,
            alignItems: 'center',
            justifyContent: 'end',
          }}
        >
          {node?.dryRun && (
            <Tooltip
              placement="top"
              label="Dry run"
            >
              <DryRunIcon color={theme.colors['icon-light']} />
            </Tooltip>
          )}
          {globalService && (
            <Tooltip
              placement="top"
              label={`Global service: ${globalService?.name}`}
            >
              <GlobeIcon color={theme.colors['icon-light']} />
            </Tooltip>
          )}
          <AiInsightSummaryIcon
            navPath={`${getServiceDetailsPath({
              clusterId: node?.cluster?.id,
              serviceId: node?.id,
            })}/insights`}
            insight={node?.insight}
            iconFrameType="floating"
          />
          <ServicesRollbackDeployment
            refetch={refetch}
            serviceDeployment={serviceDeployment}
          />
          <ServicesResyncDeployment serviceDeployment={serviceDeployment} />
          <MoreMenu onSelectionChange={(newKey) => setMenuKey(newKey)}>
            {!node?.globalService?.id && (
              <ListBoxItem
                key={MenuItemKey.MakeGlobal}
                leftContent={<GlobeIcon />}
                label="Make global"
                textValue="Make global"
              />
            )}
            <ListBoxItem
              key={MenuItemKey.Permissions}
              leftContent={<PeopleIcon />}
              label="Permissions"
              textValue="Permissions"
            />
            {serviceDeployment.helm && (
              <ListBoxItem
                key={MenuItemKey.HelmValues}
                leftContent={<ListIcon />}
                label="Helm values"
                textValue="Helm values"
              />
            )}
            <ListBoxItem
              key={MenuItemKey.Settings}
              leftContent={<GearTrainIcon />}
              label="Settings"
              textValue="Settings"
            />
            {node?.globalService?.id && (
              <ListBoxItem
                key={MenuItemKey.DeleteGlobal}
                leftContent={<GlobeIcon color={theme.colors['icon-danger']} />}
                label="Delete global service"
                textValue="Delete global service"
              />
            )}
            {!node.protect && (
              <ListBoxItem
                key={MenuItemKey.Detach}
                leftContent={
                  <ReturnIcon color={theme.colors['icon-danger-critical']} />
                }
                label="Detach service"
                textValue="Detach service"
              />
            )}
            {!node.protect && (
              <ListBoxItem
                key={MenuItemKey.Delete}
                leftContent={
                  <TrashCanIcon color={theme.colors['icon-danger-critical']} />
                }
                label="Delete service"
                textValue="Delete service"
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
          <DetachService
            serviceDeployment={serviceDeployment}
            open={menuKey === MenuItemKey.Detach}
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
          <ServiceUpdateHelmValues
            serviceDeployment={serviceDeployment}
            open={menuKey === MenuItemKey.HelmValues}
            onClose={() => {
              setMenuKey('')
            }}
            refetch={refetch}
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
