import { EmptyState } from '@pluralsh/design-system'
import { type ComponentProps, useMemo } from 'react'
import { Div } from 'honorable'

import ComponentCard from './ComponentCard'
import { orderBy } from './Components'

export function ComponentList({
  components,
  selectedKinds,
  setUrl,
}: {
  components:
    | (ComponentProps<typeof ComponentCard>['component'] | null | undefined)[]
    | null
    | undefined
  selectedKinds: any
  setUrl: (
    component:
      | ComponentProps<typeof ComponentCard>['component']
      | null
      | undefined
  ) => string | undefined
}) {
  const filteredComponents = useMemo(
    () =>
      components?.filter((comp) => selectedKinds.has(comp?.kind)).sort(orderBy),
    [components, selectedKinds]
  )

  return (filteredComponents || []).length === 0 ? (
    <EmptyState message="No components match your selection" />
  ) : (
    <Div
      display="grid"
      gap="xsmall"
      gridTemplateColumns="1fr 1fr"
    >
      {filteredComponents?.map(
        (component, i) =>
          component && (
            <ComponentCard
              key={i}
              url={setUrl(component)}
              component={component}
            />
          )
      )}
    </Div>
  )
}
