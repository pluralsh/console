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
  CD_REL_PATH,
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
              meta: {
                refetch,
                currentRevision: data.serviceDeployment.revision,
              },
            }}
          />
        </FullHeightTableWrap>
      )}
    </ScrollablePage>
  )
}
