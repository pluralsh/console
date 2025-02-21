import {
  Button,
  CaretRightIcon,
  Flex,
  IconFrame,
  LogsIcon,
  ReturnIcon,
} from '@pluralsh/design-system'
import { LogLine } from 'components/cd/logs/LogLine'
import { TRUNCATE } from 'components/utils/truncate'
import { LogsEvidenceFragment } from 'generated/graphql'
import { useState } from 'react'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

export function LogsEvidencePanel({ logs }: { logs: LogsEvidenceFragment[] }) {
  const [selectedLog, setSelectedLog] = useState<LogsEvidenceFragment | null>(
    null
  )
  const logLines =
    selectedLog?.lines?.filter(isNonNullable).map((line) => line) ?? []

  return (
    <WrapperSC>
      {selectedLog ? (
        <>
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
        </>
      ) : (
        logs.map((log, i) => (
          <LogEvidenceLineSC
            key={i}
            onClick={() => setSelectedLog(log)}
          >
            <IconFrame
              icon={<LogsIcon />}
              css={{ flexShrink: 0 }}
              type="floating"
            />
            <span css={{ ...TRUNCATE, flex: 1 }}>{log.lines?.[0]?.log}</span>
            <IconFrame icon={<CaretRightIcon />} />
          </LogEvidenceLineSC>
        ))
      )}
    </WrapperSC>
  )
}

const WrapperSC = styled.div((_) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'auto',
}))

const LogEvidenceLineSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2Bold,
  width: '100%',
  color: theme.colors['text-light'],
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  cursor: 'pointer',
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  borderBottom: theme.borders.input,
  '&:hover': {
    backgroundColor: theme.colors['fill-one-hover'],
  },
}))
