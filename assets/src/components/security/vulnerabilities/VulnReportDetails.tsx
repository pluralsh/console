import {
  IconFrame,
  ReturnIcon,
  Table,
  useSetBreadcrumbs,
  Flex,
  Button,
  CopyIcon,
} from '@pluralsh/design-system'
import { ColExpander } from 'components/cd/cluster/pod/PodContainers'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import pluralize from 'pluralize'
import { useClusterQuery, useVulnerabilityReportQuery } from 'generated/graphql'
import { useCurrentFlow } from 'components/flows/hooks/useCurrentFlow'
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
  ColVulnSelect,
} from './VulnReportDetailsTableCols'
import { getFlowBreadcrumbs } from 'components/flows/flow/Flow'
import { securityVulnReportsCrumbs } from './VulnReports'
import { useMemo, useState } from 'react'
import { VulnFixButton } from './VulnFixButton'
import { RowSelectionState } from '@tanstack/react-table'
import ejs from 'ejs'
import vulnBatchPromptTemplate from './vulnerability-batch-prompt.ejs?raw'

export function VulnerabilityReportDetails() {
  const { vulnerabilityReportId, clusterId } = useParams()

  const { flowIdOrName, flowData, loading: flowLoading } = useCurrentFlow()
  const { data: clusterData, loading: clusterLoading } = useClusterQuery({
    variables: { id: clusterId ?? '' },
    skip: !clusterId,
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

  const [bulkSelectMode, setBulkSelectMode] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const vulnerabilities = useMemo(
    () =>
      (data?.vulnerabilityReport?.vulnerabilities ?? []).filter(
        (v): v is NonNullable<typeof v> => !!v
      ),
    [data?.vulnerabilityReport?.vulnerabilities]
  )
  const selectedVulns = useMemo(
    () => vulnerabilities.filter((v) => rowSelection[v.id]),
    [vulnerabilities, rowSelection]
  )
  const batchPrompt = useMemo(
    () =>
      selectedVulns.length > 0
        ? ejs.render(vulnBatchPromptTemplate, {
            vulns: selectedVulns,
            report: data?.vulnerabilityReport,
          })
        : '',
    [selectedVulns, data?.vulnerabilityReport]
  )

  const columns = useMemo(
    () => [
      ...(bulkSelectMode ? [ColVulnSelect] : []),
      ColExpander,
      ColID,
      ColPackage,
      ColInstalledVersion,
      ColFixedVersion,
      ColSeverity,
    ],
    [bulkSelectMode]
  )

  const exitBulkSelectMode = () => {
    setBulkSelectMode(false)
    setRowSelection({})
  }

  useSetBreadcrumbs(
    useMemo(
      () =>
        flowIdOrName
          ? getFlowBreadcrumbs(
              flowData?.flow?.name ?? '',
              VULNERABILITY_REPORTS_REL_PATH
            )
          : securityVulnReportsCrumbs,
      [flowIdOrName, flowData?.flow?.name]
    )
  )

  if (error) return <GqlError error={error} />

  return (
    <WrapperSC>
      <HeaderSC>
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
              to={getVulnerabilityReportsPath({ clusterId, flowIdOrName })}
              tooltip={`Return to ${flowIdOrName ? 'flow' : 'security'}`}
              icon={<ReturnIcon />}
              style={{ flexShrink: 0 }}
            />
          }
          css={{ minWidth: 0, flex: 1 }}
        />
        <Button
          {...(bulkSelectMode
            ? { secondary: true }
            : { floating: true, startIcon: <CopyIcon size={16} /> })}
          onClick={() =>
            bulkSelectMode ? exitBulkSelectMode() : setBulkSelectMode(true)
          }
        >
          {bulkSelectMode ? 'Exit selection' : 'Bulk select'}
        </Button>
      </HeaderSC>
      <TableWrapperSC>
        <Table
          key={bulkSelectMode ? 'bulk-select' : 'default'}
          fullHeightWrap
          virtualizeRows
          data={vulnerabilities}
          columns={columns}
          loading={loading && !data}
          getRowCanExpand={() => true}
          renderExpanded={({ row }) => (
            <VulnDetailExpanded
              row={row}
              parentReport={data?.vulnerabilityReport}
            />
          )}
          onRowClick={(_, row) => row.getToggleExpandedHandler()()}
          emptyStateProps={{ message: 'No vulnerabilities found.' }}
          expandedBgColor="fill-zero"
          expandedRowType="custom"
          reactTableOptions={{
            enableRowSelection: bulkSelectMode,
            enableMultiRowSelection: true,
            onRowSelectionChange: setRowSelection,
            state: { rowSelection },
          }}
        />
        {bulkSelectMode && (
          <BulkSelectionBarSC>
            <SelectionCountSC>{selectedVulns.length} selected</SelectionCountSC>
            <VulnFixButton
              key={selectedVulns.map((v) => v.id).join(',')}
              small
              headerTitle={`Fix ${pluralize('vulnerability', selectedVulns.length)}`}
              initialPrompt={batchPrompt}
              flowId={flowData?.flow?.id}
              disabled={selectedVulns.length === 0}
            >
              Fix {pluralize('vulnerability', selectedVulns.length)}
            </VulnFixButton>
          </BulkSelectionBarSC>
        )}
      </TableWrapperSC>
    </WrapperSC>
  )
}

const HeaderSC = styled(Flex)(({ theme }) => ({
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.medium,
}))

const TableWrapperSC = styled.div(() => ({
  position: 'relative',
  flex: 1,
  overflow: 'hidden',
}))

const BulkSelectionBarSC = styled.div(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing.large,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.large,
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  backgroundColor: theme.colors['fill-three'],
  border: theme.borders['fill-three'],
  borderRadius: 12,
  boxShadow: theme.boxShadows.moderate,
  zIndex: theme.zIndexes.toast,
  whiteSpace: 'nowrap',
}))

const SelectionCountSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors.text,
  paddingRight: theme.spacing.medium,
  borderRight: theme.borders['fill-three'],
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
}))

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
