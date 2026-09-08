import {
  ComponentProps,
  FormEvent,
  useCallback,
  useMemo,
  useState,
} from 'react'
import {
  Button,
  ComboBox,
  FormField,
  ListBoxItem,
  Table,
  markdocComponents as Components,
} from '@pluralsh/design-system'

import { isEmpty, isEqual } from 'lodash'
import { useTheme } from 'styled-components'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
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
import { GqlError } from 'components/utils/Alert'

import { SinkInfo, sinkEditColumns } from '../sinks/NotificationSinksColumns'

type ModalBaseProps = {
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

function EditNotificationRouterModalBase({
  notificationRouter,
  open,
  onClose,
}: ModalProps) {
  const theme = useTheme()
  const router = notificationRouter
  const events = router?.events || []
  const [sinksQ, setSinksQ] = useState('')

  const { data: sinksData, loading: sinksLoading } = useNotificationSinksQuery({
    variables: { q: sinksQ },
  })

  const initialState = useMemo(
    () =>
      ({
        name: router?.name || '',
        sinks: router?.sinks?.filter(isNonNullable) || [],
      }) as const satisfies FormState,
    [router?.name, router?.sinks]
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
    (e: FormEvent) => {
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
      asForm
      formProps={{ onSubmit }}
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
            Update
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
        <FormField label="Events">
          <Components.List>
            {events.map((event) => (
              <Components.ListItem key={event}>{event}</Components.ListItem>
            ))}
          </Components.List>
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
    />
  )
}

export function EditNotificationRouterModal(
  props: Omit<ComponentProps<typeof EditNotificationRouterModalBase>, 'mode'>
) {
  return (
    <ModalMountTransition open={props.open}>
      <EditNotificationRouterModalBase {...props} />
    </ModalMountTransition>
  )
}
