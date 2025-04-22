import {
  Button,
  Card,
  CaretRightIcon,
  Flex,
  IconFrame,
  LogsIcon,
  ReturnIcon,
  WrapWithIf,
} from '@pluralsh/design-system'
import { LogLine } from 'components/cd/logs/LogLine'
import { TRUNCATE } from 'components/utils/truncate'
import { LogsEvidenceFragment } from 'generated/graphql'
import { useState } from 'react'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

export function LogsEvidencePanel({
  logs,
  isTable = true,
}: {
  logs: LogsEvidenceFragment[]
  isTable?: boolean
}) {
  const [selectedLog, setSelectedLog] = useState<LogsEvidenceFragment | null>(
    null
  )
  const logLines =
    selectedLog?.lines?.filter(isNonNullable).map((line) => line) ?? []

  return (
    <EvidenceWrapperSC $table={isTable}>
      {selectedLog ? (
        <WrapWithIf
          condition={!isTable}
          wrapper={<Card css={{ maxHeight: 300, overflow: 'auto' }} />}
        >
          <Flex padding="medium">
            <Button
              secondary
              endIcon={<ReturnIcon />}
              onClick={() => setSelectedLog(null)}
              width="100%"
            >
              Back to all log evidence
            </Button>
          </Flex>
          {logLines.map((line, i) => (
            <LogLine
              key={i}
              line={line}
            />
          ))}
        </WrapWithIf>
      ) : (
        logs.map((log, i) => (
          <WrapWithIf
            key={i}
            condition={!isTable}
            wrapper={<Card clickable />}
          >
            <LogEvidenceLineSC
              key={i}
              $table={isTable}
              onClick={() => setSelectedLog(log)}
            >
              <IconFrame
                icon={<LogsIcon />}
                css={{ flexShrink: 0 }}
                type="floating"
              />
              <span css={{ ...TRUNCATE, flex: 1 }}>
                {log.line ?? log.lines?.[0]?.log}
              </span>
              <IconFrame
                clickable
                icon={<CaretRightIcon />}
                onClick={() => setSelectedLog(log)}
              />
            </LogEvidenceLineSC>
          </WrapWithIf>
        ))
      )}
    </EvidenceWrapperSC>
  )
}

export const EvidenceWrapperSC = styled.div<{
  $table?: boolean
}>(({ theme, $table }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: $table ? 0 : theme.spacing.medium,
  height: '100%',
  overflow: 'auto',
}))

const LogEvidenceLineSC = styled.div<{ $table: boolean }>(
  ({ theme, $table }) => ({
    ...theme.partials.text.body2Bold,
    width: '100%',
    color: theme.colors['text-light'],
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.small,
    cursor: 'pointer',
    padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
    borderBottom: $table ? theme.borders.input : 'none',
    '&:hover': {
      backgroundColor: $table ? theme.colors['fill-one-hover'] : 'transparent',
    },
  })
)
