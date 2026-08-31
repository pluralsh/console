import { useMemo } from 'react'

import { Breadcrumbs as BreadcrumbsComponent } from '@pluralsh/design-system'
import { useRouter } from 'next/router'

import { useNavMenu } from '../contexts/NavDataContext'
import { getBarePathFromPath, removeTrailingSlashes } from '../utils/text'

import type { NavItem } from '../NavData'

function findCrumbs(path, sections: NavItem[]) {
  path = removeTrailingSlashes(path)

  for (const { title: label, href: url, sections: sects } of sections) {
    if (removeTrailingSlashes(url) === path) {
      return [{ label, url }]
    }
    const tailCrumbs = findCrumbs(path, sects || [])

    if (tailCrumbs.length > 0) {
      return [{ label, url }, ...tailCrumbs]
    }
  }

  return []
}

export default function Breadcrumbs() {
  const { asPath } = useRouter()

  const path = getBarePathFromPath(asPath)
  const navData = useNavMenu()

  const crumbs = useMemo(
    () => [{ label: 'Docs', url: '/' }, ...findCrumbs(path, navData)],
    [navData, path]
  )

  if (crumbs.length <= 1) {
    return null
  }

  return <BreadcrumbsComponent breadcrumbs={crumbs ?? []} />
}
