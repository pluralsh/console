import {
  Button,
  Chip,
  EmptyState,
  ErrorIcon,
  Flex,
  Tooltip,
} from '@pluralsh/design-system'
import {
  getAlertAnnotations,
  getAlertTagEntries,
} from 'components/utils/alerts/alertDetails'
import { alertSeverityToChipSeverity } from 'components/utils/alerts/AlertsTable'
import {
  ALERT_SEVERITY_ORDER,
  ALERT_SEVERITY_SHORT_LABELS,
  AlertSeverityIcon,
} from 'components/utils/alerts/AlertSeverityIcon'
import {
  AlertSourceLink,
  getAlertName,
} from 'components/utils/alerts/AlertSourceLink'
import { AlertStateChip } from 'components/utils/alerts/AlertStateChip'
import { GqlError } from 'components/utils/Alert'
import { toggleListValue } from 'components/utils/display/DisplayPanel'
import { TRUNCATE } from 'components/utils/truncate'
import {
  BoardLoadingOrEmpty,
  LoadMoreSentinel,
  useBoardLoadMore,
} from 'components/workbenches/common/WorkbenchBoard'
import {
  DetailsCollapseButton,
  DetailsColumnSC,
  DetailsErrorBanner,
  DetailsExpandButton,
  DetailsIconTitleSC,
  DetailsLayoutSC,
  DetailsLinkSC,
  DetailsListAgeSC,
  DetailsListItem,
  DetailsListItemsSC,
  DetailsListSC,
  DetailsListSearchSC,
  DetailsPanelBodySC,
  DetailsPanelHeader,
  DetailsStatusGutter,
  DetailsTabBodySC,
  DetailsTabs,
  DetailsTitleSC,
  getJobGutterStatus,
  useDetailsSelection,
} from 'components/workbenches/common/WorkbenchDetailsView'
import { WorkbenchSearchInput } from 'components/workbenches/common/WorkbenchSearchInput'
import {
  AlertFragment,
  AlertSeverity,
  AlertState,
  WorkbenchJobStatus,
} from 'generated/graphql'
import { countBy, isEmpty } from 'lodash'
import { ReactNode, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { formatDateTime, formatShortAge } from 'utils/datetime'
import { WorkbenchJobResultContent } from './job/WorkbenchJobResult'
import {
  ExpandablePrompt,
  usePolledWorkbenchJob,
} from './WorkbenchJobConclusionPanel'

type AlertDetailsTab = 'Annotations' | 'Tags' | 'All information'

const ALERT_DETAILS_TABS: AlertDetailsTab[] = [
  'Annotations',
  'Tags',
  'All information',
]

export function WorkbenchAlertsDetails({
  alerts,
  loading,
  hasNextPage,
  fetchNextPage,
  fallbackWorkbenchId,
  searchString,
  onSearchChange,
}: {
  alerts: AlertFragment[]
  loading: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  fallbackWorkbenchId: string
  searchString: string
  onSearchChange: (value: string) => void
}) {
  const [severities, setSeverities] = useState<AlertSeverity[]>([])
  const loadMore = useBoardLoadMore({ loading, hasNextPage, fetchNextPage })

  const severityCounts = useMemo(
    () => countBy(alerts, ({ severity }) => severity),
    [alerts]
  )
  // ignore selected severities whose chip disappeared (no alerts left), so the
  // filter can't get stuck on a chip that can no longer be toggled off
  const activeSeverities = useMemo(
    () => severities.filter((severity) => severityCounts[severity]),
    [severities, severityCounts]
  )
  const visible = useMemo(
    () =>
      isEmpty(activeSeverities)
        ? alerts
        : alerts.filter(({ severity }) => activeSeverities.includes(severity)),
    [alerts, activeSeverities]
  )
  const { selected, setSelectedId, detailsOpen, setDetailsOpen } =
    useDetailsSelection(visible)
  const workbenchId = selected?.workbench?.id ?? fallbackWorkbenchId

  if (isEmpty(alerts) && !searchString)
    return (
      <BoardLoadingOrEmpty
        loading={loading}
        message="No alerts found."
      />
    )

  return (
    <DetailsLayoutSC $panelCount={detailsOpen ? 2 : 1}>
      <DetailsListSC>
        <DetailsListSearchSC>
          <WorkbenchSearchInput
            size="small"
            value={searchString}
            onChange={onSearchChange}
            placeholder="Search alerts"
          />
        </DetailsListSearchSC>
        {!isEmpty(alerts) && (
          <DetailsListSearchSC>
            <SeverityChipsSC>
              {ALERT_SEVERITY_ORDER.filter(
                (severity) => severityCounts[severity]
              ).map((severity) => (
                <Chip
                  key={severity}
                  clickable
                  size="small"
                  fillLevel={2}
                  severity={alertSeverityToChipSeverity[severity]}
                  inactive={
                    !isEmpty(activeSeverities) &&
                    !activeSeverities.includes(severity)
                  }
                  aria-pressed={activeSeverities.includes(severity)}
                  onClick={() =>
                    setSeverities(toggleListValue(activeSeverities, severity))
                  }
                  rounded
                >
                  {ALERT_SEVERITY_SHORT_LABELS[severity]} (
                  {severityCounts[severity]})
                </Chip>
              ))}
            </SeverityChipsSC>
          </DetailsListSearchSC>
        )}
        <DetailsListItemsSC>
          {isEmpty(visible) && (
            <EmptyState message="No alerts match the search or severities.">
              <Button
                small
                secondary
                onClick={() => {
                  setSeverities([])
                  onSearchChange('')
                }}
              >
                Reset filters
              </Button>
            </EmptyState>
          )}
          {visible.map((alert) => (
            <DetailsListItem
              key={alert.id}
              selected={alert.id === selected?.id}
              onSelect={() => setSelectedId(alert.id)}
              gutter={
                <DetailsStatusGutter
                  status={getJobGutterStatus(alert.workbenchJob?.status)}
                />
              }
              title={
                <DetailsIconTitleSC>
                  <AlertSeverityIcon severity={alert.severity} />
                  <span>{alert.title}</span>
                </DetailsIconTitleSC>
              }
              end={
                <>
                  {alert.state === AlertState.Firing && (
                    <Tooltip
                      placement="top"
                      label="Firing"
                    >
                      <FiringIconSC aria-label="Firing">
                        <ErrorIcon
                          size={16}
                          color="icon-danger"
                        />
                      </FiringIconSC>
                    </Tooltip>
                  )}
                  <DetailsListAgeSC>
                    {formatShortAge(alert.updatedAt)}
                  </DetailsListAgeSC>
                </>
              }
            />
          ))}
          {hasNextPage && <LoadMoreSentinel onVisible={loadMore} />}
        </DetailsListItemsSC>
      </DetailsListSC>
      {selected && (
        <AlertConclusionPanel
          key={`conclusion-${selected.id}`}
          alert={selected}
          workbenchId={workbenchId}
          headerActions={
            !detailsOpen && (
              <DetailsExpandButton
                label="Show alert details"
                onClick={() => setDetailsOpen(true)}
              />
            )
          }
        />
      )}
      {selected && detailsOpen && (
        <AlertDetailsPanel
          key={`details-${selected.id}`}
          alert={selected}
          onCollapse={() => setDetailsOpen(false)}
        />
      )}
    </DetailsLayoutSC>
  )
}

function AlertConclusionPanel({
  alert,
  workbenchId,
  headerActions,
}: {
  alert: AlertFragment
  workbenchId: string
  headerActions?: ReactNode
}) {
  const job = alert.workbenchJob
  const jobId = job?.id
  const viewJobLink = jobId && (
    <DetailsLinkSC
      as={Link}
      to={getWorkbenchJobAbsPath({ workbenchId, jobId })}
    >
      View job
    </DetailsLinkSC>
  )
  const summary =
    typeof alert.annotations?.summary === 'string'
      ? alert.annotations.summary
      : null

  return (
    <DetailsColumnSC>
      <DetailsPanelHeader title="Conclusion">
        {viewJobLink}
        {headerActions}
      </DetailsPanelHeader>
      <DetailsPanelBodySC>
        {alert.workbenchJob?.status === WorkbenchJobStatus.Failed && (
          <DetailsErrorBanner action={viewJobLink}>
            Workbench job reported an error.
          </DetailsErrorBanner>
        )}
        <Flex
          direction="column"
          gap="medium"
        >
          <DetailsTitleSC>{summary || getAlertName(alert)}</DetailsTitleSC>
          {alert.title && <ExpandablePrompt prompt={alert.title} />}
        </Flex>
        <SummaryCardSC>
          {summary && (
            <SummaryField label="Alert summary">{summary}</SummaryField>
          )}
          {alert.cluster?.name && (
            <SummaryField label="Plural Cluster">
              {alert.cluster.name}
            </SummaryField>
          )}
          <SummaryField label="Severity">
            <Flex
              align="center"
              gap="xxsmall"
            >
              <AlertSeverityIcon severity={alert.severity} />
              {ALERT_SEVERITY_SHORT_LABELS[alert.severity]}
            </Flex>
          </SummaryField>
          <SummaryField label="State">
            <AlertStateChip state={alert.state} />
          </SummaryField>
          {alert.url && (
            <SummaryField label="Source link">
              <SmallLinkSC>
                <AlertSourceLink alert={alert} />
              </SmallLinkSC>
            </SummaryField>
          )}
        </SummaryCardSC>
        <KeyValueSection
          title="Annotations"
          entries={getAlertAnnotations(alert)}
        />
        <KeyValueSection
          title="Tags"
          entries={getAlertTagEntries(alert)}
        />
        {job && (
          <AlertJobResult
            jobId={job.id}
            jobStatus={job.status}
          />
        )}
      </DetailsPanelBodySC>
    </DetailsColumnSC>
  )
}

// Result of the job the alert triggered, under the alert information.
function AlertJobResult({
  jobId,
  jobStatus,
}: {
  jobId: string
  jobStatus: WorkbenchJobStatus
}) {
  const { data, error } = usePolledWorkbenchJob(jobId, jobStatus)
  const job = data?.workbenchJob

  if (error) return <GqlError error={error} />
  if (!job) return null

  return (
    <JobResultSC>
      <WorkbenchJobResultContent job={job} />
    </JobResultSC>
  )
}

function AlertDetailsPanel({
  alert,
  onCollapse,
}: {
  alert: AlertFragment
  onCollapse: () => void
}) {
  const [tab, setTab] = useState<AlertDetailsTab>('Annotations')

  return (
    <DetailsColumnSC>
      <DetailsPanelHeader title="Alert details">
        <DetailsCollapseButton
          label="Hide alert details"
          onClick={onCollapse}
        />
      </DetailsPanelHeader>
      <DetailsTabs
        tabs={ALERT_DETAILS_TABS}
        selected={tab}
        onChange={setTab}
      />
      <DetailsTabBodySC>
        {tab === 'Annotations' && (
          <KeyValueChips
            entries={getAlertAnnotations(alert)}
            emptyMessage="No annotations."
          />
        )}
        {tab === 'Tags' && (
          <KeyValueChips
            entries={getAlertTagEntries(alert)}
            emptyMessage="No tags."
          />
        )}
        {tab === 'All information' && (
          <KeyValueCardSC>
            <KeyValueRow
              label="Title"
              value={alert.title}
            />
            <KeyValueRow
              label="Name"
              value={getAlertName(alert)}
            />
            <KeyValueRow
              label="Source"
              value={alert.type}
            />
            <KeyValueRow
              label="Severity"
              value={ALERT_SEVERITY_SHORT_LABELS[alert.severity]}
            />
            <KeyValueRow
              label="State"
              value={alert.state}
            />
            <KeyValueRow
              label="Cluster"
              value={alert.cluster?.name}
            />
            <KeyValueRow
              label="Fingerprint"
              value={alert.fingerprint}
            />
            <KeyValueRow
              label="URL"
              value={alert.url}
            />
            <KeyValueRow
              label="Updated"
              value={
                alert.updatedAt
                  ? formatDateTime(alert.updatedAt, 'M/D/YYYY h:mma')
                  : null
              }
            />
            <KeyValueRow
              label="Message"
              value={alert.message}
            />
          </KeyValueCardSC>
        )}
      </DetailsTabBodySC>
    </DetailsColumnSC>
  )
}

function KeyValueSection({
  title,
  entries,
}: {
  title: string
  entries: [string, string][]
}) {
  if (isEmpty(entries)) return null

  return (
    <SectionSC>
      <SectionTitleSC>{title}</SectionTitleSC>
      <KeyValueCardSC>
        {entries.map(([label, value], i) => (
          <KeyValueRow
            key={`${label}-${i}`}
            label={label}
            value={value}
          />
        ))}
      </KeyValueCardSC>
    </SectionSC>
  )
}

function KeyValueChips({
  entries,
  emptyMessage,
}: {
  entries: [string, string][]
  emptyMessage: string
}) {
  if (isEmpty(entries)) return <EmptyState message={emptyMessage} />

  return (
    <ChipsSC>
      {entries.map(([label, value], i) => (
        <Chip
          key={`${label}-${i}`}
          size="small"
          fillLevel={1}
          tooltip={`${label}: ${value}`}
          truncateWidth={360}
        >
          {label}: {value}
        </Chip>
      ))}
    </ChipsSC>
  )
}

function SummaryField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <SummaryFieldSC>
      <SummaryLabelSC>{label}</SummaryLabelSC>
      <SummaryValueSC>{children}</SummaryValueSC>
    </SummaryFieldSC>
  )
}

function KeyValueRow({
  label,
  value,
}: {
  label: string
  value: Nullable<string>
}) {
  if (!value) return null

  return (
    <KeyValueRowSC>
      <KeyValueLabelSC>{label}</KeyValueLabelSC>
      <KeyValueValueSC>{value}</KeyValueValueSC>
    </KeyValueRowSC>
  )
}

const SeverityChipsSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.xsmall,
}))

const FiringIconSC = styled.span({
  display: 'flex',
  flexShrink: 0,
})

const SummaryCardSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: `${theme.spacing.medium}px ${theme.spacing.large}px`,
  padding: theme.spacing.large,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.default,
}))

const SummaryFieldSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  minWidth: 0,
}))

const SummaryLabelSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  whiteSpace: 'nowrap',
}))

const SummaryValueSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors.text,
  minWidth: 0,
  wordBreak: 'break-word',
}))

const SmallLinkSC = styled.div(({ theme }) => ({
  display: 'flex',
  minWidth: 0,
  '& a, & > span': { ...theme.partials.text.caption },
}))

const SectionSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
})

const SectionTitleSC = styled.h3(({ theme }) => ({
  ...theme.partials.text.body1,
  margin: 0,
  padding: `${theme.spacing.medium}px 0 ${theme.spacing.small}px`,
  color: theme.colors['text-xlight'],
}))

const KeyValueCardSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  padding: `${theme.spacing.xsmall}px ${theme.spacing.large}px`,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.default,
  backgroundColor: theme.colors['fill-zero'],
}))

const KeyValueRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  padding: `${theme.spacing.small}px 0`,
  borderBottom: theme.borders.default,
  '&:last-child': { borderBottom: 'none' },
}))

const KeyValueLabelSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  flexShrink: 0,
  width: 150,
  ...TRUNCATE,
  color: theme.colors['text-input-disabled'],
}))

const KeyValueValueSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  flex: 1,
  minWidth: 0,
  wordBreak: 'break-word',
  color: theme.colors.text,
}))

const JobResultSC = styled.div(({ theme }) => ({
  paddingTop: theme.spacing.large,
}))

const ChipsSC = styled.div({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
})
