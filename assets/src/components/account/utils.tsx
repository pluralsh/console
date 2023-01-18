export const sanitize = ({ id, user, group }) => ({ id, userId: user && user.id, groupId: group && group.id })

// TODO: Use it?
export const canEdit = ({ roles, id }, { rootUser }) => (
  (roles && roles.admin) || id === rootUser.id
)

// TODO: Use it?
export const hasRbac = ({ boundRoles }, role) => (boundRoles || []).some(({ permissions }) => permissions.includes(role))
