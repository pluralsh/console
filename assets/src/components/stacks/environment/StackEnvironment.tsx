import {
  Button,
  EmptyState,
  EyeClosedIcon,
  EyeIcon,
  IconFrame,
  Input,
  SearchIcon,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import React, { useMemo, useState } from 'react'

import { useOutletContext, useParams } from 'react-router-dom'

import isEmpty from 'lodash/isEmpty'
import { useTheme } from 'styled-components'
import { createColumnHelper } from '@tanstack/react-table'
import { useDebounce } from '@react-hooks-library/core'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import CopyButton from 'components/utils/CopyButton'
import { ObscuredToken } from 'components/profile/ObscuredToken'

import {
  StackEnvironment as StackEnvironmentT,
  StackFragment,
} from '../../../generated/graphql'

import { ModalMountTransition } from '../../utils/ModalMountTransition'

import { StackOutletContextT, getBreadcrumbs } from '../StackDetails'

import StackEnvironmentDelete from './StackEnvironmentDelete'
import StackEnvironmentEdit from './StackEnvironmentEdit'
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
  const { stack } = useOutletContext() as { stack?: Nullable<StackFragment> }

  return (
    <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
      {stack && (
        <>
          <CopyButton
            text={env.value || ''}
            tooltip="Copy value"
            type="tertiary"
          />
          <StackEnvironmentEdit env={env} />
          <StackEnvironmentDelete env={env} />
        </>
      )}
    </div>
  )
}

export default function StackEnvironment() {
  const theme = useTheme()
  const { stackId = '' } = useParams()
  const { stack } = useOutletContext() as StackOutletContextT
  const [createOpen, setCreateOpen] = useState(false)
  const [filterString, setFilterString] = useState('')
  const debouncedFilterString = useDebounce(filterString, 100)

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stackId), { label: 'environment' }],
      [stackId]
    )
  )

  const addButton = useMemo(
    () => (
      <Button
        secondary
        onClick={() => setCreateOpen(true)}
      >
        Add environment variable
      </Button>
    ),
    [setCreateOpen]
  )

  if (!stack) {
    return <LoadingIndicator />
  }

  return (
    <>
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
        {isEmpty(stack.environment) ? (
          <EmptyState message="Looks like this stack doesn't have any environment variables set.">
            {addButton}
          </EmptyState>
        ) : (
          <>
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
              {addButton}
            </div>
            <FullHeightTableWrap>
              <Table
                data={stack.environment || []}
                columns={columns}
                css={{
                  maxHeight: 'unset',
                  height: '100%',
                }}
                reactTableOptions={{
                  state: { globalFilter: debouncedFilterString },
                }}
              />
            </FullHeightTableWrap>
          </>
        )}
      </div>
    </>
  )
}
