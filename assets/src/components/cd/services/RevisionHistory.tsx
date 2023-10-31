import { ServiceDeploymentRevisionFragment } from 'generated/graphql'
import { createColumnHelper } from '@tanstack/react-table'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import { toDateOrUndef } from 'utils/date'
import { CheckRoundedIcon, Tooltip } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'

import { StackedText } from '../clusters/Clusters'

const columnHelper =
  createColumnHelper<Nullable<ServiceDeploymentRevisionFragment>>()

const ColGitRef = columnHelper.accessor((row) => row?.git.ref, {
  id: 'gitRef',
  header: 'Commit ref',
  meta: { truncate: true },
  cell: ({ row: { original }, getValue }) => (
    <Tooltip
      placement="top-start"
      label={getValue()}
    >
      <StackedText
        first={getValue()}
        second={`sha: ${original?.sha || ''}`}
      />
    </Tooltip>
  ),
})

const ColMessage = columnHelper.accessor((row) => row?.message, {
  id: 'commitMessage',
  header: 'Message',
  cell: ({ getValue }) => getValue(),
})

const ColCommitTime = columnHelper.accessor(
  (row) => toDateOrUndef(row?.insertedAt),
  {
    id: 'commitTime',
    header: 'Commit date',
    enableSorting: true,
    cell: ({ row: { original } }) => (
      <DateTimeCol dateString={original?.insertedAt} />
    ),
  }
)

const SelectedIcon = styled(CheckRoundedIcon)(({ theme }) => ({
  color: theme.colors['action-primary'],
  position: 'relative',
  '& svg': {
    zIndex: 0,
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '2px',
    right: '2px',
    left: '2px',
    bottom: '2px',
    backgroundColor: theme.colors['text-always-white'],
    borderRadius: '50%',
  },
}))

const ColSelectedSC = styled.div((_) => ({
  display: 'flex',
  alignItems: 'center',
}))
const ColSelected = columnHelper.accessor(
  (row) => toDateOrUndef(row?.insertedAt),
  {
    id: 'selected',
    header: '',
    cell: function Cell({ row: { getIsSelected } }) {
      const theme = useTheme()

      return (
        <ColSelectedSC>
          {getIsSelected() && (
            <SelectedIcon
              size={16}
              color={theme.colors['action-primary']}
            />
          )}
        </ColSelectedSC>
      )
    },
  }
)

export const columns = [ColGitRef, ColMessage, ColCommitTime, ColSelected]
