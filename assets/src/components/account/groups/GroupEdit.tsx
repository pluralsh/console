import { useApolloClient, useMutation } from '@apollo/client'
import {
  ComboBox,
  FormField,
  Modal,
  Tab,
  TabList,
  TabPanel,
  ValidatedInput,
} from '@pluralsh/design-system'
import { useEffect, useRef, useState } from 'react'
import { Flex } from 'honorable'

import { fetchUsers } from 'components/utils/BindingInput'

import { GqlError } from '../../utils/Alert'

import { Actions } from '../../utils/Actions'

import { CREATE_GROUP_MEMBERS, GROUP_MEMBERS, UPDATE_GROUP } from './queries'

import GroupMembers from './GroupMembers'

const TABS = {
  Attributes: { label: 'Attributes' },
  Users: { label: 'Users' },
}

export default function GroupEdit({ group, edit, setEdit }: any) {
  const client = useApolloClient()
  const [value, setValue] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mutation, { loading, error }] = useMutation(UPDATE_GROUP, {
    variables: { id: group.id, attributes: { name, description } },
    onCompleted: () => setEdit(false),
  })
  const [addMut] = useMutation(CREATE_GROUP_MEMBERS, {
    variables: { groupId: group.id },
    refetchQueries: [{ query: GROUP_MEMBERS, variables: { id: group.id } }],
  })
  const [suggestions, setSuggestions] = useState([])
  const tabStateRef = useRef<any>(null)
  const [view, setView] = useState('Attributes')

  // Run only on first render. Make sure there will be data in Combo Box to start with.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => fetchUsers(client, value, setSuggestions), [])

  useEffect(() => {
    setName(group.name)
    setDescription(group.description)
  }, [group])

  return (
    <Modal
      header="Edit group"
      portal
      open={edit}
      size="large"
      onClose={() => setEdit(false)}
      actions={(
        <Actions
          cancel={() => setEdit(false)}
          submit={() => mutation()}
          loading={loading}
          action="Update"
        />
      )}
    >
      <Flex
        flexDirection="column"
        gap="large"
      >
        {error && (
          <GqlError
            header="Something went wrong"
            error={error}
          />
        )}
        <TabList
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'horizontal',
            selectedKey: view,
            onSelectionChange: key => setView(key as string),
          }}
        >
          {Object.entries(TABS).map(([key, { label }]) => (
            <Tab key={key}>{label}</Tab>
          ))}
        </TabList>
        <TabPanel stateRef={tabStateRef}>
          {view === 'Attributes' && (
            <Flex
              flexDirection="column"
              gap="large"
            >
              <ValidatedInput
                label="Name"
                value={name}
                onChange={({ target: { value } }) => setName(value)}
              />
              <ValidatedInput
                label="Description"
                value={description}
                onChange={({ target: { value } }) => setDescription(value)}
              />
            </Flex>
          )}
          {view === 'Users' && (
            <Flex
              flexDirection="column"
              gap="large"
            >
              <FormField
                label="Add users"
                width="100%"
                {...{
                  '& :last-child': {
                    marginTop: 0,
                  },
                }}
              >
                <ComboBox
                  inputValue={value}
                  // @ts-expect-error
                  placeholder="Search a user"
                  onSelectionChange={key => {
                    setValue('')
                    // @ts-expect-error
                    addMut({ variables: { userId: key } })
                  }}
                  onInputChange={value => {
                    setValue(value)
                    fetchUsers(client, value, setSuggestions)
                  }}
                >
                  {suggestions.map(({ label }) => label)}
                </ComboBox>
              </FormField>
              <GroupMembers
                group={group}
                edit
              />
            </Flex>
          )}
        </TabPanel>
      </Flex>
    </Modal>
  )
}
