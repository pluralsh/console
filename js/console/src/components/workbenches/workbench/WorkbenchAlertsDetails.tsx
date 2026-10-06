import {
  Chip,
  EmptyState,
  ErrorIcon,
  Flex,
  Spinner,
  Tab,
  TabList,
  Tooltip,
} from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import {
  getAlertAnnotations,
  getAlertTags,
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
import {
  LoadMoreSentinel,
  useBoardLoadMore,
} from 'components/workbenches/common/WorkbenchBoard'
import {
  DetailsCollapseButton,
  DetailsColumnSC,
  DetailsErrorBanner,
  DetailsExpandButton,
  DetailsGutterStatus,
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
  DetailsTitleSC,
} from 'components/workbenches/common/WorkbenchDetailsView'
import {
  AlertFragment,
  AlertSeverity,
  AlertState,
  useWorkbenchJobQuery,
  WorkbenchJobStatus,
} from 'generated/graphql'
import { countBy, isEmpty, xor } from 'lodash'
import { ReactNode, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { formatDateTime, formatShortAge } from 'utils/datetime'
import { isJobRunning } from './job/WorkbenchJobActivity'
import { WorkbenchJobResult } from './job/WorkbenchJobResult'
import { ExpandablePrompt } from './WorkbenchJobConclusionPanel'

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
}: {
  alerts: AlertFragment[]
  loading: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  fallbackWorkbenchId: string
}) {
  const [selectedId, setSelectedId] = useState<string>()
  const [detailsOpen, setDetailsOpen] = useState(true)
  const [severities, setSeverities] = useState<AlertSeverity[]>([])
  const loadMore = useBoardLoadMore({ loading, hasNextPage, fetchNextPage })

  const severityCounts = useMemo(
    () => countBy(alerts, ({ severity }) => severity),
    [alerts]
  )
  const visible = useMemo(
    () =>
      isEmpty(severities)
        ? alerts
        : alerts.filter(({ severity }) => severities.includes(severity)),
    [alerts, severities]
  )
  const selected = visible.find(({ id }) => id === selectedId) ?? visible[0]
  const workbenchId = selected?.workbench?.id ?? fallbackWorkbenchId

  if (isEmpty(alerts)) {
    return loading ? (
      <CenteredSC>
        <Spinner />
      </CenteredSC>
    ) : (
      <EmptyState message="No alerts found." />
    )
  }

  return (
    <DetailsLayoutSC $panelCount={detailsOpen ? 2 : 1}>
      <DetailsListSC>
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
                  !isEmpty(severities) && !severities.includes(severity)
                }
                aria-pressed={severities.includes(severity)}
                onClick={() => setSeverities(xor(severities, [severity]))}
                css={{ borderRadius: 12 }}
              >
                {ALERT_SEVERITY_SHORT_LABELS[severity]} (
                {severityCounts[severity]})
              </Chip>
            ))}
          </SeverityChipsSC>
        </DetailsListSearchSC>
        <DetailsListItemsSC>
          {visible.map((alert) => (
            <DetailsListItem
              key={alert.id}
              selected={alert.id === selected?.id}
              onSelect={() => setSelectedId(alert.id)}
              gutter={
                <DetailsStatusGutter status={getAlertGutterStatus(alert)} />
              }
              title={
                <AlertTitleSC>
                  <AlertSeverityIcon severity={alert.severity} />
                  <span>{alert.title}</span>
                </AlertTitleSC>
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
  const jobId = alert.workbenchJob?.id
  const viewJobLink = jobId && (
    <DetailsLinkSC
      as={Link}
      to={getWorkbenchJobAbsPath({ workbenchId, jobId })}
    >
      View job
    </DetailsLinkSC>
  )
  const annotations = getAlertAnnotations(alert)
  const tags = getAlertTags(alert)
  const summary = alert.annotations?.summary

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
          <DetailsTitleSC>
            {typeof summary === 'string' && summary
              ? summary
              : getAlertName(alert)}
          </DetailsTitleSC>
          {alert.title && <ExpandablePrompt prompt={alert.title} />}
        </Flex>
        <SummaryCardSC>
          {typeof summary === 'string' && summary && (
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
        {!isEmpty(annotations) && (
          <SectionSC>
            <SectionTitleSC>Annotations</SectionTitleSC>
            <KeyValueCardSC>
              {annotations.map(([key, value]) => (
                <KeyValueRow
                  key={key}
                  label={key}
                  value={value}
                />
              ))}
            </KeyValueCardSC>
          </SectionSC>
        )}
        {!isEmpty(tags) && (
          <SectionSC>
            <SectionTitleSC>Tags</SectionTitleSC>
            <KeyValueCardSC>
              {tags.map((tag) => (
                <KeyValueRow
                  key={tag.id}
                  label={tag.name}
                  value={tag.value}
                />
              ))}
            </KeyValueCardSC>
          </SectionSC>
        )}
        {jobId && <AlertJobResult jobId={jobId} />}
      </DetailsPanelBodySC>
    </DetailsColumnSC>
  )
}

// Result of the job the alert triggered, under the alert information.
function AlertJobResult({ jobId }: { jobId: string }) {
  const { data, error } = useWorkbenchJobQuery({
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const job = data?.workbenchJob

  if (error) return <GqlError error={error} />
  if (!job) return null

  return (
    <JobResultSC>
      <WorkbenchJobResult
        job={job}
        loading={false}
        showAlertAndIssue={false}
        scrollable={false}
      />
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
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const [tab, setTab] = useState<AlertDetailsTab>('Annotations')
  const annotations = getAlertAnnotations(alert)
  const tags = getAlertTags(alert)

  return (
    <DetailsColumnSC>
      <DetailsPanelHeader title="Alert details">
        <DetailsCollapseButton
          label="Hide alert details"
          onClick={onCollapse}
        />
      </DetailsPanelHeader>
      <Flex
        flexShrink={0}
        css={{ backgroundColor: theme.colors['fill-one'] }}
      >
        <TabList
          scrollable
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'horizontal',
            selectedKey: tab,
            onSelectionChange: (key) => setTab(String(key) as AlertDetailsTab),
          }}
          flexShrink={0}
        >
          {ALERT_DETAILS_TABS.map((label) => (
            <Tab
              key={label}
              textValue={label}
            >
              {label}
            </Tab>
          ))}
        </TabList>
        <Flex
          flex={1}
          css={{ borderBottom: theme.borders.default }}
        />
      </Flex>
      <TabBodySC>
        {tab === 'Annotations' &&
          (isEmpty(annotations) ? (
            <EmptyState message="No annotations." />
          ) : (
            <ChipsSC>
              {annotations.map(([key, value]) => (
                <Chip
                  key={key}
                  size="small"
                  fillLevel={1}
                  tooltip={`${key}: ${value}`}
                  truncateWidth={360}
                >
                  {key}: {value}
                </Chip>
              ))}
            </ChipsSC>
          ))}
        {tab === 'Tags' &&
          (isEmpty(tags) ? (
            <EmptyState message="No tags." />
          ) : (
            <ChipsSC>
              {tags.map((tag) => (
                <Chip
                  key={tag.id}
                  size="small"
                  fillLevel={1}
                  tooltip={`${tag.name}: ${tag.value}`}
                  truncateWidth={360}
                >
                  {tag.name}: {tag.value}
                </Chip>
              ))}
            </ChipsSC>
          ))}
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
      </TabBodySC>
    </DetailsColumnSC>
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

function getAlertGutterStatus({
  workbenchJob,
}: AlertFragment): DetailsGutterStatus {
  if (workbenchJob?.status === WorkbenchJobStatus.Failed) return 'failed'
  if (isJobRunning(workbenchJob?.status)) return 'running'
  return null
}

const SeverityChipsSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.xsmall,
}))

const AlertTitleSC = styled.span(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  minWidth: 0,
  '& > span:last-child': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
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
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
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

const TabBodySC = styled.div(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: theme.spacing.medium,
}))

const ChipsSC = styled.div({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
})

const CenteredSC = styled(Flex)({
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
})
