import {
  ClusterIcon,
  Flex,
  IconFrame,
  ReturnIcon,
  Table,
} from '@pluralsh/design-system'
import { ColExpander } from 'components/cd/cluster/pod/PodContainers'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { DEFAULT_REACT_VIRTUAL_OPTIONS } from 'components/utils/table/useFetchPaginatedData'
import { useClusterQuery, useVulnerabilityReportQuery } from 'generated/graphql'
import { useNavigate, useParams } from 'react-router-dom'
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
  const navigate = useNavigate()
  const { vulnerabilityReportId = '', clusterId = '' } = useParams()

  const { data: clusterData } = useClusterQuery({
    variables: { id: clusterId },
  })
  const cluster = clusterData?.cluster

  const { data, loading, error } = useVulnerabilityReportQuery({
    variables: { id: vulnerabilityReportId },
    skip: !vulnerabilityReportId,
    fetchPolicy: 'cache-and-network',
  })

  if (error) return <GqlError error={error} />

  return (
    <WrapperSC>
      <HeaderWrapperSC>
        <IconFrame
          size="large"
          clickable
          type="secondary"
          icon={<ReturnIcon css={{ width: 16 }} />}
          onClick={() => navigate(getVulnerabilityReportsPath({ clusterId }))}
        />
        <Flex
          gap="xsmall"
          align="center"
        >
          <IconFrame
            size="large"
            type="floating"
            icon={<ClusterIcon color="icon-light" />}
          />
          <StackedText
            first={cluster?.name}
            firstPartialType="body2Bold"
            second={`handle: ${cluster?.handle}`}
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
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
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
