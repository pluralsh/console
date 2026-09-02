import {
  AccordionItem,
  ArrowTopRightIcon,
  Chip,
  Flex,
  MegaphoneIcon,
  Prop,
} from '@pluralsh/design-system'
import { alertSeverityToChipSeverity } from 'components/utils/alerts/AlertsTable'
import { AlertStateChip } from 'components/utils/alerts/AlertStateChip'
import { Body2BoldP, CaptionP, InlineA } from 'components/utils/typography/Text'
import {
  TriggerAccordionSC,
  TriggerCardIconWrapperSC,
  TriggerCardSC,
  TriggerPropsRowSC,
} from 'components/workbenches/common/WorkbenchTriggerCard'
import { AlertFragment } from 'generated/graphql'
import { startCase } from 'lodash'
import styled from 'styled-components'
import { formatDateTime } from 'utils/datetime'

export function WorkbenchJobTriggerAlert({
  alert,
}: {
  alert?: Nullable<AlertFragment>
}) {
  if (!alert) return null

  return (
    <TriggerCardSC>
      <TriggerAccordionSC
        type="multiple"
        defaultValue={['alert-details']}
      >
        <AccordionItem
          value="alert-details"
          padding="none"
          caret="right-quarter"
          trigger={
            <Flex
              align="center"
              gap="medium"
            >
              <TriggerCardIconWrapperSC>
                <MegaphoneIcon />
              </TriggerCardIconWrapperSC>
              <Body2BoldP $color="text-light">Alert</Body2BoldP>
            </Flex>
          }
        >
          <TriggerContentSC
            direction="column"
            gap="medium"
          >
            <Flex
              justify="space-between"
              align="center"
              gap="small"
            >
              {alert.url ? (
                <Flex
                  direction="column"
                  gap="xxsmall"
                >
                  <InlineA href={alert.url}>{alert.url}</InlineA>
                  <CaptionP $color="text-xlight">{alert.title}</CaptionP>
                </Flex>
              ) : (
                <CaptionP $color="text-xlight">{alert.title}</CaptionP>
              )}
              {alert.url ? <ArrowTopRightIcon size={12} /> : null}
            </Flex>
            <TriggerPropsRowSC>
              {alert.updatedAt && (
                <Prop
                  title="Date"
                  margin={0}
                >
                  {formatDateTime(alert.updatedAt, 'M/D/YYYY h:mma')}
                </Prop>
              )}
              <Prop
                title="Severity"
                margin={0}
              >
                <Chip
                  size="small"
                  severity={alertSeverityToChipSeverity[alert.severity]}
                >
                  {startCase(alert.severity.toLowerCase())}
                </Chip>
              </Prop>
              <Prop
                title="Status"
                margin={0}
              >
                <AlertStateChip state={alert.state} />
              </Prop>
              <Prop
                title="Provider"
                margin={0}
              >
                {startCase(alert.type.toLowerCase())}
              </Prop>
            </TriggerPropsRowSC>
          </TriggerContentSC>
        </AccordionItem>
      </TriggerAccordionSC>
    </TriggerCardSC>
  )
}

const TriggerContentSC = styled(Flex)(({ theme }) => ({
  marginTop: theme.spacing.small,
}))
