import { ComponentProps, ReactElement, useMemo, useState } from 'react'
import {
  Chip,
  EditIcon,
  IconFrame,
  LinkoutIcon,
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

import DecoratedName from '../../cd/services/DecoratedName'
import { ProtectBadge } from '../../cd/clusters/ProtectBadge'
import { getServiceDetailsPath } from '../../../routes/cdRoutesConsts'
import { BasicLink } from '../../utils/typography/BasicLink'

import { PrSettingsModal } from './PrSettings'
import { DeletePrModal } from './DeletePr'

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
}: ColServiceContentProps): ReactElement {
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

const ColTitle = columnHelper.accessor(({ node }) => node?.title, {
  id: 'title',
  header: 'PR Title',
  meta: { truncate: true },
  cell: function Cell({ getValue }) {
    return <>{getValue()}</>
  },
})

const ColStatus = columnHelper.accessor(({ node }) => node?.status, {
  id: 'status',
  header: 'Status',
  cell: function Cell({ getValue }) {
    const status = getValue()
    const severity: ComponentProps<typeof Chip>['severity'] = useMemo(() => {
      switch (status) {
        case PrStatus.Open:
          return 'info'
        case PrStatus.Closed:
          return 'danger'
        case PrStatus.Merged:
          return 'success'
      }
    }, [status])

    if (!status) return null

    return <Chip severity={severity}>{capitalize(status)}</Chip>
  },
})

const ColCreator = columnHelper.accessor(({ node }) => node?.creator, {
  id: 'creator',
  header: 'Creator',
  cell: function Cell({ getValue }) {
    return <>{getValue()}</>
  },
})

const ColLabelsSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xsmall,
  flexWrap: 'wrap',
}))
const ColLabels = columnHelper.accessor(
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

const ColCluster = columnHelper.accessor(({ node }) => node?.cluster?.name, {
  id: 'cluster',
  header: 'Cluster',
  cell: function Cell({ row }) {
    return <ColClusterContent cluster={row.original?.node?.cluster} />
  },
})

const ColService = columnHelper.accessor(({ node }) => node, {
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

const ColInsertedAt = columnHelper.accessor(({ node }) => node?.insertedAt, {
  id: 'insertedAt',
  header: 'Created',
  cell: function Cell({ getValue }) {
    return <DateTimeCol date={getValue()} />
  },
})

const ColLink = columnHelper.accessor(({ node }) => node?.url, {
  id: 'link',
  header: 'Link',
  cell: function Cell({ getValue }) {
    const theme = useTheme()

    return (
      <IconFrame
        icon={<LinkoutIcon color={theme.colors['action-link-inline']} />}
        as="a"
        href={getValue()}
        target="_blank"
        rel="noopener noreferrer"
      />
    )
  },
})

export const ColActions = columnHelper.accessor(({ node }) => node, {
  id: 'actions',
  header: '',
  cell: function Cell({ table, getValue }) {
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
  ColLink,
  ColStatus,
  ColCluster,
  ColService,
  ColCreator,
  ColLabels,
  ColInsertedAt,
  ColActions,
]
