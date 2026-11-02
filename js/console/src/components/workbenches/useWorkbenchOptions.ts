import { useThrottle } from 'components/hooks/useThrottle'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  useFlowWorkbenchesQuery,
  useWorkbenchesQuery,
  WorkbenchSelectorOptionsQuery,
  WorkbenchSelectorOptionsQueryVariables,
  WorkbenchTinyFragment,
} from 'generated/graphql'
import { WorkbenchSelectorOptionsDocument } from 'generated/graphql-documents'
import { useMemo, useState } from 'react'
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

function withCurrentWorkbench(
  workbenches: WorkbenchTinyFragment[],
  current: WorkbenchTinyFragment | null
) {
  if (!current?.id) return workbenches
  if (workbenches.some((workbench) => workbench.id === current.id))
    return workbenches

  return [current, ...workbenches]
}

export function useSearchableWorkbenchOptions(workbenchId: Nullable<string>) {
  const [query, setQuery] = useState('')
  const search = useThrottle(query, 200).trim()
  const { data, loading, pageInfo, fetchNextPage, fetchingMore } =
    useFetchPaginatedData<
      WorkbenchSelectorOptionsQuery,
      WorkbenchSelectorOptionsQueryVariables
    >(
      {
        query: WorkbenchSelectorOptionsDocument,
        keyPath: ['workbenches'],
        errorPolicy: 'ignore',
      },
      {
        q: search || undefined,
        currentWorkbenchId: workbenchId || undefined,
        hasCurrentWorkbench: !!workbenchId,
      }
    )

  const listed = useMemo(
    () => mapExistingNodes(data?.workbenches),
    [data?.workbenches]
  )
  const fetchedWorkbench = data?.workbench
  const selectedWorkbench =
    (fetchedWorkbench && fetchedWorkbench.id === workbenchId
      ? fetchedWorkbench
      : null) ??
    listed.find((workbench) => workbench.id === workbenchId) ??
    null
  const workbenches = useMemo(
    () =>
      search ? listed : withCurrentWorkbench(listed, selectedWorkbench),
    [listed, search, selectedWorkbench]
  )

  return {
    workbenches,
    selectedWorkbench,
    hasWorkbenches: workbenches.length > 0 || !!search,
    loading: loading && !data,
    fetchingMore,
    query,
    setQuery,
    hasNextPage: !!pageInfo?.hasNextPage,
    fetchNextPage,
  }
}
