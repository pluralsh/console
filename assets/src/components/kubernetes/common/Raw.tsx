import { ReactElement, useMemo } from 'react'
import { useMatch, useParams } from 'react-router-dom'
import yaml from 'js-yaml'
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
  const tabs = useMemo(
    () =>
      object
        ? [
            {
              key: 'yaml',
              label: 'YAML',
              language: 'yaml',
              content: yaml.dump(object),
            },
            {
              key: 'json',
              label: 'JSON',
              language: 'json',
              content: JSON.stringify(object, null, 2),
            },
          ]
        : [],
    [object]
  )

  if (loading) return <LoadingIndicator />

  if (!object) return <GqlError error="Could not fetch resource" />

  return (
    <section>
      <Code
        tabs={tabs}
        css={{
          height: '100%',
        }}
      />
    </section>
  )
}
