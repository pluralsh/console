import { Chip, ChipSeverity, Flex, Flyover } from '@pluralsh/design-system'
import { getObservabilityWebhookTypeIcon } from 'components/settings/webhooks/webhookIcons'
import { getAlertSummary } from 'components/utils/alerts/alertDetails'
import { getAlertName } from 'components/utils/alerts/AlertSourceLink'
import { AlertStateChip } from 'components/utils/alerts/AlertStateChip'
import { TRUNCATE } from 'components/utils/truncate'
import { DetailsField } from 'components/workbenches/common/WorkbenchDetailsView'
import { WorkbenchViewJobChip } from 'components/workbenches/common/WorkbenchViewJobChip'
import { AlertFragment, WorkbenchJobStatus } from 'generated/graphql'
import { upperFirst } from 'lodash'
import { cloneElement } from 'react'
import styled from 'styled-components'
import { AlertInformation } from './WorkbenchAlertsDetails'

const JOB_STATUS_SEVERITY: Record<WorkbenchJobStatus, ChipSeverity> = {
  [WorkbenchJobStatus.Pending]: 'info',
  [WorkbenchJobStatus.Running]: 'info',
  [WorkbenchJobStatus.Successful]: 'success',
  [WorkbenchJobStatus.Failed]: 'danger',
  [WorkbenchJobStatus.Cancelled]: 'neutral',
  [WorkbenchJobStatus.Paused]: 'warning',
}

// Quick side view with all alert information, opened from a board card.
export function WorkbenchAlertFlyover({
  alert,
  fallbackWorkbenchId,
  onClose,
}: {
  alert: Nullable<AlertFragment>
  fallbackWorkbenchId: string
  onClose: () => void
}) {
  const job = alert?.workbenchJob

  return (
    <Flyover
      open={!!alert}
      onClose={onClose}
      width="min(629px, 100%)"
      minWidth={320}
      header={
        alert && (
          <HeaderSC>
            {cloneElement(getObservabilityWebhookTypeIcon(alert.type), {
              size: 16,
            })}
            <HeaderTitleSC>
              {getAlertSummary(alert) || getAlertName(alert)}
            </HeaderTitleSC>
          </HeaderSC>
        )
      }
      css={{ padding: 0 }}
    >
      {alert && (
        <BodySC>
          <Flex
            justify="space-between"
            align="flex-start"
            gap="medium"
          >
            {job ? (
              <WorkbenchViewJobChip
                workbenchId={alert.workbench?.id ?? fallbackWorkbenchId}
                jobId={job.id}
                status={job.status}
                onNavigate={onClose}
              />
            ) : (
              <span />
            )}
            <Flex gap="large">
              <DetailsField label="State">
                <AlertStateChip state={alert.state} />
              </DetailsField>
              {job && (
                <DetailsField label="Job status">
                  <Chip
                    size="small"
                    severity={JOB_STATUS_SEVERITY[job.status]}
                  >
                    {upperFirst(job.status.toLowerCase())}
                  </Chip>
                </DetailsField>
              )}
            </Flex>
          </Flex>
          <AlertInformation alert={alert} />
        </BodySC>
      )}
    </Flyover>
  )
}

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  minWidth: 0,
  '& > :first-child': { flexShrink: 0 },
}))

const HeaderTitleSC = styled.h2(({ theme }) => ({
  ...theme.partials.text.subtitle1,
  ...TRUNCATE,
  margin: 0,
  color: theme.colors.text,
}))

const BodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  minHeight: '100%',
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
  backgroundColor:
    theme.mode === 'light'
      ? theme.colors['fill-zero']
      : theme.colors['fill-accent'],
}))
