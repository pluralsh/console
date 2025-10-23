import { Button, Modal } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
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
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'

import { Permissions } from '../../cd/utils/PermissionsModal.tsx'
import { StepBody } from '../../cd/ModalAlt.tsx'

export function AIAgentRuntimePermissionsModal({
  id,
  bindings,
  header,
  name,
  open,
  onClose,
  refetch,
}: {
  id: string
  bindings?: Nullable<Nullable<PolicyBindingFragment>[]>
  header: ReactNode
  name?: string
  open: boolean
  onClose: () => void
  refetch?: () => void
}) {
  const theme = useTheme()

  const [createBindings, setCreateBindings] = useState(bindings)

  useEffect(() => setCreateBindings(bindings), [bindings])

  const uniqueCreateBindings = useMemo(
    () => uniqWith(createBindings, isEqual),
    [createBindings]
  )

  const [mutation, { loading: mutationLoading, error: mutationError }] =
    useUpdateRbacMutation({
      onCompleted: () => {
        refetch?.()
        onClose()
      },
    })

  const allowSubmit = createBindings

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()

      if (!allowSubmit) return

      // mutation({
      //   variables: {
      //     [idType]: id,
      //     rbac: {
      //       writeBindings: writeBindings
      //         ?.filter(isNonNullable)
      //         .map(bindingToBindingAttributes),
      //     },
      //   },
      // })
    },
    [allowSubmit]
  )

  return (
    <Modal
      header={header}
      open={open}
      onClose={onClose}
      asForm
      formProps={{ onSubmit }}
      size="large"
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
        <StepBody>
          Bind users and groups to create permissions for
          {name && (
            <>
              {' '}
              <b>{name}</b> agent runtime
            </>
          )}
        </StepBody>
        {!bindings ? (
          <LoadingIndicator />
        ) : (
          <div css={{ display: 'flex' }}>
            <Permissions
              permissionType="create"
              forLabel={'agent runtime'}
              bindings={uniqueCreateBindings}
              setBindings={setCreateBindings}
            />
          </div>
        )}
        {mutationError && <GqlError error={mutationError} />}
      </div>
    </Modal>
  )
}
