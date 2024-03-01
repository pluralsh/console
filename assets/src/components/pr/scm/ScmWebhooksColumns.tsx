import { Button } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import { ScmType, ScmWebhookFragment } from 'generated/graphql'
import { Edge } from 'utils/graphql'

import { StopPropagation } from 'components/utils/StopPropagation'
import { TruncateStart } from 'components/utils/table/TruncateStart'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'

import { ScmTypeCell, scmTypeToLabel } from './PrScmConnectionsColumns'

export const columnHelper = createColumnHelper<Edge<ScmWebhookFragment>>()

// const ColName = columnHelper.accessor(({ node }) => node?.name, {
//   id: 'name',
//   header: 'Name',
//   meta: { truncate: true },
//   cell: function Cell({ getValue }) {
//     return <>{getValue()}</>
//   },
// })

const ColOwner = columnHelper.accessor(({ node }) => node?.owner, {
  id: 'owner',
  header: 'Organization or group name',
  cell: function Cell({ getValue }) {
    return <span>{getValue()}</span>
  },
})

const ColInsertedAt = columnHelper.accessor(({ node }) => node?.insertedAt, {
  id: 'insertedAt',
  header: 'Created',
  cell: function Cell({ getValue }) {
    return <DateTimeCol date={getValue()} />
  },
})

export const ColType = columnHelper.accessor(({ node }) => node?.type, {
  id: 'type',
  header: 'Provider type',
  cell: ScmTypeCell,
})

export const ColUrl = columnHelper.accessor(({ node }) => node?.url, {
  id: 'url',
  header: 'URL',
  meta: { truncate: true },
  cell: function Cell({ getValue }) {
    return (
      <TruncateStart>
        <span>{getValue()}</span>
      </TruncateStart>
    )
  },
})

function getWebhookUrl(scmWebhook: Nullable<ScmWebhookFragment>) {
  if (scmWebhook?.type === ScmType.Github) {
    return `https://github.com/organizations/${scmWebhook.owner}/settings/hooks`
  }
  if (scmWebhook?.type === ScmType.Gitlab) {
    return `https://gitlab.com/groups/${scmWebhook.owner}/-/hooks`
  }

  return undefined
}

export const ColActions = columnHelper.display({
  id: 'actions',
  header: '',
  cell: function Cell({ row }) {
    const scmWebhook = row.original.node
    const url = getWebhookUrl(scmWebhook)
    const scmName = scmWebhook?.type ? scmTypeToLabel[scmWebhook?.type] : ''

    if (!url) {
      return null
    }

    return (
      <StopPropagation>
        <Button
          secondary
          as="a"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Manage{scmName && <> on {scmName}</>}
        </Button>
      </StopPropagation>
    )
  },
})

export const columns = [ColType, ColOwner, ColUrl, ColInsertedAt, ColActions]
