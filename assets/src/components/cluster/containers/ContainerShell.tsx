import {
  Button,
  CliIcon,
  CloseIcon,
  IconFrame,
  Input,
  PencilIcon,
  ReloadIcon,
  ToolIcon,
  Tooltip,
} from '@pluralsh/design-system'
import {
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Flex, Form, Span } from 'honorable'
import { useParams } from 'react-router-dom'

import TerminalThemeSelector from 'components/terminal/TerminalThemeSelector'

import styled from 'styled-components'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { ShellContext, TerminalActions, TerminalScreen } from '../../terminal/Terminal'

export const DEFAULT_COMMAND = '/bin/sh'

const CodeInput = styled(Input)(({ theme }) => ({
  display: 'flex',
  flexGrow: 1,
  flexShrink: 1,
  alignItems: 'center',
  'input, div': {
    ...theme.partials.text.code,
  },
  '& > div': {
    maxWidth: '70%',
    justifyContent: 'left',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    '&, *': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      textAlign: 'left',
      justifyContent: 'left',
    },
  },
}))

const CODELINE_HEIGHT = 42

const CodeLine = styled(({ children, ...props }) => (
  <div {...props}>
    <div>{children}</div>
  </div>
))(({ theme }) => ({
  ...theme.partials.text.code,
  position: 'relative',
  overflowX: 'auto',
  overflowY: 'hidden',
  height: CODELINE_HEIGHT,
  whiteSpace: 'nowrap',
  border: theme.borders.input,
  borderRadius: theme.borderRadiuses.medium,
  color: theme.colors['text-xlight'],
  backgroundColor: theme.colors['fill-one'],
  div: {
    display: 'flex',
    alignItems: 'center',
    position: 'absolute',
    paddingLeft: theme.spacing.small,
    paddingRight: theme.spacing.small,
    top: 0,
    height: CODELINE_HEIGHT - theme.borderWidths.default * 2,
  },
}))

function truncRight(str: string, amt: number) {
  return str.slice(str.length - amt, str.length)
}
function truncLeft(str: string, amt: number) {
  return str.slice(0, amt)
}

const CodeWrap = styled.div<{ $isEditing: boolean }>(({ $isEditing }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'stretch',
  overflowX: 'hidden',
  ...($isEditing ? { width: 0 } : { flexGrow: 1, flexShrink: 1 }),
}))

export function ShellCommand({
  command,
  setCommand,
  isDefault,
  defaultCommand,
}: {
  command: string
  setCommand: (arg: string | null) => void
  isDefault: boolean
  defaultCommand: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputVal, setInputVal] = useState(command)
  const { namespace, name, container } = useParams()
  const inputWrapRef = useRef<HTMLDivElement>()

  useEffect(() => {
    if (!isEditing) {
      setInputVal(command)
    }
  }, [command, isEditing])

  useEffect(() => {
    if (isEditing && inputWrapRef.current) {
      const input = inputWrapRef.current.querySelector('input')

      input?.focus()
    }
  }, [isEditing])

  const commandLeft = `kubectl exec ${name} -it -n ${namespace} -c ${container} -- `
  const commandLeftTrunc = (
    <span>
      {truncLeft(commandLeft, 13)}
      <Span color="text-xlight">...</Span>
      {truncRight(commandLeft, 20)}
    </span>
  )

  return (
    <Form
      display="flex"
      gap="xsmall"
      onSubmit={e => {
        e.preventDefault()
        setCommand(inputVal)
        setIsEditing(false)
      }}
      width="100%"
    >
      <Flex
        ref={inputWrapRef as any}
        width="50px"
        flex="1 1"
      >
        <CodeWrap
          $isEditing={isEditing}
          className="codeWrap"
        >
          <CodeLine className="codeEdit">{`${commandLeft}${command}`}</CodeLine>
        </CodeWrap>
        {isEditing && (
          <CodeInput
            placeholder={defaultCommand}
            value={inputVal}
            prefix={commandLeftTrunc}
            onChange={({ target: { value } }) => {
              setInputVal(value)
            }}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.code.toLowerCase() === 'escape') {
                setIsEditing(false)
              }
            }}
          />
        )}
      </Flex>
      {!isEditing && (
        <Button
          floating
          size="medium"
          startIcon={<PencilIcon />}
          onClick={() => {
            setIsEditing(true)
          }}
        >
          Edit
        </Button>
      )}
      {isEditing && (
        <Button
          floating
          size="medium"
          startIcon={<CliIcon />}
          type="submit"
        >
          Run
        </Button>
      )}
      {(isEditing || !isDefault) && (
        <Button
          secondary
          size="medium"
          startIcon={<CloseIcon />}
          onClick={() => {
            setCommand(null)
            setIsEditing(false)
          }}
        >
          Reset
        </Button>
      )}
    </Form>
  )
}

const useCommand = (initialCommand?: string | null) => {
  const [command, setCommand] = useState(initialCommand || DEFAULT_COMMAND)
  const setCommandSafe: (arg: string | null) => void = newCmd => {
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

function ShellWithContext() {
  const {
    command, setCommand, defaultCommand, isDefault,
  } = useCommand(null)
  const { namespace, name, container } = useParams()
  const shellContext = useContext(ShellContext)

  console.log('shell with context')

  return (
    <Flex
      direction="column"
      height="100%"
      gap="medium"
    >
      <Flex
        gap="medium"
      >
        <ShellCommand
          command={command}
          defaultCommand={defaultCommand}
          isDefault={isDefault}
          setCommand={setCommand}
        />
        <Tooltip label="Repair viewport">
          <Button
            floating
            small
            onClick={() => {
              shellContext?.current?.handleResetSize()
            }}
          ><ToolIcon size={16} />
          </Button>
        </Tooltip>
        {/* <TerminalThemeSelector /> */}
      </Flex>

      <TerminalScreen
        room={`pod:${namespace}:${name}:${container}`}
        command={command}
        header={`Connecting to pod ${name} using ${command}...`}
        height="100%"
      />
    </Flex>
  )
}

export default function Shell() {
  const ref = useRef<TerminalActions>({ handleResetSize: () => {} })

  console.log('shell')

  return (
    <ShellContext.Provider value={ref}>
      <ShellWithContext />
    </ShellContext.Provider>
  )
}
