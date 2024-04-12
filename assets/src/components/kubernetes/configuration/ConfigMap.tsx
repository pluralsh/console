import { ReactElement, useMemo } from 'react'
import { Code, useSetBreadcrumbs } from '@pluralsh/design-system'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import { isEmpty } from 'lodash'
import yaml from 'js-yaml'

import {
  ConfigMapQueryVariables,
  Configmap_ConfigMapDetail as ConfigMapT,
  useConfigMapQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { MetadataSidecar } from '../common/utils'
import { NAMESPACE_PARAM } from '../Navigation'
import {
  CONFIG_MAPS_REL_PATH,
  getConfigurationAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import ResourceDetails, { TabEntry } from '../common/ResourceDetails'

import { useCluster } from '../Cluster'

import { getBreadcrumbs } from './ConfigMaps'

const directory: Array<TabEntry> = [
  { path: '', label: 'Data' },
  { path: 'raw', label: 'Raw' },
] as const

export default function ConfigMap(): ReactElement {
  const cluster = useCluster()
  const { clusterId, name = '', namespace = '' } = useParams()
  const { data, loading } = useConfigMapQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
    } as ConfigMapQueryVariables,
  })

  const cm = data?.handleGetConfigMapDetail

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
            'configmap',
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
      sidecar={<MetadataSidecar resource={cm} />}
    >
      <Outlet context={cm} />
    </ResourceDetails>
  )
}

export function ConfigMapData(): ReactElement {
  const cm = useOutletContext() as ConfigMapT
  const tabs = useMemo(
    () => [
      {
        key: 'yaml',
        label: 'YAML',
        language: 'yaml',
        content: yaml.dump(cm?.data),
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
