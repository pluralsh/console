import { AccordionItem, Checkbox } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { Dispatch, SetStateAction } from 'react'
import { produce } from 'immer'
import { CatalogsFilter } from './CatalogsFilters.tsx'

export function CatalogsFiltersGroup({
  label,
  last = false,
  filters,
  activeFilters,
  setActiveFilters,
}: {
  label: string
  last?: boolean
  filters: CatalogsFilter[]
  activeFilters: string[]
  setActiveFilters: Dispatch<SetStateAction<string[]>>
}) {
  const theme = useTheme()

  return (
    <AccordionItem
      trigger={`${label} (${filters.length})`}
      css={{ borderBottom: last ? undefined : theme.borders['fill-two'] }}
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.xxsmall,
        }}
      >
        {filters.map(({ key, items }) => (
          <Checkbox
            small
            checked={activeFilters.includes(key)}
            onChange={() => {
              const i = activeFilters.indexOf(key)

              if (i > -1) {
                setActiveFilters((f) =>
                  produce(f, (draft) => {
                    draft.splice(i, 1)
                  })
                )
              } else {
                setActiveFilters([...activeFilters, key])
              }
            }}
          >
            {key} ({items})
          </Checkbox>
        ))}
      </div>
    </AccordionItem>
  )
}
