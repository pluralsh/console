import { ansiToJson } from 'anser'
import { textStyle } from 'components/utils/AnsiText'
import escapeCarriageReturn from 'escape-carriage'
import { Flex, Span } from 'honorable'
import { useEffect, useMemo, useRef } from 'react'

function CommandLogLine({ line, number, follow }) {
  const mounted = useRef<any>()
  const lineRef = useRef<any>()

  const blocks = useMemo(() => ansiToJson(escapeCarriageReturn(line), { json: true, remove_empty: true }), [line])

  useEffect(() => {
    if (!mounted.current && follow && lineRef && lineRef.current) lineRef.current.scrollIntoView(true)
    mounted.current = true
  }, [follow, lineRef, line])

  return (
    <Flex
      align="center"
      color="text-light"
      gap="medium"
      paddingLeft={40}
      ref={lineRef}
      _hover={{ backgroundColor: 'fill-one-hover' }}
    >
      <Span color="text-xlight">{number}</Span>
      {blocks.map((json, i) => (
        <Span
          key={i}
          style={textStyle(json)}
          whiteSpace="pre"
        >
          {json.content}
        </Span>
      ))}
    </Flex>
  )
}

export default function CommandLog({ text, follow }) {
  if (!text) return null

  const lines = text.match(/[^\r\n]+/g)

  return (
    <Flex
      direction="column"
      overflowY="auto"
    >
      {lines.map((line, i) => (
        <CommandLogLine
          key={i}
          line={line}
          number={i + 1}
          follow={follow}
        />
      ))}
    </Flex>
  )
}

