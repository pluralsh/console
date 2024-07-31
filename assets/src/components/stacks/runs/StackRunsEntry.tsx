import {
  CaretRightIcon,
  GitCommitIcon,
  IconFrame,
  Tooltip,
} from '@pluralsh/design-system'
import moment from 'moment'
import { CSSObject, useTheme } from 'styled-components'
import { useNavigate } from 'react-router'
import { useParams } from 'react-router-dom'

import { StackRunFragment } from '../../../generated/graphql'
import { getStackRunsAbsPath } from '../../../routes/stacksRoutesConsts'

import { TRUNCATE } from '../../utils/truncate'

import StackStatusChip from '../common/StackStatusChip'
import StackRunIcon from '../common/StackRunIcon'

export default function StackRunsEntry({
  stackRun,
  first,
  entryStyles,
}: {
  stackRun: StackRunFragment
  first: boolean
  entryStyles?: CSSObject
}) {
  const navigate = useNavigate()
  const { stackId } = useParams()
  const {
    id,
    insertedAt,
    message,
    status,
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
        ...entryStyles,
      }}
      onClick={() => navigate(getStackRunsAbsPath(stackId, id))}
    >
      <StackRunIcon status={stackRun.status} />
      <div
        css={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          gap: theme.spacing.xxxsmall,
          overflow: 'hidden',
        }}
      >
        <Tooltip
          placement="top-start"
          label={message ?? (first ? 'Initial run' : 'No message')}
        >
          <div
            css={{
              alignItems: 'baseline',
              display: 'flex',
              gap: theme.spacing.medium,
            }}
          >
            <div
              css={{
                ...theme.partials.text.body2Bold,
                ...TRUNCATE,
                maxWidth: '50%',
              }}
            >
              {message ?? (first ? 'Initial run' : 'No message')}
            </div>
            {approver && (
              <div
                css={{
                  ...theme.partials.text.caption,
                  ...TRUNCATE,

                  color: theme.colors['text-xlight'],
                }}
              >
                approved by {approver?.name}
              </div>
            )}
          </div>
        </Tooltip>
        <div
          css={{
            ...theme.partials.text.caption,
            ...TRUNCATE,
            display: 'flex',
            color: theme.colors['text-xlight'],
            gap: theme.spacing.xsmall,
          }}
        >
          <GitCommitIcon />
          {ref}
        </div>
      </div>
      <div
        css={{
          ...theme.partials.text.caption,
          color: theme.colors['text-xlight'],
          display: 'flex',
          justifyContent: 'end',
          whiteSpace: 'nowrap',
        }}
      >
        {moment(insertedAt).fromNow()}
      </div>
      <StackStatusChip status={status} />
      <IconFrame icon={<CaretRightIcon />} />
    </div>
  )
}
