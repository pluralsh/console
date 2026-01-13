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

export default function Raw(): ReactElement<any> {
  const theme = useTheme()
  const { clusterId, name = '', namespace, crd } = useParams()
  const pathMatch = useMatch(`${getKubernetesAbsPath(clusterId)}/:kind/*`)
  const [current, setCurrent] = useState<string>()
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

  const { data, refetch, isFetching, error } = namespace
    ? namespacedQuery
    : clusterQuery

  const namespacedMutation = useMutation({
    ...updateNamespacedResourceMutation(),
    onSuccess: () => refetch().finally(() => setUpdating(false)),
    onError: (err) => {
      setUpdating(false)
      setUpdateError(err)
    },
  })

  const clusterMutation = useMutation({
    ...updateResourceMutation(),
    onSuccess: () => refetch().finally(() => setUpdating(false)),
    onError: (err) => {
      setUpdating(false)
      setUpdateError(err)
    },
  })

  const mutation = namespace ? namespacedMutation : clusterMutation

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

    const current = dump(data?.Object)

    setCurrent(current)
    calculateSHA(current)

    async function calculateSHA(current: string) {
      setSHA(await hash(current ?? ''))
    }
  }, [data])

  if (!current && !error) return <LoadingIndicator />

  if (!data?.Object && !isFetching)
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
            const input = load(v) as Record<string, unknown>

            setUpdating(true)
            mutation.mutate({
              client,
              path: namespace
                ? { kind, name: name ?? '', namespace: namespace ?? '' }
                : { kind, name: name ?? '', namespace: '' },
              body: input,
            })
          } catch (e) {
            setUpdateError(
              e instanceof Error
                ? e.message
                : e instanceof AxiosError
                  ? e.message
                  : String(e)
            )
          }
        }}
      />
    </>
  )
}
