import { RefObject, useCallback } from 'react'

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

export function LogLine({
  ref,
  line: { timestamp, log },
  inferLevel = true,
  highlighted = false,
  onClick,
}: {
  ref?: RefObject<HTMLDivElement | null>
  line: LogLineFragment
  inferLevel?: boolean
  highlighted?: boolean
  onClick?: () => void
}) {
  const borderColor = useBorderColor()
  const level = inferLevel ? determineLevel(log) : Level.UNKNOWN
  return (
    <LogLineWrapper
      ref={ref}
      $borderColor={borderColor(level)}
      $highlighted={highlighted}
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
