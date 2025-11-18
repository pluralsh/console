import { CodeEditor, Flex, Toast } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import {
  ClusterFragment,
  ClusterQueryHookResult,
  useUpdateClusterMutation,
} from 'generated/graphql'

import { useCallback, useMemo, useState } from 'react'

export function ClusterMetadataEditor({
  cluster,
  refetch,
}: {
  cluster: ClusterFragment
  refetch: ClusterQueryHookResult['refetch']
}) {
  const [refetching, setRefetching] = useState(false)
  const [isJsonInvalid, setIsJsonInvalid] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  const fetchedJsonStr = useMemo(
    () => stringifyJsonWithError(cluster.metadata),
    [cluster.metadata]
  )

  const [updateCluster, { loading, error }] = useUpdateClusterMutation({
    onCompleted: () => {
      setRefetching(true)
      refetch().finally(() => {
        setRefetching(false)
        setShowSuccessToast(true)
      })
    },
  })

  const onSave = useCallback(
    (newJsonStr) => {
      if (!isValidJson(newJsonStr)) {
        setIsJsonInvalid(true)
        return
      }
      setIsJsonInvalid(false)
      updateCluster({
        variables: { id: cluster.id, attributes: { metadata: newJsonStr } },
      })
    },
    [cluster.id, setIsJsonInvalid, updateCluster]
  )

  if (fetchedJsonStr === false)
    return (
      <GqlError error="Invalid JSON received from server, check logs for more details." />
    )

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      {error && <GqlError error={error} />}
      {isJsonInvalid && (
        <GqlError error="Please confirm JSON is valid before submitting." />
      )}
      <CodeEditor
        save
        key={fetchedJsonStr} // forces re-render when parent data changes, resets the initial value
        onSave={onSave}
        value={fetchedJsonStr || ''}
        saving={loading || refetching}
        language="json"
        height={440}
        fillLevel={1}
        options={{ lineNumbers: 'off', minimap: { enabled: false } }}
      />
      <Toast
        show={showSuccessToast}
        closeTimeout={5000}
        severity="success"
        margin="medium"
        position="bottom"
        onClose={() => setShowSuccessToast(false)}
      >
        Metadata updated successfully!
      </Toast>
    </Flex>
  )
}

const stringifyJsonWithError = (
  jsonObject: Nullable<Record<string, unknown>>
) => {
  if (!jsonObject) return false
  try {
    return JSON.stringify(jsonObject, null, 2)
  } catch (e: unknown) {
    console.error('Invalid JSON:', e)
    return false
  }
}

const isValidJson = (str: string) => {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}
