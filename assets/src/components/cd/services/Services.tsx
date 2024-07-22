import {
  ComponentProps,
  Dispatch,
  SetStateAction,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ListIcon,
  NetworkInterfaceIcon,
  SubTab,
  TabList,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import {
  CD_ABS_PATH,
  CD_REL_PATH,
  SERVICES_REL_PATH,
} from 'routes/cdRoutesConsts'

import { Outlet, useMatch } from 'react-router-dom'

import {
  CD_BASE_CRUMBS,
  useSetPageHeaderContent,
} from '../ContinuousDeployment'

import { LinkTabWrap } from '../../utils/Tabs'

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

export type ServicesContextT = {
  setRefetch?: Dispatch<SetStateAction<() => () => void>>
  clusterId?: string
}

const directory = [
  { path: '', label: 'Table', icon: <ListIcon /> },
  { path: 'tree', label: 'Tree', icon: <NetworkInterfaceIcon /> },
]

export default function Services() {
  const theme = useTheme()
  const pathMatch = useMatch(`${CD_ABS_PATH}/${SERVICES_REL_PATH}/:tab`)
  const tab = pathMatch?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path === tab)
  const tabStateRef = useRef<any>(null)
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
              selectedKey: currentTab?.path,
            }}
          >
            {directory.map(({ path, label, icon }) => (
              <LinkTabWrap
                subTab
                key={path}
                textValue={label}
                to={`/${CD_REL_PATH}/${SERVICES_REL_PATH}/${path}`}
              >
                <SubTab
                  key={path}
                  textValue={label}
                  css={{
                    alignItems: 'center',
                    display: 'flex',
                    gap: theme.spacing.small,
                  }}
                >
                  {icon} {label}
                </SubTab>
              </LinkTabWrap>
            ))}
          </TabList>
          <DeployService refetch={refetch} />
        </div>
      ),
      [currentTab?.path, refetch, theme.spacing.small]
    )
  )

  return <Outlet context={{ setRefetch } as ServicesContextT} />
}
