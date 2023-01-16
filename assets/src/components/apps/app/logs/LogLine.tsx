import { grey, red, yellow } from '@pluralsh/design-system/dist/theme/colors'
import { ansiToJson } from 'anser'
import escapeCarriageReturn from 'escape-carriage'
import { Flex } from 'honorable'
import { useMemo } from 'react'

import { Level, ts } from './misc'

export function borderColor(lvl) {
  switch (lvl) {
  case Level.FATAL:
    return red[300]
  case Level.ERROR:
    return red[300]
  case Level.WARN:
    return yellow[200]
  case Level.INFO:
    return grey[100]
  default:
    return grey[750]
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
