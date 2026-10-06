import {
  EmptyState,
  Flex,
  Input,
  SearchIcon,
  Spinner,
} from '@pluralsh/design-system'
import { getIssueWebhookProviderIcon } from 'components/settings/webhooks/webhookIcons'
import { IssueStatusIcon } from 'components/workbenches/common/IssueStatusChip'
import {
  LoadMoreSentinel,
  useBoardLoadMore,
} from 'components/workbenches/common/WorkbenchBoard'
import {
  DetailsCollapseButton,
  DetailsColumnSC,
  DetailsExpandButton,
  DetailsGutterStatus,
  DetailsLayoutSC,
  DetailsListAgeSC,
  DetailsListItem,
  DetailsListItemsSC,
  DetailsListSC,
  DetailsListSearchSC,
  DetailsPanelHeader,
  DetailsStatusGutter,
} from 'components/workbenches/common/WorkbenchDetailsView'
import { WorkbenchIssueCard } from 'components/workbenches/common/WorkbenchIssueCard'
import { WorkbenchIssueFragment, WorkbenchJobStatus } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { cloneElement, useState } from 'react'
import styled from 'styled-components'
import { formatShortAge } from 'utils/datetime'
import { isJobRunning } from './job/WorkbenchJobActivity'
import { WorkbenchJobConclusionPanel } from './WorkbenchJobConclusionPanel'

export function WorkbenchIssuesDetails({
  issues,
  loading,
  hasNextPage,
  fetchNextPage,
  searchString,
  onSearchChange,
  fallbackWorkbenchId,
}: {
  issues: WorkbenchIssueFragment[]
  loading: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  searchString: string
  onSearchChange: (value: string) => void
  fallbackWorkbenchId: string
}) {
  const [selectedId, setSelectedId] = useState<string>()
  const [detailsOpen, setDetailsOpen] = useState(true)
  const loadMore = useBoardLoadMore({ loading, hasNextPage, fetchNextPage })
  const selected = issues.find(({ id }) => id === selectedId) ?? issues[0]
  const selectedJobId = selected?.workbenchJob?.id
  const workbenchId = selected?.workbench?.id ?? fallbackWorkbenchId

  if (isEmpty(issues) && !searchString) {
    return loading ? (
      <CenteredSC>
        <Spinner />
      </CenteredSC>
    ) : (
      <EmptyState message="No issues found." />
    )
  }

  return (
    <DetailsLayoutSC $panelCount={detailsOpen ? 2 : 1}>
      <DetailsListSC>
        <DetailsListSearchSC>
          <Input
            size="small"
            showClearButton
            startIcon={<SearchIcon />}
            placeholder="Search issues"
            value={searchString}
            onChange={(e) => onSearchChange(e.currentTarget.value)}
          />
        </DetailsListSearchSC>
        <DetailsListItemsSC>
          {isEmpty(issues) ? (
            loading ? (
              <CenteredSC css={{ padding: 16 }}>
                <Spinner />
              </CenteredSC>
            ) : (
              <EmptyState message="No matching issues found." />
            )
          ) : (
            issues.map((issue) => (
              <DetailsListItem
                key={issue.id}
                selected={issue.id === selected?.id}
                onSelect={() => setSelectedId(issue.id)}
                gutter={
                  <DetailsStatusGutter status={getIssueGutterStatus(issue)} />
                }
                title={
                  <IssueTitleSC>
                    <ProviderIconSC>
                      {cloneElement(
                        getIssueWebhookProviderIcon(issue.provider),
                        { size: 12, fullColor: false }
                      )}
                    </ProviderIconSC>
                    <span>{issue.title}</span>
                  </IssueTitleSC>
                }
                end={
                  <>
                    <IssueStatusIcon status={issue.status} />
                    <DetailsListAgeSC>
                      {formatShortAge(issue.insertedAt)}
                    </DetailsListAgeSC>
                  </>
                }
              />
            ))
          )}
          {hasNextPage && <LoadMoreSentinel onVisible={loadMore} />}
        </DetailsListItemsSC>
      </DetailsListSC>
      {selected &&
        (selectedJobId ? (
          <WorkbenchJobConclusionPanel
            key={`conclusion-${selected.id}`}
            jobId={selectedJobId}
            workbenchId={workbenchId}
            headerActions={
              !detailsOpen && (
                <DetailsExpandButton
                  label="Show issue details"
                  onClick={() => setDetailsOpen(true)}
                />
              )
            }
          />
        ) : (
          <DetailsColumnSC key={`conclusion-${selected.id}`}>
            <DetailsPanelHeader title="Conclusion">
              {!detailsOpen && (
                <DetailsExpandButton
                  label="Show issue details"
                  onClick={() => setDetailsOpen(true)}
                />
              )}
            </DetailsPanelHeader>
            <EmptyState message="No job has been run for this issue yet." />
          </DetailsColumnSC>
        ))}
      {selected && detailsOpen && (
        <DetailsColumnSC key={`details-${selected.id}`}>
          <DetailsPanelHeader title="Issues">
            <DetailsCollapseButton
              label="Hide issue details"
              onClick={() => setDetailsOpen(false)}
            />
          </DetailsPanelHeader>
          <IssueBodySC>
            <WorkbenchIssueCard issue={selected} />
          </IssueBodySC>
        </DetailsColumnSC>
      )}
    </DetailsLayoutSC>
  )
}

function getIssueGutterStatus({
  workbenchJob,
}: WorkbenchIssueFragment): DetailsGutterStatus {
  if (workbenchJob?.status === WorkbenchJobStatus.Failed) return 'failed'
  if (isJobRunning(workbenchJob?.status)) return 'running'
  return null
}

const IssueTitleSC = styled.span(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  minWidth: 0,
  '& > span': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
}))

// fixed 12px frame, so the icon never shrinks next to a truncated title
const ProviderIconSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 12,
  height: 12,
})

// The issue card spans the full panel width, as in Figma.
const IssueBodySC = styled.div({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
})

const CenteredSC = styled(Flex)({
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
})
