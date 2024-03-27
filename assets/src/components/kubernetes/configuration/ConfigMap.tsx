import { ReactElement, useMemo } from 'react'
import { Code, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { isEmpty } from 'lodash'
import yaml from 'js-yaml'

import {
  ConfigMapQueryVariables,
  useConfigMapQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { ResponsivePageFullWidth } from '../../utils/layout/ResponsivePageFullWidth'
import { SubTitle } from '../../cluster/nodes/SubTitle'
import { MetadataSidecar, useKubernetesCluster } from '../utils'
import { NAMESPACE_PARAM } from '../Kubernetes'
import {
  CONFIG_MAPS_REL_PATH,
  getConfigurationAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { getBreadcrumbs } from './ConfigMaps'

export default function ConfigMap(): ReactElement {
  const theme = useTheme()
  const cluster = useKubernetesCluster()
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
    <ResponsivePageFullWidth>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.large,
        }}
      >
        <section>
          <SubTitle>Metadata</SubTitle>
          <MetadataSidecar objectMeta={cm?.objectMeta} />
        </section>
        <section>
          <SubTitle>Data</SubTitle>
          {!isEmpty(cm?.data) ? (
            <Code tabs={tabs} />
          ) : (
            'There is no data to display.'
          )}
        </section>
      </div>
    </ResponsivePageFullWidth>
  )
}
