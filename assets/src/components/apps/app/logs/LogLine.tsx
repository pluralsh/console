import { ansiToJson } from 'anser'
import { textStyle } from 'components/utils/AnsiText'
import escapeCarriageReturn from 'escape-carriage'
import { Flex, Span } from 'honorable'
import { useCallback, useMemo } from 'react'

import { useTheme } from 'styled-components'

import { Level, ts } from './misc'

export function useBorderColor() {
  const { green, red, yellow, grey } = useTheme().colors

  return useCallback(
    (lvl) => {
      switch (lvl) {
        case Level.FATAL:
          return red[300]
        case Level.ERROR:
          return red[200]
        case Level.WARN:
          return yellow[200]
        case Level.INFO:
          return green[300]
        default:
          return grey[750]
      }
    },
    [green, grey, red, yellow]
  )
}

export default function LogLine({
  line: { timestamp, value },
  level,
  open = false,
  onClick,
}) {
  const blocks = useMemo(
    () =>
      ansiToJson(escapeCarriageReturn(value), {
        json: true,
        remove_empty: true,
      }),
    [value]
  )
  const borderColor = useBorderColor()

  return (
    <>
      <Flex
        borderLeft={
          open ? '4px solid border-info' : `4px solid ${borderColor(level)}`
        }
        backgroundColor={open ? 'fill-one-selected' : undefined}
        direction="row"
        fontFamily="Monument Mono"
        paddingHorizontal="small"
        paddinbVertical="xxsmall"
        wordBreak="break-word"
        wrap="wrap"
        onClick={onClick}
        _hover={{ backgroundColor: 'fill-two', borderColor: 'border-info' }}
      >
        {ts(timestamp)}
        {blocks.map((json) => (
          <Span
            key={json.content}
            {...textStyle(json)}
          >
            &nbsp;{json.content}
          </Span>
        ))}
      </Flex>
      <Flex
        borderLeft="4px solid border"
        height={4}
      />
    </>
  )
}
