import {
  CatalogFragment,
  CatalogSearchItem,
  PrAutomationSearchItem,
} from 'generated/graphql'
import Fuse from 'fuse.js'
import { isEmpty } from 'lodash'

export const SELF_SERVICE_SEARCH_PLACEHOLDER =
  'Ask anything across service catalog and PR automations. Try "I want to create clusters."'

export const catalogFuseSearchOptions = {
  keys: ['name', 'description', 'category'],
  threshold: 0.25,
}

export type SearchDropdownItem = {
  id: string
  name: string
  description?: Nullable<string>
  icon?: Nullable<string>
  darkIcon?: Nullable<string>
}

export function hasSearchValue<T>(value: Nullable<T> | undefined): value is T {
  return !!value
}

export function fuseSearch<T>(
  items: T[],
  query: string,
  options: Fuse.IFuseOptions<T>
) {
  if (!query || isEmpty(items)) return []

  return new Fuse(items, options).search(query).map(({ item }) => item)
}

export function catalogSearchItemToDropdownItem(
  item: CatalogSearchItem,
  catalogsById: Record<string, CatalogFragment>
): SearchDropdownItem {
  const catalog = catalogsById[item.id]

  return {
    id: item.id,
    name: item.name,
    description: catalog?.description ?? item.documentation,
    icon: catalog?.icon ?? item.icon,
    darkIcon: catalog?.darkIcon ?? item.darkIcon,
  }
}

export function prSearchItemToDropdownItem(
  item: PrAutomationSearchItem
): SearchDropdownItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    icon: item.icon,
    darkIcon: item.darkIcon,
  }
}
