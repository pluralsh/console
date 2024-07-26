import {
  ListBoxFooterPlus,
  ReloadIcon,
  TagMultiSelect,
} from '@pluralsh/design-system'
import { useThrottle } from 'components/hooks/useThrottle'
import { Conjunction, TagType, useTagPairsQuery } from 'generated/graphql'
import isEqual from 'lodash/isEqual'
import uniqWith from 'lodash/uniqWith'
import { type ComponentProps, type Key, useMemo, useState } from 'react'
import { tagToKey } from 'utils/clusterTags'

export function TagsFilter({
  type,
  innerChips,
  selectedTagKeys,
  setSelectedTagKeys,
  searchOp,
  setSearchOp,
  comboBoxProps,
  selectProps,
}: {
  type?: TagType
  innerChips?: boolean
  selectedTagKeys: Set<Key>
  setSelectedTagKeys: (keys: Set<Key>) => void
  searchOp: Conjunction
  setSearchOp: ComponentProps<typeof TagMultiSelect>['onChangeMatchType']
  comboBoxProps?: ComponentProps<typeof TagMultiSelect>['comboBoxProps']
  selectProps?: ComponentProps<typeof TagMultiSelect>['selectProps']
}) {
  const [inputValue, setInputValue] = useState('')
  const throttledInputValue = useThrottle(inputValue, 150)

  const {
    data: currentData,
    previousData,
    loading,
  } = useTagPairsQuery({
    fetchPolicy: 'cache-and-network',
    variables: { q: throttledInputValue, type },
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
      innerChips={innerChips}
      comboBoxProps={{
        dropdownFooterFixed: (
          <ListBoxFooterPlus
            leftContent={<ReloadIcon />}
            onClick={() => {
              setSelectedTagKeys(new Set())
              setInputValue('')
            }}
          >
            Reset tags
          </ListBoxFooterPlus>
        ),
        ...comboBoxProps,
      }}
      selectProps={selectProps}
      selectedTagKeys={selectedTagKeys}
      setSelectedTagKeys={setSelectedTagKeys}
      inputValue={inputValue}
      setInputValue={setInputValue}
      loading={loading}
      options={searchResults}
      selectedMatchType={searchOp}
      onChangeMatchType={setSearchOp}
    />
  )
}
