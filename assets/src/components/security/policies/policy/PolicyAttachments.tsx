import { Table } from '@pluralsh/design-system'
import type { Row } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  PolicyStackAttachmentFragment,
  PolicyWorkbenchAttachmentFragment,
  usePolicyAttachmentsQuery,
} from 'generated/graphql'
import { startCase } from 'lodash'
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

const columns = [ColWorkbench, ColMatchingArg, ColUpdated]

export function PolicyAttachments() {
  const navigate = useNavigate()
  const { policy } = useOutletContext<PolicyDetailsContext>()
  const params = useParams()
  const id = policy?.id ?? params[POLICIES_PARAM_ID] ?? ''
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: usePolicyAttachmentsQuery,
        keyPath: ['policy', 'workbenchPolicies'],
        skip: !id,
      },
      { id, stackFirst: 100 }
    )

  const rows = useMemo(
    () => [
      ...mapExistingNodes(data?.policy?.workbenchPolicies).map(toWorkbenchRow),
      ...mapExistingNodes(data?.policy?.stackPolicies).map(toStackRow),
    ],
    [data]
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

function toWorkbenchRow(
  attachment: PolicyWorkbenchAttachmentFragment
): PolicyAttachmentRow {
  return {
    id: attachment.id,
    kind: 'workbench',
    name: attachment.workbench?.name,
    description: attachment.workbench?.description,
    matchingArgs: (attachment.matches?.regexes ?? []).filter(
      (regex): regex is string => !!regex
    ),
    updatedAt: attachment.updatedAt,
    href: attachment.workbench?.id
      ? getWorkbenchAbsPath(attachment.workbench.id)
      : undefined,
  }
}

function toStackRow(
  attachment: PolicyStackAttachmentFragment
): PolicyAttachmentRow {
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
