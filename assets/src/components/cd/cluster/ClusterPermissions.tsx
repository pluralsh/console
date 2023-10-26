import { Button, Modal, PersonIcon } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import {
  ComponentProps,
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import isEqual from 'lodash/isEqual'
import uniqWith from 'lodash/uniqWith'

import {
  ClusterFragment,
  ClustersRowFragment,
  PolicyBindingFragment,
  ServiceDeploymentsRowFragment,
  useClusterBindingsQuery,
  useServiceDeploymentBindingsQuery,
  useUpdateRbacMutation,
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
  bindings?: (PolicyBindingFragment | null | undefined)[] | null | undefined
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
  bindings?: (PolicyBindingFragment | null | undefined)[] | null | undefined
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
  header,
  ...props
}: Omit<
  ComponentProps<typeof PermissionsModal>,
  'bindings' | 'clusterId' | 'serviceId' | 'header'
> & {
  header?: ReactNode
  cluster: ClustersRowFragment
}) {
  const { data } = useClusterBindingsQuery({
    variables: { id: cluster.id },
    fetchPolicy: 'no-cache',
    skip: !cluster.id,
  })
  const bindings = data?.cluster

  if (!bindings) {
    return null
  }

  return (
    <PermissionsModal
      header={header || `Cluster permissions – ${cluster.name}`}
      name={cluster.name}
      bindings={bindings}
      clusterId={cluster.id}
      {...props}
    />
  )
}

export function ServicePermissionsModal({
  service,
  header,
  ...props
}: Omit<
  ComponentProps<typeof PermissionsModal>,
  'bindings' | 'clusterId' | 'serviceId' | 'header'
> & {
  header?: ReactNode
  service: ServiceDeploymentsRowFragment
}) {
  const { data } = useServiceDeploymentBindingsQuery({
    variables: { id: service.id },
    fetchPolicy: 'no-cache',
    skip: !service.id,
  })
  const bindings = data?.serviceDeployment

  if (!bindings) {
    return null
  }

  return (
    <PermissionsModal
      header={header || `Service permissions – ${service.name}`}
      name={service.name}
      bindings={bindings}
      clusterId={service.id}
      {...props}
    />
  )
}

export function PermissionsModal({
  clusterId,
  serviceId,
  bindings,
  header,
  name,
  open,
  onClose,
}: {
  clusterId?: string
  serviceId?: string
  bindings: {
    readBindings?: Nullable<Nullable<PolicyBindingFragment>[]>
    writeBindings?: Nullable<Nullable<PolicyBindingFragment>[]>
  }
  header: ReactNode
  name?: string
  open: boolean
  onClose: () => void
}) {
  const theme = useTheme()

  const [readBindings, setReadBindings] = useState(bindings.readBindings)
  const [writeBindings, setWriteBindings] = useState(bindings.writeBindings)

  useEffect(() => {
    setReadBindings(bindings.readBindings)
  }, [bindings.readBindings])
  useEffect(() => {
    setWriteBindings(bindings.writeBindings)
  }, [bindings.writeBindings])

  const uniqueReadBindings = useMemo(
    () => uniqWith(readBindings, isEqual),
    [readBindings]
  )
  const uniqueWriteBindings = useMemo(
    () => uniqWith(writeBindings, isEqual),
    [writeBindings]
  )
  const [mutation, { loading: mutationLoading, error: mutationError }] =
    useUpdateRbacMutation({
      onCompleted: () => {
        onClose()
      },
    })
  const allowSubmit = readBindings && writeBindings

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if ((serviceId || clusterId) && readBindings && writeBindings) {
        mutation({
          variables: {
            ...(clusterId ? { clusterId } : serviceId ? { serviceId } : {}),
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
    [clusterId, mutation, readBindings, serviceId, writeBindings]
  )

  return (
    <Modal
      header={header}
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
            Bind users to read or write permissions for <b>{name}</b> cluster
          </StepBody>
        </div>
        {!bindings ? (
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
