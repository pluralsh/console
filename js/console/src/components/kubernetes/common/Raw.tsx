import { CodeEditor } from '@pluralsh/design-system'
import { dump, load } from 'js-yaml'
import pluralize from 'pluralize'
import { ReactElement, useEffect, useMemo, useState } from 'react'
import { useMatch, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { useQuery, useMutation } from '@tanstack/react-query'

import {
  getNamespacedResourceOptions,
  getResourceOptions,
  updateNamespacedResourceMutation,
  updateResourceMutation,
} from '../../../generated/kubernetes/@tanstack/react-query.gen'
import { AxiosInstance } from '../../../helpers/axios'
import { getKubernetesAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { hash } from '../../../utils/sha'
import { GqlError, GqlErrorType } from '../../utils/Alert'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { AxiosError } from 'axios'

export function normalizeUpdateError(error: unknown): GqlErrorType {
  const responseData =
    error instanceof AxiosError ? error.response?.data : undefined

  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData
  }

  return error instanceof Error ? error : String(error)
}

function parseYaml(value: string): Record<string, unknown> | Error {
  try {
    return load(value) as Record<string, unknown>
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e))
  }
}

export default function Raw(): ReactElement<any> {
  const theme = useTheme()
  const { clusterId, name = '', namespace, crd } = useParams()
  const pathMatch = useMatch(`${getKubernetesAbsPath(clusterId)}/:kind/*`)
  const [sha, setSHA] = useState<string>()
  const [updateError, setUpdateError] = useState<GqlErrorType>()
  const [updating, setUpdating] = useState(false)
  const kind = useMemo(
    () => crd ?? pluralize(pathMatch?.params?.kind || '', 1),
    [pathMatch?.params?.kind, crd]
  )

  const client = AxiosInstance(clusterId ?? '')

  const namespacedQuery = useQuery({
    ...getNamespacedResourceOptions({
      client,
      path: { kind, name, namespace: namespace! },
    }),
    enabled: !!clusterId && !!namespace,
    gcTime: 0,
    refetchInterval: 30_000,
  })

  const clusterQuery = useQuery({
    ...getResourceOptions({
      client,
      path: { kind, name },
    }),
    enabled: !!clusterId && !namespace,
    gcTime: 0,
    refetchInterval: 30_000,
  })

  const { data, refetch, isLoading, error } = namespace
    ? namespacedQuery
    : clusterQuery
  const current = useMemo(() => (data ? dump(data) : undefined), [data])
  const handleUpdateError = (error: unknown) => {
    setUpdating(false)
    setUpdateError(normalizeUpdateError(error))
  }

  const namespacedMutation = useMutation({
    ...updateNamespacedResourceMutation(),
    onSuccess: () => refetch().finally(() => setUpdating(false)),
    onError: handleUpdateError,
  })

  const clusterMutation = useMutation({
    ...updateResourceMutation(),
    onSuccess: () => refetch().finally(() => setUpdating(false)),
    onError: handleUpdateError,
  })

  const mutation = namespace ? namespacedMutation : clusterMutation

  useEffect(() => {
    if (!updateError) return

    setTimeout(() => setUpdateError(undefined), 10_000) // Dismiss error after 10s
  }, [updateError])

  useEffect(() => {
    if (current === undefined) return

    hash(current).then(setSHA)
  }, [current])

  if (error) return <GqlError error={error} />

  if (!data && !isLoading) return <GqlError error="Could not fetch resource" />

  if (!current && !error) return <LoadingIndicator />

  return (
    <>
      {updateError && (
        <div
          css={{
            position: 'absolute',
            top: theme.spacing.large,
            left: theme.spacing.large,
            zIndex: 100,
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
          const input = parseYaml(v)
          if (input instanceof Error) {
            setUpdateError(normalizeUpdateError(input))
            return
          }

          setUpdating(true)
          mutation.mutate({
            client,
            path: { kind, name: name ?? '', namespace: namespace ?? '' },
            body: input,
          })
        }}
      />
    </>
  )
}
