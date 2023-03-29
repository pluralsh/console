export const hasRbac = ({ boundRoles }, role) =>
  (boundRoles || []).some(({ permissions }) => permissions.includes(role))

export const Permissions = {
  INSTALL: 'INSTALL',
  USERS: 'USERS',
}
