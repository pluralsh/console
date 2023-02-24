import styled from 'styled-components'
import {
  Dispatch,
  ReactElement,
  useCallback,
  useMemo,
  useState,
} from 'react'
import {
  AppIcon,
  Button,
  ComboBox,
  FormField,
  GraphQLToast,
  Input,
  ListBoxFooterPlus,
  ListBoxItem,
  Modal,
} from '@pluralsh/design-system'
import { ServerError, useMutation, useQuery } from '@apollo/client'
import { A } from 'honorable'

import Fuse from 'fuse.js'

import { CreateWireguardPeer } from '../graphql/mutations'
import {
  PageInfo,
  RootMutationTypeCreatePeerArgs,
  RootQueryType,
  RootQueryTypeUsersArgs,
  WireguardPeer,
} from '../../../generated/graphql'
import { USERS_Q } from '../../graphql/users'
import { extendConnection } from '../../../utils/graphql'
import { isValidEmail } from '../../../utils/email'

interface CreateClientProps {
  refetch: Dispatch<void>
  onClose: Dispatch<void>
}

function CreateClient({ onClose, refetch }: CreateClientProps): ReactElement {
  return (
    <Modal
      BackdropProps={{ zIndex: 20 }}
      header="create vpn client"
      open
      onClose={() => onClose()}
      size="large"
      style={{ padding: 0 }}
    >
      <ModalContent
        onClose={onClose}
        refetch={refetch}
      />
    </Modal>
  )
}

const ModalContent = styled(ModalContentUnstyled)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,

  '.footer': {
    display: 'flex',
    gap: theme.spacing.medium,
    alignSelf: 'flex-end',
  },
}))

enum UserSelectionMode {
  Select,
  Input,
}

function ModalContentUnstyled({ onClose, refetch, ...props }: CreateClientProps): ReactElement {
  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>()
  const [mode, setMode] = useState<UserSelectionMode>(UserSelectionMode.Select)
  const [selectedKey, setSelectedKey] = useState<string>()
  const [inputValue, setInputValue] = useState<string>()

  // Queries & Mutations
  const { data: { users: userList } = {}, fetchMore } = useQuery<Pick<RootQueryType, 'users'>, RootQueryTypeUsersArgs>(USERS_Q)
  const [createPeer, { loading, error }] = useMutation<WireguardPeer, RootMutationTypeCreatePeerArgs>(CreateWireguardPeer, {
    variables: {
      name,
      email,
      userId: selectedKey,
    },
    onCompleted: () => {
      refetch()
      onClose()
    },
  })

  // Memo
  const { pageInfo, users } = useMemo(() => ({
    pageInfo: userList?.pageInfo ?? {} as PageInfo,
    users: userList?.edges?.map(edge => edge?.node) ?? [],
  }), [userList])
  const fuse = useMemo(() => new Fuse(users, {
    includeScore: true,
    shouldSort: true,
    threshold: 0.3,
    keys: ['name'],
  }),
  [users])
  const searchResults = useMemo(() => {
    if (inputValue) {
      return fuse.search(inputValue)?.map(res => res.item)
    }

    return users
  }, [fuse, inputValue, users])
  const isEmailValid = useMemo(() => isValidEmail(email ?? ''), [email])
  const isValid = useMemo(() => name && (isEmailValid || selectedKey), [isEmailValid, name, selectedKey])

  // Callbacks
  const onSelectionChange = useCallback(key => {
    setSelectedKey(key)
    setInputValue(users?.find(user => user?.id === key)?.name)
  }, [users])
  const onInputChange = useCallback(value => {
    setInputValue(value)
    setSelectedKey(undefined)
  }, [])

  return (
    <div {...props}>
      <FormField
        label="Name"
        required
      >
        <Input
          placeholder="VPN client name"
          value={name}
          onChange={({ target: { value } }) => setName(value)}
        />
      </FormField>

      <FormField
        label={mode === UserSelectionMode.Select ? 'User' : 'User email'}
        required
        error={!isEmailValid}
        hint={email && !isEmailValid ? 'Invalid email address' : undefined}
        caption={(
          <A
            inline
            onClick={() => {
              setMode(mode === UserSelectionMode.Input ? UserSelectionMode.Select : UserSelectionMode.Input)
              setSelectedKey(undefined)
              setInputValue(undefined)
              setEmail(undefined)
            }}
          >{mode === UserSelectionMode.Input ? 'Go back' : 'Input email'}
          </A>
        )}
      >
        {mode === UserSelectionMode.Select && (
          <ComboBox
            aria-label="user-selector"
            inputProps={{ placeholder: 'Search for a user' }}
            inputValue={inputValue}
            onInputChange={onInputChange}
            selectedKey={selectedKey}
            onSelectionChange={onSelectionChange}
            allowsEmptyCollection
            dropdownFooterFixed={pageInfo?.hasNextPage && (
              <ListBoxFooterPlus onClick={() => fetchMore({
                variables: { cursor: pageInfo?.endCursor },
                updateQuery: (prev, { fetchMoreResult: { users } }) => extendConnection(prev, users, 'users'),
              })}
              >Load more
              </ListBoxFooterPlus>
            )}
          >
            {searchResults?.map(user => (
              <ListBoxItem
                key={user?.id}
                textValue={user?.name}
                label={user?.name}
                leftContent={(
                  <AppIcon
                    key={user?.id}
                    name={user?.name}
                    url={user?.profile ?? ''}
                    spacing={user?.profile ? 'none' : undefined}
                    size="xxsmall"
                  />
                )}
              />
            ))}
          </ComboBox>
        )}

        {mode === UserSelectionMode.Input && (
          <Input
            placeholder="Enter user email"
            value={email}
            error={!isEmailValid}
            onChange={({ target: { value } }) => setEmail(value)}
          />
        )}
      </FormField>
      <div className="footer">
        <Button
          secondary
          onClick={() => onClose()}
        >Cancel
        </Button>
        <Button
          loading={loading}
          onClick={() => createPeer()}
          disabled={!isValid}
        >Create
        </Button>
      </div>

      {error && (
        <GraphQLToast
          header={(error?.networkError as ServerError)?.statusCode?.toString() ?? 'Error'}
          error={{ graphQLErrors: [...error?.graphQLErrors ?? []] }}
          margin="medium"
          marginHorizontal="xxxxlarge"
        />
      )}
    </div>
  )
}

export { CreateClient }
