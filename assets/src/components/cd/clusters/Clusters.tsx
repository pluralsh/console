import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  Breadcrumb,
  GearTrainIcon,
  IconFrame,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ComponentProps, useMemo } from 'react'
import { isEmpty } from 'lodash'
import { Row } from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import chroma from 'chroma-js'

import { ClustersRowFragment, useClustersQuery } from 'generated/graphql'

import { Edge } from 'utils/graphql'
import {
  CD_REL_PATH,
  CLUSTERS_REL_PATH,
  GLOBAL_SETTINGS_ABS_PATH,
  getClusterDetailsPath,
} from 'routes/cdRoutesConsts'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import {
  POLL_INTERVAL,
  useSetCDHeaderContent,
  useSetCDScrollable,
} from '../ContinuousDeployment'
import { useCDEnabled } from '../utils/useCDEnabled'
import { DEMO_CLUSTERS } from '../utils/demoData'

import CreateCluster from './create/CreateCluster'
import { DemoTable } from './ClustersDemoTable'
import { ClustersGettingStarted } from './ClustersGettingStarted'
import { columns } from './ClustersColumns'

export const CD_CLUSTERS_BASE_CRUMBS: Breadcrumb[] = [
  { label: 'cd', url: '/cd' },
  { label: 'clusters', url: `${CD_REL_PATH}/${CLUSTERS_REL_PATH}` },
]

type TableWrapperSCProps = {
  $blurred: boolean
}
export const TableWrapperSC = styled(FullHeightTableWrap)<TableWrapperSCProps>(
  ({ theme, $blurred }) => ({
    '&&': {
      ...($blurred
        ? {
            position: 'relative',
            height: 'fit-content',
            // maxHeight: 300,
            pointerEvents: 'none',
            '&:before': {
              content: '""',
              position: 'absolute',
              top: -5,
              left: -5,
              right: -5,
              bottom: -5,
              zIndex: 10,
              background: `linear-gradient(180deg, ${chroma(
                theme.colors['fill-zero']
              ).alpha(0.1)} 0%, ${theme.colors['fill-zero']} 100%)`,
              backdropFilter: `blur(1px)`,
            },
          }
        : {}),
    },
  })
)

export default function Clusters() {
  const theme = useTheme()
  const navigate = useNavigate()
  const cdIsEnabled = useCDEnabled()
  const { data, refetch } = useClustersQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const headerActions = useMemo(
    () =>
      cdIsEnabled ? (
        <div
          css={{
            display: 'flex',
            justifyContent: 'end',
            gap: theme.spacing.large,
          }}
        >
          <IconFrame
            type="secondary"
            size="large"
            tooltip="Global settings"
            clickable
            icon={<GearTrainIcon />}
            onClick={() => navigate(GLOBAL_SETTINGS_ABS_PATH)}
          />
          <CreateCluster />
        </div>
      ) : null,
    [cdIsEnabled, navigate, theme.spacing.large]
  )

  useSetCDHeaderContent(headerActions)
  useSetBreadcrumbs(CD_CLUSTERS_BASE_CRUMBS)

  const clusterEdges = data?.clusters?.edges
  const isDemo = isEmpty(clusterEdges) || !cdIsEnabled
  const tableData = isDemo ? DEMO_CLUSTERS : clusterEdges
  const showGettingStarted = isDemo || (clusterEdges?.length ?? 0) < 2

  useSetCDScrollable(showGettingStarted || isDemo)

  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <>
      {!isDemo ? (
        <FullHeightTableWrap>
          <ClustersTable
            data={tableData || []}
            refetch={refetch}
          />
        </FullHeightTableWrap>
      ) : (
        <DemoTable mode={cdIsEnabled ? 'empty' : 'disabled'} />
      )}
      {showGettingStarted && <ClustersGettingStarted />}
    </>
  )
}
export const CLUSTERS_REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export function ClustersTable({
  refetch,
  data,
}: {
  refetch?: () => void
  data: any[]
}) {
  const navigate = useNavigate()
  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(() => ({ meta: { refetch } }), [refetch])

  return (
    <Table
      loose
      virtualizeRows
      reactVirtualOptions={CLUSTERS_REACT_VIRTUAL_OPTIONS}
      data={data || []}
      columns={columns}
      reactTableOptions={reactTableOptions}
      css={{
        maxHeight: 'unset',
        height: '100%',
      }}
      onRowClick={(_e, { original }: Row<Edge<ClustersRowFragment>>) =>
        navigate(
          getClusterDetailsPath({
            clusterId: original.node?.id,
          })
        )
      }
    />
  )
}
