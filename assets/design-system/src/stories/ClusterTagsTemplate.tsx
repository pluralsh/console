import { Flex } from 'honorable'
import { type ComponentProps, type Key, useMemo, useState } from 'react'
import Fuse from 'fuse.js'

import { isEqual, uniqWith } from 'lodash-es'

import styled, { useTheme } from 'styled-components'

import { Card, Chip, ComboBox, ListBoxItem, TagIcon, WrapWithIf } from '..'

import { isNonNullable } from '../utils/isNonNullable'
import TextSwitch from '../components/TextSwitch'

const TagPicker = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
}))

type Tag = {
  name: string
  value: string
}

const TAGS: Tag[] = [
  { name: 'local', value: 'true' },
  { name: 'local', value: 'false' },
  { name: 'stage', value: 'dev' },
  { name: 'stage', value: 'prod' },
  { name: 'stage', value: 'canary' },
  { name: 'route', value: 'some-very-very-long-tag-value' },
  { name: 'route', value: 'short-name' },
  { name: 'local2', value: 'true' },
  { name: 'local2', value: 'false' },
  { name: 'stage2', value: 'dev' },
  { name: 'stage2', value: 'prod' },
  { name: 'stage2', value: 'canary' },
  { name: 'route2', value: 'some-very-very-long-tag-value' },
  { name: 'route2', value: 'short-name' },
]
const tags = uniqWith(TAGS, isEqual)

function tagToKey(tag: Tag) {
  return `${tag.name}:${tag.value}`
}

export function ClusterTagsTemplate({
  onFillLevel,
  withTitleContent,
  ...args
}: {
  onFillLevel: any
  withTitleContent: boolean
}) {
  const theme = useTheme()
  const [selectedTagKeys, setSelectedTagKeys] = useState(new Set<Key>())
  const selectedTagArr = useMemo(() => [...selectedTagKeys], [selectedTagKeys])
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [searchLogic, setSearchLogic] = useState<string>('AND')

  const fuse = useMemo(
    () =>
      new Fuse(tags, {
        includeScore: true,
        shouldSort: true,
        threshold: 0.3,
        keys: ['name', 'value'],
      }),
    []
  )

  const searchResults = useMemo(() => {
    let ret: Fuse.FuseResult<Tag>[]

    if (inputValue) {
      ret = fuse.search(inputValue)
    } else {
      ret = tags.map((tag, i) => ({ item: tag, score: 1, refIndex: i }))
    }

    return ret.filter((tag) => !selectedTagKeys.has(tagToKey(tag.item)))
  }, [fuse, inputValue, selectedTagKeys])

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
    <WrapWithIf
      condition={onFillLevel > 0}
      wrapper={
        <Card
          display="flex"
          flexDirection="column"
          gap="large"
          padding="large"
          fillLevel={onFillLevel}
        />
      }
    >
      <Flex
        flexDirection="column"
        gap="large"
      >
        <TagPicker>
          <ComboBox
            isOpen={isOpen}
            inputValue={inputValue}
            onSelectionChange={onSelectionChange}
            onInputChange={onInputChange}
            inputContent={
              selectedTagArr.length > -1 && (
                <TextSwitch
                  onClick={(e) => e.stopPropagation()}
                  size="small"
                  value={searchLogic}
                  onChange={(value) => setSearchLogic(value as string)}
                  options={[
                    { label: 'All', value: 'AND' },
                    { label: 'Any', value: 'OR' },
                  ]}
                  style={{ marginRight: theme.spacing.xxsmall }}
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
            }}
            inputProps={{
              placeholder: 'Tag filters',
            }}
            onOpenChange={(isOpen, _trigger) => {
              setIsOpen(isOpen)
            }}
            maxHeight={232}
            allowsEmptyCollection
            startIcon={<TagIcon />}
            {...(withTitleContent
              ? {
                  startIcon: null,
                  titleContent: (
                    <>
                      <TagIcon marginRight="small" />
                      Search tags
                    </>
                  ),
                }
              : {})}
            showArrow
            {...args}
          >
            {searchResults
              .map(({ item: tag, score: _score, refIndex: _refIndex }) => {
                const tagStr = tagToKey(tag)

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
        </TagPicker>
      </Flex>
    </WrapWithIf>
  )
}
