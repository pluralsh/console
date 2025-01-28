import { EmptyState } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import Fuse from 'fuse.js'

import { ComponentState } from 'generated/graphql'
import ComponentCard, { type Component } from './ComponentCard'
import { compareComponents } from './Components.tsx'

const searchOptions: Fuse.IFuseOptions<Component> = {
  keys: ['name', 'kind', 'group'],
  threshold: 0.25,
  ignoreLocation: true,
}

export function ComponentList<C extends Component>({
  components,
  selectedKinds,
  selectedState,
  setUrl,
  searchQuery,
}: {
  components: C[] | null | undefined
  selectedKinds: any
  selectedState?: ComponentState | null
  setUrl: (component: C) => string | undefined
  searchQuery?: string
}) {
  const theme = useTheme()
  const filteredComponents = useMemo(() => {
    const filtered = components
      ?.filter((comp) => selectedKinds.has(comp?.kind))
      .filter(
        (comp) =>
          !selectedState ||
          (!comp?.state && selectedState === ComponentState.Running) ||
          selectedState === comp?.state
      )

    if (!filtered?.length) return []

    if (!searchQuery) return filtered.sort(compareComponents)

    const fuse = new Fuse(filtered, searchOptions)
    return fuse
      .search(searchQuery)
      .map(({ item }) => item)
      .sort(compareComponents)
  }, [components, selectedKinds, selectedState, searchQuery])

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
