import { Key, useMemo, useRef, useState } from 'react'
import { SubTab, TabList, useSetBreadcrumbs } from '@pluralsh/design-system'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { ScrollablePage } from '../../utils/layout/ScrollablePage'
import { BREADCRUMBS } from '../Account'

const DIRECTORY = [
  { path: 'table', label: 'Table view' },
  { path: 'graph', label: 'Graph view' },
]

export default function Audits() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const tabStateRef = useRef<any>(null)
  const currentView =
    DIRECTORY.find((tab) => pathname?.startsWith(`/audits/${tab.path}`))
      ?.path || DIRECTORY[0].path
  const [view, setView] = useState<Key>(currentView)

  useSetBreadcrumbs(
    useMemo(
      () => [...BREADCRUMBS, { label: 'audits', url: '/account/audits' }],
      []
    )
  )

  return (
    <ScrollablePage
      scrollable={false}
      heading="Audits"
      headingContent={
        <TabList
          gap="xxsmall"
          margin={1}
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'horizontal',
            // @ts-ignore
            selectedKey: view,
            onSelectionChange: (view) => {
              setView(view)
              navigate(view as string)
            },
          }}
        >
          {DIRECTORY.map(({ path, label }) => (
            <SubTab
              key={path}
              textValue={label}
            >
              {label}
            </SubTab>
          ))}
        </TabList>
      }
    >
      <Outlet />
    </ScrollablePage>
  )
}
