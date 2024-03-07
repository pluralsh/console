import { ComponentProps, useCallback, useMemo } from 'react'
import { Button, FormField, Input2, Modal } from '@pluralsh/design-system'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { Body2P } from 'components/utils/typography/Text'
import { useTheme } from 'styled-components'
import { useUpdateState } from 'components/hooks/useUpdateState'
import {
  NotificationSinkFragment,
  NotificationSinksDocument,
  SinkType,
  useUpsertNotificationSinkMutation,
} from 'generated/graphql'
import { InlineLink } from 'components/utils/typography/InlineLink'

import { appendConnection, updateCache } from 'utils/graphql'

import { sinkTypeToIcon } from './NotificationSinksColumns'

const hookUrlMatch = [
  [SinkType.Slack, /^https:\/\/[^/]*?slack/],
  [SinkType.Teams, /^https:\/\/[^/]*?office/],
] as const satisfies [SinkType, RegExp][]

type ModalBaseProps = {
  mode: 'edit' | 'create'
  sink?: NotificationSinkFragment
}

type ModalProps = {
  open: boolean
  onClose: Nullable<() => void>
} & ModalBaseProps

function UpsertNotificationSinkModal({ mode, open, onClose, ...props }: ModalProps) {
  const sink = mode === 'edit' ? props.sink : undefined
  const theme = useTheme()
  const initialState = useMemo(
    () => ({
      name: '',
      hookUrl: '',
      ...(mode === 'edit'
        ? {
            name: sink?.name,
            hookUrl:
              sink?.configuration.slack?.url || sink?.configuration.teams?.url,
          }
        : {}),
    }),
    [
      mode,
      sink?.configuration.slack?.url,
      sink?.configuration.teams?.url,
      sink?.name,
    ]
  )
  const { state, update, hasUpdates } = useUpdateState<{
    name: string
    hookUrl: string
  }>(initialState)
  const hookType = hookUrlMatch.find(([_, regex]) =>
    regex.test(state.hookUrl)
  )?.[0]

  const [mutation, { loading }] = useUpsertNotificationSinkMutation({
    onCompleted: () => onClose?.(),
    update: (cache, { data }) =>
      updateCache(cache, {
        query: NotificationSinksDocument,
        update: (prev) =>
          appendConnection(
            prev,
            data?.upsertNotificationSink,
            'notificationSinks'
          ),
      }),
  })

  const allowSubmit = hookType && state.name && state.hookUrl && hasUpdates

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
            type: hookType,
            configuration: {
              [hookType]: {
                url: state.hookUrl,
              },
            },
          },
        },
      })
    },
    [allowSubmit, hookType, mutation, state.hookUrl, state.name]
  )

  return (
    <Modal
      portal
      asForm
      onSubmit={onSubmit}
      open={open}
      onClose={onClose || undefined}
      header={mode === 'edit' ? `Edit sink – ${sink?.name}` : 'New sink'}
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
        <Body2P>
          Add a{' '}
          <InlineLink
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noreferrer"
          >
            Slack
          </InlineLink>{' '}
          or{' '}
          <InlineLink
            href="https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook?tabs=newteams%2Cdotnet"
            target="_blank"
            rel="noreferrer"
          >
            Teams
          </InlineLink>{' '}
          webhook url to send this event alert to your team.
        </Body2P>
        <FormField label={mode === 'edit' ? `Webhook url` : 'Add sink'}>
          <div css={{ display: 'flex', gap: theme.spacing.xxsmall }}>
            {mode !== 'edit' && (
              <Input2
                value={state.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Name"
                css={{ flex: '0 0 130px' }}
              />
            )}
            <Input2
              value={state.hookUrl}
              endIcon={sinkTypeToIcon[hookType || '']}
              onChange={(e) => update({ hookUrl: e.target.value })}
              placeholder="https://hooks.provider.com/..."
              css={{ flex: '1 1 100%' }}
            />
          </div>
        </FormField>
      </div>
    </Modal>
  )
}

export function CreateNotificationSinkModal(
  props: Omit<ComponentProps<typeof UpsertNotificationSinkModal>, 'mode' | 'sink'>
) {
  return (
    <ModalMountTransition open={props.open}>
      <UpsertNotificationSinkModal
        mode="create"
        {...props}
      />
    </ModalMountTransition>
  )
}

export function EditNotificationSinkModal(
  props: Omit<ComponentProps<typeof UpsertNotificationSinkModal>, 'mode'>
) {
  return (
    <ModalMountTransition open={props.open}>
      <UpsertNotificationSinkModal
        mode="edit"
        {...props}
      />
    </ModalMountTransition>
  )
}
