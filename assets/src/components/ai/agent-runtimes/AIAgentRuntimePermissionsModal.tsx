import { Button, Flex, Modal } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import {
  AgentRuntimeType,
  PolicyBindingFragment,
  useUpsertAgentRuntimeMutation,
} from 'generated/graphql'
import isEqual from 'lodash/isEqual'
import uniqWith from 'lodash/uniqWith'
import {
  ComponentProps,
  FormEvent,
  useCallback,
  useMemo,
  useState,
} from 'react'

import { FormBindings } from 'components/utils/bindings.tsx'
import { StepBody } from '../../cd/ModalAlt.tsx'

export function AIAgentRuntimePermissionsModal({
  open,
  onClose,
  ...props
}: {
  open: boolean
} & ComponentProps<typeof AIAgentRuntimePermissionsModalInner>) {
  return (
    <Modal
      header={`${name} agent runtime permissions`}
      open={open}
      onClose={onClose}
      size="large"
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      <AIAgentRuntimePermissionsModalInner
        onClose={onClose}
        {...props}
      />
    </Modal>
  )
}

export function AIAgentRuntimePermissionsModalInner({
  onClose,
  name,
  type,
  initialBindings,
}: {
  onClose: () => void
  initialBindings: PolicyBindingFragment[]
  name: string
  type: AgentRuntimeType
}) {
  const [createBindings, setCreateBindings] = useState(initialBindings)

  const uniqueCreateBindings = useMemo(
    () => uniqWith(createBindings, isEqual),
    [createBindings]
  )

  const [mutation, { loading, error }] = useUpsertAgentRuntimeMutation({
    variables: {
      attributes: {
        name,
        type,
        createBindings: uniqueCreateBindings.map(({ user, group }) => ({
          ...(user?.email && { userEmail: user.email }),
          ...(group?.name && { groupName: group.name }),
        })),
      },
    },
    onCompleted: onClose,
    refetchQueries: ['AgentRuntimes', 'AgentRuntime'],
    awaitRefetchQueries: true,
  })

  const allowSubmit =
    JSON.stringify(uniqueCreateBindings) !== JSON.stringify(initialBindings)

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (allowSubmit) mutation()
    },
    [allowSubmit, mutation]
  )

  return (
    <form onSubmit={onSubmit}>
      <Flex
        direction="column"
        gap="large"
      >
        <StepBody>
          Bind users and groups to create permissions for the
          <b> {name}</b> agent runtime
        </StepBody>
        <FormBindings
          bindings={uniqueCreateBindings}
          setBindings={setCreateBindings}
          hints={{
            user: 'Users with create permissions for this agent runtime',
            group: 'Groups with create permissions for this agent runtime',
          }}
        />
        {error && <GqlError error={error} />}
        <Flex
          gap="medium"
          alignSelf="flex-end"
        >
          <Button
            secondary
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!allowSubmit}
            loading={loading}
          >
            Save
          </Button>
        </Flex>
      </Flex>
    </form>
  )
}
