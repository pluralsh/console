import type { ReactElement } from 'react'

import { type DocSection, docsStructure } from './routing/docs-structure'

export type NavItem = {
  title?: string
  href?: string
  toMenu?: MenuId
  icon?: ReactElement
  sections?: NavItem[]
}
export type NavMenu = NavItem[]
export type NavMenuId = 'docs'
export type MenuId = NavMenuId | 'plural'
export type NavData = Record<NavMenuId, NavMenu>

export function findNavItem(
  test: (arg: NavItem) => boolean,
  section: NavMenu
): NavItem | null {
  for (const item of section) {
    if (test(item)) {
      return item
    }

    const search = findNavItem(test, item.sections || [])

    if (search) {
      return search
    }
  }

  return null
}

export const getNavData = (): NavData => ({
  docs: docsStructureToNavMenu,
})

const docsStructureToNavMenu: NavMenu = docsStructure.map((section) =>
  docSectionToNavItem(section)
)

// these data structures are slightly different so need to convert, but docsStructure is the single source of truth
function docSectionToNavItem(section: DocSection, parentPath = ''): NavItem {
  const path = `${parentPath}/${section.path}`

  const sections = section.sections?.map((subSection) =>
    docSectionToNavItem(subSection, path)
  )

  return { title: section.title, href: path, sections }
}
