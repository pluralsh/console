import {
  Button,
  EyeClosedIcon,
  EyeIcon,
  IconFrame,
  Input,
  SearchIcon,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { createColumnHelper } from '@tanstack/react-table'
import { useDebounce } from '@react-hooks-library/core'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import CopyButton from 'components/utils/CopyButton'
import { ObscuredToken } from 'components/profile/ObscuredToken'

import { StackEnvironment as StackEnvironmentT } from '../../../generated/graphql'
import { ModalMountTransition } from '../../utils/ModalMountTransition'

import { StackOutletContextT, getBreadcrumbs } from '../Stacks'

import StackEnvironmentEdit from './StackEnvironmentEdit'

import StackEnvironmentDelete from './StackEnvironmentDelete'

import StackEnvironmentApplyModal from './StackEnvironmentApplyModal'

const columnHelper = createColumnHelper<StackEnvironmentT>()

const columns = [
  columnHelper.accessor((row) => row.name, {
    id: 'name',
    header: 'Name',
    enableGlobalFilter: true,
    meta: { truncate: true },
    cell: ({ getValue }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()

      return <span css={{ ...theme.partials.text.code }}>{getValue()}</span>
    },
  }),
  columnHelper.accessor((row) => row, {
    id: 'value',
    header: 'Value',
    meta: { truncate: true },
    cell: ({ getValue }) => {
      const env = getValue()

      return (
        <EnvironmentValue
          value={env.value}
          secret={!!env?.secret}
        />
      )
    },
  }),
  columnHelper.accessor((row) => row, {
    id: 'actions',
    header: '',
    cell: ({ getValue }) => <EnvironmentActions env={getValue()} />,
  }),
]

function EnvironmentValue({
  value,
  secret,
}: {
  value: string
  secret?: boolean
}) {
  const theme = useTheme()
  const [reveal, setReveal] = useState(!secret)

  return (
    <div
      css={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.small,
      }}
    >
      <ObscuredToken
        token={value}
        reveal={reveal}
        reducedOpacity={false}
      />
      {secret && (
        <IconFrame
          className="icon"
          type="floating"
          clickable
          tooltip={reveal ? 'Hide value' : 'Reveal value'}
          icon={reveal ? <EyeIcon /> : <EyeClosedIcon />}
          onClick={() => setReveal((reveal) => !reveal)}
          css={{ width: 34 }}
        />
      )}
    </div>
  )
}

function EnvironmentActions({ env }: { env: StackEnvironmentT }) {
  const theme = useTheme()

  return (
    <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
      <CopyButton
        text={env.value || ''}
        tooltip="Copy value"
        type="tertiary"
      />
      <StackEnvironmentEdit env={env} />
      <StackEnvironmentDelete env={env} />
    </div>
  )
}

export default function StackEnvironment() {
  const theme = useTheme()
  const { stack } = useOutletContext() as StackOutletContextT
  const [createOpen, setCreateOpen] = useState(false)
  const [filterString, setFilterString] = useState('')
  const debouncedFilterString = useDebounce(filterString, 100)

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stack.id, stack.name), { label: 'environment' }],
      [stack]
    )
  )

  return (
    <div css={{ overflow: 'hidden' }}>
      <ModalMountTransition open={createOpen}>
        <StackEnvironmentApplyModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
        />
      </ModalMountTransition>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.medium,
          height: '100%',
        }}
      >
        <div
          css={{
            display: 'flex',
            columnGap: theme.spacing.medium,
            flexShrink: 0,
          }}
        >
          <Input
            placeholder="Search"
            startIcon={<SearchIcon />}
            value={filterString}
            onChange={(e) => setFilterString(e.currentTarget.value)}
            css={{ flexGrow: 1 }}
          />
          <Button
            secondary
            onClick={() => setCreateOpen(true)}
          >
            Add environment variable
          </Button>
        </div>
        <FullHeightTableWrap>
          <Table
            data={stack.environment || []}
            columns={columns}
            reactTableOptions={{
              state: { globalFilter: debouncedFilterString },
            }}
            emptyStateProps={{ message: 'No environment variables set.' }}
          />
        </FullHeightTableWrap>
      </div>
    </div>
  )
}
