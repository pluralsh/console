import {
  Button,
  Chip,
  EmptyState,
  ErrorIcon,
  Tooltip,
} from '@pluralsh/design-system'
import {
  getAlertAnnotations,
  getAlertSummary,
  getAlertTagEntries,
} from 'components/utils/alerts/alertDetails'
import { alertSeverityToChipSeverity } from 'components/utils/alerts/AlertsTable'
import {
  ALERT_SEVERITY_ORDER,
  ALERT_SEVERITY_LABELS,
  AlertSeverityIcon,
} from 'components/utils/alerts/AlertSeverityIcon'
import {
  AlertSourceLink,
  getAlertName,
} from 'components/utils/alerts/AlertSourceLink'
import { alertStateLabel } from 'components/utils/alerts/AlertStateChip'
import { GqlError } from 'components/utils/Alert'
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
  DetailsField,
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
import { compact, isEmpty } from 'lodash'
import { ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { formatDateTime, formatShortAge } from 'utils/datetime'
import { WorkbenchJobResultContent } from './job/WorkbenchJobResult'
import {
  ALERT_SEVERITY_OPTIONS,
  ALERT_TYPE_LABELS,
  allAlertSeveritiesSelected,
  toggleAlertSeverityChip,
} from './workbenchAlertsDisplay'
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

// Alerts details view: the alert list (page sidebar) and the alert panels.
export function useWorkbenchAlertsDetails({
  alerts,
  loading,
  fetchingMore,
  hasNextPage,
  fetchNextPage,
  fallbackWorkbenchId,
  searchString,
  onSearchChange,
  severities,
  severityCounts,
  onSeveritiesChange,
}: {
  alerts: AlertFragment[]
  // first load only (spinner); later fetches don't blank the view
  loading: boolean
  // a page or poll in flight, to pace loading more
  fetchingMore: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  fallbackWorkbenchId: string
  searchString: string
  onSearchChange: (value: string) => void
  // the display severity filter, applied server-side
  severities: AlertSeverity[]
  // workbench-wide counts per severity
  severityCounts: Partial<Record<AlertSeverity, number>>
  onSeveritiesChange: (severities: AlertSeverity[]) => void
}) {
  const loadMore = useBoardLoadMore({
    fetchingMore,
    hasNextPage,
    fetchNextPage,
  })

  const filtered = !allAlertSeveritiesSelected(severities)
  const { selected, setSelectedId, detailsOpen, setDetailsOpen } =
    useDetailsSelection(alerts)
  const workbenchId = selected?.workbench?.id ?? fallbackWorkbenchId

  const sidebar = (
    <DetailsListSC>
      <DetailsListSearchSC>
        <WorkbenchSearchInput
          size="small"
          value={searchString}
          onChange={onSearchChange}
          placeholder="Search alerts"
        />
      </DetailsListSearchSC>
      {!isEmpty(compact(Object.values(severityCounts))) && (
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
                inactive={filtered && !severities.includes(severity)}
                aria-pressed={filtered && severities.includes(severity)}
                onClick={() =>
                  onSeveritiesChange(
                    toggleAlertSeverityChip(severities, severity)
                  )
                }
                rounded
              >
                {ALERT_SEVERITY_LABELS[severity]} ({severityCounts[severity]})
              </Chip>
            ))}
          </SeverityChipsSC>
        </DetailsListSearchSC>
      )}
      <DetailsListItemsSC>
        {isEmpty(alerts) &&
          (filtered && !loading ? (
            <EmptyState message="No alerts match the selected severities.">
              <Button
                small
                secondary
                onClick={() => onSeveritiesChange(ALERT_SEVERITY_OPTIONS)}
              >
                Reset filters
              </Button>
            </EmptyState>
          ) : (
            <BoardLoadingOrEmpty
              loading={loading}
              message={
                searchString ? 'No matching alerts found.' : 'No alerts found.'
              }
            />
          ))}
        {alerts.map((alert) => (
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
                    <FiringIconSC
                      role="img"
                      aria-label="Firing"
                    >
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
  )

  const content = (
    <DetailsLayoutSC $panelCount={detailsOpen ? 2 : 1}>
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

  return { sidebar, content }
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
            {alert.workbenchJob.error ? ` ${alert.workbenchJob.error}` : ''}
          </DetailsErrorBanner>
        )}
        <DetailsTitleSC>
          {getAlertSummary(alert) || getAlertName(alert)}
        </DetailsTitleSC>
        <AlertInformation alert={alert} />
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

// Alert title, summary fields, annotations and tags; shared by the details
// view and the board's quick view.
export function AlertInformation({ alert }: { alert: AlertFragment }) {
  const summary = getAlertSummary(alert)
  const service = alert.serviceDeployment

  return (
    <>
      {alert.title && <ExpandablePrompt prompt={alert.title} />}
      {(summary ||
        service ||
        alert.cluster?.name ||
        alert.value ||
        alert.url ||
        alert.silenceUrl) && (
        <SummaryCardSC>
          {summary && (
            <DetailsField
              valueSize="caption"
              label="Alert summary"
            >
              {summary}
            </DetailsField>
          )}
          {service && (
            <DetailsField
              valueSize="caption"
              label="Plural Service"
            >
              {service.cluster?.id ? (
                <DetailsLinkSC
                  as={Link}
                  to={getServiceDetailsPath({
                    clusterId: service.cluster.id,
                    serviceId: service.id,
                  })}
                >
                  {service.name}
                </DetailsLinkSC>
              ) : (
                service.name
              )}
            </DetailsField>
          )}
          {alert.cluster?.name && (
            <DetailsField
              valueSize="caption"
              label="Plural Cluster"
            >
              {alert.cluster.name}
            </DetailsField>
          )}
          {alert.value && (
            <DetailsField
              valueSize="caption"
              label="Value"
            >
              {alert.value}
            </DetailsField>
          )}
          {alert.url && (
            <DetailsField
              valueSize="caption"
              label="Source link"
            >
              <SmallLinkSC>
                <AlertSourceLink alert={alert} />
              </SmallLinkSC>
            </DetailsField>
          )}
          {alert.silenceUrl && (
            <DetailsField
              valueSize="caption"
              label="Silence link"
            >
              <SmallLinkSC>
                <AlertSourceLink
                  alert={{ ...alert, url: alert.silenceUrl }}
                  label={`Silence in ${ALERT_TYPE_LABELS[alert.type]}`}
                />
              </SmallLinkSC>
            </DetailsField>
          )}
        </SummaryCardSC>
      )}
      <KeyValueSection
        title="Annotations"
        entries={getAlertAnnotations(alert)}
        valueAlign="right"
      />
      <KeyValueSection
        title="Tags"
        entries={getAlertTagEntries(alert)}
      />
    </>
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
              value={ALERT_TYPE_LABELS[alert.type]}
            />
            <KeyValueRow
              label="Severity"
              value={ALERT_SEVERITY_LABELS[alert.severity]}
            />
            <KeyValueRow
              label="State"
              value={alertStateLabel(alert.state)}
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
  valueAlign = 'left',
}: {
  title: string
  entries: [string, string][]
  // right: label fills the row and the value sits at its end (annotations)
  valueAlign?: 'left' | 'right'
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
            valueAlign={valueAlign}
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

function KeyValueRow({
  label,
  value,
  valueAlign = 'left',
}: {
  label: string
  value: Nullable<string>
  valueAlign?: 'left' | 'right'
}) {
  if (!value) return null

  return (
    <KeyValueRowSC>
      <KeyValueLabelSC $fill={valueAlign === 'right'}>{label}</KeyValueLabelSC>
      <KeyValueValueSC $align={valueAlign}>{value}</KeyValueValueSC>
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

const KeyValueLabelSC = styled.span<{ $fill: boolean }>(({ theme, $fill }) => ({
  ...theme.partials.text.caption,
  ...TRUNCATE,
  ...($fill ? { flex: 1, minWidth: 0 } : { flexShrink: 0, width: 150 }),
  color: theme.colors['text-input-disabled'],
}))

const KeyValueValueSC = styled.span<{ $align: 'left' | 'right' }>(
  ({ theme, $align }) => ({
    ...theme.partials.text.body2,
    minWidth: 0,
    wordBreak: 'break-word',
    color: theme.colors.text,
    ...($align === 'right'
      ? { flexShrink: 0, maxWidth: '60%', textAlign: 'right' }
      : { flex: 1 }),
  })
)

const JobResultSC = styled.div(({ theme }) => ({
  paddingTop: theme.spacing.large,
}))

const ChipsSC = styled.div({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
})
