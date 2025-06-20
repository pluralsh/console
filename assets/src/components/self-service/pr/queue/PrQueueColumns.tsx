import { ComponentProps, ReactElement, useState } from 'react'
import {
  ArrowTopRightIcon,
  Chip,
  EditIcon,
  IconFrame,
  ListBoxItem,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import styled, { useTheme } from 'styled-components'
import { Link } from 'react-router-dom'
import capitalize from 'lodash/capitalize'

import {
  Cluster,
  PrStatus,
  PullRequestFragment,
  ServiceDeployment,
} from 'generated/graphql'
import { Edge } from 'utils/graphql'
import { MoreMenu } from 'components/utils/MoreMenu'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import { ColClusterContent } from 'components/cd/clusters/ClustersColumns'

import { PrSettingsModal } from './PrSettings'
import { DeletePrModal } from './DeletePr'
import { ProtectBadge } from 'components/cd/clusters/ProtectBadge'
import DecoratedName from 'components/cd/services/DecoratedName'
import { BasicLink } from 'components/utils/typography/BasicLink'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'

enum MenuItemKey {
  None = '',
  Update = 'update',
  Delete = 'delete',
}

interface ColServiceContentProps {
  serviceDeployment: Nullable<
    Pick<ServiceDeployment, 'id' | 'name' | 'protect' | 'deletedAt'>
  >
  cluster: Nullable<Pick<Cluster, 'id'>>
}

function ColServiceContent({
  serviceDeployment,
  cluster,
}: ColServiceContentProps): ReactElement<any> {
  const serviceLink = getServiceDetailsPath({
    clusterId: cluster?.id,
    serviceId: serviceDeployment?.id,
  })

  return (
    <DecoratedName
      suffix={
        <ProtectBadge
          isProtected={serviceDeployment?.protect}
          resource="service"
        />
      }
      deletedAt={serviceDeployment?.deletedAt}
    >
      <BasicLink
        as={Link}
        to={serviceLink}
        css={{ whiteSpace: 'nowrap' }}
      >
        {serviceDeployment?.name}
      </BasicLink>
    </DecoratedName>
  )
}

export const columnHelper = createColumnHelper<Edge<PullRequestFragment>>()

export const ColTitle = columnHelper.accessor(({ node }) => node?.title, {
  id: 'title',
  header: 'PR Title',
  meta: { truncate: true },
  cell: function Cell({ getValue }) {
    return <>{getValue()}</>
  },
})

export function PrStatusChip({ status }: { status?: PrStatus | null }) {
  if (!status) return null

  let severity: ComponentProps<typeof Chip>['severity'] = 'neutral'

  switch (status) {
    case PrStatus.Open:
      severity = 'info'
      break
    case PrStatus.Closed:
      severity = 'danger'
      break
    case PrStatus.Merged:
      severity = 'success'
      break
  }

  return <Chip severity={severity}>{capitalize(status)}</Chip>
}

export const ColStatus = columnHelper.accessor(({ node }) => node?.status, {
  id: 'status',
  header: 'Status',
  cell: function Cell({ getValue }) {
    return <PrStatusChip status={getValue()} />
  },
})

export const ColCreator = columnHelper.accessor(({ node }) => node?.creator, {
  id: 'creator',
  header: 'Creator',
  cell: function Cell({ getValue }) {
    return <>{getValue()}</>
  },
})

export const ColLabelsSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xsmall,
  flexWrap: 'wrap',
}))
export const ColLabels = columnHelper.accessor(
  ({ node }) => node?.labels?.join(', ') || '',
  {
    id: 'labels',
    header: 'Labels',
    meta: { truncate: true },
    cell: function Cell({ row: { original } }) {
      const labels = original.node?.labels

      return (
        <ColLabelsSC>
          {labels?.map?.(
            (label) =>
              label && (
                <Chip
                  css={{
                    width: 'fit-content',
                  }}
                >
                  {label}
                </Chip>
              )
          )}
        </ColLabelsSC>
      )
    },
  }
)

export const ColCluster = columnHelper.accessor(
  ({ node }) => node?.cluster?.name,
  {
    id: 'cluster',
    header: 'Cluster',
    cell: function Cell({ row }) {
      return <ColClusterContent cluster={row.original?.node?.cluster} />
    },
  }
)

export const ColService = columnHelper.accessor(({ node }) => node, {
  id: 'service',
  header: 'Service',
  cell: function Cell({ row }) {
    return (
      <ColServiceContent
        serviceDeployment={row?.original?.node?.service}
        cluster={row?.original?.node?.cluster}
      />
    )
  },
})

export const ColInsertedAt = columnHelper.accessor(
  ({ node }) => node?.insertedAt,
  {
    id: 'insertedAt',
    header: 'Created',
    cell: function Cell({ getValue }) {
      return <DateTimeCol date={getValue()} />
    },
  }
)

export const ColActions = columnHelper.accessor(({ node }) => node, {
  id: 'actions',
  header: '',
  cell: function Cell({ table, getValue }) {
    const theme = useTheme()
    const pullReq = getValue()
    const refetch = table.options?.meta?.refetch || (() => {})
    const [menuKey, setMenuKey] = useState<MenuItemKey>(MenuItemKey.None)

    if (!pullReq) {
      return null
    }

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        css={{ alignItems: 'center', alignSelf: 'end', display: 'flex' }}
      >
        <IconFrame
          icon={<ArrowTopRightIcon color={theme.colors['icon-light']} />}
          as="a"
          href={pullReq.url}
          target="_blank"
          rel="noopener noreferrer"
        />
        <MoreMenu onSelectionChange={(newKey) => setMenuKey(newKey)}>
          <ListBoxItem
            key={MenuItemKey.Update}
            leftContent={<EditIcon />}
            label="Update"
            textValue="Update"
          />
          <ListBoxItem
            destructive
            key={MenuItemKey.Delete}
            leftContent={<TrashCanIcon color="icon-danger" />}
            label="Delete"
            textValue="Delete"
          />
        </MoreMenu>
        {/* Modals */}
        <PrSettingsModal
          pr={pullReq}
          refetch={refetch}
          open={menuKey === MenuItemKey.Update}
          onClose={() => setMenuKey(MenuItemKey.None)}
        />
        <DeletePrModal
          pr={pullReq}
          refetch={refetch}
          open={menuKey === MenuItemKey.Delete}
          onClose={() => setMenuKey(MenuItemKey.None)}
        />
      </div>
    )
  },
})

export const prColumns = [
  ColTitle,
  ColStatus,
  ColCluster,
  ColService,
  ColCreator,
  ColLabels,
  ColInsertedAt,
  ColActions,
]
