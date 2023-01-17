import { useMutation } from '@apollo/client'
import { Box } from 'grommet'
import { Flex } from 'honorable'
import {
  ListBoxItem,
  Modal,
  PageTitle,
  SearchIcon,
} from '@pluralsh/design-system'
import { useContext, useState } from 'react'

import { Confirm } from 'components/utils/Confirm'

import { LoginContext } from 'components/contexts'

import ListInput from '../utils/ListInput'

import { List } from '../utils/List'

import { removeConnection, updateCache } from '../../utils/graphql'

import { MoreMenu } from '../utils/MoreMenu'

import { DELETE_GROUP, GROUPS_Q } from './queries'

import { ViewGroup } from './Group'
import { CreateGroup } from './CreateGroup'
import { EditGroup } from './EditGroup'

import { Info } from './Info'
import { GroupsList } from './GroupsList'

function Header({ q, setQ }: any) {
  return (
    <ListInput
      width="100%"
      value={q}
      placeholder="Search a group"
      startIcon={<SearchIcon color="text-light" />}
      onChange={({ target: { value } }) => setQ(value)}
      flexGrow={0}
    />
  )
}

export function Group({ group, q }: any) {
  const { me } = useContext<any>(LoginContext)
  const editable = !!me.roles?.admin
  const [edit, setEdit] = useState(false)
  const [view, setView] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading, error }] = useMutation(DELETE_GROUP, {
    variables: { id: group.id },
    onCompleted: () => setConfirm(false),
    update: (cache, { data: { deleteGroup } }) => updateCache(cache, {
      query: GROUPS_Q,
      variables: { q },
      update: prev => removeConnection(prev, deleteGroup, 'groups'),
    }),
  })

  const menuItems = editable ? {
    edit: {
      label: 'Edit group',
      onSelect: () => setEdit(true),
    },
    delete: {
      label: 'Delete group',
      onSelect: () => setConfirm(true),
    },
  } : {
    view: {
      label: 'View group',
      onSelect: () => setView(true),
    },
  }

  return (
    <Box
      fill="horizontal"
      direction="row"
      align="center"
    >
      <Info
        text={group.name}
        description={group.description || 'no description'}
      />
      <>
        <Box
          flex={false}
          direction="row"
          gap="24px"
          align="center"
        >
          <MoreMenu onSelectionChange={selectedKey => menuItems[selectedKey]?.onSelect()}>
            {Object.entries(menuItems).map(([key, { label, props = {} }]) => (
              <ListBoxItem
                key={key}
                textValue={label}
                label={label}
                {...props}
                color="blue"
              />
            ))}
          </MoreMenu>
        </Box>
        <Modal
          header="View group"
          open={view}
          width="60vw"
          onClose={() => setView(false)}
        >
          <ViewGroup group={group} />
        </Modal>
        <EditGroup
          group={group}
          edit={edit}
          setEdit={setEdit}
        />
        <Confirm
          open={confirm}
          text="Deleting groups cannot be undone and permissions attached to this group will be removed."
          close={() => setConfirm(false)}
          submit={() => mutation()}
          loading={loading}
          destructive
          error={error}
        />
      </>
    </Box>
  )
}

export function Groups() {
  const [q, setQ] = useState('')

  return (
    <Flex
      flexGrow={1}
      flexDirection="column"
      maxHeight="100%"
    >
      <PageTitle heading="Groups">
        <CreateGroup q={q} />
      </PageTitle>
      <List>
        <Header
          q={q}
          setQ={setQ}
        />
        <GroupsList q={q} />
      </List>
    </Flex>
  )
}
