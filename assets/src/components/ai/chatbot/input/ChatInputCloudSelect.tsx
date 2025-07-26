import {
  ChatThreadTinyFragment,
  useCloudConnectionsQuery,
  useUpdateChatThreadMutation,
} from '../../../../generated/graphql.ts'
import {
  CloudIcon,
  Input,
  ListBoxFooter,
  ListBoxFooterPlus,
  ListBoxItem,
  Select,
  Spinner,
  Toast,
} from '@pluralsh/design-system'

import { ChatInputSelectButton } from './ChatInputSelectButton.tsx'
import { useTheme } from 'styled-components'
import { useCallback, useMemo, useState } from 'react'
import { useFetchPaginatedData } from '../../../utils/table/useFetchPaginatedData.tsx'
import { isEmpty } from 'lodash'
import ProviderIcon from '../../../utils/Provider.tsx'
import { TRUNCATE } from '../../../utils/truncate.ts'
import { useThrottle } from '../../../hooks/useThrottle.tsx'

export function ChatInputCloudSelect({
  currentThread,
}: {
  currentThread: ChatThreadTinyFragment
}) {
  const theme = useTheme()
  const [inputValue, setInputValue] = useState('')
  const throttledInput = useThrottle(inputValue, 100)
  const currentConnection = currentThread.session?.connection

  const [
    updateThread,
    { loading: updateThreadLoading, error: updateThreadError },
  ] = useUpdateChatThreadMutation()

  const { data, loading, pageInfo, fetchNextPage } = useFetchPaginatedData(
    {
      queryHook: useCloudConnectionsQuery,
      keyPath: ['cloudConnections'],
      errorPolicy: 'ignore',
    },
    { q: throttledInput }
  )

  const cloudConnections = useMemo(
    () =>
      data?.cloudConnections?.edges?.flatMap((e) => (e?.node ? e.node : [])) ||
      [],
    [data?.cloudConnections?.edges]
  )

  const onCloudChange = useCallback(
    (connectionId: string | undefined) => {
      if (connectionId !== currentConnection?.id) {
        updateThread({
          variables: {
            id: currentThread.id,
            attributes: {
              summary: currentThread.summary,
              session: { connectionId }, // TODO: How to properly handle cloud updates? Does it work only with agent?
            },
          },
        })
      }
    },
    [
      currentThread.id,
      currentThread.summary,
      currentConnection?.id,
      updateThread,
    ]
  )

  if (loading && !data) return <Spinner size={12} />

  return (
    <>
      <Select
        selectedKey={currentThread.session?.connection?.id ?? ''}
        onSelectionChange={(key) => onCloudChange(key as string | undefined)}
        label="cloud"
        width={270}
        dropdownHeaderFixed={
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.xsmall,
              color: theme.colors['text-xlight'],
              padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
            }}
          >
            Cloud connection
            <Input
              small
              inputProps={{ lineHeight: '12px' }}
              type="text"
              showClearButton
              placeholder="Search..."
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.currentTarget.value)
              }}
            />
          </div>
        }
        dropdownFooter={
          !data ? (
            <ListBoxFooter>Loading</ListBoxFooter>
          ) : isEmpty(cloudConnections) ? (
            <ListBoxFooter>No results</ListBoxFooter>
          ) : pageInfo?.hasNextPage ? (
            <ListBoxFooterPlus>Show more</ListBoxFooterPlus>
          ) : undefined
        }
        onFooterClick={() => {
          if (pageInfo?.hasNextPage) {
            fetchNextPage()
          }
        }}
        dropdownFooterFixed={
          currentThread.session?.connection?.id ? (
            <ListBoxFooterPlus
              onClick={() => onCloudChange(undefined)}
              leftContent={<CloudIcon />}
            >
              Deselect cloud connection
            </ListBoxFooterPlus>
          ) : undefined
        }
        triggerButton={
          <ChatInputSelectButton>
            {updateThreadLoading ? (
              <Spinner size={12} />
            ) : currentConnection ? (
              <ProviderIcon
                provider={currentConnection?.provider}
                size={16}
              />
            ) : (
              <CloudIcon size={12} />
            )}
            <span css={{ ...TRUNCATE }}>
              {currentConnection?.name || 'cloud'}
            </span>
          </ChatInputSelectButton>
        }
      >
        {cloudConnections.map((c) => (
          <ListBoxItem
            key={c?.id}
            label={c?.name}
            textValue={c?.name}
            leftContent={
              <ProviderIcon
                provider={c?.provider}
                size={16}
              />
            }
          />
        ))}
      </Select>
      <Toast
        show={!!updateThreadError}
        severity="danger"
        position="bottom"
        marginBottom="medium"
      >
        Error updating thread settings.
      </Toast>
    </>
  )
}
