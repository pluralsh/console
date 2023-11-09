import { Button, ToolIcon, Tooltip } from '@pluralsh/design-system'
import { useContext, useRef, useState } from 'react'
import { Div, Flex } from 'honorable'
import { useParams } from 'react-router-dom'

import TerminalThemeSelector from 'components/terminal/TerminalThemeSelector'

import {
  ShellContext,
  TerminalActions,
  TerminalScreen,
} from '../../terminal/Terminal'

import { CODELINE_HEIGHT, ShellCommandEditor } from './ShellCommandEditor'

export const DEFAULT_COMMAND = '/bin/sh'

export function HeaderIconButton({ tooltipProps, ...props }) {
  // Button needs div wrapper for tooltip to work
  return (
    <Tooltip {...tooltipProps}>
      <Div height="100%">
        <Button
          floating
          width={CODELINE_HEIGHT}
          height="100%"
          {...props}
        />
      </Div>
    </Tooltip>
  )
}

const useCommand = (initialCommand?: string | null) => {
  const [command, setCommand] = useState(initialCommand || DEFAULT_COMMAND)
  const setCommandSafe: (arg: string | null) => void = (newCmd) => {
    if (typeof newCmd === 'string') {
      newCmd = newCmd.trim()
    }
    setCommand(newCmd || DEFAULT_COMMAND)
  }

  return {
    command,
    defaultCommand: DEFAULT_COMMAND,
    setCommand: setCommandSafe,
    isDefault: command === DEFAULT_COMMAND,
  }
}

export function ShellWithContext({
  namespace,
  name,
  container,
  clusterId,
}: {
  namespace: string
  name: string
  container: string
  clusterId?: string
}) {
  const { command, setCommand, defaultCommand, isDefault } = useCommand(null)

  const shellContext = useContext(ShellContext)
  const cluster = clusterId ? `${clusterId}:` : ''
  const room = `pod:${cluster}${namespace}:${name}:${container}`

  return (
    <Flex
      direction="column"
      height="100%"
      gap="medium"
    >
      <Flex gap="medium">
        <ShellCommandEditor
          name={name}
          namespace={namespace}
          container={container}
          command={command}
          defaultCommand={defaultCommand}
          isDefault={isDefault}
          setCommand={setCommand}
        />
        <HeaderIconButton
          tooltipProps={{ label: 'Repair viewport' }}
          onClick={shellContext.current?.handleResetSize()}
        >
          <ToolIcon size={16} />
        </HeaderIconButton>
        <TerminalThemeSelector />
      </Flex>
      <TerminalScreen
        room={room}
        command={command}
        header={`Connecting to pod ${name} using ${command}...`}
      />
    </Flex>
  )
}

export default function Shell() {
  const ref = useRef<TerminalActions>({ handleResetSize: () => {} })
  const { name = '', namespace = '', container = '' } = useParams()

  return (
    <ShellContext.Provider value={ref}>
      <ShellWithContext
        name={name}
        namespace={namespace}
        container={container}
      />
    </ShellContext.Provider>
  )
}
