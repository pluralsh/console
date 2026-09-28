import { ReactNode, RefObject } from 'react'

import styled, { useTheme } from 'styled-components'

import { SemanticColorKey } from '@pluralsh/design-system'
import { LogLineFragment } from 'generated/graphql'
import { formatDateTime } from 'utils/datetime'
import { getLogSearchMatchRanges } from './logSearch'

export enum LogLevel {
  SUCCESS = 'Success',
  WARN = 'Warn',
  ERROR = 'Error',
  FATAL = 'Fatal',
  INFO = 'Info',
  UNKNOWN = 'Unknown',
}

export function determineLevel(line: string): LogLevel {
  if (/fatal/i.test(line)) return LogLevel.FATAL
  if (/error/i.test(line)) return LogLevel.ERROR
  if (/warn/i.test(line)) return LogLevel.WARN
  if (/info/i.test(line)) return LogLevel.INFO
  if (/success/i.test(line)) return LogLevel.SUCCESS

  return LogLevel.UNKNOWN
}

export const logLevelToColor: Record<LogLevel, SemanticColorKey> = {
  [LogLevel.SUCCESS]: 'border-success',
  [LogLevel.WARN]: 'border-warning',
  [LogLevel.ERROR]: 'border-danger-light',
  [LogLevel.FATAL]: 'icon-danger-critical',
  [LogLevel.INFO]: 'border-selected',
  [LogLevel.UNKNOWN]: 'border-fill-three',
}

export function LogLine({
  ref,
  line: { timestamp, log },
  inferLevel = true,
  highlighted = false,
  searchQuery,
  onClick,
}: {
  ref?: RefObject<HTMLDivElement | null>
  line: LogLineFragment
  inferLevel?: boolean
  highlighted?: boolean
  searchQuery?: string
  onClick?: () => void
}) {
  const { colors } = useTheme()
  const level = inferLevel ? determineLevel(log ?? '') : LogLevel.UNKNOWN
  return (
    <LogLineWrapper
      ref={ref}
      $borderColor={colors[logLevelToColor[level]]}
      $highlighted={highlighted}
      onClick={onClick}
    >
      {formatDateTime(timestamp, 'MM/DD/YYYY-HH:mm:ss[[UTC]]', true, true)}
      {(log || '').split('\n').map((line, index) => (
        <span key={index}>{highlightMatches(line, searchQuery)}</span>
      ))}
    </LogLineWrapper>
  )
}

function highlightMatches(line: string, searchQuery?: string) {
  const ranges = getLogSearchMatchRanges(line, searchQuery)
  if (!ranges.length) return line

  const parts: ReactNode[] = []
  let cursor = 0

  ranges.forEach(({ start, end }, i) => {
    if (start > cursor) parts.push(line.slice(cursor, start))
    parts.push(
      <LogMatchMarkSC key={`${start}-${end}-${i}`}>
        {line.slice(start, end)}
      </LogMatchMarkSC>
    )
    cursor = end
  })

  if (cursor < line.length) parts.push(line.slice(cursor))

  return parts
}

const LogLineWrapper = styled.div<{
  $borderColor?: string
  $highlighted?: boolean
}>(({ theme, $borderColor, $highlighted }) => ({
  width: '100%',
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.small}px`,
  borderLeft: `4px solid ${$borderColor}`,
  color: $highlighted ? theme.colors.text : theme.colors['text-light'],
  wordBreak: 'break-word',
  fontFamily: 'Monument Mono',
  fontSize: '12px',
  lineHeight: '20px',
  letterSpacing: '0.25px',
  backgroundColor: $highlighted ? theme.colors['fill-two'] : 'transparent',
  '&:hover': {
    backgroundColor: theme.colors['fill-two'],
    borderColor: theme.colors['border-info'],
  },
}))

const LogMatchMarkSC = styled.mark(({ theme }) => ({
  backgroundColor: 'rgba(255, 202, 40, 0.32)',
  borderRadius: 2,
  color: theme.colors.text,
  padding: '0 1px',
}))
