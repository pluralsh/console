import { useDebounce } from '@react-hooks-library/core'
import {
  ComboBox,
  Flex,
  FormField,
  Input2,
  ListBoxFooter,
  ListBoxFooterPlus,
  ListBoxItem,
  SearchIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { InlineA } from 'components/utils/typography/Text'
import { useSearchConversationsQuery } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import { isNonNullable } from 'utils/isNonNullable'

const CHANNEL_HINT =
  'Slack channel name to listen in, such as general or my-team-channel. Use the channel name without the # prefix.'

export function ChatbotChannelSelect({
  chatConnectionId,
  channel,
  onChannelChange,
  disabled,
}: {
  chatConnectionId: string
  channel: string
  onChannelChange: (channel: string) => void
  disabled?: boolean
}) {
  const [manualEntry, setManualEntry] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const debouncedQuery = useDebounce(inputValue, 200)

  useEffect(() => {
    setManualEntry(false)
    setInputValue('')
  }, [chatConnectionId])

  const { data, loading, error } = useSearchConversationsQuery({
    variables: {
      chatConnectionId,
      query: debouncedQuery.trim() || undefined,
    },
    skip: !chatConnectionId || manualEntry,
    fetchPolicy: 'network-only',
  })

  const conversations = useMemo(
    () => (data?.searchConversations ?? []).filter(isNonNullable),
    [data?.searchConversations]
  )

  const isDisabled = disabled || !chatConnectionId

  if (manualEntry) {
    return (
      <FormField
        required
        label="Attach a channel"
        hint={CHANNEL_HINT}
      >
        <Flex
          direction="column"
          gap="xsmall"
        >
          <Input2
            value={channel}
            onChange={(e) => onChannelChange(e.target.value)}
            disabled={isDisabled}
            placeholder="Enter channel name"
          />
          <InlineA
            href=""
            onClick={(e) => {
              e.preventDefault()
              setManualEntry(false)
            }}
          >
            Search for channel
          </InlineA>
        </Flex>
      </FormField>
    )
  }

  return (
    <Flex
      direction="column"
      gap="small"
      width="100%"
    >
      {error && <GqlError error={error} />}
      <FormField
        required
        label="Attach a channel"
        hint={CHANNEL_HINT}
      >
        <ComboBox
          isDisabled={isDisabled}
          inputValue={inputValue}
          onInputChange={setInputValue}
          selectedKey={channel || null}
          onSelectionChange={(key) => {
            onChannelChange(key ? String(key) : '')
            setInputValue('')
            setIsOpen(false)
          }}
          inputProps={{
            placeholder: channel ? `#${channel}` : 'Search channels',
          }}
          startIcon={<SearchIcon />}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          loading={isOpen && !!chatConnectionId && loading}
          dropdownFooter={
            !chatConnectionId ? undefined : loading &&
              isEmpty(conversations) ? (
              <ListBoxFooter>Loading channels…</ListBoxFooter>
            ) : isEmpty(conversations) ? (
              <ListBoxFooter>No channels found</ListBoxFooter>
            ) : undefined
          }
          dropdownFooterFixed={
            <ListBoxFooterPlus
              onClick={() => {
                setManualEntry(true)
                setIsOpen(false)
                setInputValue('')
              }}
            >
              Enter manually
            </ListBoxFooterPlus>
          }
        >
          {conversations.map((conversation) => (
            <ListBoxItem
              key={conversation.name}
              label={`#${conversation.name}`}
              textValue={conversation.name}
            />
          ))}
        </ComboBox>
      </FormField>
    </Flex>
  )
}
