import {
  ComboBox,
  FillLevel,
  ListBoxFooter,
  ListBoxItem,
} from '@pluralsh/design-system'

import { useThrottle } from 'components/hooks/useThrottle'
import { McpServerFragment, useMcpServersQuery } from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { useMemo, useState } from 'react'

import { FillLevelDiv } from 'components/utils/FillLevelDiv'
import { mapExistingNodes } from 'utils/graphql'

type McpServerSelectorProps = {
  onServerChange: (server: McpServerFragment) => void
  selectedServers?: McpServerFragment[]
  placeholder?: string
  loading?: boolean
  disabled?: boolean
  fillLevel?: FillLevel
}

export function McpServerSelector({
  onServerChange,
  selectedServers = [],
  placeholder = 'Search for an MCP server...',
  loading,
  disabled,
  fillLevel = 1,
}: McpServerSelectorProps) {
  const [inputValue, setInputValue] = useState('')
  const throttledInput = useThrottle(inputValue, 100)
  const [serverSelectIsOpen, setServerSelectIsOpen] = useState(false)

  const { data, loading: loadingList } = useMcpServersQuery({
    variables: { q: throttledInput || undefined },
  })

  // filter out servers that are already selected
  const servers = useMemo(
    () =>
      mapExistingNodes(data?.mcpServers).filter(
        (server) =>
          !selectedServers.some((selected) => selected.id === server?.id)
      ),
    [data?.mcpServers, selectedServers]
  )

  return (
    <FillLevelDiv fillLevel={fillLevel}>
      <ComboBox
        startIcon={null}
        inputProps={{ placeholder }}
        inputValue={inputValue}
        onInputChange={setInputValue}
        loading={loading || (serverSelectIsOpen && data && loadingList)}
        isDisabled={disabled}
        isOpen={serverSelectIsOpen}
        onOpenChange={(isOpen) => {
          setServerSelectIsOpen(isOpen)
        }}
        dropdownFooter={
          !data && loading ? (
            <ListBoxFooter>Loading</ListBoxFooter>
          ) : isEmpty(servers) ? (
            <ListBoxFooter>No results</ListBoxFooter>
          ) : undefined
        }
        onFooterClick={() => setServerSelectIsOpen(false)}
        onSelectionChange={(selectedId) => {
          if (typeof selectedId !== 'string') return
          const selectedObj = servers.find((server) => server.id === selectedId)
          if (selectedObj) onServerChange?.(selectedObj)
          setInputValue('')
        }}
      >
        {servers.map((server) => (
          <ListBoxItem
            key={server.id}
            label={server.name}
            textValue={server.name}
          />
        ))}
      </ComboBox>
    </FillLevelDiv>
  )
}
