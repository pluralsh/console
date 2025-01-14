import { useCallback } from 'react'

import styled, { useTheme } from 'styled-components'

import { LogLineFragment } from 'generated/graphql'
import { dayjsExtended } from 'utils/datetime'

export const Level = {
  UNKNOWN: 'u',
  INFO: 'i',
  SUCCESS: 's',
  WARN: 'w',
  ERROR: 'e',
  FATAL: 'f',
}

export function determineLevel(line) {
  if (/fatal/i.test(line)) return Level.FATAL
  if (/error/i.test(line)) return Level.ERROR
  if (/warn/i.test(line)) return Level.WARN
  if (/info/i.test(line)) return Level.INFO
  if (/success/i.test(line)) return Level.SUCCESS

  return Level.UNKNOWN
}

export function useBorderColor() {
  const theme = useTheme()

  return useCallback(
    (lvl) => {
      switch (lvl) {
        case Level.INFO:
          return theme.colors['border-selected']
        case Level.ERROR:
          return theme.colors['border-danger-light']
        case Level.SUCCESS:
          return theme.colors['border-success']
        case Level.WARN:
          return theme.colors['border-warning']
        case Level.FATAL:
          return theme.colors['icon-danger-critical']
        default:
          return theme.colors['border-fill-three']
      }
    },
    [theme.colors]
  )
}

export default function LogLine({
  line: { timestamp, log },
  open = false,
  onClick,
}: {
  line: LogLineFragment
  open?: boolean
  onClick?: () => void
}) {
  const borderColor = useBorderColor()
  const level = determineLevel(log)
  return (
    <LogLineWrapper
      $open={open}
      $borderColor={borderColor(level)}
      onClick={onClick}
    >
      {dayjsExtended(timestamp).utc().format('MM/DD/YYYY-HH:mm:ss[[UTC]] ')}
      {(log || '').split('\n').map((line, index) => (
        <span key={index}>{line}</span>
      ))}
    </LogLineWrapper>
  )
}
const LogLineWrapper = styled.div<{
  $open?: boolean
  $borderColor?: string
}>(({ theme, $open, $borderColor }) => ({
  borderLeft: $open
    ? `4px solid ${theme.colors['border-info']}`
    : `4px solid ${$borderColor}`,
  backgroundColor: $open ? theme.colors['fill-one-selected'] : undefined,
  flexDirection: 'row',
  fontFamily: 'Monument Mono',
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.small}px`,
  wordBreak: 'break-word',
  flexWrap: 'wrap',
  '&:hover': {
    backgroundColor: theme.colors['fill-two'],
    borderColor: theme.colors['border-info'],
  },
}))
