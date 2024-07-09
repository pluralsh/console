export const bindingToBindingAttributes = ({
  id,
  user,
  group,
}: {
  id?: string | null | undefined
  user?: { id?: string } | null | undefined
  group?: { id?: string } | null | undefined
}) => ({
  ...(id && { id }),
  ...(user?.id && { userId: user.id }),
  ...(group?.id && { groupId: group.id }),
})
