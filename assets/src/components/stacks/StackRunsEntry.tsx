import {
  AppIcon,
  CaretRightIcon,
  CliIcon,
  IconFrame,
} from '@pluralsh/design-system'
import moment from 'moment'
import { useTheme } from 'styled-components'
import { useNavigate } from 'react-router'
import { useParams } from 'react-router-dom'

import { StackRunFragment } from '../../generated/graphql'
import { getStackRunsAbsPath } from '../../routes/stacksRoutesConsts'

import { StackRunStatusChip } from './common/StackRunStatusChip'

export default function StackRunsEntry({
  stackRun,
  first,
}: {
  stackRun: StackRunFragment
  first: boolean
}) {
  const navigate = useNavigate()
  const { stackId } = useParams()
  const {
    id,
    insertedAt,
    message,
    status,
    approvedAt,
    approver,
    git: { ref },
  } = stackRun
  const theme = useTheme()

  return (
    <div
      css={{
        alignItems: 'center',
        borderBottom: theme.borders.default,
        cursor: 'pointer',
        display: 'flex',
        gap: theme.spacing.medium,
        paddingTop: theme.spacing.small,
        paddingBottom: theme.spacing.small,
        paddingLeft: theme.spacing.medium,
        paddingRight: theme.spacing.medium,
        '&:hover': { backgroundColor: theme.colors['fill-one-hover'] },
      }}
      onClick={() => navigate(getStackRunsAbsPath(stackId, id))}
    >
      <AppIcon
        size="xxsmall"
        icon={<CliIcon width={32} />}
      />
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.xxxsmall,
          overflow: 'hidden',
        }}
      >
        <div
          css={{
            ...theme.partials.text.body2,
            textOverflow: 'ellipsis',
            overflow: 'hidden',
          }}
        >
          {message ?? (first ? 'Initial run' : 'No message')}
        </div>
        {approvedAt && approver && (
          <div
            css={{
              ...theme.partials.text.caption,
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              color: theme.colors['text-light'],
            }}
          >
            Approved {moment(approvedAt).fromNow()} by {approver?.name}
          </div>
        )}
        <div
          css={{
            ...theme.partials.text.caption,
            color: theme.colors['text-xlight'],
            textOverflow: 'ellipsis',
            overflow: 'hidden',
          }}
        >
          {ref}
        </div>
      </div>
      <div
        css={{
          ...theme.partials.text.caption,
          color: theme.colors['text-xlight'],
          display: 'flex',
          flexGrow: 1,
          justifyContent: 'end',
          whiteSpace: 'nowrap',
        }}
      >
        {moment(insertedAt).fromNow()}
      </div>
      <StackRunStatusChip status={status} />
      <IconFrame icon={<CaretRightIcon />} />
    </div>
  )
}
