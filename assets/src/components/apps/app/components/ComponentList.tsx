import { EmptyState } from '@pluralsh/design-system'
import { useMemo } from 'react'

import { useTheme } from 'styled-components'

import ComponentCard, { type Component } from './ComponentCard'
import { orderBy } from './Components'

export function ComponentList<C extends Component>({
  components,
  selectedKinds,
  setUrl,
}: {
  components: C[] | null | undefined
  selectedKinds: any
  setUrl: (component: C) => string | undefined
}) {
  const theme = useTheme()
  const filteredComponents = useMemo(
    () =>
      components?.filter((comp) => selectedKinds.has(comp?.kind)).sort(orderBy),
    [components, selectedKinds]
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
