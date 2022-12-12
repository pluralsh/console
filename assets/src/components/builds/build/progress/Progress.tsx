import { Card, PageTitle } from '@pluralsh/design-system'
import { AnsiLine } from 'components/utils/AnsiText'
import { Box, Text, ThemeContext } from 'grommet'
import { Checkmark, StatusCritical } from 'grommet-icons'
import { normalizeColor } from 'grommet/utils'
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

function ExitStatusInner({ exitCode }) {
  const success = exitCode === 0

  return (
    <Box
      direction="row"
      align="center"
      gap="xsmall"
    >
      {success ? (
        <Checkmark
          color="success"
          size="12px"
        />
      ) : <StatusCritical size="12px" />}
      {success ? (
        <Text
          size="small"
          color="success"
        >OK
        </Text>
      ) : <Text size="small">exit code: {exitCode}</Text>}
    </Box>
  )
}

function ExitStatus({ exitCode }) {
  const background: any = exitCode !== 0 ? 'error' : null

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
    <Box
      pad="xsmall"
      background={background}
      align="center"
    >
      <ExitStatusInner exitCode={exitCode} />
    </Box>
  )
}

function Command({ command, follow }) {
  const ref = useRef<any>()
  const { stdout } = command

  useEffect(() => {
      // eslint-disable-next-line no-unused-expressions
    ref && ref.current && follow && ref.current.scrollIntoView()
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
        overflowY="auto"
      >
        {edges.map(({ node }, ind) => (
          <Command
            key={node.id}
            command={node}
            follow={ind === len - 1}
          />
        ))}
      </Card>
    </>
  )
}
