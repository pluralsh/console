export const hasRbac = (me, role) =>
  (me?.boundRoles || []).some(({ permissions }) => permissions.includes(role))

export const Permissions = {
  INSTALL: 'INSTALL',
  USERS: 'USERS',
}
