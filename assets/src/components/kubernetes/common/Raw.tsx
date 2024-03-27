import { ReactElement, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import yaml from 'js-yaml'
import { isEmpty } from 'lodash'
import { Code } from '@pluralsh/design-system'
import * as pluralize from 'pluralize'

import {
  RawQueryVariables,
  useRawQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { SubTitle } from '../../cluster/nodes/SubTitle'

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

  const json = JSON.stringify(data?.handleGetResource?.object)
  const tabs = useMemo(
    () => [
      {
        key: 'yaml',
        label: 'YAML',
        language: 'yaml',
        content: yaml.dump(json),
      },
      {
        key: 'json',
        label: 'JSON',
        language: 'json',
        content: JSON.stringify(json, null, 2),
      },
    ],
    [json]
  )

  if (loading) {
    return <LoadingIndicator />
  }

  return (
    <section>
      <SubTitle>Data</SubTitle>
      <Code
        tabs={tabs}
        css={{
          height: '100%',
        }}
      />
    </section>
  )
}
