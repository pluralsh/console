import { ReactElement, useMemo } from 'react'
import { useMatch, useParams } from 'react-router-dom'
import { Code } from '@pluralsh/design-system'
import * as pluralize from 'pluralize'

import {
  NamespacedResourceQueryVariables,
  ResourceQueryVariables,
  useNamespacedResourceQuery,
  useResourceQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { getKubernetesAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { GqlError } from '../../utils/Alert'
import { useCodeTabs } from '../utils'

export default function Raw(): ReactElement {
  const { clusterId, name, namespace } = useParams()
  const pathMatch = useMatch(`${getKubernetesAbsPath(clusterId)}/:kind/*`)
  const kind = useMemo(
    () => pluralize(pathMatch?.params?.kind || '', 1),
    [pathMatch?.params?.kind]
  )
  const resourceQuery = useMemo(
    () => (namespace ? useNamespacedResourceQuery : useResourceQuery),
    [namespace]
  )
  const { data, loading } = resourceQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      kind,
      name,
      namespace,
    } as ResourceQueryVariables & NamespacedResourceQueryVariables,
  })

  const object = data?.handleGetResource?.Object
  const tabs = useCodeTabs(object)

  if (loading) return <LoadingIndicator />

  if (!object) return <GqlError error="Could not fetch resource" />

  return (
    <Code
      tabs={tabs}
      css={{
        height: '100%',
      }}
    />
  )
}
