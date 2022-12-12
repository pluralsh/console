import { Card, PageTitle } from '@pluralsh/design-system'
import { AnsiLine } from 'components/utils/AnsiText'
import { Box, ThemeContext } from 'grommet'
import { normalizeColor } from 'grommet/utils'
import { Div, P } from 'honorable'
import { useContext, useEffect, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { BeatLoader } from 'react-spinners'

import { Timer } from '../Build'

function Log({ text, follow }) {
  if (!text) return null

  const lines = text.match(/[^\r\n]+/g)

  return (
    <Box
      flex={false}
      style={{ overflow: 'auto' }}
      fill="horizontal"
    >
      {lines.map((line, ind) => (
        <LogLine
          key={ind}
          line={line}
          number={ind + 1}
          follow={follow}
        />
      ))}
    </Box>
  )
}

function LogLine({ line, number, follow }) {
  const theme = useContext(ThemeContext)
  const mounted = useRef<any>()
  const lineRef = useRef<any>()

  useEffect(() => {
    if (!mounted.current && follow && lineRef && lineRef.current) lineRef.current.scrollIntoView(true)
    mounted.current = true
  }, [follow, lineRef, line])

  return (
    <Box
      flex={false}
      ref={lineRef}
      direction="row"
      align="center"
      height="20px"
      style={{ color: normalizeColor('light-4', ThemeContext), cursor: 'default' }}
      gap="medium"
      onClick={() => null}
      hoverIndicator="card"
      pad={{ left: '55px' }}
    >
      <pre style={{ color: normalizeColor('dark-5', theme) }}>{number}</pre>
      <AnsiLine line={line} />
    </Box>
  )
}

function ExitStatus({ exitCode }) {
  if (!exitCode && exitCode !== 0) {
    return (
      <Box
        width="40px"
        direction="row"
      >
        <BeatLoader size={5} />
      </Box>
    )
  }

  return (
    <Div padding="xsmall">
      {exitCode === 0
        ? <P color="text-success">✓ OK</P>
        : <P color="text-error">✗ Exit code: {exitCode}</P>}
    </Div>
  )
}

function Command({ command, follow }) {
  const ref = useRef<any>()
  const { stdout } = command

  useEffect(() => {
    if (ref && ref.current && follow) ref.current.scrollIntoView()
  }, [follow, ref])

  return (
    <Box
      flex={false}
      ref={ref}
    >
      <Box
        direction="row"
        gap="small"
        pad={{ vertical: 'xxsmall', horizontal: 'medium' }}
        align="center"
      >
        <Box
          fill="horizontal"
          direction="row"
          gap="small"
          align="center"
        >
          <pre>{'==>'} {command.command}</pre>
          <ExitStatus exitCode={command.exitCode} />
        </Box>
        <Timer
          insertedAt={command.insertedAt}
          completedAt={command.completedAt}
          status={undefined}
        />
      </Box>
      <Log
        text={stdout}
        follow={follow}
      />
    </Box>
  )
}

export default function Progress() {
  const { edges } = useOutletContext<any>()
  const len = edges.length

  return (
    <>
      <PageTitle heading="Progress" />
      <Card
        flexGrow={1}
        fontFamily="monospace"
        overflowY="auto"
      >
        {edges.map(({ node }, i) => (
          <Command
            key={node.id}
            command={node}
            follow={i === len - 1}
          />
        ))}
      </Card>
    </>
  )
}
