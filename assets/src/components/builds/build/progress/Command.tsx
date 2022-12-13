import { Div, Flex, Span } from 'honorable'
import { useEffect, useRef } from 'react'

import { Timer } from '../Build'

import CommandExitStatus from './CommandExitStatus'
import CommandLog from './CommandLog'

export default function Command({ command, follow }) {
  const ref = useRef<any>()
  const { stdout } = command

  useEffect(() => {
    if (ref && ref.current && follow) ref.current.scrollIntoView()
  }, [follow, ref])

  return (
    <Div ref={ref}>
      <Flex
        gap="small"
        paddingHorizontal="medium"
        paddingVertical="xsmall"
        justify="space-between"
      >
        <Flex
          gap="small"
          align="center"
        >
          <Span>→ {command.command}</Span>
          <CommandExitStatus exitCode={command.exitCode} />
        </Flex>
        <Timer
          insertedAt={command.insertedAt}
          completedAt={command.completedAt}
          status={undefined}
        />
      </Flex>
      <CommandLog
        text={stdout}
        follow={follow}
      />
    </Div>
  )
}
