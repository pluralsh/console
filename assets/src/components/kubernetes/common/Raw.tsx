import { ReactElement, useMemo, useState } from 'react'
import { useMatch, useParams } from 'react-router-dom'
import { CodeEditor } from '@pluralsh/design-system'
import pluralize from 'pluralize'
import yaml from 'js-yaml'

import {
  NamespacedResourceQueryVariables,
  ResourceQueryVariables,
  useNamespacedResourceQuery,
  useNamespacedResourceUpdateMutation,
  useResourceQuery,
  useResourceUpdateMutation,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { getKubernetesAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { GqlError } from '../../utils/Alert'

export default function Raw(): ReactElement {
  const { clusterId, name, namespace } = useParams()
  const pathMatch = useMatch(`${getKubernetesAbsPath(clusterId)}/:kind/*`)
  const [current, setCurrent] = useState<string>()
  const kind = useMemo(
    () => pluralize(pathMatch?.params?.kind || '', 1),
    [pathMatch?.params?.kind]
  )
  const resourceQuery = useMemo(
    () => (namespace ? useNamespacedResourceQuery : useResourceQuery),
    [namespace]
  )
  const updateMutation = useMemo(
    () =>
      namespace
        ? useNamespacedResourceUpdateMutation
        : useResourceUpdateMutation,
    [namespace]
  )
  const { data, loading, refetch } = resourceQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    fetchPolicy: 'cache-and-network',
    variables: {
      kind,
      name,
      namespace,
    } as ResourceQueryVariables & NamespacedResourceQueryVariables,
  })
  const [mutation, { loading: saving, error: updateError }] = updateMutation({
    client: KubernetesClient(clusterId ?? ''),
    onCompleted: refetch,
    errorPolicy: 'all',
  })

  const object = data?.handleGetResource?.Object
  const value = useMemo(() => current ?? yaml.dump(object), [current, object])

  if (loading) return <LoadingIndicator />

  if (!object) return <GqlError error="Could not fetch resource" />

  return (
    <>
      {updateError && <GqlError error={updateError?.message} />}
      <CodeEditor
        language="yaml"
        value={value}
        save
        saving={saving}
        saveLabel="Update"
        onSave={(v) => {
          setCurrent(v)
          mutation({
            variables: {
              kind,
              name: name ?? '',
              namespace: namespace ?? '',
              input: yaml.load(v),
            },
          })
        }}
        options={{
          // TODO: add to design system to as a workaround for cursor position issue
          fontLigatures: '',
        }}
      />
    </>
  )
}
