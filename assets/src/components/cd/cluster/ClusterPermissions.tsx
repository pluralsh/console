import { Button, Modal, PersonIcon } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import isEqual from 'lodash/isEqual'
import uniqWith from 'lodash/uniqWith'

import {
  ClusterPolicyBindingFragment,
  ClusterTinyFragment,
  useClusterBindingsQuery,
} from 'generated/graphql'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import RoleFormBindings from 'components/account/roles/RoleFormBindings'

import { StepBody } from '../ModalAlt'

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
  console.log('read bindings', bindings)

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
  console.log('write bindings', bindings)

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
  cluster: ClusterTinyFragment
  open: boolean
  onClose: () => void
}) {
  const theme = useTheme()
  const allowSubmit = false
  const mutationLoading = false

  const { data, loading, error } = useClusterBindingsQuery({
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
  console.log('readBindings', readBindings, data?.cluster?.readBindings)
  console.log('writeBindings', writeBindings, data?.cluster?.writeBindings)

  const uniqueReadBindings = useMemo(
    () => uniqWith(readBindings, isEqual),
    [readBindings]
  )
  const uniqueWriteBindings = useMemo(
    () => uniqWith(writeBindings, isEqual),
    [writeBindings]
  )

  console.log({ data, loading, error })

  const onSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()

    console.log('Submit form')
  }, [])

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
      </div>
    </Modal>
  )
}

export default function ClusterPermissions({
  cluster,
}: {
  cluster: ClusterTinyFragment
}) {
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
