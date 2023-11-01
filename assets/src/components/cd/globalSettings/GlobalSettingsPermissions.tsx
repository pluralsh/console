import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { splitBindings } from 'components/account/roles/RoleFormBindings'
import {
  getGlobalSettingsBreadcrumbs,
  useGlobalSettingsContext,
} from 'components/cd/globalSettings/GlobalSettings'
import { GqlError } from 'components/utils/Alert'
import { BindingInput } from 'components/utils/BindingInput'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import {
  PolicyBindingFragment,
  useUpdateDeploymentSettingsMutation,
} from 'generated/graphql'
import { upperFirst } from 'lodash'
import { useCallback, useMemo } from 'react'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

type SetBindingsType = (
  bindings: Nullable<{
    group?: Nullable<{ id: string }>
    user?: Nullable<{ id: string }>
  }>[]
) => void

export function GlobalSettingsPermissions({
  type,
}: {
  type: 'write' | 'read' | 'git' | 'create'
}) {
  const theme = useTheme()
  const { deploymentSettings, refetch } = useGlobalSettingsContext()
  const [updateSettings, { loading, error }] =
    useUpdateDeploymentSettingsMutation()

  useSetBreadcrumbs(
    useMemo(
      () => getGlobalSettingsBreadcrumbs({ page: `${type} permissions` }),
      [type]
    )
  )

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
    <ScrollablePage heading={`${upperFirst(type)} Permissions`}>
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
    </ScrollablePage>
  )
}

export default function ReadWriteBindings({
  bindings: bindingsProp,
  setBindings,
  hints,
}: {
  bindings: Nullable<Nullable<PolicyBindingFragment>[]>
  setBindings: SetBindingsType
  hints?: { user?: string; group?: string }
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
        flexDirection: 'row',
        gap: theme.spacing.xlarge,
        '& > *': {
          flexBasis: '50%',
          flexGrow: 1,
          flexShrink: 1,
        },
      }}
    >
      <BindingInput
        type="user"
        hint={hints?.user || 'Users that will receive this role'}
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
        hint={hints?.group || 'Groups that will receive this role'}
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
