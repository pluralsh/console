import { Table } from '@pluralsh/design-system'
import type { Row } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  BindingPolicyType,
  PolicyAttachmentFragment,
  PolicyType,
  usePolicyAttachmentsQuery,
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
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: usePolicyAttachmentsQuery,
        keyPath: ['policy', 'attachments'],
        skip: !id,
      },
      { id }
    )

  const rows = useMemo(
    () => mapExistingNodes(data?.policy?.attachments).map(toAttachmentRow),
    [data]
  )
  const columns = useMemo(
    () => [
      {
        ...ColWorkbench,
        header: policy?.type === PolicyType.Stack ? 'Stack' : 'Workbench',
      },
      ...(policy?.type === PolicyType.Stack ? [] : [ColMatchingArg]),
      ColUpdated,
    ],
    [policy?.type]
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

function toAttachmentRow(
  attachment: PolicyAttachmentFragment
): PolicyAttachmentRow {
  if (attachment.type === BindingPolicyType.Stack) {
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

const WrapperSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  height: '100%',
  overflow: 'hidden',
})
