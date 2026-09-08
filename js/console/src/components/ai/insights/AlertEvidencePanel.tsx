import {
  Button,
  Card,
  Flex,
  Markdown,
  ReturnIcon,
  SirenIcon,
  WrapWithIf,
} from '@pluralsh/design-system'
import { AlertEvidenceFragment } from 'generated/graphql'
import { useState } from 'react'
import { useTheme } from 'styled-components'
import { BasicEvidenceLine, EvidenceWrapperSC } from './LogsEvidencePanel'

export function AlertsEvidencePanel({
  alerts,
  isTable = true,
}: {
  alerts: AlertEvidenceFragment[]
  isTable?: boolean
}) {
  const { spacing } = useTheme()
  const [selectedAlert, setSelectedAlert] =
    useState<AlertEvidenceFragment | null>(null)

  return (
    <EvidenceWrapperSC $table={isTable}>
      {selectedAlert ? (
        <WrapWithIf
          condition={!isTable}
          wrapper={<Card css={{ maxHeight: 300, overflow: 'auto' }} />}
        >
          <Flex padding="medium">
            <Button
              secondary
              endIcon={<ReturnIcon />}
              onClick={() => setSelectedAlert(null)}
              width="100%"
            >
              Back to all alert evidence
            </Button>
          </Flex>
          <div css={{ padding: spacing.medium }}>
            <Markdown text={selectedAlert.resolution ?? ''} />
          </div>
        </WrapWithIf>
      ) : (
        alerts.map((alert, i) => (
          <WrapWithIf
            key={i}
            condition={!isTable}
            wrapper={<Card clickable />}
          >
            <BasicEvidenceLine
              key={i}
              icon={<SirenIcon />}
              content={alert.title}
              onClick={() => setSelectedAlert(alert)}
              isTable={isTable}
            />
          </WrapWithIf>
        ))
      )}
    </EvidenceWrapperSC>
  )
}
