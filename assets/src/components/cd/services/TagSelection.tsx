import { useMemo, useRef, useState } from 'react'
import sortBy from 'lodash/sortBy'
import { useTheme } from 'styled-components'
import { Chip, IconFrame, Input, PlusIcon } from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'

import {
  ChipList,
  tagsToNameValue,
  validateTagName,
  validateTagValue,
} from './CreateGlobalService'

export function TagSelection({
  tags,
  setTags,
}: {
  setTags: (tags: Record<string, string>) => void
  tags: Record<string, string>
}) {
  const theme = useTheme()
  const [tagName, setTagName] = useState('')
  const [tagValue, setTagValue] = useState('')
  const tagNameRef = useRef<HTMLInputElement>()
  const tagValueRef = useRef<HTMLInputElement>()
  const sortedTags = useMemo(
    () => sortBy(tagsToNameValue(tags), ['name']),
    [tags]
  )
  const tagIsValid = validateTagName(tagName) && validateTagValue(tagValue)

  const addTag = () => {
    if (tagIsValid) {
      setTags({ ...tags, [tagName]: tagValue })
      setTagName('')
      setTagValue('')
      tagNameRef.current?.focus?.()
    }
  }

  return (
    <>
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.small,
          alignItems: 'center',
          '&& > *': { flexShrink: 0, flexGrow: 1 },
        }}
      >
        <Input
          placeholder="Tag name"
          inputProps={{ ref: tagNameRef, maxLength: 63 }}
          value={tagName}
          onChange={(e) => {
            setTagName(
              e.currentTarget.value.trim().replace(/[^a-z0-9A-Z-_./]/, '')
            )
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              tagValueRef.current?.focus?.()
            }
          }}
        />
        <Input
          placeholder="Tag value"
          inputProps={{ ref: tagValueRef, maxLength: 63 }}
          value={tagValue}
          onChange={(e) => {
            setTagValue(
              e.currentTarget.value.trim().replace(/[^a-z0-9A-Z-_.]/, '')
            )
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag()
            }
          }}
        />
        <IconFrame
          css={{ '&&': { flexGrow: 0 } }}
          type="secondary"
          tooltip={tagIsValid ? 'Add tag' : 'Tag is incomplete or invalid'}
          size="medium"
          clickable={tagIsValid}
          icon={
            <PlusIcon
              {...(!tagIsValid ? { color: theme.colors['text-disabled'] } : {})}
            />
          }
          onClick={() => {
            addTag()
          }}
        />
      </div>
      {!isEmpty(sortedTags) && (
        <ChipList
          maxVisible={Infinity}
          chips={sortedTags.map(({ name, value }) => (
            <Chip
              key={name}
              size="small"
              clickable
              onClick={() => {
                const next = { ...tags }

                delete next[name]

                return setTags(next)
              }}
              closeButton
            >
              {name}: {value}
            </Chip>
          ))}
        />
      )}
    </>
  )
}
