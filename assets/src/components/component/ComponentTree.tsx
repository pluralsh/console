import { EmptyState } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

import {
  ComponentTreeFragment,
  MetadataFragment,
  useComponentTreeQuery,
} from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'

import { ConditionalKeys } from 'type-fest'

import { isNonNullable } from 'utils/isNonNullable'

import { ComponentDetailsContext } from './ComponentDetails'

type HasMetadata = { metadata?: MetadataFragment }
type ComponentTypeKey = ConditionalKeys<
  ComponentTreeFragment,
  Nullable<Nullable<HasMetadata>[]>
>

const cTypes = [
  'certificates',
  'configmaps',
  'cronjobs',
  'daemonsets',
  'deployments',
  'ingresses',
  'secrets',
  'services',
  'statefulsets',
] as const satisfies ComponentTypeKey[]

export default function ComponentTree() {
  const ctx = useOutletContext<ComponentDetailsContext>()
  const componentId = ctx?.component.id

  console.log('ctx', ctx)
  const queryRes = useComponentTreeQuery({ variables: { id: componentId } })
  const tree = queryRes.data?.componentTree

  console.log('queryRes', queryRes)

  const edges = tree?.edges || []
  const metadatas = useMemo(
    () =>
      cTypes.map(
        (cType) =>
          tree?.[cType]?.filter(isNonNullable).map((c: HasMetadata) => ({
            type: cType,
            ...c,
          }))
      ),
    [tree]
  )

  console.log('metadatas', metadatas)
  console.log('edges', edges)

  if (queryRes.error) {
    return <GqlError error={queryRes.error} />
  }
  if (!queryRes.data?.componentTree) {
    return <EmptyState message="No data available." />
  }

  return <div>hi</div>
}
