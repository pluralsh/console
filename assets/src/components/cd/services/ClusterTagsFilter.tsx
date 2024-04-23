import { type ComponentProps, type Key, useMemo, useState } from 'react'
import { TagMultiSelect } from '@pluralsh/design-system'
import uniqWith from 'lodash/uniqWith'
import isEqual from 'lodash/isEqual'
import { Conjunction, useTagPairsQuery } from 'generated/graphql'
import { useThrottle } from 'components/hooks/useThrottle'
import { tagToKey } from 'utils/clusterTags'

export function ClusterTagsFilter({
  selectedTagKeys,
  setSelectedTagKeys,
  searchOp,
  setSearchOp,
}: {
  selectedTagKeys: Set<Key>
  setSelectedTagKeys: (keys: Set<Key>) => void
  searchOp: Conjunction
  setSearchOp: ComponentProps<typeof TagMultiSelect>['onChangeMatchType']
}) {
  const [inputValue, setInputValue] = useState('')
  const throttledInputValue = useThrottle(inputValue, 100)

  const {
    data: currentData,
    previousData,
    loading,
  } = useTagPairsQuery({
    variables: { q: throttledInputValue },
  })
  const data = currentData || previousData
  const searchResults = useMemo(
    () =>
      uniqWith(
        data?.tagPairs?.edges?.flatMap((edge) => {
          if (!edge?.node) return []

          const tagName = tagToKey(edge?.node)

          if (selectedTagKeys.has(tagName)) return []

          return tagName
        }) || [],
        isEqual
      ),
    [data?.tagPairs?.edges, selectedTagKeys]
  )

  return (
    <TagMultiSelect
      onSelectedTagsChange={setSelectedTagKeys}
      onFilterChange={setInputValue}
      loading={loading}
      options={searchResults}
      selectedMatchType={searchOp}
      onChangeMatchType={setSearchOp}
    />
  )
}
