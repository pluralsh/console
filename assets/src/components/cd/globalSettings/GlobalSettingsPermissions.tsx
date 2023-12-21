import { useSetBreadcrumbs } from '@pluralsh/design-system'
import {
  getGlobalSettingsBreadcrumbs,
  useGlobalSettingsContext,
} from 'components/cd/globalSettings/GlobalSettings'
import { GqlError } from 'components/utils/Alert'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useUpdateDeploymentSettingsMutation } from 'generated/graphql'
import { upperFirst } from 'lodash'
import { useCallback, useMemo } from 'react'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

import ReadWriteBindings from './ReadWriteBindings'

export type SetBindingsType = (
  bindings: Nullable<{
    group?: Nullable<{ id: string }>
    user?: Nullable<{ id: string }>
  }>[]
) => void

export default function GlobalSettingsPermissions({
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
