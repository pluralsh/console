import { ComponentProps, useCallback, useMemo,useState } from 'react'
import { Button, FormField, Input2, Modal } from '@pluralsh/design-system'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { useTheme } from 'styled-components'
import { useUpdateState } from 'components/hooks/useUpdateState'
import {
  NotificationRouterAttributes,
  NotificationRouterFragment,
  NotificationRoutersDocument,
  useUpsertNotificationRouterMutation,
} from 'generated/graphql'

import { appendConnection, updateCache } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import ModalAlt from 'components/cd/ModalAlt'

type ModalBaseProps = {
  mode: 'edit' | 'create'
  router?: NotificationRouterFragment
}

type ModalProps = {
  open: boolean
  onClose: Nullable<() => void>
} & ModalBaseProps

/**
 * Upsert a notification router
 * @param mode Defaults to `edit`. `create` is only provided for debugging,
 * don't expose to users
 * @returns
 */
function UpsertNotificationRouterModal({
  mode = 'edit',
  open,
  onClose,
  ...props
}: ModalProps) {
  const router = mode === 'edit' ? props.router : undefined
  const theme = useTheme()
  const [mOpen, setMOpen] = useState(false)

  const createMutationAttrs =
    mode === 'create'
      ? ({
          name: 'test-router-',
          events: [
            // '*',
            // 'service.update',
            // 'cluster.create',
            'pipeline.update',
            'pr.create',
            'pr.close',
          ],
          routerSinks: [],
        } as const satisfies Partial<NotificationRouterAttributes>)
      : ({} as const satisfies Partial<NotificationRouterAttributes>)

  const initialState = useMemo(
    () =>
      ({
        name: router?.name || '',
        routerSinks:
          router?.sinks?.filter(isNonNullable).map((sink) => ({
            sinkId: sink.id,
          })) || [],
        ...createMutationAttrs,
      }) as const satisfies NotificationRouterAttributes,
    [createMutationAttrs, router?.name, router?.sinks]
  )
  const { state, update, hasUpdates } =
    useUpdateState<NotificationRouterAttributes>(initialState)

  const [mutation, { loading }] = useUpsertNotificationRouterMutation({
    onCompleted: () => onClose?.(),
    update: (cache, { data }) =>
      updateCache(cache, {
        query: NotificationRoutersDocument,
        update: (prev) =>
          appendConnection(
            prev,
            data?.upsertNotificationRouter,
            'notificationRouters'
          ),
      }),
  })

  const allowSubmit = state.name && hasUpdates

  const onSubmit = useCallback(
    (e: SubmitEvent) => {
      e.preventDefault()

      if (!allowSubmit) {
        return
      }
      mutation({
        variables: {
          attributes: state,
        },
      })
    },
    [allowSubmit, mutation, state]
  )

  return (
    <ModalAlt
      portal
      asForm
      onSubmit={onSubmit}
      open={open}
      onClose={onClose || undefined}
      header={`Edit notification router${
        router?.name ? `– ${router.name}` : ''
      }`}
      actions={
        <div
          css={{
            display: 'flex',
            flexDirection: 'row-reverse',
            gap: theme.spacing.medium,
          }}
        >
          <Button
            primary
            type="submit"
            loading={loading}
            disabled={!allowSubmit}
          >
            {mode === 'edit' ? 'Update' : 'Create'}
          </Button>
          <Button
            secondary
            type="button"
            onClick={() => onClose?.()}
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
          gap: theme.spacing.large,
        }}
      >
        <div>
          <Button onClick={() => setMOpen(true)}>Thing</Button>
          <Modal
            open={mOpen}
            onClose={() => setMOpen(false)}
          >
            thing
          </Modal>
        </div>
        {mode !== 'edit' && (
          <FormField label="name">
            <div css={{ display: 'flex', gap: theme.spacing.xxsmall }}>
              <Input2
                value={state.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Name"
              />
            </div>
          </FormField>
        )}
        <FormField label="name">
          <div css={{ display: 'flex', gap: theme.spacing.xxsmall }}>
            <Input2
              value={state.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Name"
            />
          </div>
        </FormField>
      </div>
    </ModalAlt>
  )
}

/**
 * For creating test routers only. Don't expose to users.
 */
export function CreateNotificationRouterModal(
  props: Omit<
    ComponentProps<typeof UpsertNotificationRouterModal>,
    'mode' | 'router'
  >
) {
  return (
    <ModalMountTransition open={props.open}>
      <UpsertNotificationRouterModal
        mode="create"
        {...props}
      />
    </ModalMountTransition>
  )
}

export function EditNotificationRouterModal(
  props: Omit<ComponentProps<typeof UpsertNotificationRouterModal>, 'mode'>
) {
  return (
    <ModalMountTransition open={props.open}>
      <UpsertNotificationRouterModal
        mode="edit"
        {...props}
      />
    </ModalMountTransition>
  )
}
