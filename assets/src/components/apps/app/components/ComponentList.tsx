import { EmptyState } from '@pluralsh/design-system'
import { useMemo } from 'react'

import { type Key } from '@react-types/shared'
import { useTheme } from 'styled-components'

import ComponentCard, { type Component } from './ComponentCard'
import { compareComponents } from './Components'
import { ComponentState } from 'generated/graphql'

export function ComponentList<C extends Component>({
  components,
  selectedKinds,
  selectedStates,
  setUrl,
}: {
  components: C[] | null | undefined
  selectedKinds: any
  selectedStates?: Set<Key>
  setUrl: (component: C) => string | undefined
}) {
  const theme = useTheme()
  const filteredComponents = useMemo(
    () =>
      components
        ?.filter((comp) => selectedKinds.has(comp?.kind))
        .filter((comp) =>
          selectedStates
            ? selectedStates.size === 0 ||
              (!comp?.state && selectedStates.has(ComponentState.Running)) ||
              selectedStates.has(comp?.state as Key)
            : true
        )
        .sort(compareComponents),
    [components, selectedKinds, selectedStates]
  )

  return (filteredComponents || []).length === 0 ? (
    <EmptyState message="No components match your selection" />
  ) : (
    <div
      css={{
        display: 'grid',
        gap: theme.spacing.xsmall,
        gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
      }}
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
    </div>
  )
}
