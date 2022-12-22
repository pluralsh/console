import { ansiToJson } from 'anser'
import escapeCarriageReturn from 'escape-carriage'
import { Flex } from 'honorable'
import { useMemo } from 'react'

import { Level, ts } from './misc'

function borderColor(lvl) {
  switch (lvl) {
  case Level.FATAL:
    return 'border-danger'
  case Level.ERROR:
    return 'border-danger'
  case Level.WARN:
    return 'border-warning'
  case Level.INFO:
    return 'border-selected'
  default:
    return 'border-fill-two'
  }
}

export default function LogLine({
  line: { timestamp, value }, level, onClick,
}) {
  const blocks = useMemo(() => ansiToJson(escapeCarriageReturn(value), { json: true, remove_empty: true }), [value])

  return (
    <Flex
      borderLeft={`2px solid ${borderColor(level)}`}
      direction="row"
      fontFamily="Monument Mono"
      paddingHorizontal="small"
      paddinbVertical="xxsmall"
      wordBreak="break-word"
      onClick={onClick}
      _hover={{ backgroundColor: 'fill-two', borderColor: 'border-info' }}
    >
      {ts(timestamp)}{blocks.map(json => <> {json.content}</>)}
    </Flex>
  )
}
