import { Flex } from '@pluralsh/design-system'
import { ansiToJson } from 'anser'
import { textStyle } from 'components/utils/AnsiText'
import escapeCarriageReturn from 'escape-carriage'
import { useEffect, useMemo, useRef } from 'react'
import styled, { useTheme } from 'styled-components'

function CommandLogLine({ line, number, follow }) {
  const theme = useTheme()
  const mounted = useRef<any>(undefined)
  const lineRef = useRef<any>(undefined)

  const blocks = useMemo(
    () =>
      ansiToJson(escapeCarriageReturn(line), {
        json: true,
        remove_empty: true,
      }),
    [line]
  )

  useEffect(() => {
    if (!mounted.current && follow && lineRef && lineRef.current)
      lineRef.current.scrollIntoView({ block: 'end' })
    mounted.current = true
  }, [follow, lineRef, line])

  return (
    <LineWrapperSC ref={lineRef}>
      <span css={{ color: theme.colors['text-xlight'], width: 35 }}>
        {number}
      </span>
      {blocks.map((json, i) => (
        <span
          key={i}
          css={{ whiteSpace: 'pre' }}
          style={textStyle(json)}
        >
          {json.content}
        </span>
      ))}
    </LineWrapperSC>
  )
}

export default function CommandLog({ text, follow }) {
  const { spacing } = useTheme()
  if (!text) return null

  const lines = text.match(/[^\r\n]+/g)

  return (
    <Flex
      direction="column"
      fontFamily="Monument Mono"
      paddingTop={spacing.small}
      paddingBottom={spacing.small}
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

const LineWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  color: theme.colors['text-light'],
  gap: theme.spacing.medium,
  paddingLeft: theme.spacing.medium,
  '&:hover': {
    backgroundColor: theme.colors['fill-one-hover'],
  },
}))
