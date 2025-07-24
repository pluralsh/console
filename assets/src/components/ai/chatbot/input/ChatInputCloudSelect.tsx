import {
  ChatThreadTinyFragment,
  useCloudConnectionsQuery,
} from '../../../../generated/graphql.ts'
import {
  CloudIcon,
  Input,
  ListBoxFooter,
  ListBoxFooterPlus,
  ListBoxItem,
  Select,
  Spinner,
} from '@pluralsh/design-system'

import { ChatInputSelectButton } from './ChatInputSelectButton.tsx'
import { useTheme } from 'styled-components'
import { Dispatch, SetStateAction, useMemo, useState } from 'react'
import { useFetchPaginatedData } from '../../../utils/table/useFetchPaginatedData.tsx'
import { isEmpty } from 'lodash'
import ProviderIcon from '../../../utils/Provider.tsx'
import { TRUNCATE } from '../../../utils/truncate.ts'

export function ChatInputCloudSelect({
  cloudConnectionId,
  setCloudConnectionId,
}: {
  currentThread: ChatThreadTinyFragment
  cloudConnectionId: string | undefined
  setCloudConnectionId: Dispatch<SetStateAction<string | undefined>>
}) {
  const theme = useTheme()
  const [inputValue, setInputValue] = useState('')
  // const throttledInput = useThrottle(inputValue, 100)

  const { data, loading, pageInfo, fetchNextPage } = useFetchPaginatedData(
    {
      queryHook: useCloudConnectionsQuery,
      keyPath: ['cloudConnections'],
      errorPolicy: 'ignore',
    },
    {} // TODO: Add search support.
  )

  const cloudConnections = useMemo(
    () =>
      data?.cloudConnections?.edges?.flatMap((e) => (e?.node ? e.node : [])) ||
      [],
    [data?.cloudConnections?.edges]
  )

  const selectedCloudConnection = useMemo(
    () => cloudConnections?.find((c) => c?.id === cloudConnectionId),
    [cloudConnectionId, cloudConnections]
  )

  if (loading && !data) return <Spinner size={12} />

  return (
    <Select
      selectedKey={cloudConnectionId ?? ''}
      onSelectionChange={(key) =>
        setCloudConnectionId(key as string | undefined)
      }
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
        <ListBoxFooterPlus
          onClick={() => setCloudConnectionId(undefined)}
          leftContent={<CloudIcon />}
        >
          Deselect cloud connection
        </ListBoxFooterPlus>
      }
      triggerButton={
        <ChatInputSelectButton>
          {selectedCloudConnection ? (
            <ProviderIcon
              provider={selectedCloudConnection?.provider}
              size={16}
            />
          ) : (
            <CloudIcon size={12} />
          )}
          <span css={{ ...TRUNCATE }}>
            {selectedCloudConnection?.name || 'cloud'}
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
  )
}
