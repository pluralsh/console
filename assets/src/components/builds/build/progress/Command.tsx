import { ArrowRightIcon } from '@pluralsh/design-system'
import { Div, Flex, Span } from 'honorable'
import { useEffect, useRef } from 'react'

import { Timer } from '../BuildTimer'

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
          <ArrowRightIcon size={12} />
          <span> {command.command}</span>
          <CommandExitStatus exitCode={command.exitCode} />
        </Flex>
        <Timer
          insertedAt={command.insertedAt}
          completedAt={command.completedAt}
        />
      </Flex>
      <CommandLog
        text={stdout}
        follow={follow}
      />
    </Div>
  )
}
