import {
  Breadcrumb,
  Card,
  EmptyState,
  Flex,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import {
  ServiceDeploymentRevisionFragment,
  useServiceDeploymentRevisionsQuery,
} from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'

import {
  CD_REL_PATH,
  SERVICE_PARAM_CLUSTER_ID,
  SERVICE_PARAM_ID,
} from 'routes/cdRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'

import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import ConsolePageTitle from 'components/utils/layout/ConsolePageTitle'

import { useTheme } from 'styled-components'

import { formatDateTime } from 'utils/datetime'

import { CaptionText } from 'components/cluster/TableElements'

import { columns } from '../ServiceRevisionColumns'

import {
  getServiceDetailsBreadcrumbs,
  useServiceContext,
} from './ServiceDetails'

export function ServiceRevisions() {
  const theme = useTheme()
  const { serviceId, clusterId } = useParams<{
    [SERVICE_PARAM_ID]: string
    [SERVICE_PARAM_CLUSTER_ID]: string
  }>()
  const { service } = useServiceContext()

  const { data, error, refetch } = useServiceDeploymentRevisionsQuery({
    variables: { id: service?.id ?? '' },
    skip: !service?.id,
  })
  const revisions = mapExistingNodes(data?.serviceDeployment?.revisions)

  const breadcrumbs: Breadcrumb[] = useMemo(
    () => [
      ...getServiceDetailsBreadcrumbs({
        cluster: service?.cluster || { id: clusterId || '' },
        service: service || { id: serviceId || '' },
      }),
      {
        label: 'revisions',
        url: `${CD_REL_PATH}/services/${serviceId}/revisions`,
      },
    ],
    [clusterId, service, serviceId]
  )

  useSetBreadcrumbs(breadcrumbs)

  if (error) {
    return <GqlError error={error} />
  }
  if (!data?.serviceDeployment?.revisions) {
    return <LoadingIndicator />
  }

  const currentRevision = data.serviceDeployment.revision

  return (
    <Flex
      flexDirection="column"
      overflow="hidden"
      gap="small"
      marginBottom={theme.spacing.large}
    >
      <ConsolePageTitle heading="Revisions" />
      {currentRevision && <CurrentRevision revision={currentRevision} />}
      <h3 css={theme.partials.text.subtitle2}>All revisions</h3>
      {isEmpty(revisions) ? (
        <EmptyState message="No revisions" />
      ) : (
        <Table
          fullHeightWrap
          data={revisions}
          columns={columns}
          reactTableOptions={{
            meta: {
              refetch,
              currentRevision,
            },
          }}
        />
      )}
    </Flex>
  )
}

function CurrentRevision({
  revision,
}: {
  revision: ServiceDeploymentRevisionFragment
}) {
  const theme = useTheme()
  const ref = revision.helm?.chart
    ? `${revision.helm.chart}@${revision.helm.version}`
    : revision.git?.ref

  return (
    <Flex
      flexDirection="column"
      gap="small"
      marginBottom={theme.spacing.medium}
    >
      <Flex
        justify="space-between"
        align="center"
      >
        <h3 css={theme.partials.text.subtitle2}>Current revision</h3>
        <CaptionText>
          {formatDateTime(revision.insertedAt, 'll h:mma')}
        </CaptionText>
      </Flex>
      <Card
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.xsmall,
          padding: theme.spacing.medium,
        }}
      >
        <Flex
          gap="xsmall"
          align="center"
        >
          <span css={theme.partials.text.body1Bold}>{ref}</span>
          <CaptionText>{`sha: ${revision.sha}`}</CaptionText>
        </Flex>
        <span
          css={{
            ...theme.partials.text.body2,
            color: theme.colors['text-light'],
          }}
        >
          {revision.message}
        </span>
      </Card>
    </Flex>
  )
}
