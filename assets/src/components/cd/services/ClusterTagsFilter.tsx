import {
  ListBoxFooterPlus,
  ReloadIcon,
  TagMultiSelect,
  TagMultiSelectProps,
} from '@pluralsh/design-system'
import { useThrottle } from 'components/hooks/useThrottle'
import { Conjunction, TagType, useTagPairsLazyQuery } from 'generated/graphql'
import isEqual from 'lodash/isEqual'
import uniqWith from 'lodash/uniqWith'
import { type Key, useMemo, useState } from 'react'
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
  setSearchOp: TagMultiSelectProps['onChangeMatchType']
  comboBoxProps?: TagMultiSelectProps['comboBoxProps']
  selectProps?: TagMultiSelectProps['selectProps']
}) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const throttledInputValue = useThrottle(inputValue, 150)

  const [getTags, { data: currentData, previousData, loading }] =
    useTagPairsLazyQuery({
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
        isOpen: open,
        onOpenChange: (o) => {
          if (o && !data) getTags()
          setOpen(o)
        },
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
