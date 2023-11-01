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

export function GlobalSettingsPermissions({
  type,
}: {
  type: 'write' | 'read' | 'git' | 'create'
}) {
  useSetBreadcrumbs(
    useMemo(
      () => getGlobalSettingsBreadcrumbs({ page: `${type} permissions` }),
      [type]
    )
  )
  const { deploymentSettings, refetch } = useGlobalSettingsContext()
  const [updateSettings, { loading, error }] =
    useUpdateDeploymentSettingsMutation()

  const setBindings = useCallback(
    (bindings: { group?: { id: string }; user?: { id: string } }[]) => {
      const finalBindings = bindings
        .map(({ group, user }) =>
          group ? { groupId: group.id } : user ? { userId: user.id } : null
        )
        .filter(isNonNullable)

      console.log('finalBindings', finalBindings)

      updateSettings({
        variables: {
          attributes: {
            [`${type}Bindings`]: finalBindings,
          },
        },
        onCompleted: (c) => {
          console.log('comlete', c)
          refetch()
        },
      })
    },
    [refetch, type, updateSettings]
  )

  const bindings = deploymentSettings[`${type}Bindings`]

  console.log('bindings', bindings)

  return (
    <ScrollablePage heading={`${upperFirst(type)} Permissions`}>
      <ReadWriteBindings
        bindings={bindings}
        setBindings={setBindings}
      />
      {loading && 'Updating...'}
      {error && <GqlError error={error} />}
    </ScrollablePage>
  )
}

export default function ReadWriteBindings({
  bindings: bindingsProp,
  setBindings,
  hints,
}: {
  bindings: Nullable<Nullable<PolicyBindingFragment>[]>
  setBindings: (
    bindings: { group?: { id: string }; user?: { id: string } }[]
  ) => void
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
