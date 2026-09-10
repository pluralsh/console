import compact from 'lodash/compact'

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
  return compact([
    formatIdentity(user),
    ...(groups ?? []).map((group) => group?.name?.trim()),
  ]).join('\n')
}

export function formatGroupMembersCopy(
  group: Named,
  members: Nullable<Nullable<UserIdentity>[]>
): string {
  return compact([
    group.name?.trim(),
    ...(members ?? []).map(formatIdentity),
  ]).join('\n')
}
