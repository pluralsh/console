import {
  ClusterIcon,
  Flex,
  FlowIcon,
  IconFrame,
  ReturnIcon,
  Table,
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
import { getVulnerabilityReportsPath } from 'routes/securityRoutesConsts'
import styled, { useTheme } from 'styled-components'
import {
  ColFixedVersion,
  ColID,
  ColInstalledVersion,
  ColPackage,
  ColSeverity,
  VulnerabilityExpansionPanel,
} from './VulnReportDetailsTableCols'

export function VulnerabilityReportDetails() {
  const theme = useTheme()
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

  if (error) return <GqlError error={error} />

  return (
    <WrapperSC>
      <HeaderWrapperSC>
        <IconFrame
          as={Link}
          size="large"
          clickable
          type="secondary"
          to={getVulnerabilityReportsPath({ clusterId, flowId })}
          icon={<ReturnIcon css={{ width: 16 }} />}
        />
        <Flex
          gap="xsmall"
          align="center"
        >
          <IconFrame
            size="large"
            type="floating"
            icon={
              flowData ? (
                <FlowIcon color="icon-light" />
              ) : (
                <ClusterIcon color="icon-light" />
              )
            }
          />
          <StackedText
            loading={loading && !data}
            first={data?.vulnerabilityReport?.artifactUrl}
            firstPartialType="body2Bold"
            second={
              flowData
                ? `flow: ${flowData.flow?.name ?? ''}`
                : `cluster: ${cluster?.name} (${cluster?.handle})`
            }
          />
        </Flex>
      </HeaderWrapperSC>
      <Table
        fullHeightWrap
        virtualizeRows
        fillLevel={1}
        rowBg="base"
        data={data?.vulnerabilityReport?.vulnerabilities ?? []}
        columns={columns}
        loading={loading && !data}
        getRowCanExpand={() => true}
        renderExpanded={VulnerabilityExpansionPanel}
        onRowClick={(_, row) => row.getToggleExpandedHandler()()}
        emptyStateProps={{ message: 'No vulnerabilities found.' }}
        css={{
          // hacky, for targeting the expander row. should build this into table
          'tr:has(td[colspan]) td': { background: theme.colors['fill-two'] },
        }}
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

const HeaderWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  width: '100%',
}))
