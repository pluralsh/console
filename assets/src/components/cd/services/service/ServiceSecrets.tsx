import {
  Breadcrumb,
  Button,
  EmptyState,
  EyeClosedIcon,
  EyeIcon,
  FormField,
  GearTrainIcon,
  IconFrame,
  Input,
  SearchIcon,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import isEmpty from 'lodash/isEmpty'
import styled, { useTheme } from 'styled-components'
import { createColumnHelper } from '@tanstack/react-table'
import { useDebounce } from '@react-hooks-library/core'

import {
  ConfigAttributes,
  ServiceDeploymentDetailsFragment,
  useMergeServiceMutation,
  useServiceDeploymentSecretsQuery,
} from 'generated/graphql'

import {
  CD_BASE_PATH,
  SERVICE_PARAM_CLUSTER_ID,
  SERVICE_PARAM_ID,
} from 'routes/cdRoutesConsts'

import { GqlError } from 'components/utils/Alert'
import { DeleteIconButton } from 'components/utils/IconButtons'
import { Confirm } from 'components/utils/Confirm'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import ModalAlt from 'components/cd/ModalAlt'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { useUpdateState } from 'components/hooks/useUpdateState'

import CopyButton from 'components/utils/CopyButton'

import { ObscuredToken } from 'components/profile/ObscuredToken'

import { InputRevealer } from 'components/cd/providers/InputRevealer'

import { getServiceDetailsBreadcrumbs } from './ServiceDetails'

function DeleteSecret({
  serviceDeploymentId,
  secretName,
  refetch,
}: {
  serviceDeploymentId
  secretName: string
  refetch: () => void
}) {
  const theme = useTheme()
  const [confirm, setConfirm] = useState(false)

  const [mutation, { loading, error }] = useMergeServiceMutation({
    variables: {
      id: serviceDeploymentId,
      configuration: [{ name: secretName, value: null }],
    },
    onCompleted: () => {
      refetch?.()
      setConfirm(false)
    },
  })

  return (
    <>
      <DeleteIconButton
        onClick={() => setConfirm(true)}
        tooltip
      />
      <Confirm
        open={confirm}
        title="Delete Access Token"
        text={
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.medium,
            }}
          >
            <p>Are you sure you want to delete this secret?"</p>
            <p>{secretName}</p>
          </div>
        }
        close={() => setConfirm(false)}
        submit={() => {
          mutation()
        }}
        loading={loading}
        destructive
        error={error}
      />
    </>
  )
}

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

function ChangeSecret({
  serviceDeploymentId,
  secret,
  refetch,
}: {
  serviceDeploymentId
  secret: { name: string; value: string }
  refetch: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="icon">
        <IconFrame
          tooltip="Edit secret"
          clickable
          icon={<GearTrainIcon />}
          onClick={() => setOpen(true)}
        />
      </div>
      <ModalMountTransition open={open}>
        <SecretEditModal
          open={open}
          serviceDeploymentId={serviceDeploymentId}
          refetch={refetch}
          onClose={() => setOpen(false)}
          mode="edit"
          initialValue={secret}
        />
      </ModalMountTransition>
    </>
  )
}

const secretsColumnHelper = createColumnHelper<ConfigAttributes>()

const ColName = secretsColumnHelper.accessor((row) => row.name, {
  id: 'name',
  header: 'Name',
  enableGlobalFilter: true,
  meta: { truncate: true },
  cell: ({ getValue }) => getValue(),
})

const SecretValueSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
  '.icon': {
    flexGrow: 0,
    width: 32,
    height: 32,
    '*': {
      width: 'unset',
      overflow: 'unset',
      whiteSpace: 'unset',
    },
  },
}))

function SecretValue({ children }: { children: string }) {
  const [reveal, setReveal] = useState(false)

  return (
    <SecretValueSC>
      <IconFrame
        className="icon"
        size="medium"
        clickable
        tooltip={reveal ? 'Hide value' : 'Reveal value'}
        icon={reveal ? <EyeIcon /> : <EyeClosedIcon />}
        onClick={() => {
          setReveal((reveal) => !reveal)
        }}
      />
      <ObscuredToken
        token={children}
        length={20}
        reveal={reveal}
      />
    </SecretValueSC>
  )
}

const ColValue = secretsColumnHelper.accessor((row) => row.value, {
  id: 'value',
  header: 'Value',
  enableGlobalFilter: true,
  meta: { truncate: true },
  cell: ({ getValue }) => <SecretValue>{getValue() || ''}</SecretValue>,
})

const ColActionsSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xsmall,
}))
const ColActions = ({
  serviceDeploymentId,
  refetch,
}: {
  serviceDeploymentId: string | null | undefined
  refetch: () => void
}) =>
  secretsColumnHelper.accessor((row) => row.name, {
    id: 'actions',
    header: '',
    cell: ({ row: { original } }) => (
      <ColActionsSC>
        {serviceDeploymentId && (
          <>
            <CopyButton
              text={original.value || ''}
              tooltip="Copy value"
              type="secondary"
            />
            <ChangeSecret
              key={serviceDeploymentId}
              serviceDeploymentId={serviceDeploymentId}
              secret={{ name: original.name, value: original.value || '' }}
              refetch={refetch}
            />
            <DeleteSecret
              key={serviceDeploymentId}
              serviceDeploymentId={serviceDeploymentId}
              secretName={original.name}
              refetch={refetch}
            />
          </>
        )}
      </ColActionsSC>
    ),
  })

export default function ServiceSecrets() {
  const theme = useTheme()
  const serviceId = useParams()[SERVICE_PARAM_ID]
  const clusterName = useParams()[SERVICE_PARAM_CLUSTER_ID]
  const outletContext = useOutletContext<{
    service: ServiceDeploymentDetailsFragment | null | undefined
  }>()

  const [createOpen, setCreateOpen] = useState(false)
  const { data, error, refetch } = useServiceDeploymentSecretsQuery({
    variables: { id: serviceId || '' },
  })
  const serviceName = outletContext?.service?.name
  const breadcrumbs: Breadcrumb[] = useMemo(
    () => [
      ...getServiceDetailsBreadcrumbs({
        clusterId: clusterName,
        serviceId,
        serviceName,
      }),
      {
        label: 'secrets',
        url: `${CD_BASE_PATH}/services/${serviceId}/secrets`,
      },
    ],
    [clusterName, serviceId, serviceName]
  )

  useSetBreadcrumbs(breadcrumbs)
  const [filterString, setFilterString] = useState('')
  const debouncedFilterString = useDebounce(filterString, 100)
  const secretsColumns = useMemo(
    () => [
      ColName,
      ColValue,
      ColActions({ serviceDeploymentId: serviceId, refetch }),
    ],
    [refetch, serviceId]
  )

  if (error) {
    return <GqlError error={error} />
  }
  if (!data?.serviceDeployment?.configuration) {
    return <LoadingIndicator />
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        rowGap: theme.spacing.medium,
      }}
    >
      <ModalMountTransition open={createOpen}>
        <SecretEditModal
          open={createOpen}
          serviceDeploymentId={serviceId}
          refetch={refetch}
          onClose={() => setCreateOpen(false)}
        />
      </ModalMountTransition>
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
          onChange={(e) => {
            setFilterString(e.currentTarget.value)
          }}
          css={{ flexShrink: 0, flexGrow: 1 }}
        />
        <Button
          primary
          onClick={() => setCreateOpen(true)}
        >
          Add secret
        </Button>
      </div>
      {isEmpty(data?.serviceDeployment?.configuration) ? (
        <EmptyState message="No secrets" />
      ) : (
        <FullHeightTableWrap>
          <Table
            data={data.serviceDeployment?.configuration || []}
            columns={secretsColumns}
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
  )
}
