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
import upperFirst from 'lodash/upperFirst'
import { PolicyBindingFragment, useUpdateRbacMutation } from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import RoleFormBindings from 'components/settings/usermanagement/roles/RoleFormBindings'
import { bindingToBindingAttributes } from 'components/settings/usermanagement/roles/misc'
import { GqlError } from 'components/utils/Alert'

import { StepBody } from '../ModalAlt'

export const Overline = styled.h3(({ theme }) => ({
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
}))
export const PermissionsColumnSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  rowGap: theme.spacing.medium,
}))

export function Permissions({
  bindings,
  setBindings,
  permissionType,
  forLabel,
}: {
  bindings?: (PolicyBindingFragment | null | undefined)[] | null | undefined
  setBindings: any
  permissionType: 'read' | 'write' | 'create'
  forLabel: string | undefined
}) {
  return (
    <PermissionsColumnSC>
      <Overline>{upperFirst(permissionType)} permissions</Overline>
      <RoleFormBindings
        bindings={bindings}
        setBindings={setBindings}
        hints={{
          user: `Users with ${permissionType} permissions${
            !forLabel ? '' : ` for this ${forLabel}`
          }`,
          group: `Groups with ${permissionType} permissions${
            !forLabel ? '' : ` for this ${forLabel}`
          }`,
        }}
      />
    </PermissionsColumnSC>
  )
}

export enum PermissionsIdType {
  Cluster = 'clusterId',
  Service = 'serviceId',
  Pipeline = 'pipelineId',
  Stack = 'stackId',
  Project = 'projectId',
}

export function PermissionsModal({
  id,
  type: idType,
  bindings,
  header,
  name,
  open,
  onClose,
  refetch,
}: {
  id: string
  type: PermissionsIdType
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

      if (!allowSubmit) return

      mutation({
        variables: {
          [idType]: id,
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
    },
    [allowSubmit, mutation, idType, id, readBindings, writeBindings]
  )
  // idType expected to be in the form 'labelId'
  const forLabel = idType.slice(0, -2)

  return (
    <Modal
      header={header}
      open={open}
      onClose={onClose}
      asForm
      formProps={{ onSubmit }}
      size="custom"
      css={{ width: 1024, maxWidth: 1024 }}
      onOpenAutoFocus={(e) => {
        e.preventDefault()
      }}
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
            Bind users and groups to read or write permissions for
            {name && (
              <>
                {' '}
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
              <Permissions
                permissionType="read"
                forLabel={forLabel}
                bindings={uniqueReadBindings}
                setBindings={setReadBindings}
              />
            </div>
            <div css={{ width: '50%', paddingLeft: theme.spacing.large }}>
              <Permissions
                permissionType="write"
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
