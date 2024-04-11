import { ReactElement, useEffect, useMemo, useState } from 'react'
import { useMatch, useParams } from 'react-router-dom'
import { CodeEditor } from '@pluralsh/design-system'
import pluralize from 'pluralize'
import yaml from 'js-yaml'
import { ApolloError } from '@apollo/client'
import { useTheme } from 'styled-components'

import { GraphQLErrors } from '@apollo/client/errors'
import type { GraphQLError } from 'graphql'

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
import { hash } from '../../../utils/sha'

export default function Raw(): ReactElement {
  const theme = useTheme()
  const { clusterId, name, namespace, crd } = useParams()
  const pathMatch = useMatch(`${getKubernetesAbsPath(clusterId)}/:kind/*`)
  const [current, setCurrent] = useState<string>()
  const [sha, setSHA] = useState<string>()
  const [updateError, setUpdateError] = useState<ApolloError>()
  const [updating, setUpdating] = useState(false)
  const kind = useMemo(
    () => crd ?? pluralize(pathMatch?.params?.kind || '', 1),
    [pathMatch?.params?.kind, crd]
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
  const { data, refetch, loading } = resourceQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    fetchPolicy: 'no-cache',
    variables: {
      kind,
      name,
      namespace,
      input: yaml.load(current ?? '{}'),
    } as ResourceQueryVariables & NamespacedResourceQueryVariables,
  })
  const [mutation, { error }] = updateMutation({
    client: KubernetesClient(clusterId ?? ''),
    onCompleted: () => refetch().finally(() => setUpdating(false)),
    onError: () => setUpdating(false),
  })

  useEffect(() => {
    if (!error) {
      return
    }

    setUpdateError(error)
  }, [error])

  useEffect(() => {
    if (!updateError) {
      return
    }

    // Dismiss error after 6 seconds
    setTimeout(() => setUpdateError(undefined), 6_000)
  }, [updateError])

  useEffect(() => {
    if (!data) {
      return
    }

    const current = yaml.dump(data?.handleGetResource?.Object)

    setCurrent(current)
    calculateSHA(current)

    async function calculateSHA(current: string) {
      setSHA(await hash(current ?? ''))
    }
  }, [data])

  if (!current) return <LoadingIndicator />

  if (!data?.handleGetResource?.Object && !loading)
    return <GqlError error="Could not fetch resource" />

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
          <GqlError
            error={updateError}
            header="Error updating resource"
          />
        </div>
      )}
      <CodeEditor
        key={sha}
        language="yaml"
        value={current}
        save
        saving={updating}
        saveLabel="Update"
        onSave={(v) => {
          try {
            const input = yaml.load(v)

            setUpdating(true)
            mutation({
              variables: {
                kind,
                name: name ?? '',
                namespace: namespace ?? '',
                input,
              },
            })
          } catch (e) {
            setUpdateError({
              graphQLErrors: [
                { message: (e as any)?.message as string } as GraphQLError,
              ] as GraphQLErrors,
            } as ApolloError)
          }
        }}
      />
    </>
  )
}
