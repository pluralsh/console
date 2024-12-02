import { Accordion } from '@pluralsh/design-system'
import { Dispatch, SetStateAction } from 'react'
import { CatalogsFiltersGroup } from './CatalogsFiltersGroup.tsx'
import { useTheme } from 'styled-components'

export type CatalogsFilter = {
  key: string
  items: number
}

export function CatalogsFilters({
  authors,
  authorFilters,
  setAuthorFilters,
  categories,
  categoryFilters,
  setCategoryFilters,
}: {
  authors: CatalogsFilter[]
  authorFilters: string[]
  setAuthorFilters: Dispatch<SetStateAction<string[]>>
  categories: CatalogsFilter[]
  categoryFilters: string[]
  setCategoryFilters: Dispatch<SetStateAction<string[]>>
}) {
  const theme = useTheme()

  return (
    <div
      css={{
        marginLeft: theme.spacing.large,
        overflowY: 'auto',
        paddingRight: theme.spacing.xxsmall, // Additional space between scrollbar and card.
        width: 220,
      }}
    >
      <Accordion type="multiple">
        <CatalogsFiltersGroup
          label="Authors"
          filters={authors}
          activeFilters={authorFilters}
          setActiveFilters={setAuthorFilters}
        />
        <CatalogsFiltersGroup
          label="Categories"
          last
          filters={categories}
          activeFilters={categoryFilters}
          setActiveFilters={setCategoryFilters}
        />
      </Accordion>
    </div>
  )
}
