import { Flex, Flyover } from '@pluralsh/design-system'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { getObservabilityWebhookTypeIcon } from 'components/settings/webhooks/webhookIcons'
import { getAlertHeading } from 'components/utils/alerts/AlertSourceLink'
import { AlertStateChip } from 'components/utils/alerts/AlertStateChip'
import { TRUNCATE } from 'components/utils/truncate'
import { DetailsField } from 'components/workbenches/common/WorkbenchDetailsView'
import { WorkbenchViewJobChip } from 'components/workbenches/common/WorkbenchViewJobChip'
import { WorkbenchAlertFragment } from 'generated/graphql'
import { cloneElement, useState } from 'react'
import styled from 'styled-components'
import { AlertInformation } from './WorkbenchAlertsDetails'

// Quick side view with all alert information, opened from a board card.
export function WorkbenchAlertFlyover({
  alert,
  workbenchId,
  onClose,
}: {
  alert: Nullable<WorkbenchAlertFragment>
  workbenchId: string
  onClose: () => void
}) {
  // the last alert shown, kept so the content stays while the flyover animates
  // closed (or after the alert left the list) instead of going blank
  const [lastAlert, setLastAlert] = useState(alert)
  if (alert && alert !== lastAlert) setLastAlert(alert)
  const shown = alert ?? lastAlert
  const job = shown?.workbenchJob

  return (
    <Flyover
      open={!!alert}
      onClose={onClose}
      width="min(629px, 100%)"
      minWidth={320}
      header={
        shown && (
          <HeaderSC>
            {cloneElement(getObservabilityWebhookTypeIcon(shown.type), {
              size: 16,
              flexShrink: 0,
            })}
            <HeaderTitleSC>{getAlertHeading(shown)}</HeaderTitleSC>
          </HeaderSC>
        )
      }
      css={{ padding: 0 }}
    >
      {shown && (
        <BodySC>
          <Flex
            justify="space-between"
            align="flex-start"
            gap="medium"
          >
            {job ? (
              <WorkbenchViewJobChip
                workbenchId={workbenchId}
                jobId={job.id}
                status={job.status}
                onNavigate={onClose}
              />
            ) : (
              <span />
            )}
            <Flex gap="large">
              <DetailsField label="State">
                <AlertStateChip state={shown.state} />
              </DetailsField>
              {job && (
                <DetailsField label="Job status">
                  <RunStatusChip
                    size="small"
                    status={job.status}
                  />
                </DetailsField>
              )}
            </Flex>
          </Flex>
          <AlertInformation alert={shown} />
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
}))

const HeaderTitleSC = styled.h2(({ theme }) => ({
  ...theme.partials.text.mono,
  fontSize: 20,
  fontWeight: 500,
  lineHeight: '24px',
  letterSpacing: 0,
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
