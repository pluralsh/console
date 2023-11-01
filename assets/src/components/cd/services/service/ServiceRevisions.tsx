import {
  Breadcrumb,
  EmptyState,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import isEmpty from 'lodash/isEmpty'
import { useServiceDeploymentRevisionsQuery } from 'generated/graphql'

import {
  CD_BASE_PATH,
  SERVICE_PARAM_CLUSTER_ID,
  SERVICE_PARAM_ID,
} from 'routes/cdRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'

import { GqlError } from 'components/utils/Alert'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { columns } from '../ServiceRevisionColumns'

import {
  getServiceDetailsBreadcrumbs,
  useServiceContext,
} from './ServiceDetails'

export default function ServiceRevisions() {
  const serviceId = useParams()[SERVICE_PARAM_ID]
  const clusterName = useParams()[SERVICE_PARAM_CLUSTER_ID]
  const { service } = useServiceContext()

  const { data, error, refetch } = useServiceDeploymentRevisionsQuery({
    variables: { id: service?.id ?? '' },
    skip: !service?.id,
  })
  const revisions = mapExistingNodes(data?.serviceDeployment?.revisions)

  const serviceName = service?.name
  const breadcrumbs: Breadcrumb[] = useMemo(
    () => [
      ...getServiceDetailsBreadcrumbs({
        clusterId: clusterName,
        serviceId,
        serviceName,
      }),
      {
        label: 'revisions',
        url: `${CD_BASE_PATH}/services/${serviceId}/revisions`,
      },
    ],
    [clusterName, serviceId, serviceName]
  )

  useSetBreadcrumbs(breadcrumbs)

  if (error) {
    return <GqlError error={error} />
  }
  if (!data?.serviceDeployment?.revisions) {
    return <LoadingIndicator />
  }

  return (
    <ScrollablePage
      scrollable={false}
      heading="Revisions"
    >
      {isEmpty(revisions) ? (
        <EmptyState message="No revisions" />
      ) : (
        <FullHeightTableWrap>
          <Table
            data={revisions}
            columns={columns}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
            reactTableOptions={{
              meta: { refetch },
            }}
          />
        </FullHeightTableWrap>
      )}
    </ScrollablePage>
  )
}
