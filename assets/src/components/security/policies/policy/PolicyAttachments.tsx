import { Table } from '@pluralsh/design-system'
import type { Row } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  PolicyType,
  usePolicyStackAttachmentsQuery,
  usePolicyWorkbenchAttachmentsQuery,
} from 'generated/graphql'
import { compact, startCase } from 'lodash'
import { useMemo } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { POLICIES_PARAM_ID } from 'routes/securityRoutesConsts'
import { getStacksAbsPath } from 'routes/stacksRoutesConsts'
import { getWorkbenchAbsPath } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import {
  ColMatchingArg,
  ColUpdated,
  ColWorkbench,
  PolicyAttachmentRow,
} from './PolicyAttachmentsColumns'
import { PolicyDetailsContext } from './PolicyDetails'

export function PolicyAttachments() {
  const navigate = useNavigate()
  const { policy } = useOutletContext<PolicyDetailsContext>()
  const params = useParams()
  const id = policy?.id ?? params[POLICIES_PARAM_ID] ?? ''
  const type = policy?.type
  const isStack = type === PolicyType.Stack
  const workbenchQuery = useFetchPaginatedData(
    {
      queryHook: usePolicyWorkbenchAttachmentsQuery,
      keyPath: ['policy', 'workbenchPolicies'],
      skip: !id || !type || isStack,
    },
    { id }
  )
  const stackQuery = useFetchPaginatedData(
    {
      queryHook: usePolicyStackAttachmentsQuery,
      keyPath: ['policy', 'stackPolicies'],
      skip: !id || !type || !isStack,
    },
    { id }
  )
  const { loading, error, pageInfo, fetchNextPage, setVirtualSlice } = isStack
    ? stackQuery
    : workbenchQuery
  const data = isStack ? stackQuery.data : workbenchQuery.data

  const rows = useMemo(() => {
    if (isStack) {
      return mapExistingNodes(stackQuery.data?.policy?.stackPolicies).map(
        toStackRow
      )
    }

    return mapExistingNodes(workbenchQuery.data?.policy?.workbenchPolicies).map(
      toWorkbenchRow
    )
  }, [isStack, stackQuery.data, workbenchQuery.data])
  const columns = useMemo(
    () => [
      {
        ...ColWorkbench,
        header: isStack ? 'Stack' : 'Workbench',
      },
      ...(isStack ? [] : [ColMatchingArg]),
      ColUpdated,
    ],
    [isStack]
  )

  if (error) return <GqlError error={error} />

  return (
    <WrapperSC>
      <Table
        fullHeightWrap
        virtualizeRows
        data={rows}
        loading={!data && loading}
        columns={columns}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        onRowClick={(_e, { original }: Row<PolicyAttachmentRow>) => {
          if (original.href) navigate(original.href)
        }}
        emptyStateProps={{ message: 'No attachments found.' }}
      />
    </WrapperSC>
  )
}

function toWorkbenchRow(attachment: {
  id: string
  matches?: { regexes?: (string | null)[] | null } | null
  workbench?: {
    id?: string | null
    name?: string | null
    description?: string | null
  } | null
  updatedAt?: string | null
}): PolicyAttachmentRow {
  return {
    id: attachment.id,
    kind: 'workbench',
    name: attachment.workbench?.name,
    description: attachment.workbench?.description,
    matchingArgs: compact(attachment.matches?.regexes),
    updatedAt: attachment.updatedAt,
    href: attachment.workbench?.id
      ? getWorkbenchAbsPath(attachment.workbench.id)
      : undefined,
  }
}

function toStackRow(attachment: {
  id: string
  stack?: {
    id?: string | null
    name?: string | null
    type?: string | null
  } | null
  updatedAt?: string | null
}): PolicyAttachmentRow {
  return {
    id: attachment.id,
    kind: 'stack',
    name: attachment.stack?.name,
    description: attachment.stack?.type
      ? startCase(attachment.stack.type.toLowerCase())
      : 'Stack',
    matchingArgs: [],
    updatedAt: attachment.updatedAt,
    href: attachment.stack?.id
      ? getStacksAbsPath(attachment.stack.id)
      : undefined,
  }
}

const WrapperSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  height: '100%',
  overflow: 'hidden',
})
