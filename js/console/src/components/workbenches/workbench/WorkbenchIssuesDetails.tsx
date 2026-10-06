import { EmptyState, Input, SearchIcon } from '@pluralsh/design-system'
import { getIssueWebhookProviderIcon } from 'components/settings/webhooks/webhookIcons'
import { IssueStatusIcon } from 'components/workbenches/common/IssueStatusChip'
import {
  BoardLoadingOrEmpty,
  LoadMoreSentinel,
  useBoardLoadMore,
} from 'components/workbenches/common/WorkbenchBoard'
import {
  DetailsCollapseButton,
  DetailsColumnSC,
  DetailsExpandButton,
  DetailsIconTitleSC,
  DetailsLayoutSC,
  DetailsListAgeSC,
  DetailsListItem,
  DetailsListItemsSC,
  DetailsListSC,
  DetailsListSearchSC,
  DetailsPanelHeader,
  DetailsStatusGutter,
  getJobGutterStatus,
  useDetailsSelection,
} from 'components/workbenches/common/WorkbenchDetailsView'
import { WorkbenchIssueCard } from 'components/workbenches/common/WorkbenchIssueCard'
import { WorkbenchIssueFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { cloneElement } from 'react'
import styled from 'styled-components'
import { formatShortAge } from 'utils/datetime'
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
  const loadMore = useBoardLoadMore({ loading, hasNextPage, fetchNextPage })
  const { selected, setSelectedId, detailsOpen, setDetailsOpen } =
    useDetailsSelection(issues)
  const selectedJob = selected?.workbenchJob
  const workbenchId = selected?.workbench?.id ?? fallbackWorkbenchId
  const expandButton = !detailsOpen && (
    <DetailsExpandButton
      label="Show issue details"
      onClick={() => setDetailsOpen(true)}
    />
  )

  if (isEmpty(issues) && !searchString)
    return (
      <BoardLoadingOrEmpty
        loading={loading}
        message="No issues found."
      />
    )

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
            <BoardLoadingOrEmpty
              loading={loading}
              message="No matching issues found."
            />
          ) : (
            issues.map((issue) => (
              <DetailsListItem
                key={issue.id}
                selected={issue.id === selected?.id}
                onSelect={() => setSelectedId(issue.id)}
                gutter={
                  <DetailsStatusGutter
                    status={getJobGutterStatus(issue.workbenchJob?.status)}
                  />
                }
                title={
                  <DetailsIconTitleSC>
                    {cloneElement(getIssueWebhookProviderIcon(issue.provider), {
                      size: 12,
                      fullColor: false,
                    })}
                    <span>{issue.title}</span>
                  </DetailsIconTitleSC>
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
        (selectedJob ? (
          <WorkbenchJobConclusionPanel
            key={`conclusion-${selected.id}`}
            jobId={selectedJob.id}
            jobStatus={selectedJob.status}
            workbenchId={workbenchId}
            headerActions={expandButton}
          />
        ) : (
          <DetailsColumnSC key={`conclusion-${selected.id}`}>
            <DetailsPanelHeader title="Conclusion">
              {expandButton}
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

// The issue card spans the full panel width, as in Figma.
const IssueBodySC = styled.div({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
})
