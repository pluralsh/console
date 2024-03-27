import { ReactElement, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import yaml from 'js-yaml'
import { Code } from '@pluralsh/design-system'
import * as pluralize from 'pluralize'

import {
  RawQueryVariables,
  useRawQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'

export default function Raw(): ReactElement {
  const { clusterId, kind, name, namespace } = useParams()
  const { data, loading } = useRawQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      kind: pluralize(kind, 1),
      name,
      namespace,
    } as RawQueryVariables,
  })

  const object = data?.handleGetResource?.object
  const tabs = useMemo(
    () => [
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
    ],
    [object]
  )

  if (loading) {
    return <LoadingIndicator />
  }

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
