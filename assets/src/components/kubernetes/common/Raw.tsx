import { ReactElement, useEffect, useMemo, useState } from 'react'
import { useMatch, useParams } from 'react-router-dom'
import { CodeEditor } from '@pluralsh/design-system'
import pluralize from 'pluralize'
import yaml from 'js-yaml'

import { ApolloError } from '@apollo/client'

import { useTheme } from 'styled-components'

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
  const theme = useTheme()
  const { clusterId, name, namespace } = useParams()
  const pathMatch = useMatch(`${getKubernetesAbsPath(clusterId)}/:kind/*`)
  const [current, setCurrent] = useState<string>()
  const [updateError, setUpdateError] = useState<ApolloError>()
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
    onCompleted: (data) =>
      setCurrent(yaml.dump(data?.handleGetResource?.Object)),
  })
  const [mutation, { loading: saving, error, called: saved }] = updateMutation({
    client: KubernetesClient(clusterId ?? ''),
    onCompleted: refetch,
  })

  const object = data?.handleGetResource?.Object
  const value = useMemo(() => current ?? yaml.dump(object), [current, object])

  useEffect(() => {
    if (error) {
      setTimeout(() => setUpdateError(undefined), 6_000)
    }

    setUpdateError(error)
  }, [error])

  if (loading && !saved) return <LoadingIndicator />

  if (!object) return <GqlError error="Could not fetch resource" />

  return (
    <>
      {updateError && (
        <div
          css={{
            position: 'absolute',
            top: theme.spacing.large,
            left: theme.spacing.large,
            zIndex: 1,
          }}
        >
          <GqlError error="Could not update resource. Make sure that the provided YAML is valid." />
        </div>
      )}
      <CodeEditor
        language="yaml"
        value={value}
        save
        saving={saving}
        saveLabel="Update"
        onSave={(v) => {
          mutation({
            variables: {
              kind,
              name: name ?? '',
              namespace: namespace ?? '',
              input: yaml.load(v),
            },
          }).then(() => setCurrent(v))
        }}
        options={{
          // TODO: add to design system to as a workaround for cursor position issue
          fontLigatures: '',
        }}
      />
    </>
  )
}
