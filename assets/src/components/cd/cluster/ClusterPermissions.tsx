import { Button, Modal, PersonIcon } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import isEqual from 'lodash/isEqual'
import uniqWith from 'lodash/uniqWith'

import {
  ClusterFragment,
  ClusterPolicyBindingFragment,
  useClusterBindingsQuery,
  useUpdateClusterBindingsMutation,
} from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import RoleFormBindings from 'components/account/roles/RoleFormBindings'

import { bindingToBindingAttributes } from 'components/account/roles/misc'

import { GqlError } from 'components/utils/Alert'

import { StepBody } from '../ModalAlt'

type Cluster = Pick<ClusterFragment, 'id' | 'name' | 'version'>

const Overline = styled.h3(({ theme }) => ({
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
}))

const PermissionsColumnSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  rowGap: theme.spacing.medium,
}))

function ReadPermissions({
  bindings,
  setBindings,
}: {
  bindings?:
    | (ClusterPolicyBindingFragment | null | undefined)[]
    | null
    | undefined
  setBindings: any
}) {
  return (
    <PermissionsColumnSC>
      <Overline>Read Permissions</Overline>
      <RoleFormBindings
        bindings={bindings}
        setBindings={setBindings}
        hints={{
          user: 'Users with read permissions for this cluster',
          group: 'Groups with read permissions for this cluster',
        }}
      />
    </PermissionsColumnSC>
  )
}

function WritePermissions({
  bindings,
  setBindings,
}: {
  bindings?:
    | (ClusterPolicyBindingFragment | null | undefined)[]
    | null
    | undefined
  setBindings: any
}) {
  return (
    <PermissionsColumnSC>
      <Overline>Write Permissions</Overline>
      <RoleFormBindings
        bindings={bindings}
        setBindings={setBindings}
        hints={{
          user: 'Users with write permissions for this cluster',
          group: 'Groups with write permissions for this cluster',
        }}
      />
    </PermissionsColumnSC>
  )
}

export function ClusterPermissionsModal({
  cluster,
  open,
  onClose,
}: {
  cluster: Cluster
  open: boolean
  onClose: () => void
}) {
  const theme = useTheme()

  const { data } = useClusterBindingsQuery({
    variables: { id: cluster.id },
    fetchPolicy: 'no-cache',
    skip: !cluster.id,
  })

  const [readBindings, setReadBindings] = useState(data?.cluster?.readBindings)
  const [writeBindings, setWriteBindings] = useState(
    data?.cluster?.writeBindings
  )

  useEffect(() => {
    setReadBindings(data?.cluster?.readBindings)
  }, [data?.cluster?.readBindings])
  useEffect(() => {
    setWriteBindings(data?.cluster?.writeBindings)
  }, [data?.cluster?.writeBindings])

  const uniqueReadBindings = useMemo(
    () => uniqWith(readBindings, isEqual),
    [readBindings]
  )
  const uniqueWriteBindings = useMemo(
    () => uniqWith(writeBindings, isEqual),
    [writeBindings]
  )
  const [mutation, { loading: mutationLoading, error: mutationError }] =
    useUpdateClusterBindingsMutation({
      onCompleted: () => {
        onClose()
      },
    })
  const allowSubmit = readBindings && writeBindings

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (cluster.version && readBindings && writeBindings) {
        mutation({
          variables: {
            id: cluster.id,
            rbac: {
              readBindings: readBindings
                ?.filter(isNonNullable)
                .map(bindingToBindingAttributes),
              writeBindings: writeBindings
                ?.filter(isNonNullable)
                .map(bindingToBindingAttributes),
            },
          },
        })
      }
    },
    [cluster.id, cluster.version, mutation, readBindings, writeBindings]
  )

  return (
    <Modal
      header={`Cluster permissions – ${cluster.name}`}
      open={open}
      onClose={onClose}
      asForm
      formProps={{ onSubmit }}
      portal
      size="large"
      maxWidth={1024}
      width={1024}
      actions={
        <div
          css={{
            display: 'flex',
            columnGap: theme.spacing.medium,
            flexDirection: 'row-reverse',
          }}
        >
          <Button
            type="submit"
            disabled={!allowSubmit}
            loading={mutationLoading}
            primary
          >
            Save
          </Button>
          <Button
            secondary
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onClose?.()
            }}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.xlarge,
        }}
      >
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            rowGap: theme.spacing.medium,
          }}
        >
          <StepBody>
            Bind users to read or write permissions for <b>{cluster.name}</b>{' '}
            cluster
          </StepBody>
        </div>
        {!data ? (
          <LoadingIndicator />
        ) : (
          <div css={{ display: 'flex' }}>
            <div
              css={{
                width: '50%',
                paddingRight: theme.spacing.large,
                borderRight: theme.borders['fill-two'],
              }}
            >
              <ReadPermissions
                bindings={uniqueReadBindings}
                setBindings={setReadBindings}
              />
            </div>
            <div css={{ width: '50%', paddingLeft: theme.spacing.large }}>
              <WritePermissions
                bindings={uniqueWriteBindings}
                setBindings={setWriteBindings}
              />
            </div>
          </div>
        )}
        {mutationError && <GqlError error={mutationError} />}
      </div>
    </Modal>
  )
}

export default function ClusterPermissions({ cluster }: { cluster: Cluster }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        secondary
        startIcon={<PersonIcon />}
        onClick={() => setIsOpen(true)}
      >
        Permissions
      </Button>
      <ModalMountTransition open={isOpen}>
        <ClusterPermissionsModal
          cluster={cluster}
          open={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
