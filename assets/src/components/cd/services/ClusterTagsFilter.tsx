import { type ComponentProps, type Key, useMemo, useState } from 'react'
import {
  Chip,
  ComboBox,
  ListBoxFooter,
  ListBoxItem,
  TagIcon,
  WarningIcon,
} from '@pluralsh/design-system'
import TextSwitch from '@pluralsh/design-system/dist/components/TextSwitch'
import { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'
import uniqWith from 'lodash/uniqWith'
import isEqual from 'lodash/isEqual'
import { Conjunction, useTagPairsQuery } from 'generated/graphql'
import { useThrottle } from 'components/hooks/useThrottle'
import { tagToKey } from 'utils/clusterTags'

const tagOps: { value: Conjunction; label: string }[] = [
  {
    value: Conjunction.Or,
    label: 'Any',
  },
  {
    value: Conjunction.And,
    label: 'All',
  },
]

export function ClusterTagsFilter({
  selectedTagKeys,
  setSelectedTagKeys,
  searchOp,
  setSearchOp,
  ...props
}: {
  selectedTagKeys: Set<Key>
  setSelectedTagKeys: (keys: Set<Key>) => void
  searchOp: Conjunction
  setSearchOp: (op: Conjunction) => void
} & Omit<ComponentProps<typeof ComboBox>, 'children'>) {
  const theme = useTheme()
  const selectedTagArr = useMemo(() => [...selectedTagKeys], [selectedTagKeys])
  const [inputValue, setInputValue] = useState('')
  const throttledInputValue = useThrottle(inputValue, 100)
  const [isOpen, setIsOpen] = useState(false)

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

  const onSelectionChange: ComponentProps<
    typeof ComboBox
  >['onSelectionChange'] = (key) => {
    if (key) {
      setSelectedTagKeys(new Set([...selectedTagArr, key]))
      setInputValue('')
    }
  }

  const onInputChange: ComponentProps<typeof ComboBox>['onInputChange'] = (
    value
  ) => {
    setInputValue(value)
  }

  return (
    <ComboBox
      isOpen={isOpen}
      inputValue={inputValue}
      onSelectionChange={onSelectionChange}
      onInputChange={onInputChange}
      inputContent={
        selectedTagArr.length > -1 && (
          <TextSwitch
            onClick={(e: MouseEvent) => e.stopPropagation()}
            size="small"
            value={searchOp}
            onChange={setSearchOp as any}
            options={tagOps}
            css={{ marginRight: theme.spacing.xxsmall }}
            label="Match"
            labelPosition="start"
          />
        )
      }
      chips={selectedTagArr.map((key) => ({
        key,
        children: key,
      }))}
      onDeleteChip={(chipKey) => {
        const newKeys = new Set(selectedTagKeys)

        newKeys.delete(chipKey)
        setSelectedTagKeys(newKeys)
        // setSelectedTagKeys(new Set())
      }}
      inputProps={{
        placeholder: 'Filter by tag',
      }}
      onOpenChange={(isOpen, _trigger) => {
        setIsOpen(isOpen)
      }}
      dropdownFooterFixed={
        isEmpty(searchResults) ? (
          <ListBoxFooter
            leftContent={<WarningIcon color={theme.colors['icon-warning']} />}
          >
            No tags found
          </ListBoxFooter>
        ) : null
      }
      maxHeight={232}
      allowsEmptyCollection
      loading={loading}
      startIcon={<TagIcon />}
      showArrow
      {...props}
    >
      {searchResults?.flatMap((tagStr) => (
        <ListBoxItem
          key={tagStr}
          label={
            <Chip
              size="small"
              label={tagStr}
              textValue={tagStr}
            >
              {tagStr}
            </Chip>
          }
          textValue={tagStr}
        />
      ))}
    </ComboBox>
  )
}
