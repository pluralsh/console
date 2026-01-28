import {
  IconFrame,
  ReturnIcon,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ColExpander } from 'components/cd/cluster/pod/PodContainers'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'

import {
  useClusterQuery,
  useFlowQuery,
  useVulnerabilityReportQuery,
} from 'generated/graphql'
import { Link, useParams } from 'react-router-dom'
import {
  getVulnerabilityReportsPath,
  VULNERABILITY_REPORTS_REL_PATH,
} from 'routes/securityRoutesConsts'
import styled from 'styled-components'
import { VulnDetailExpanded } from './VulnDetailExpanded'
import {
  ColFixedVersion,
  ColID,
  ColInstalledVersion,
  ColPackage,
  ColSeverity,
} from './VulnReportDetailsTableCols'
import { getFlowBreadcrumbs } from 'components/flows/flow/Flow'
import { securityVulnReportsCrumbs } from './VulnReports'
import { useMemo } from 'react'
import { FixVulnFormSC } from './FixVulnerabilityButton'

export function VulnerabilityReportDetails() {
  const { vulnerabilityReportId, clusterId, flowId } = useParams()

  const { data: clusterData, loading: clusterLoading } = useClusterQuery({
    variables: { id: clusterId ?? '' },
    skip: !clusterId,
  })
  const { data: flowData, loading: flowLoading } = useFlowQuery({
    variables: { id: flowId ?? '' },
    skip: !flowId,
  })

  const cluster = clusterData?.cluster

  const {
    data,
    loading: reportLoading,
    error,
  } = useVulnerabilityReportQuery({
    variables: { id: vulnerabilityReportId ?? '' },
    skip: !vulnerabilityReportId,
    fetchPolicy: 'cache-and-network',
  })

  const loading = clusterLoading || flowLoading || reportLoading

  useSetBreadcrumbs(
    useMemo(
      () =>
        flowId
          ? getFlowBreadcrumbs(
              flowId,
              flowData?.flow?.name ?? '',
              VULNERABILITY_REPORTS_REL_PATH
            )
          : securityVulnReportsCrumbs,
      [flowId, flowData?.flow?.name]
    )
  )

  if (error) return <GqlError error={error} />

  return (
    <WrapperSC>
      <StackedText
        loading={loading && !data}
        first={data?.vulnerabilityReport?.artifactUrl}
        firstPartialType="body2Bold"
        second={
          flowData
            ? `flow: ${flowData.flow?.name ?? ''}`
            : `cluster: ${cluster?.name} (${cluster?.handle})`
        }
        icon={
          <IconFrame
            as={Link}
            size="large"
            clickable
            type="secondary"
            to={getVulnerabilityReportsPath({ clusterId, flowId })}
            tooltip={`Return to ${flowId ? 'flow' : 'security'}`}
            icon={<ReturnIcon />}
            style={{ flexShrink: 0 }}
          />
        }
      />
      <Table
        fullHeightWrap
        virtualizeRows
        data={data?.vulnerabilityReport?.vulnerabilities ?? []}
        columns={columns}
        loading={loading && !data}
        getRowCanExpand={() => true}
        renderExpanded={({ row }) => <VulnDetailExpanded row={row} />}
        onRowClick={(_, row) => row.getToggleExpandedHandler()()}
        emptyStateProps={{ message: 'No vulnerabilities found.' }}
        expandedBgColor="fill-zero"
        expandedRowType="custom"
        // should probably find a better DS solution for this
        {...{ [`td:has(${FixVulnFormSC})`]: { overflow: 'visible' } }}
      />
    </WrapperSC>
  )
}

const columns = [
  ColExpander,
  ColID,
  ColPackage,
  ColInstalledVersion,
  ColFixedVersion,
  ColSeverity,
]

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  height: '100%',
  width: '100%',
  maxWidth: 1280,
  margin: 'auto',
  overflow: 'hidden',
  padding: `${theme.spacing.large}px ${theme.spacing.xxlarge}px`,
}))
