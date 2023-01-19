import {
  Button,
  CheckIcon,
  Code,
  IconFrame,
  Input,
  PageTitle,
  PencilIcon,
  ReloadIcon,
} from '@pluralsh/design-system'
import { useContext, useRef, useState } from 'react'
import { Flex, Form } from 'honorable'
import { useParams } from 'react-router-dom'

import TerminalThemeSelector from 'components/terminal/TerminalThemeSelector'

import { ShellContext, Terminal, TerminalActions } from '../../terminal/Terminal'

export const DEFAULT_COMMAND = '/bin/sh'

export function ShellCommand({ command, setCommand }) {
  const [edit, setEdit] = useState(false)
  const [val, setVal] = useState(command || DEFAULT_COMMAND)
  const { namespace, name, container } = useParams()

  return (
    <Flex
      gap="xsmall"
      marginBottom="xsmall"
      alignItems="stretch"
    >
      <Code
        minWidth={200}
        flexShrink={1}
        flexGrow={1}
      >
        {`kubectl exec ${name} -it -n ${namespace} -c ${container} -- `}
      </Code>
      {!edit && (
        <Code
          flexGrow={1}
          flexShrink={1}
          minWidth="200px"
        >
          {command || DEFAULT_COMMAND}
        </Code>
      )}
      {edit && (
        <Form
          display="flex"
          onSubmit={() => {
            setEdit(false)
            setCommand(val)
          }}
        >
          <Input
            plain
            value={val}
            flexGrow={1}
            flexShrink={1}
            minWidth="200px"
            alignItems="center"
            onChange={({ target: { value } }) => setVal(value)}
          />
        </Form>
      )}
      <Flex alignItems="center">
        <IconFrame
          clickable
          size="medium"
          icon={edit ? <CheckIcon /> : <PencilIcon />}
          textValue={edit ? 'Set command' : 'Change command'}
          tooltip
          onClick={() => {
            if (!edit) {
              setEdit(true)
            }
            else {
              setEdit(false)
              setCommand(val)
            }
          }}
        />
      </Flex>
    </Flex>
  )
}

function ShellWithContext() {
  const [command, setCommand] = useState(DEFAULT_COMMAND)
  const { namespace, name, container } = useParams()
  const shellContext = useContext(ShellContext)

  return (
    <Flex
      flexDirection="column"
      height="100%"
    >
      <PageTitle heading={container}>
        <Flex
          align="center"
          gap="medium"
        >
          <Button
            small
            tertiary
            startIcon={<ReloadIcon />}
            onClick={() => {
              shellContext?.current?.handleResetSize()
            }}
          >
            Repair viewport
          </Button>
          <TerminalThemeSelector />
        </Flex>
      </PageTitle>
      <ShellCommand
        command={command}
        setCommand={setCommand}
      />
      <Terminal
        room={`pod:${namespace}:${name}:${container}`}
        command={command || DEFAULT_COMMAND}
        header={`connecting to pod ${name} using ${command || DEFAULT_COMMAND}...`}
      />
    </Flex>
  )
}

export default function Shell() {
  const ref = useRef<TerminalActions>({ handleResetSize: () => { } })

  return (
    <ShellContext.Provider value={ref}>
      <ShellWithContext />
    </ShellContext.Provider>
  )
}
