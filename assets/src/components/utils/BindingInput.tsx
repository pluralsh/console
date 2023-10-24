import {
  AppIcon,
  Chip,
  ComboBox,
  FormField,
  ListBoxItem,
  ListBoxItemChipList,
  PeopleIcon,
  PersonIcon,
} from '@pluralsh/design-system'
import { useEffect, useState } from 'react'
import { ApolloClient, useApolloClient } from '@apollo/client'
import styled from 'styled-components'

import {
  SearchGroupsDocument,
  SearchGroupsQuery,
  SearchGroupsQueryVariables,
  SearchUsersDocument,
  SearchUsersQuery,
  SearchUsersQueryVariables,
} from 'generated/graphql'

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

export function fetchUsers(client: ApolloClient<any>, query, setSuggestions) {
  client
    .query<SearchUsersQuery, SearchUsersQueryVariables>({
      query: SearchUsersDocument,
      variables: { q: query },
    })
    .then(
      ({ data }) =>
        data?.users?.edges?.map((edge) => ({
          value: edge?.node,
          label: userSuggestion(edge?.node),
        }))
    )
    .then(setSuggestions)
}

export function fetchGroups(client: ApolloClient<any>, query, setSuggestions) {
  client
    .query<SearchGroupsQuery, SearchGroupsQueryVariables>({
      query: SearchGroupsDocument,
      variables: { q: query },
    })
    .then(
      ({ data }) =>
        data?.groups?.edges?.map((edge) => ({
          value: edge?.node,
          label: groupSuggestion(edge?.node),
        }))
    )
    .then(setSuggestions)
}

export function userSuggestion({ name, email, avatar, id }: any) {
  return (
    <ListBoxItem
      key={id}
      label={name}
      textValue={`${name} - ${email}`}
      description={email}
      leftContent={
        <AppIcon
          spacing={avatar ? 'none' : undefined}
          hue="lightest"
          size="xsmall"
          name={name}
          url={avatar}
        />
      }
    />
  )
}

export function groupSuggestion({ name, description, id }: any) {
  return (
    <ListBoxItem
      key={id}
      label={name}
      textValue={`${name} - ${description}`}
      description={description}
      leftContent={<PeopleIcon />}
    />
  )
}

const ChipList = styled(ListBoxItemChipList)(({ theme }) => ({
  marginTop: theme.spacing.small,
  justifyContent: 'start',
}))

export function BindingInput({
  type,
  fetcher,
  bindings,
  remove,
  add,
  hint,
  placeholder = TEXT[type]?.placeholder,
  label = TEXT[type]?.label,
}: any) {
  const client = useApolloClient()
  const [suggestions, setSuggestions] = useState([])
  const fetch = fetcher || FETCHER[type]

  return (
    <TagInput
      noborder
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
}: any) {
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
          onSelectionChange={(key) => {
            const selection = suggestions.find((s) => s?.value?.id === key)

            if (selection) onAdd(selection)
          }}
          onInputChange={(value) => {
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
          <ChipList
            maxVisible={Infinity}
            chips={items.map((key) => (
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
        )}
      </FormField>
    </TagPicker>
  )
}
