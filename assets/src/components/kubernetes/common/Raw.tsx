import { CodeEditor } from '@pluralsh/design-system'
import { dump, load } from 'js-yaml'
import pluralize from 'pluralize'
import { ReactElement, useEffect, useMemo, useState } from 'react'
import { useMatch, useParams } from 'react-router-dom'
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
import { getKubernetesAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { hash } from '../../../utils/sha'
import { GqlError, GqlErrorType } from '../../utils/Alert'
import LoadingIndicator from '../../utils/LoadingIndicator'

export default function Raw(): ReactElement<any> {
  const theme = useTheme()
  const { clusterId, name, namespace, crd } = useParams()
  const pathMatch = useMatch(`${getKubernetesAbsPath(clusterId)}/:kind/*`)
  const [current, setCurrent] = useState<string>()
  const [sha, setSHA] = useState<string>()
  const [updateError, setUpdateError] = useState<GqlErrorType>()
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
  const { data, refetch, loading, error } = resourceQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    fetchPolicy: 'no-cache',
    variables: {
      kind,
      name,
      namespace,
      input: load(current ?? '{}'),
    } as ResourceQueryVariables & NamespacedResourceQueryVariables,
  })
  const [mutation] = updateMutation({
    client: KubernetesClient(clusterId ?? ''),
    onCompleted: () => refetch().finally(() => setUpdating(false)),
    onError: (err) => {
      setUpdating(false)
      setUpdateError(err)
    },
  })

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

    const current = dump(data?.handleGetResource?.Object)

    setCurrent(current)
    calculateSHA(current)

    async function calculateSHA(current: string) {
      setSHA(await hash(current ?? ''))
    }
  }, [data])

  if (!current && !error) return <LoadingIndicator />

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
            const input = load(v)

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
            setUpdateError(e instanceof Error ? e.message : (e as any))
          }
        }}
      />
    </>
  )
}
