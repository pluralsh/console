import { ComponentProps, ReactElement, useMemo, useRef, useState } from 'react'
import {
  ListIcon,
  NetworkInterfaceIcon,
  SubTab,
  TabList,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { CD_REL_PATH, SERVICES_REL_PATH } from 'routes/cdRoutesConsts'

import {
  CD_BASE_CRUMBS,
  useSetPageHeaderContent,
} from '../ContinuousDeployment'

import {
  ColActions,
  ColCluster,
  ColErrors,
  ColLastActivity,
  ColRef,
  ColRepo,
  ColServiceDeployment,
  ColStatus,
} from './ServicesColumns'
import { DeployService } from './deployModal/DeployService'
import { ServicesTable } from './ServicesTable'

export const columns = [
  ColServiceDeployment,
  ColCluster,
  ColRepo,
  ColRef,
  ColLastActivity,
  ColStatus,
  ColErrors,
  ColActions,
]

export const SERVICES_REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export const SERVICES_QUERY_PAGE_SIZE = 100

enum View {
  Table = 'table',
  Tree = 'tree',
}

const viewIcons = {
  [View.Table]: <ListIcon />,
  [View.Tree]: <NetworkInterfaceIcon />,
} as const satisfies Record<View, ReactElement>

export default function Services() {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const [view, setView] = useState(View.Table)
  const [refetch, setRefetch] = useState(() => () => {})

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...CD_BASE_CRUMBS,
        {
          label: 'services',
          url: `/${CD_REL_PATH}/${SERVICES_REL_PATH}`,
        },
      ],
      []
    )
  )

  useSetPageHeaderContent(
    useMemo(
      () => (
        <div
          css={{
            display: 'flex',
            justifyContent: 'end',
            gap: theme.spacing.small,
          }}
        >
          <TabList
            gap="xxsmall"
            margin={1}
            stateRef={tabStateRef}
            stateProps={{
              orientation: 'horizontal',
              selectedKey: view,
              onSelectionChange: (view) => setView(view as View),
            }}
          >
            {Object.entries(View).map(([k, v]) => (
              <SubTab
                key={v}
                textValue={k}
                css={{
                  alignItems: 'center',
                  display: 'flex',
                  gap: theme.spacing.small,
                }}
              >
                {viewIcons[v]} {k}
              </SubTab>
            ))}
          </TabList>
          <DeployService refetch={refetch} />
        </div>
      ),
      [refetch, theme.spacing.small, view]
    )
  )

  return useMemo(() => {
    switch (view) {
      case View.Tree:
        return <div>tree</div>
      default:
        return <ServicesTable setRefetch={setRefetch} />
    }
  }, [view])
}
