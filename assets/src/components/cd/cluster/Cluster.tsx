import {
  ClusterIcon,
  ListBoxItem,
  Select,
  SubTab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import {
  ReactNode,
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { Outlet, useMatch, useParams } from 'react-router-dom'
import { LinkTabWrap } from 'components/utils/Tabs'
import { CLUSTER_BASE_PATH } from 'routes/cdRoutes'
import { isEmpty } from 'lodash'
import { useTheme } from 'styled-components'

import {
  useClusterQuery,
  useClustersTinyQuery,
} from '../../../generated/graphql'

import ClusterPermissions from './ClusterPermissions'
import ClusterMetadata from './ClusterMetadata'

const ClusterContext = createContext<
  { setHeaderContent: (content: ReactNode) => void } | undefined
>(undefined)

export const useSetClusterHeaderContent = (headerContent?: ReactNode) => {
  const ctx = useContext(ClusterContext)

  if (!ctx) {
    console.warn(
      'useSetClusterHeaderContent() must be used within a ClusterContext'
    )
  }
  const { setHeaderContent } = ctx || {}

  useLayoutEffect(() => {
    setHeaderContent?.(headerContent)

    return () => {
      setHeaderContent?.(null)
    }
  }, [setHeaderContent, headerContent])
}

const directory = [
  { path: 'services', label: 'Services' },
  { path: 'nodes', label: 'Nodes' },
  { path: 'pods', label: 'Pods' },
] as const

const POLL_INTERVAL = 10 * 1000

export default function Cluster() {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const tab = useMatch(`/${CLUSTER_BASE_PATH}/:tab`)?.params?.tab || ''
  const path = `/${CLUSTER_BASE_PATH}/${tab}`
  const { clusterId }: { clusterId?: string } = useParams()
  const [clusterSelectIsOpen, setClusterSelectIsOpen] = useState(false)
  const [selectedClusterId, setSelectedClusterId] = useState(clusterId)
  const currentTab = directory.find(({ path }) => path === tab)
  const crumbs = useMemo(
    () => (path ? [{ label: tab, path }] : []),
    [path, tab]
  )

  useSetBreadcrumbs(crumbs)

  const { data: clustersData } = useClustersTinyQuery()
  const clusterEdges = clustersData?.clusters?.edges

  const { data } = useClusterQuery({
    variables: { id: clusterId || '' },
    pollInterval: POLL_INTERVAL,
  })

  return (
    <ResponsivePageFullWidth
      scrollable={false}
      headingContent={
        <>
          {clusterEdges && !isEmpty(clusterEdges) && (
            <div css={{ width: 360 }}>
              <Select
                isOpen={clusterSelectIsOpen}
                onOpenChange={setClusterSelectIsOpen}
                label="Cluster"
                titleContent={
                  <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
                    <ClusterIcon />
                    Cluster
                  </div>
                }
                selectedKey={selectedClusterId}
                onSelectionChange={(key) => setSelectedClusterId(key as any)}
              >
                {clusterEdges.map((edge) => (
                  <ListBoxItem
                    key={edge?.node?.id}
                    label={edge?.node?.name}
                    textValue={edge?.node?.name}
                  />
                ))}
              </Select>
            </div>
          )}
          <TabList
            gap="xxsmall"
            stateRef={tabStateRef}
            stateProps={{
              orientation: 'horizontal',
              selectedKey: currentTab?.path,
            }}
          >
            {directory.map(({ label, path }) => (
              <LinkTabWrap
                subTab
                key={path}
                textValue={label}
                to={`/${CLUSTER_BASE_PATH}/${path}`.replace(
                  ':clusterId',
                  clusterId ?? ''
                )}
              >
                <SubTab
                  key={path}
                  textValue={label}
                >
                  {label}
                </SubTab>
              </LinkTabWrap>
            ))}
          </TabList>
          <div
            css={{
              justifyContent: 'end',
              display: 'flex',
              flexGrow: 1,
              gap: theme.spacing.large,
            }}
          >
            <ClusterPermissions />
            <ClusterMetadata cluster={data?.cluster} />
          </div>
        </>
      }
    >
      <TabPanel
        css={{ height: '100%' }}
        stateRef={tabStateRef}
      >
        <Outlet />
      </TabPanel>
    </ResponsivePageFullWidth>
  )
}
