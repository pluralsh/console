import { ReactElement, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { MetadataSidecar } from '../common/utils'
import {
  ServiceAccountQueryVariables,
  useServiceAccountQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import {
  SERVICE_ACCOUNTS_REL_PATH,
  getAccessAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { NAMESPACE_PARAM } from '../Navigation'
import LoadingIndicator from '../../utils/LoadingIndicator'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'

import { useCluster } from '../Cluster'

import { getBreadcrumbs } from './ServiceAccounts'

const directory: Array<TabEntry> = [{ path: 'raw', label: 'Raw' }] as const

export default function ServiceAccount(): ReactElement {
  const cluster = useCluster()
  const { clusterId, name = '', namespace = '' } = useParams()
  const { data, loading } = useServiceAccountQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
    } as ServiceAccountQueryVariables,
  })

  const serviceAccount = data?.handleGetServiceAccountDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: namespace ?? '',
          url: `${getAccessAbsPath(
            cluster?.id
          )}/${SERVICE_ACCOUNTS_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            'serviceaccount',
            name,
            namespace
          ),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  if (loading) return <LoadingIndicator />

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={<MetadataSidecar resource={serviceAccount} />}
    >
      <Outlet context={serviceAccount} />
    </ResourceDetails>
  )
}
