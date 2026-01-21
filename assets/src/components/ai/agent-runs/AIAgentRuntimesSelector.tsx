import {
  CloseIcon,
  ListBoxFooterPlus,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { useAgentRuntimesQuery } from 'generated/graphql'
import { mapExistingNodes } from 'utils/graphql'

export function AIAgentRuntimesSelector({
  selectedRuntimeId,
  setSelectedRuntimeId,
  placeholder = 'Filter by runtime',
  allowDeselect = false,
}: {
  selectedRuntimeId: Nullable<string>
  setSelectedRuntimeId: (runtimeId: Nullable<string>) => void
  placeholder?: string
  allowDeselect?: boolean
}) {
  const { data, loading, error } = useAgentRuntimesQuery({
    fetchPolicy: 'cache-and-network',
  })

  const runtimes = mapExistingNodes(data?.agentRuntimes)

  if (error) return <GqlError error={error} />

  return (
    <div css={{ width: 240 }}>
      <Select
        transparent
        label={!data && loading ? <RectangleSkeleton /> : placeholder}
        selectedKey={selectedRuntimeId ?? ''}
        onSelectionChange={(key) => setSelectedRuntimeId(key ? `${key}` : null)}
        dropdownFooterFixed={
          allowDeselect && (
            <ListBoxFooterPlus
              key="deselect"
              leftContent={<CloseIcon />}
              onClick={() => setSelectedRuntimeId(null)}
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
