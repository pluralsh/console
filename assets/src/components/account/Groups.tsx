import { useMutation } from '@apollo/client'
import { Box } from 'grommet'
import { Flex } from 'honorable'
import {
  Button,
  GlobeIcon,
  IconFrame,
  Modal,
  PageTitle,
  SearchIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { useContext, useState } from 'react'

import { Confirm } from 'components/utils/Confirm'

import { LoginContext } from 'components/contexts'

import ListInput from '../utils/ListInput'

import { List } from '../utils/List'

import { removeConnection, updateCache } from '../../utils/graphql'

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
  const { me } = useContext(LoginContext)
  const editable = true // TODO: canEdit(me, account) || hasRbac(me, Permissions.USERS)
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
          {group.global && <GlobeIcon size={20} />}
          {!editable && (
            <Button
              secondary
              small
              onClick={() => setView(true)}
            >
              View
            </Button>
          )}
          {editable && (
            <Button
              secondary
              small
              onClick={() => setEdit(true)}
            >
              Edit
            </Button>
          )}

          {editable && (
            <IconFrame
              size="medium"
              clickable
              icon={<TrashCanIcon color="icon-danger" />}
              textValue="Delete"
              onClick={() => setConfirm(true)}
            />
          )}
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
