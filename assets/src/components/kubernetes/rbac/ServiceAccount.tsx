import { ReactElement, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useQuery } from '@tanstack/react-query'
import { AxiosInstance } from '../../../helpers/axios.ts'

import { MetadataSidecar } from '../common/utils'
import { getServiceAccountOptions } from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  SERVICE_ACCOUNTS_REL_PATH,
  getRbacAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { NAMESPACE_PARAM } from '../Navigation'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { GqlError } from '../../utils/Alert'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'

import { useCluster } from '../Cluster'

import { Kind } from '../common/types'

import { getBreadcrumbs } from './ServiceAccounts'

const directory: Array<TabEntry> = [{ path: 'raw', label: 'Raw' }] as const

export default function ServiceAccount(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId = '', name = '', namespace = '' } = useParams()
  const {
    data: serviceAccount,
    isLoading,
    error,
  } = useQuery({
    ...getServiceAccountOptions({
      client: AxiosInstance(clusterId),
      path: { serviceaccount: name, namespace },
    }),
    refetchInterval: 30_000,
  })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: namespace ?? '',
          url: `${getRbacAbsPath(
            cluster?.id
          )}/${SERVICE_ACCOUNTS_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            Kind.ServiceAccount,
            name,
            namespace
          ),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  if (error) {
    return <GqlError error={error} />
  }

  if (isLoading) {
    return <LoadingIndicator />
  }

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={<MetadataSidecar resource={serviceAccount} />}
    >
      <Outlet context={serviceAccount} />
    </ResourceDetails>
  )
}
