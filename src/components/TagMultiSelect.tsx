import { type ComponentProps, type Key, useMemo, useState } from 'react'

import styled, {
  type DefaultTheme,
  type StyledComponent,
  useTheme,
} from 'styled-components'

import {
  Chip,
  ChipList,
  ComboBox,
  Flex,
  ListBoxItem,
  Select,
  SelectButton,
  type SelectPropsSingle,
} from '..'

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
  innerChips?: boolean
  selectedMatchType?: 'AND' | 'OR'
  onSelectedTagsChange?: (keys: Set<Key>) => void
  onFilterChange?: (value: string) => void
  onChangeMatchType?: (value: 'AND' | 'OR') => void
  comboBoxProps?: Omit<ComponentProps<typeof ComboBox>, 'children'>
  selectProps?: Omit<SelectPropsSingle, 'children'>
}

function TagMultiSelect({
  options,
  loading,
  innerChips = true,
  selectedMatchType,
  selectedTagKeys,
  setSelectedTagKeys,
  inputValue,
  setInputValue,
  onChangeMatchType,
  comboBoxProps,
  selectProps,
  ...props
}: TagMultiSelectProps & ComponentProps<StyledComponent<'div', DefaultTheme>>) {
  const theme = useTheme()
  const selectedTagArr = useMemo(() => [...selectedTagKeys], [selectedTagKeys])
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

  return (
    <TagMultiSelectWrapperSC {...props}>
      <Flex>
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
                {matchOptions.find((el) => el.value === searchLogic).label}
              </SelectButton>
            </MultiSelectMatchButtonContainer>
          }
          {...selectProps}
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
          onInputChange={(value) => setInputValue(value)}
          chips={
            innerChips
              ? selectedTagArr.map((key) => ({
                  key,
                  children: key,
                }))
              : undefined
          }
          onDeleteChip={(chipKey) => {
            const newKeys = new Set(selectedTagKeys)

            newKeys.delete(chipKey)
            setSelectedTagKeys(newKeys)
          }}
          onOpenChange={(isOpen, _trigger) => {
            setIsOpen(isOpen)
          }}
          maxHeight={232}
          allowsEmptyCollection
          loading={loading}
          containerProps={{ style: { flexGrow: 1 } }}
          showArrow={false}
          {...comboBoxProps}
          inputProps={{
            placeholder: 'Search Tags...',
            ...comboBoxProps?.inputProps,
            style: {
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              backgroundColor: theme.colors['fill-one'],
              ...comboBoxProps?.inputProps?.style,
            },
          }}
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
      {!(innerChips || selectedTagArr.length === 0) && (
        <ChipList
          size="small"
          limit={8}
          values={selectedTagArr}
          closeButton
          onClickCondition={() => true}
          onClick={(key: Key) => {
            const newKeys = new Set(selectedTagArr)

            newKeys.delete(key)
            setSelectedTagKeys(newKeys)
          }}
        />
      )}
    </TagMultiSelectWrapperSC>
  )
}

export { TagMultiSelect }
export type { TagMultiSelectProps }

const TagMultiSelectWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
}))

const MultiSelectMatchButtonContainer = styled.div`
  > div {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: none;
    minwidth: fit-content;
    text-wrap: nowrap;
  }
`
