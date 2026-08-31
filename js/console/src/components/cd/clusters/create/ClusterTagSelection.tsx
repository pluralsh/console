import { ComponentProps, useCallback, useMemo } from 'react'

import { TagSelection } from 'components/cd/services/TagSelection'

import { FormField } from '@pluralsh/design-system'

import { ClusterCreateMode, useCreateClusterContext } from './CreateCluster'

export function ClusterTagSelection({ mode }: { mode: ClusterCreateMode }) {
  const ctx = useCreateClusterContext()[mode]
  const tags = useMemo(
    () =>
      Object.fromEntries(
        ctx?.attributes?.tags?.map((t) => [t?.name, t?.value]) || []
      ) || {},
    [ctx?.attributes?.tags]
  )
  const setTags = useCallback<ComponentProps<typeof TagSelection>['setTags']>(
    (tags) => {
      const nextTags = Object?.entries(tags)?.map?.(([name, value]) => ({
        name,
        value,
      }))

      ctx.setAttributes({ ...ctx.attributes, tags: nextTags })
    },
    [ctx]
  )

  return (
    <FormField label="Tags">
      <TagSelection
        tags={tags}
        setTags={setTags}
      />
    </FormField>
  )
}
