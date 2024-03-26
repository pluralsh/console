import { ReactElement, useRef } from 'react'
import { Link, useMatch, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { SubTab, TabList, Table } from '@pluralsh/design-system'

import { createColumnHelper } from '@tanstack/react-table'

import { KubernetesClient } from '../../../helpers/kubernetes.client'
import {
  PodQueryVariables,
  Pod_PodDetail as PodT,
  usePodQuery,
} from '../../../generated/graphql-kubernetes'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { SubTitle } from '../../cluster/nodes/SubTitle'
import { Metadata } from '../utils'

import { ResponsiveLayoutSidecarContainer } from '../../utils/layout/ResponsiveLayoutSidecarContainer'

import { ResponsiveLayoutPage } from '../../utils/layout/ResponsiveLayoutPage'

import { ResponsiveLayoutSpacer } from '../../utils/layout/ResponsiveLayoutSpacer'

import { LinkTabWrap } from '../../utils/Tabs'

import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { ClusterTinyFragment } from '../../../generated/graphql'
import { InlineLink } from '../../utils/typography/InlineLink'

import { ScrollablePage } from '../../utils/layout/ScrollablePage'

import { ResponsiveLayoutContentContainer } from '../../utils/layout/ResponsiveLayoutContentContainer'

import { ResponsiveLayoutHeader } from '../../utils/layout/ResponsiveLayoutHeader'

import { ResponsivePageFullWidth } from '../../utils/layout/ResponsivePageFullWidth'

import Containers from '../common/Containers'

import PodSidecar from './PodSidecar'

const directory = [
  { path: '', label: 'Info' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

const columnHelper = createColumnHelper<any>()

const colNode = columnHelper.accessor((pod) => pod, {
  id: 'mock',
  header: 'Mock',
  cell: ({ getValue, table }) => <div />,
})

export default function Pod(): ReactElement {
  const theme = useTheme()
  const { clusterId, name, namespace } = useParams()
  const { data, loading } = usePodQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
    } as PodQueryVariables,
  })

  const pod = data?.handleGetPodDetail as PodT
  const containers = pod?.containers
  const conditions = pod?.conditions

  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`:tab/*`)
  const tab = pathMatch?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path === tab)

  if (loading) {
    return <LoadingIndicator />
  }

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutPage
        css={{
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          paddingBottom: theme.spacing.large,

          '> div': {
            paddingLeft: 0,
            paddingTop: 0,
          },
        }}
      >
        <ResponsiveLayoutHeader
          css={{
            paddingRight: theme.spacing.xlarge,
            overflow: 'hidden',
          }}
        >
          <div
            css={{
              height: '100%',
              width: '100%',
              maxWidth: theme.breakpoints.desktopLarge,
              marginRight: 'auto',
              marginLeft: 'auto',
            }}
          >
            <TabList
              scrollable
              gap="xxsmall"
              stateRef={tabStateRef}
              stateProps={{
                orientation: 'horizontal',
                selectedKey: currentTab?.path,
              }}
              marginRight="medium"
              paddingBottom="xxsmall"
            >
              {directory.map(({ label, path }) => (
                <LinkTabWrap
                  subTab
                  key={path}
                  textValue={label}
                  to=""
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
          </div>
        </ResponsiveLayoutHeader>
        <ResponsivePageFullWidth
          noPadding
          maxContentWidth={theme.breakpoints.desktopLarge}
        >
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              gap: theme.spacing.large,
            }}
          >
            <section>
              <SubTitle>Containers</SubTitle>
              <Containers containers={containers} />
            </section>
            <section>
              <SubTitle>Conditions</SubTitle>
              <Table
                data={[]}
                columns={[colNode]}
                virtualizeRows
                css={{
                  maxHeight: 'unset',
                  height: '100%',
                }}
              />
            </section>
            <section>
              <SubTitle>Metadata</SubTitle>
              <Metadata objectMeta={pod?.objectMeta} />
            </section>
          </div>
        </ResponsivePageFullWidth>
      </ResponsiveLayoutPage>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutSidecarContainer>
        <PodSidecar pod={pod} />
      </ResponsiveLayoutSidecarContainer>
    </ResponsiveLayoutPage>
  )
}
