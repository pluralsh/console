import { useFlowWorkbenchesQuery, useWorkbenchesQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'

export function useWorkbenchOptions(flowId?: Nullable<string>, enabled = true) {
  const {
    data: flowData,
    loading: flowLoading,
    error: flowError,
  } = useFlowWorkbenchesQuery({
    variables: { id: flowId ?? '' },
    skip: !enabled || !flowId,
    fetchPolicy: 'cache-first',
  })

  const {
    data: allWorkbenchesData,
    loading: allWorkbenchesLoading,
    error: allWorkbenchesError,
  } = useWorkbenchesQuery({
    skip: !enabled || !!flowId,
    fetchPolicy: 'cache-first',
  })

  const workbenches = useMemo(() => {
    if (flowId) return (flowData?.flow?.workbenches ?? []).filter(isNonNullable)

    return mapExistingNodes(allWorkbenchesData?.workbenches)
  }, [allWorkbenchesData?.workbenches, flowData?.flow?.workbenches, flowId])

  const error = flowId ? flowError : allWorkbenchesError
  const loading = flowId
    ? flowLoading && !flowData
    : allWorkbenchesLoading && !allWorkbenchesData
  const hasWorkbenches = workbenches.length > 0

  return {
    workbenches,
    hasWorkbenches,
    loading,
    error,
    confirmedNoWorkbenches: !loading && !error && !hasWorkbenches,
  }
}
