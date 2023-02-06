import { grey, red, yellow, green } from '@pluralsh/design-system/dist/theme/colors'
import { ansiToJson } from 'anser'
import { textStyle } from 'components/utils/AnsiText'
import escapeCarriageReturn from 'escape-carriage'
import { Flex, Span } from 'honorable'
import { useMemo } from 'react'

import { Level, ts } from './misc'

export function borderColor(lvl) {
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
}

export default function LogLine({
  line: { timestamp, value }, level, open = false, onClick,
}) {
  const blocks = useMemo(() => ansiToJson(escapeCarriageReturn(value), { json: true, remove_empty: true }), [value])

  return (
    <>
      <Flex
        borderLeft={open ? '4px solid border-info' : `4px solid ${borderColor(level)}`}
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
        {blocks.map(json => <Span {...textStyle(json)}>&nbsp;{json.content}</Span>)}
      </Flex>
      <Flex
        borderLeft="4px solid border"
        height={4}
      />
    </>
  )
}
