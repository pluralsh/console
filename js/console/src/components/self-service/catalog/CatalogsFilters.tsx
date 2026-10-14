import {
  DisplayFilterSection,
  DisplayPanel,
} from 'components/utils/display/DisplayPanel'
import { Dispatch, SetStateAction } from 'react'

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
    <DisplayPanel>
      <CatalogsFilterSection
        title="Authors"
        filters={authors}
        selected={authorFilters}
        onChange={setAuthorFilters}
      />
      <CatalogsFilterSection
        title="Categories"
        filters={categories}
        selected={categoryFilters}
        onChange={setCategoryFilters}
      />
    </DisplayPanel>
  )
}

function CatalogsFilterSection({
  title,
  filters,
  selected,
  onChange,
}: {
  title: string
  filters: CatalogsFilter[]
  selected: string[]
  onChange: (selected: string[]) => void
}) {
  return (
    <DisplayFilterSection
      title={title}
      options={filters.map(({ key }) => key)}
      selected={selected}
      counts={Object.fromEntries(filters.map(({ key, items }) => [key, items]))}
      getLabel={(key) => key}
      onChange={onChange}
    />
  )
}
