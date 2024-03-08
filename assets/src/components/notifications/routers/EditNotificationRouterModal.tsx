import { ComponentProps, useCallback, useMemo, useState } from 'react'
import {
  Button,
  ComboBox,
  FormField,
  Input2,
  ListBoxItem,
  Table,
} from '@pluralsh/design-system'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { useTheme } from 'styled-components'
import { useUpdateState } from 'components/hooks/useUpdateState'
import {
  NotificationRouterAttributes,
  NotificationRouterFragment,
  NotificationRoutersDocument,
  NotificationSinkFragment,
  useNotificationSinksQuery,
  useUpsertNotificationRouterMutation,
} from 'generated/graphql'

import { appendConnection, updateCache } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import ModalAlt from 'components/cd/ModalAlt'
import { isEmpty, isEqual } from 'lodash'

import { Body2P } from 'components/utils/typography/Text'

import { GqlError } from 'components/utils/Alert'

import { SinkInfo, sinkEditColumns } from '../sinks/NotificationSinksColumns'

type ModalBaseProps = {
  mode: 'edit' | 'create' // TODO_KLINK: Remove when done testing
  notificationRouter?: NotificationRouterFragment
}

type ModalProps = {
  open: boolean
  onClose: Nullable<() => void>
} & ModalBaseProps

type FormState = Omit<NotificationRouterAttributes, 'routerSinks'> & {
  sinks: NotificationSinkFragment[]
}

function toIdSet<T extends { id: string }>(arr: T[]): Set<string> {
  return new Set(arr.map((item) => item.id))
}

function areIdsEqual(arr1: { id: string }[], arr2: { id: string }[]): boolean {
  if (arr1.length !== arr2.length) {
    return false
  }

  return isEqual(toIdSet(arr1), toIdSet(arr2))
}

// TODO_KLINK: Remove when done testing
const CREATE_TEST_ATTRS = {
  name: 'test-router-',
  events: [
    // '*',
    // 'service.update',
    // 'cluster.create',
    'pipeline.update',
    'pr.create',
    'pr.close',
  ],
  filters: [
    {
      regex: 'someregex',
      clusterId: 'fba73cfd-054a-419d-8b78-35c2b59ec085',
      pipelineId: '35a600da-01cb-4aac-bd48-8fb126600047',
      serviceId: 'ecad5277-0d1c-45de-ab67-06a9c9c30b2f',
    },
  ],
  routerSinks: [],
} as const satisfies Partial<NotificationRouterAttributes>

function UpsertNotificationRouterModal({
  notificationRouter,
  mode = 'edit', // TODO_KLINK: Remove when done testing
  open,
  onClose,
}: ModalProps) {
  const theme = useTheme()
  const router = mode === 'edit' ? notificationRouter : undefined
  const events = router?.events || []
  const [sinksQ, setSinksQ] = useState('')

  const { data: sinksData, loading: sinksLoading } = useNotificationSinksQuery()

  // TODO_KLINK: Remove when done testing
  const createMutationAttrs =
    mode === 'create'
      ? CREATE_TEST_ATTRS
      : ({} as const satisfies Partial<NotificationRouterAttributes>)

  const initialState = useMemo(
    () =>
      ({
        name: router?.name || '',
        sinks: router?.sinks?.filter(isNonNullable) || [],
        ...createMutationAttrs,
      }) as const satisfies FormState,
    [createMutationAttrs, router?.name, router?.sinks]
  )
  const { state, update, hasUpdates } = useUpdateState<FormState>(
    initialState,
    {
      sinks: (sinksA, sinksB) =>
        !areIdsEqual(
          sinksA as NotificationSinkFragment[],
          sinksB as NotificationSinkFragment[]
        ),
    }
  )
  const sinksOptions =
    sinksData?.notificationSinks?.edges?.filter?.(
      (sinkEdge) => !state.sinks.some((s) => s.id === sinkEdge?.node?.id)
    ) || []

  const [mutation, { loading, error }] = useUpsertNotificationRouterMutation({
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

  const allowSubmit = hasUpdates

  const onSubmit = useCallback(
    (e: SubmitEvent) => {
      e.preventDefault()

      if (!allowSubmit) {
        return
      }
      mutation({
        variables: {
          attributes: {
            name: state.name,
            ...(state.events ? { events: state.events } : {}),
            ...(state.filters ? { filters: state.filters } : {}),
            routerSinks: state.sinks.map((sink) => ({
              sinkId: sink.id,
            })),
          },
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
        router?.name ? ` – ${router.name}` : ''
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
        <FormField label="Events">
          <ul
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.xxsmall,
              color: theme.colors['text-light'],
              ...theme.partials.reset.list,
            }}
          >
            {events.map((event) => (
              <li css={{ ...theme.partials.reset.li }}>
                <Body2P>{event}</Body2P>
              </li>
            ))}
          </ul>
        </FormField>
        <RouterSinksTable
          sinks={state.sinks || []}
          setSinks={(sinks: typeof state.sinks) => update({ sinks })}
        />
        <FormField label="Add new sink">
          <ComboBox
            inputProps={{
              placeholder: 'Choose a sink',
            }}
            inputValue={sinksQ}
            onInputChange={(input) => setSinksQ(input)}
            loading={sinksLoading}
            onSelectionChange={(key) => {
              if (state.sinks.find((sink) => sink.id === key)) {
                return
              }
              const newSink = sinksOptions?.find?.(
                (sink) => sink?.node?.id === key
              )

              if (!newSink?.node) {
                return
              }
              update({
                sinks: [...state.sinks, newSink.node],
              })
            }}
          >
            {isEmpty(sinksOptions) ? (
              <ListBoxItem
                label={
                  sinksQ ? 'No sinks match your query' : 'No sinks available'
                }
              />
            ) : (
              sinksOptions?.map((sink) => (
                <ListBoxItem
                  key={sink?.node?.id}
                  textValue={sink?.node?.name || ''}
                  css={{
                    '.center-content': {
                      maxWidth: '100%',
                      overflow: 'hidden',
                    },
                  }}
                  label={
                    <div
                      css={{
                        display: 'flex',
                        gap: theme.spacing.medium,
                        alignItems: 'center',
                        overflow: 'hidden',
                        width: '100%',
                      }}
                    >
                      <div
                        css={{
                          flexShrink: 0,
                          minWidth: 140,
                        }}
                      >
                        {sink?.node?.name || ''}{' '}
                      </div>
                      <SinkInfo sink={sink?.node} />
                    </div>
                  }
                />
              ))
            )}
          </ComboBox>
        </FormField>
        {error && <GqlError error={error} />}
      </div>
    </ModalAlt>
  )
}

function RouterSinksTable({
  sinks,
  setSinks,
}: {
  sinks: NotificationSinkFragment[]
  setSinks: (sinks: NotificationSinkFragment[]) => void
}) {
  const sinkEdges = sinks?.map((sink) => ({ node: sink }))

  const removeSink = useCallback(
    (sinkId: string) => {
      setSinks(sinks.filter((sink) => sink.id !== sinkId))
    },
    [setSinks, sinks]
  )

  return (
    <Table
      columns={sinkEditColumns}
      data={sinkEdges || []}
      reactTableOptions={{ meta: { removeSink } }}
      emptyStateProps={{ message: 'No sinks assigned yet' }}
      css={{
        maxHeight: 'unset',
        height: '100%',
      }}
    />
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
