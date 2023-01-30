import { useMutation } from '@apollo/client'
import { Box } from 'grommet'
import { ListBoxItem } from '@pluralsh/design-system'
import { useContext, useState } from 'react'

import { Confirm } from 'components/utils/Confirm'

import { MoreMenu } from 'components/utils/MoreMenu'

import { LoginContext } from 'components/contexts'

import { removeConnection, updateCache } from '../../../utils/graphql'

import { Info } from '../../utils/Info'

import { Permissions, hasRbac } from '../misc'

import { DELETE_GROUP, GROUPS_Q } from './queries'

import GroupEdit from './GroupEdit'
import GroupView from './GroupView'

export default function Group({ group, q }: any) {
  const { me } = useContext<any>(LoginContext)
  const editable = !!me.roles?.admin || hasRbac(me, Permissions.USERS)
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
      destructive: true,
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
      <MoreMenu onSelectionChange={selectedKey => menuItems[selectedKey]?.onSelect()}>
        {Object.entries(menuItems).map(([key, { label, destructive }]) => (
          <ListBoxItem
            key={key}
            textValue={label}
            label={label}
            destructive={destructive}
            color="blue"
          />
        ))}
      </MoreMenu>
      <>
        <GroupView
          group={group}
          view={view}
          setView={setView}
        />
        {edit && (
          <GroupEdit
            group={group}
            edit={edit}
            setEdit={setEdit}
          />
        )}
        <Confirm
          open={confirm}
          title="Delete group"
          text="Are you sure you want to delete this group? This could have downstream effects on a large number of users and their roles."
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
