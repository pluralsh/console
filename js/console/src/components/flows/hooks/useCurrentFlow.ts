import { QueryHookOptions } from '@apollo/client'
import { FlowQuery, FlowQueryVariables, useFlowQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { validate as uuidValidate } from 'uuid'

export function useCurrentFlow(
  options?: Omit<QueryHookOptions<FlowQuery, FlowQueryVariables>, 'variables'>
) {
  const { flowIdOrName } = useParams<{ flowIdOrName?: string }>()

  const flowQueryVars = useMemo(
    () =>
      !flowIdOrName
        ? undefined
        : uuidValidate(flowIdOrName)
          ? { id: flowIdOrName }
          : { name: flowIdOrName },
    [flowIdOrName]
  )

  const { skip, ...rest } = options ?? {}
  const { data, loading, error, refetch } = useFlowQuery({
    variables: flowQueryVars ?? { id: '' },
    skip: !flowQueryVars || skip,
    ...rest,
  })

  return {
    flowIdOrName,
    flowData: data,
    loading,
    error,
    refetch,
  }
}
