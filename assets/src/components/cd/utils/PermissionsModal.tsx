import { Button, Modal } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import isEqual from 'lodash/isEqual'
import uniqWith from 'lodash/uniqWith'
import { PolicyBindingFragment, useUpdateRbacMutation } from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import RoleFormBindings from 'components/account/roles/RoleFormBindings'
import { bindingToBindingAttributes } from 'components/account/roles/misc'
import { GqlError } from 'components/utils/Alert'

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

export function ReadPermissions({
  bindings,
  setBindings,
  forLabel,
}: {
  bindings?: (PolicyBindingFragment | null | undefined)[] | null | undefined
  setBindings: any
  forLabel: 'cluster' | 'service' | undefined
}) {
  return (
    <PermissionsColumnSC>
      <Overline>Read Permissions</Overline>
      <RoleFormBindings
        bindings={bindings}
        setBindings={setBindings}
        hints={{
          user: `Users with read permissions${
            !forLabel ? '' : ` for this ${forLabel}`
          }`,
          group: `Groups with read permissions${
            !forLabel ? '' : ` for this ${forLabel}`
          }`,
        }}
      />
    </PermissionsColumnSC>
  )
}

export function WritePermissions({
  bindings,
  setBindings,
  forLabel,
}: {
  bindings?: (PolicyBindingFragment | null | undefined)[] | null | undefined
  setBindings: any
  forLabel: 'cluster' | 'service' | undefined
}) {
  return (
    <PermissionsColumnSC>
      <Overline>Write Permissions</Overline>
      <RoleFormBindings
        bindings={bindings}
        setBindings={setBindings}
        hints={{
          user: `Users with write permissions${
            !forLabel ? '' : ` for this ${forLabel}`
          }`,
          group: `Groups with write permissions${
            !forLabel ? '' : ` for this ${forLabel}`
          }`,
        }}
      />
    </PermissionsColumnSC>
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
  refetch,
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
  refetch?: () => void
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
        refetch?.()
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
  const forLabel = clusterId ? 'cluster' : serviceId ? 'service' : undefined

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
            Bind users to read or write permissions for
            {name && (
              <>
                <b>{name}</b> {forLabel}
              </>
            )}
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
                forLabel={forLabel}
                bindings={uniqueReadBindings}
                setBindings={setReadBindings}
              />
            </div>
            <div css={{ width: '50%', paddingLeft: theme.spacing.large }}>
              <WritePermissions
                forLabel={forLabel}
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
