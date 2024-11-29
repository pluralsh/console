import { Accordion } from '@pluralsh/design-system'
import { Dispatch, SetStateAction } from 'react'
import { CatalogsFiltersGroup } from './CatalogsFiltersGroup.tsx'

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
  return (
    <Accordion
      type="multiple"
      width={220}
    >
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
  )
}
