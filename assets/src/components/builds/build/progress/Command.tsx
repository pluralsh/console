import { Div, Flex } from 'honorable'
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
    <Div
      ref={ref}
    >
      <Flex
        gap="small"
        paddingHorizontal="medium"
        paddingVertical="xsmall"
        align="center"
      >
        <Flex
          gap="small"
          align="center"
        >
          <pre>→ {command.command}</pre>
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
