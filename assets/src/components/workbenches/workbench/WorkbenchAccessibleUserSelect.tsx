import {
  AppIcon,
  Flex,
  FormField,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import UserInfo from 'components/utils/UserInfo'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP } from 'components/utils/typography/Text'
import { useWorkbenchAccessibleUsersLazyQuery } from 'generated/graphql'
import { useEffect, useMemo } from 'react'
import { isNonNullable } from 'utils/isNonNullable'

/**
 * `useBimodalSelectState.open()` refuses to open when the collection has zero
 * items — so we must never render an empty Select until we show at least a
 * placeholder row, and we load users on mount (not only on first open).
 */
export function WorkbenchAccessibleUserSelect({
  workbenchId,
  selectedUserId,
  onSelectionChange,
  disabled,
  hint,
}: {
  workbenchId: string
  selectedUserId: string
  onSelectionChange: (userId: string) => void
  disabled?: boolean
  hint?: string
}) {
  const [fetchUsers, { data, loading, error }] =
    useWorkbenchAccessibleUsersLazyQuery({
      fetchPolicy: 'cache-first',
    })

  useEffect(() => {
    if (!workbenchId) return
    fetchUsers({ variables: { id: workbenchId } })
  }, [workbenchId, fetchUsers])

  const accessibleUsers = useMemo(() => {
    const wb = data?.workbench
    if (wb?.id !== workbenchId) return []
    return (wb.users ?? []).filter(isNonNullable)
  }, [data?.workbench, workbenchId])

  const usersLoaded = data?.workbench?.id === workbenchId && !loading

  const selectedResolved = useMemo(
    () => accessibleUsers.find((u) => u.id === selectedUserId),
    [accessibleUsers, selectedUserId]
  )

  const isOrphanSelection = !!selectedUserId && usersLoaded && !selectedResolved

  const listEmpty = accessibleUsers.length === 0

  const awaitingFirstPayload =
    listEmpty && (loading || data?.workbench?.id !== workbenchId)

  const defaultHint = (
    <CaptionP $color="text-light">
      Automated runs use this user&apos;s permissions and credentials.
    </CaptionP>
  )

  const emptyHint = (
    <CaptionP $color="text-light">
      No run-as user is selected yet. Choose someone with read access to this
      workbench — scheduled runs and webhook handling use that user&apos;s
      identity and credentials.
    </CaptionP>
  )

  const orphanHint = (
    <CaptionP $color="text-warning">
      The previously selected user is no longer in this workbench&apos;s
      accessible users list. Choose another user below.
    </CaptionP>
  )

  const resolvedHint =
    hint ??
    (isOrphanSelection ? orphanHint : !selectedUserId ? emptyHint : defaultHint)

  if (!workbenchId) {
    return (
      <FormField label="Run as user">
        <RectangleSkeleton
          $height={38}
          $width="100%"
        />
      </FormField>
    )
  }

  return (
    <Flex
      direction="column"
      gap="small"
      width="100%"
    >
      {error && <GqlError error={error} />}
      <FormField
        label="Run as user"
        hint={resolvedHint}
        infoTooltip="The user whose identity is used when this trigger runs. Must have read access to the workbench."
      >
        <Select
          selectedKey={selectedUserId || null}
          isDisabled={disabled}
          leftContent={
            selectedResolved ? undefined : (
              <AppIcon
                size="xsmall"
                name="?"
                hue="lighter"
              />
            )
          }
          label={
            selectedResolved
              ? selectedResolved.name
              : selectedUserId
                ? 'User no longer available'
                : 'No user selected'
          }
          dropdownHeaderFixed={
            awaitingFirstPayload ? (
              <CaptionP $color="text-light">Loading users…</CaptionP>
            ) : undefined
          }
          onSelectionChange={(key) => {
            if (key && String(key) !== '__workbench-users-placeholder') {
              onSelectionChange(String(key))
            }
          }}
        >
          {listEmpty ? (
            <ListBoxItem
              key="__workbench-users-placeholder"
              label={
                awaitingFirstPayload ? 'Loading users…' : 'No accessible users'
              }
              disabled
              textValue={
                awaitingFirstPayload ? 'Loading users' : 'No accessible users'
              }
            />
          ) : (
            accessibleUsers.map((u) => (
              <ListBoxItem
                key={u.id}
                label={
                  <UserInfo
                    user={{
                      name: u.name,
                      email: u.email,
                      avatar: u.profile ?? undefined,
                    }}
                    css={{
                      minWidth: 0,
                      width: '100%',
                    }}
                  />
                }
                textValue={`${u.name} ${u.email}`}
              />
            ))
          )}
        </Select>
      </FormField>
    </Flex>
  )
}
