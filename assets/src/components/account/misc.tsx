export const hasRbac = ({ boundRoles }, role) => (boundRoles || []).some(({ permissions }) => permissions.includes(role))

export const Permissions = {
  INSTALL: 'INSTALL',
  PUBLISH: 'PUBLISH',
  BILLING: 'BILLING',
  USERS: 'USERS',
  SUPPORT: 'SUPPORT',
}
