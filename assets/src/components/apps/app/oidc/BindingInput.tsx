import {
  Chip,
  ComboBox,
  FormField,
  PeopleIcon,
  PersonIcon,
} from '@pluralsh/design-system'
import ChipList from '@pluralsh/design-system/dist/components/ListBoxItemChipList'
import { fetchGroups, fetchUsers } from 'components/apps/app/oidc/typeaheads'
import { Flex } from 'honorable'
import { useEffect, useState } from 'react'
import { useApolloClient } from 'react-apollo'
import styled from 'styled-components'

const ICONS = {
  user: <PersonIcon size={14} />,
  group: <PeopleIcon size={14} />,
}

const TEXT = {
  user: { label: 'User bindings', placeholder: 'Search for user' },
  group: { label: 'Group bindings', placeholder: 'Search for group' },
}

const FETCHER = {
  user: fetchUsers,
  group: fetchGroups,
}

// TODO: Move it to design system.
export function BindingInput({
  type,
  fetcher,
  bindings,
  remove,
  add,
  hint = undefined,
  placeholder = TEXT[type]?.placeholder,
  label = TEXT[type]?.label,
}) {
  const client = useApolloClient()
  const [suggestions, setSuggestions] = useState([])
  const fetch = fetcher || FETCHER[type]

  return (
    <TagInput
      placeholder={placeholder}
      hint={hint}
      icon={type ? ICONS[type] : null}
      label={label}
      width="100%"
      suggestions={suggestions}
      items={bindings}
      onRemove={remove}
      onAdd={({ value }) => add(value)}
      onChange={({ target: { value } }) => fetch(client, value, setSuggestions)}
    />
  )
}

const TagPicker = styled.div(({ theme: _theme }) => ({}))

function TagInput({
  placeholder,
  label,
  hint,
  suggestions,
  items,
  icon,
  onRemove,
  onAdd,
  width,
  onChange,
}) {
  const [inputValue, setInputValue] = useState('')

    // Run only on first render. Make sure there will be data in Combo Box to start with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => onChange({ target: { value: inputValue } }), [])

  return (
    <TagPicker>
      <FormField
        label={label}
        hint={hint}
        width={width}
      >
        <ComboBox
          aria-label={label}
          inputValue={inputValue}
          onSelectionChange={key => {
            const selection = suggestions.find(s => s?.value?.id === key)

            if (selection) onAdd(selection)
          }}
          onInputChange={value => {
            setInputValue(value)
            onChange({ target: { value } })
          }}
          startIcon={icon}
          inputProps={{
            placeholder,
          }}
        >
          {suggestions.map(({ label }) => label)}
        </ComboBox>
        {items?.length > 0 && (
          <Flex marginTop="small">
            <ChipList
              maxVisible={Infinity}
              chips={items.map(key => (
                <Chip
                  size="small"
                  clickable
                  onClick={() => onRemove(key)}
                  closeButton
                >
                  {key}
                </Chip>
              ))}
            />
          </Flex>
        )}
      </FormField>
    </TagPicker>
  )
}
