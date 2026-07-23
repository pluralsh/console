import {
  Flex,
  FormField,
  ListBoxItem,
  Select,
  SelectButton,
} from '@pluralsh/design-system'
import { useLogin } from 'components/contexts'
import { GqlError } from 'components/utils/Alert'
import UserInfo from 'components/utils/UserInfo'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP } from 'components/utils/typography/Text'
import { useWorkbenchAccessibleUsersLazyQuery } from 'generated/graphql'
import { type ReactNode, useEffect, useMemo } from 'react'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

function UserNameEmail({
  name,
  email,
}: {
  name?: string | null
  email?: string | null
}): ReactNode {
  const theme = useTheme()

  return (
    <span
      css={{
        display: 'flex',
        alignItems: 'baseline',
        gap: theme.spacing.xsmall,
        minWidth: 0,
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <span
        css={{
          color: theme.colors.text,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>
      {email ? (
        <span
          css={{
            color: theme.colors['text-xlight'],
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {email}
        </span>
      ) : null}
    </span>
  )
}

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
  const { me } = useLogin()
  const isAdmin = !!me?.roles?.admin
  const currentUserId = me?.id ?? ''

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

  /** Non-admins may only pick themselves; admins see everyone with workbench access. */
  const selectableUsers = useMemo(() => {
    if (isAdmin || !currentUserId) return accessibleUsers
    return accessibleUsers.filter((u) => u.id === currentUserId)
  }, [accessibleUsers, currentUserId, isAdmin])

  const usersLoaded = data?.workbench?.id === workbenchId && !loading

  const selectedResolved = useMemo(
    () => accessibleUsers.find((u) => u.id === selectedUserId),
    [accessibleUsers, selectedUserId]
  )

  const isOrphanSelection = !!selectedUserId && usersLoaded && !selectedResolved

  const listEmpty = selectableUsers.length === 0

  const awaitingFirstPayload =
    listEmpty && (loading || data?.workbench?.id !== workbenchId)

  const nonAdminActorNote = (
    <CaptionP $color="text-light">
      Only administrators can assign a different user for automated runs. Your
      account is always used unless an admin changes this setting.
    </CaptionP>
  )

  const defaultHint = (
    <Flex
      direction="column"
      gap="xxsmall"
    >
      <CaptionP $color="text-light">
        Automated runs use this user&apos;s permissions and credentials.
      </CaptionP>
      {!isAdmin && nonAdminActorNote}
    </Flex>
  )

  const emptyHint = (
    <Flex
      direction="column"
      gap="xxsmall"
    >
      <CaptionP $color="text-light">
        No run-as user is selected yet. Choose someone with read access to this
        workbench — scheduled runs and webhook handling use that user&apos;s
        identity and credentials.
      </CaptionP>
      {!isAdmin && nonAdminActorNote}
    </Flex>
  )

  const orphanHint = (
    <Flex
      direction="column"
      gap="xxsmall"
    >
      <CaptionP $color="text-warning">
        The previously selected user is no longer in this workbench&apos;s
        accessible users list. Choose another user below.
      </CaptionP>
      {!isAdmin && nonAdminActorNote}
    </Flex>
  )

  const resolvedHint =
    hint !== undefined
      ? hint || undefined
      : isOrphanSelection
        ? orphanHint
        : !selectedUserId
          ? emptyHint
          : defaultHint

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
        infoTooltip="The user whose identity is used when this trigger runs. Must have read access to the workbench. Only administrators can assign a user other than themselves."
      >
        <Select
          selectedKey={selectedUserId || null}
          isDisabled={disabled}
          label={
            selectedResolved
              ? `${selectedResolved.name ?? ''} ${selectedResolved.email ?? ''}`.trim()
              : selectedUserId
                ? 'User no longer available'
                : 'No user selected'
          }
          triggerButton={
            <SelectButton
              isDisabled={disabled}
              css={{
                '.content .children': {
                  minWidth: 0,
                  overflow: 'hidden',
                },
              }}
            >
              {selectedResolved ? (
                <UserNameEmail
                  name={selectedResolved.name}
                  email={selectedResolved.email}
                />
              ) : selectedUserId ? (
                'User no longer available'
              ) : (
                'No user selected'
              )}
            </SelectButton>
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
            selectableUsers.map((u) => (
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
