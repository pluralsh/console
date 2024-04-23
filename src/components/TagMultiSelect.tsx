import { Flex } from 'honorable'
import {
  type ComponentProps,
  type Key,
  useEffect,
  useMemo,
  useState,
} from 'react'

import styled, { useTheme } from 'styled-components'

import { Chip, ComboBox, ListBoxItem, Select, SelectButton } from '..'

import { isNonNullable } from '../utils/isNonNullable'

export type MultiSelectTag = {
  name: string
  value: string
}

const matchOptions = [
  { label: 'All', value: 'AND' },
  { label: 'Any', value: 'OR' },
] as const

type TagMultiSelectProps = {
  options: string[]
  loading: boolean
  selectedMatchType?: 'AND' | 'OR'
  onSelectedTagsChange?: (keys: Set<Key>) => void
  onFilterChange?: (value: string) => void
  onChangeMatchType?: (value: 'AND' | 'OR') => void
}

function TagMultiSelect({
  options,
  loading,
  selectedMatchType,
  onSelectedTagsChange,
  onFilterChange,
  onChangeMatchType,
}: TagMultiSelectProps) {
  const theme = useTheme()
  const [selectedTagKeys, setSelectedTagKeys] = useState(new Set<Key>())
  const selectedTagArr = useMemo(() => [...selectedTagKeys], [selectedTagKeys])
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [searchLogic, setSearchLogic] = useState<string>(
    selectedMatchType || matchOptions[0].value
  )

  const onSelectionChange: ComponentProps<
    typeof ComboBox
  >['onSelectionChange'] = (key) => {
    if (key) {
      setSelectedTagKeys(new Set([...selectedTagArr, key]))
      setInputValue('')
    }
  }

  useEffect(() => {
    onSelectedTagsChange?.(selectedTagKeys)
  }, [selectedTagKeys, onSelectedTagsChange])

  useEffect(() => {
    onFilterChange?.(inputValue)
  }, [inputValue, onFilterChange])

  const onInputChange: ComponentProps<typeof ComboBox>['onInputChange'] = (
    value
  ) => {
    setInputValue(value)
  }

  return (
    <Flex
      flexDirection="row"
      width="100%"
    >
      <Select
        label="Pick search logic"
        selectedKey={searchLogic}
        onSelectionChange={(value: 'AND' | 'OR') => {
          setSearchLogic(value)
          onChangeMatchType?.(value)
        }}
        defaultOpen={false}
        triggerButton={
          <MultiSelectMatchButtonContainer>
            <SelectButton>
              Match {matchOptions.find((el) => el.value === searchLogic).label}
            </SelectButton>
          </MultiSelectMatchButtonContainer>
        }
      >
        {matchOptions.map(({ value, label }) => (
          <ListBoxItem
            key={value}
            label={label}
            textValue={label}
          />
        ))}
      </Select>
      <ComboBox
        isOpen={isOpen}
        startIcon={null}
        inputValue={inputValue}
        onSelectionChange={onSelectionChange}
        onInputChange={onInputChange}
        chips={selectedTagArr.map((key) => ({
          key,
          children: key,
        }))}
        onDeleteChip={(chipKey) => {
          const newKeys = new Set(selectedTagKeys)

          newKeys.delete(chipKey)
          setSelectedTagKeys(newKeys)
        }}
        inputProps={{
          placeholder: 'Search Tags...',
          style: {
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            backgroundColor: theme.colors['fill-one'],
          },
        }}
        onOpenChange={(isOpen, _trigger) => {
          setIsOpen(isOpen)
        }}
        maxHeight={232}
        allowsEmptyCollection
        loading={loading}
        containerProps={{ style: { flexGrow: 1 } }}
        showArrow={false}
      >
        {options
          .map((tagStr) => {
            if (selectedTagKeys.has(tagStr)) {
              return null
            }

            return (
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
            )
          })
          .filter(isNonNullable)}
      </ComboBox>
    </Flex>
  )
}

export type { TagMultiSelectProps }
export { TagMultiSelect }

const MultiSelectMatchButtonContainer = styled.div`
  > div {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: none;
    width: 150px;
  }
`
