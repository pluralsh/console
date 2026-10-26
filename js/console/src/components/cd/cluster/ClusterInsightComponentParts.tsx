import { Chip, ChipSeverity, ComponentsIcon } from '@pluralsh/design-system'
import { ComponentPropsWithRef } from 'react'

import {
  ClusterInsightComponentFragment,
  InsightComponentPriority,
} from 'generated/graphql.ts'
import { StackedText } from '../../utils/table/StackedText.tsx'

export function ClusterInsightComponentLabel({
  component,
  icon = <ComponentsIcon size={16} />,
  ...props
}: {
  component: Nullable<ClusterInsightComponentFragment>
} & Partial<ComponentPropsWithRef<typeof StackedText>>) {
  const title = component?.namespace
    ? `${component.namespace} > ${component.name}`
    : component?.name

  return (
    <StackedText
      first={title}
      firstPartialType="body2Bold"
      firstColor="text"
      second={`${component?.group ?? component?.version ?? 'v1'}/${component?.kind}`}
      secondPartialType="body2"
      secondColor="text-light"
      icon={icon}
      iconGap="small"
      iconFlexProps={{ minWidth: 0 }}
      {...props}
    />
  )
}

export function priorityToSeverity(
  priority: Nullable<InsightComponentPriority>
): ChipSeverity {
  switch (priority) {
    case InsightComponentPriority.Medium:
      return 'warning'
    case InsightComponentPriority.High:
      return 'danger'
    case InsightComponentPriority.Critical:
      return 'critical'
    case InsightComponentPriority.Low:
    default:
      return 'neutral'
  }
}

const PRIORITY_RANK: Record<InsightComponentPriority, number> = {
  [InsightComponentPriority.Critical]: 4,
  [InsightComponentPriority.High]: 3,
  [InsightComponentPriority.Medium]: 2,
  [InsightComponentPriority.Low]: 1,
}

type SortableComponent = Pick<
  ClusterInsightComponentFragment,
  'priority' | 'namespace' | 'name'
>

// most urgent first, then a stable order by namespace and name, so both views list components the same way
export function compareInsightComponents(
  a: SortableComponent,
  b: SortableComponent
): number {
  const byPriority =
    (b.priority ? PRIORITY_RANK[b.priority] : 0) -
    (a.priority ? PRIORITY_RANK[a.priority] : 0)

  if (byPriority !== 0) return byPriority

  return (
    (a.namespace ?? '').localeCompare(b.namespace ?? '') ||
    a.name.localeCompare(b.name)
  )
}

export function sortInsightComponents<T extends SortableComponent>(
  components: T[]
): T[] {
  return [...components].sort(compareInsightComponents)
}

type ObjectRef = {
  group?: Nullable<string>
  version?: Nullable<string>
  kind: string
  namespace?: Nullable<string>
  name: string
}

// the core group and cluster scoped objects are reported as either nil or an empty string
export function isSameObject(a: ObjectRef, b: ObjectRef): boolean {
  return (
    (a.group ?? '') === (b.group ?? '') &&
    (a.version ?? '') === (b.version ?? '') &&
    a.kind === b.kind &&
    (a.namespace ?? '') === (b.namespace ?? '') &&
    a.name === b.name
  )
}

export function ClusterInsightServiceChip({
  service,
}: {
  service: Nullable<ClusterInsightComponentFragment['service']>
}) {
  if (!service) return null

  return (
    <Chip
      size="small"
      severity="info"
    >
      {service.name}
    </Chip>
  )
}
