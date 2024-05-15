import {
  Button,
  EmptyState,
  EyeClosedIcon,
  EyeIcon,
  FormField,
  IconFrame,
  Input,
  SearchIcon,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { useOutletContext, useParams } from 'react-router-dom'

import isEmpty from 'lodash/isEmpty'
import { useTheme } from 'styled-components'
import { createColumnHelper } from '@tanstack/react-table'
import { useDebounce } from '@react-hooks-library/core'

import { useMergeServiceMutation } from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import ModalAlt from 'components/cd/ModalAlt'
import { useUpdateState } from 'components/hooks/useUpdateState'
import CopyButton from 'components/utils/CopyButton'
import { ObscuredToken } from 'components/profile/ObscuredToken'
import { InputRevealer } from 'components/cd/providers/InputRevealer'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import {
  StackEnvironment as StackEnvironmentT,
  StackFragment,
} from '../../generated/graphql'

import { StackOutletContextT, getBreadcrumbs } from './Stacks'
import StackEnvironmentDelete from './StackEnvironmentDelete'

const columnHelper = createColumnHelper<StackEnvironmentT>()

const columns = [
  columnHelper.accessor((row) => row.name, {
    id: 'name',
    header: 'Name',
    enableGlobalFilter: true,
    meta: { truncate: true },
    cell: ({ getValue }) => getValue(),
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
          <ChangeSecret env={env} />
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

  if (!stack) {
    return <LoadingIndicator />
  }

  return (
    <ScrollablePage scrollable={false}>
      {/* <ModalMountTransition open={createOpen}> */}
      {/* <SecretEditModal */}
      {/*  open={createOpen} */}
      {/*  serviceDeploymentId={serviceId} */}
      {/*  refetch={refetch} */}
      {/*  onClose={() => setCreateOpen(false)} */}
      {/* /> */}
      {/* </ModalMountTransition> */}
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
            primary
            onClick={() => setCreateOpen(true)}
          >
            Add environment variable
          </Button>
        </div>
        {isEmpty(stack.environment) ? (
          <EmptyState message="No environment variables" />
        ) : (
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
        )}
      </div>
    </ScrollablePage>
  )
}

/// //////////////////////////

function SecretEditModal({
  serviceDeploymentId,
  open,
  onClose,
  refetch,
  initialValue,
  mode = 'create',
}: {
  serviceDeploymentId: string | null | undefined
  open: boolean
  onClose: () => void
  refetch: () => void
  mode?: 'edit' | 'create'
  initialValue?: { name: string; value: string } | null | undefined
}) {
  const {
    state: { name, value },
    hasUpdates,
    update,
  } = useUpdateState(initialValue || { name: '', value: '' })
  const nameRef = useRef<HTMLInputElement>()
  const valueRef = useRef<HTMLInputElement>()

  useEffect(() => {
    if (mode === 'edit') {
      valueRef.current?.focus?.()
    } else {
      nameRef.current?.focus?.()
    }
  }, [mode])

  const disabled = !hasUpdates || !name || !value

  const variables = {
    id: serviceDeploymentId || '',
    ...(disabled
      ? {}
      : {
          configuration: [
            {
              name,
              value,
            },
          ],
        }),
  }

  const [mutation, { loading, error }] = useMergeServiceMutation({
    variables,
    onCompleted: () => {
      refetch?.()
      onClose?.()
    },
  })

  return (
    <ModalAlt
      header={mode === 'edit' ? 'Edit Secret' : 'Add Secret'}
      open={open}
      portal
      onClose={onClose}
      asForm
      formProps={{
        onSubmit: (e) => {
          e.preventDefault()
          if (!disabled) {
            mutation()
          }
        },
      }}
      actions={
        <>
          <Button
            primary
            type="submit"
            disabled={disabled}
            loading={loading}
          >
            {mode === 'edit' ? 'Change value' : 'Add secret'}
          </Button>
          <Button
            secondary
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>
        </>
      }
    >
      <FormField label="Name">
        <Input
          value={name}
          disabled={mode === 'edit'}
          onChange={(e) => {
            if (mode === 'create') {
              update({ name: e.target.value })
            }
          }}
          inputProps={{ ref: nameRef }}
        />
      </FormField>
      <FormField label="Value">
        <InputRevealer
          value={value}
          onChange={(e) => {
            update({ value: e.target.value })
          }}
          inputProps={{ ref: valueRef }}
        />
      </FormField>
      {error && <GqlError error={error} />}
    </ModalAlt>
  )
}

function ChangeSecret({ env }: { env: StackEnvironment }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      test
      {/* <div className="icon"> */}
      {/*  <IconFrame */}
      {/*    tooltip="Edit secret" */}
      {/*    clickable */}
      {/*    icon={<GearTrainIcon />} */}
      {/*    onClick={() => setOpen(true)} */}
      {/*  /> */}
      {/* </div> */}
      {/* <ModalMountTransition open={open}> */}
      {/*  <SecretEditModal */}
      {/*    open={open} */}
      {/*    serviceDeploymentId={serviceDeploymentId} */}
      {/*    refetch={refetch} */}
      {/*    onClose={() => setOpen(false)} */}
      {/*    mode="edit" */}
      {/*    initialValue={secret} */}
      {/*  /> */}
      {/* </ModalMountTransition> */}
    </>
  )
}
