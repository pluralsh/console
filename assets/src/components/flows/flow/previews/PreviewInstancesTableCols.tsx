import {
  ArrowTopRightIcon,
  Flex,
  GitHubLogoIcon,
  IconFrame,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ServiceDeprecations } from 'components/cd/services/ServiceDeprecations'
import {
  ClusterNameAndIcon,
  DecoratedServiceDeployment,
} from 'components/cd/services/ServicesColumns'
import { ServicesTableErrors } from 'components/cd/services/ServicesTableErrors'
import { ServiceStatusChip } from 'components/cd/services/ServiceStatusChip'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import { TRUNCATE_LEFT } from 'components/utils/truncate'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { InlineA } from 'components/utils/typography/Text'
import { PreviewEnvironmentInstance } from 'generated/graphql'
import { Link } from 'react-router-dom'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'

const columnHelper = createColumnHelper<PreviewEnvironmentInstance>()

export const ColPrUrl = columnHelper.accessor(
  (instance) => instance.pullRequest?.url,
  {
    id: 'pr',
    header: 'PR',
    cell: function Cell({ getValue }) {
      const url = getValue()
      return (
        <Flex
          gap="xsmall"
          align="center"
          maxWidth={200}
        >
          <IconFrame
            css={{ flexShrink: 0 }}
            type="floating"
            icon={<GitHubLogoIcon />}
          />

          <InlineA
            css={TRUNCATE_LEFT}
            href={url}
          >
            {url}
          </InlineA>
        </Flex>
      )
    },
  }
)
export const ColService = columnHelper.accessor(
  (instance) => instance.service?.name,
  {
    id: 'deployment',
    header: 'Deployment',
    enableSorting: true,
    cell: function Cell({ row: { original } }) {
      return (
        <DecoratedServiceDeployment serviceDeployment={original?.service} />
      )
    },
  }
)

export const ColCluster = columnHelper.accessor(
  (instance) =>
    instance.service?.cluster?.handle || instance.service?.cluster?.name,
  {
    id: 'cluster',
    header: 'Cluster',
    enableSorting: true,
    cell: function Cell({ row: { original } }) {
      return <ClusterNameAndIcon cluster={original?.service?.cluster} />
    },
  }
)

export const ColActivity = columnHelper.accessor(
  (instance) => instance.updatedAt || instance.insertedAt,
  {
    id: 'activity',
    header: 'Activity',
    enableSorting: true,
    cell: function Cell({ getValue }) {
      return <DateTimeCol date={getValue()} />
    },
  }
)

export const ColStatus = columnHelper.accessor((instance) => instance.service, {
  id: 'status',
  header: 'Status',
  enableSorting: true,
  cell: function Cell({ getValue }) {
    const service = getValue()
    return (
      <ServiceStatusChip
        status={service?.status}
        componentStatus={service?.componentStatus}
      />
    )
  },
})

export const ColTemplate = columnHelper.accessor(
  (instance) => instance.template?.name,
  {
    id: 'template',
    header: 'Template',
    enableSorting: true,
    cell: function Cell({ table: { options }, row: { original } }) {
      const template = original?.template
      return (
        <InlineLink
          onClick={() => options.meta?.setSelectedTemplateId?.(template?.id)}
          css={{ '&:not(:hover)': { textDecoration: 'none' } }}
        >
          {template?.name}
        </InlineLink>
      )
    },
  }
)

export const ColErrors = columnHelper.accessor(
  ({ service }) => service?.errors?.length ?? 0,
  {
    id: 'errors',
    header: 'Errors',
    enableSorting: true,
    cell: ({ row: { original } }) => (
      <div>
        <ServicesTableErrors service={original?.service} />
        <ServiceDeprecations service={original?.service} />
      </div>
    ),
  }
)

export const ColLinkout = columnHelper.accessor(
  (instance) => instance.service,
  {
    id: 'linkout',
    header: '',
    cell: function Cell({ getValue }) {
      const service = getValue()
      return (
        <IconFrame
          as={Link}
          clickable
          icon={<ArrowTopRightIcon />}
          tooltip="Go to service"
          to={getServiceDetailsPath({
            serviceId: service?.id,
            clusterId: service?.cluster?.id,
          })}
        />
      )
    },
  }
)
