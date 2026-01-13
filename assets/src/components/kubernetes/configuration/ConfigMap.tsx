import { Code, useSetBreadcrumbs } from '@pluralsh/design-system'
import { dump } from 'js-yaml'
import { isEmpty } from 'lodash'
import { ReactElement, useMemo } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AxiosInstance } from '../../../helpers/axios.ts'

import { ConfigmapConfigMapDetail } from '../../../generated/kubernetes'
import { getConfigMapOptions } from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  CONFIG_MAPS_REL_PATH,
  getConfigurationAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { MetadataSidecar } from '../common/utils'
import { NAMESPACE_PARAM } from '../Navigation'

import ResourceDetails, { TabEntry } from '../common/ResourceDetails'

import { useCluster } from '../Cluster'

import { Kind } from '../common/types'

import { getBreadcrumbs } from './ConfigMaps'

const directory: Array<TabEntry> = [
  { path: '', label: 'Data' },
  { path: 'raw', label: 'Raw' },
] as const

export default function ConfigMap(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId = '', name = '', namespace = '' } = useParams()
  const { data: cm, isFetching } = useQuery({
    ...getConfigMapOptions({
      client: AxiosInstance(clusterId),
      path: { configmap: name, namespace },
    }),
    refetchInterval: 30_000,
  })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: namespace ?? '',
          url: `${getConfigurationAbsPath(
            cluster?.id
          )}/${CONFIG_MAPS_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            Kind.ConfigMap,
            name,
            namespace
          ),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  if (isFetching) return <LoadingIndicator />

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={<MetadataSidecar resource={cm} />}
    >
      <Outlet context={cm} />
    </ResourceDetails>
  )
}

export function ConfigMapData(): ReactElement<any> {
  const cm = useOutletContext() as ConfigmapConfigMapDetail
  const tabs = useMemo(
    () => [
      {
        key: 'yaml',
        label: 'YAML',
        language: 'yaml',
        content: dump(cm?.data),
      },
      {
        key: 'json',
        label: 'JSON',
        language: 'json',
        content: JSON.stringify(cm?.data, null, 2),
      },
    ],
    [cm?.data]
  )

  return !isEmpty(cm?.data) ? (
    <Code tabs={tabs} />
  ) : (
    <div>There is no data to display.</div>
  )
}
