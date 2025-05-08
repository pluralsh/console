import { Card } from '@pluralsh/design-system'
import { useGlobalSettingsContext } from 'components/settings/global/GlobalSettings'
import { splitBindings } from 'components/settings/usermanagement/roles/RoleFormBindings'
import { GqlError } from 'components/utils/Alert'
import { BindingInput } from 'components/utils/BindingInput'
import {
  PolicyBindingFragment,
  useUpdateDeploymentSettingsMutation,
} from 'generated/graphql'
import { upperFirst } from 'lodash'
import { useCallback, useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

type SetBindingsType = (
  bindings: Nullable<{
    group?: Nullable<{ id: string }>
    user?: Nullable<{ id: string }>
  }>[]
) => void

enum GlobalSettingsPermissionsType {
  Write = 'write',
  Read = 'read',
  Git = 'git',
  Create = 'create',
}

export function GlobalSettingsPermissions() {
  return (
    <SettingsWrapperSC>
      {Object.values(GlobalSettingsPermissionsType).map((type) => (
        <GlobalSettingsPermissionsCard
          key={type}
          type={type}
        />
      ))}
    </SettingsWrapperSC>
  )
}

const SettingsWrapperSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: theme.spacing.small,
}))

function GlobalSettingsPermissionsCard({
  type,
}: {
  type: GlobalSettingsPermissionsType
}) {
  const theme = useTheme()
  const { deploymentSettings, refetch } = useGlobalSettingsContext()
  const [updateSettings, { loading, error }] =
    useUpdateDeploymentSettingsMutation()

  const setBindings = useCallback<SetBindingsType>(
    (bindings) => {
      const finalBindings = bindings
        .map((binding) => {
          const { group, user } = binding || {}

          return group
            ? { groupId: group.id }
            : user
              ? { userId: user.id }
              : null
        })
        .filter(isNonNullable)

      updateSettings({
        variables: {
          attributes: {
            [`${type}Bindings`]: finalBindings,
          },
        },
        onCompleted: () => {
          refetch()
        },
      })
    },
    [refetch, type, updateSettings]
  )
  const bindings = deploymentSettings[`${type}Bindings`]

  return (
    <Card css={{ padding: theme.spacing.xlarge }}>
      <h2
        css={{
          ...theme.partials.text.overline,
          color: theme.colors['icon-xlight'],
          marginBottom: `${theme.spacing.medium}px`,
        }}
      >
        {upperFirst(type)} Permissions
      </h2>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
        }}
      >
        <ReadWriteBindings
          bindings={bindings}
          setBindings={setBindings}
        />
        {loading && (
          <p
            css={{
              ...theme.partials.text.body2,
              color: theme.colors['text-light'],
            }}
          >
            Updating...
          </p>
        )}
        {error && <GqlError error={error} />}
      </div>
    </Card>
  )
}

function ReadWriteBindings({
  bindings: bindingsProp,
  setBindings,
}: {
  bindings: Nullable<Nullable<PolicyBindingFragment>[]>
  setBindings: SetBindingsType
}) {
  const theme = useTheme()
  const bindings = (bindingsProp || []).filter(isNonNullable)

  const { userBindings, groupBindings } = useMemo(() => {
    const { userBindings, groupBindings } = splitBindings(bindings)

    return {
      userBindings: (userBindings || []).map(({ user }) => user?.email),
      groupBindings: (groupBindings || []).map(({ group }) => group?.name),
    }
  }, [bindings])

  return (
    <div
      css={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      <BindingInput
        type="user"
        bindings={userBindings}
        add={(user) => setBindings([...bindings, { user }])}
        remove={(email) =>
          setBindings(
            bindings.filter(({ user }) => !user || user.email !== email)
          )
        }
      />
      <BindingInput
        type="group"
        bindings={groupBindings}
        add={(group) => setBindings([...bindings, { group }])}
        remove={(name) =>
          setBindings(
            bindings.filter(({ group }) => !group || group.name !== name)
          )
        }
      />
    </div>
  )
}
