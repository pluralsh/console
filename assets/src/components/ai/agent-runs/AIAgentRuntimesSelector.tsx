import {
  CloseIcon,
  ListBoxFooterPlus,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { Key } from '@react-types/shared'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { AgentRuntimeFragment, useAgentRuntimesQuery } from 'generated/graphql'
import { useCallback, useState } from 'react'
import { mapExistingNodes } from 'utils/graphql'

export function AIAgentRuntimesSelector({
  setSelectedRuntimeId,
  placeholder = 'Filter by runtime',
  allowDeselect = false,
}: {
  setSelectedRuntimeId: (runtimeId: Nullable<string>) => void
  placeholder?: string
  allowDeselect?: boolean
}) {
  const [selectedRuntime, setSelectedRuntimeState] =
    useState<Nullable<AgentRuntimeFragment>>()

  const { data, loading, error } = useAgentRuntimesQuery({
    fetchPolicy: 'cache-and-network',
  })

  const runtimes = mapExistingNodes(data?.agentRuntimes)

  const setSelectedRuntime = useCallback(
    (id: Nullable<Key>) => {
      setSelectedRuntimeState(
        runtimes.find((runtime) => runtime.id === `${id}`)
      )
      setSelectedRuntimeId(id ? `${id}` : null)
    },
    [runtimes, setSelectedRuntimeId]
  )

  if (error) return <GqlError error={error} />

  return (
    <div css={{ width: 300 }}>
      <Select
        label={!data && loading ? <RectangleSkeleton /> : placeholder}
        selectedKey={selectedRuntime?.id ?? ''}
        onSelectionChange={setSelectedRuntime}
        dropdownFooterFixed={
          allowDeselect && (
            <ListBoxFooterPlus
              key="deselect"
              leftContent={<CloseIcon />}
              onClick={() => setSelectedRuntime(null)}
            >
              Clear selection
            </ListBoxFooterPlus>
          )
        }
      >
        {runtimes.map((runtime) => (
          <ListBoxItem
            key={runtime.id}
            label={runtime.name}
          />
        ))}
      </Select>
    </div>
  )
}
