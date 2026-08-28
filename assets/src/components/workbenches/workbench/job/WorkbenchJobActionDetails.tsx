import { WorkbenchJobActionFragment } from 'generated/graphql'
import styled from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import { getActionPolicyToolName } from './workbenchJobActionPolicyUtils'

export function WorkbenchJobActionDetails({
  activity,
}: {
  activity: WorkbenchJobActionFragment
}) {
  const toolName = getActionPolicyToolName(activity)
  const createdAt = activity.insertedAt
    ? formatDateTime(
        activity.insertedAt,
        'YYYY-MM-DD HH:mm:ss [UTC]',
        false,
        true
      )
    : null

  if (!toolName && !createdAt) return null

  return (
    <DetailsSC>
      <span>tool</span>
      {toolName && <ToolNameSC title={toolName}>{toolName}</ToolNameSC>}
      {toolName && createdAt && <span>·</span>}
      {createdAt && <strong>{createdAt}</strong>}
    </DetailsSC>
  )
}

const DetailsSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: theme.spacing.xsmall,
  minWidth: 0,
  color: theme.colors['text-xlight'],
  fontSize: 10,
  strong: {
    color: theme.colors['text-light'],
    fontWeight: 400,
  },
}))

const ToolNameSC = styled.strong(({ theme }) => ({
  ...theme.partials.text.code,
  fontSize: 'inherit',
  lineHeight: 'inherit',
  color: theme.colors['text-light'],
  fontWeight: 400,
  userSelect: 'all',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))
