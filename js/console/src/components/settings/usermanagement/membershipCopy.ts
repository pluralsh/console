type Named = { name?: Nullable<string> }
type UserIdentity = { name?: Nullable<string>; email?: Nullable<string> }

export function formatIdentity(user: Nullable<UserIdentity>): string {
  if (!user) return ''

  const name = user.name?.trim() ?? ''
  const email = user.email?.trim() ?? ''

  if (name && email) return `${name} <${email}>`

  return name || email
}

export function formatUserGroupsCopy(
  user: UserIdentity,
  groups: Nullable<Nullable<Named>[]>
): string {
  const groupNames = (groups ?? [])
    .map((group) => group?.name?.trim())
    .filter((name): name is string => !!name)

  return [formatIdentity(user), ...groupNames].filter(Boolean).join('\n')
}

export function formatGroupMembersCopy(
  group: Named,
  members: Nullable<Nullable<UserIdentity>[]>
): string {
  const memberLines = (members ?? []).map(formatIdentity).filter(Boolean)

  return [group.name?.trim(), ...memberLines].filter(Boolean).join('\n')
}
