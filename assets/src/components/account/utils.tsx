import { apiHost } from '../../utils/hostname'

import { SearchIcon as SI } from '../utils/SearchIcon'

import { GROUPS_Q, GROUP_MEMBERS, ROLES_Q } from './queries'

export function SearchIcon() {
  return (
    <SI
      size={16}
      border="tone-medium"
    />
  )
}

export function addGroupMember(cache, group, member) {
  const { members, ...data } = cache.readQuery({
    query: GROUP_MEMBERS,
    variables: { id: group.id },
  })

  cache.writeQuery({
    query: GROUP_MEMBERS,
    variables: { id: group.id },
    data: {
      ...data,
      members: {
        ...members,
        edges: [{ __typename: 'GroupMemberEdge', node: member }, ...members.edges],
      },
    },
  })
}

export function deleteGroup(cache, group) {
  const { groups, ...data } = cache.readQuery({ query: GROUPS_Q, variables: { q: null } })

  cache.writeQuery({
    query: GROUPS_Q,
    variables: { q: null },
    data: {
      ...data,
      groups: { ...groups, edges: groups.edges.filter(({ node: { id } }) => id !== group.id) },
    },
  })
}

export function addRole(cache, role) {
  const { roles, ...data } = cache.readQuery({ query: ROLES_Q, variables: { q: null } })

  cache.writeQuery({
    query: ROLES_Q,
    variables: { q: null },
    data: { ...data, roles: { ...roles, edges: [{ __typename: 'RoleEdge', node: role }, ...roles.edges] } },
  })
}

export const inviteLink = invite => `https://${apiHost()}/invite/${invite.secureId}`

export const sanitize = ({ id, user, group }) => ({ id, userId: user && user.id, groupId: group && group.id })

export const canEdit = ({ roles, id }, { rootUser }) => (
  (roles && roles.admin) || id === rootUser.id
)

export const hasRbac = ({ boundRoles }, role) => (boundRoles || []).some(({ permissions }) => permissions.includes(role))
