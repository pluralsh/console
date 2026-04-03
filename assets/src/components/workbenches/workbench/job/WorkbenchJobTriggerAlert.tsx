import {
  ArrowTopRightIcon,
  Chip,
  ChipSeverity,
  Flex,
  MegaphoneIcon,
} from '@pluralsh/design-system'
import { WorkbenchTriggerCardIcon } from 'components/workbenches/common/WorkbenchTriggerCardIcon'
import { AlertStateChip } from 'components/utils/alerts/AlertStateChip'
import { Body2BoldP, InlineA } from 'components/utils/typography/Text'
import { AlertSeverity, AlertState } from 'generated/graphql'
import { startCase } from 'lodash'
import styled from 'styled-components'

export type WorkbenchJobTriggerAlertData = {
  title?: Nullable<string>
  severity: AlertSeverity
  state: AlertState
  url?: Nullable<string>
}

export const MOCK_WORKBENCH_JOB_TRIGGER_ALERT: WorkbenchJobTriggerAlertData = {
  title: 'Pod restart rate elevated in workbench-agent',
  severity: AlertSeverity.High,
  state: AlertState.Firing,
  url: 'https://example.com/alerts/workbench-agent',
}

const severityToChipSeverity: Record<AlertSeverity, ChipSeverity> = {
  [AlertSeverity.Critical]: 'critical',
  [AlertSeverity.High]: 'danger',
  [AlertSeverity.Medium]: 'warning',
  [AlertSeverity.Low]: 'success',
  [AlertSeverity.Undefined]: 'neutral',
}

export function WorkbenchJobTriggerAlert({
  alert,
}: {
  alert: WorkbenchJobTriggerAlertData
}) {
  return (
    <CardSC>
      <Flex
        align="center"
        gap="medium"
      >
        <WorkbenchTriggerCardIcon>
          <MegaphoneIcon />
        </WorkbenchTriggerCardIcon>
        <Body2BoldP $color="text-light">Alert</Body2BoldP>
      </Flex>
      <Flex
        direction="column"
        gap="xsmall"
      >
        <Flex
          gap="small"
          align="center"
          wrap="wrap"
        >
          <Chip
            size="small"
            severity={severityToChipSeverity[alert.severity]}
          >
            {startCase(alert.severity.toLowerCase())}
          </Chip>
          <AlertStateChip state={alert.state} />
        </Flex>
        {alert.url ? (
          <InlineA href={alert.url}>
            <Flex
              gap="xsmall"
              align="center"
            >
              {alert.title}
              <ArrowTopRightIcon size={12} />
            </Flex>
          </InlineA>
        ) : (
          <span>{alert.title}</span>
        )}
      </Flex>
    </CardSC>
  )
}

const CardSC = styled.div(({ theme }) => ({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: theme.spacing.large,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.input,
  backgroundColor: theme.colors['fill-zero'],
}))
