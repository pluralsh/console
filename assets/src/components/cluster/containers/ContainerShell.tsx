import {
  Button,
  CliIcon,
  CloseIcon,
  Input,
  PageTitle,
  PencilIcon,
  ReloadIcon,
} from '@pluralsh/design-system'
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  Div,
  Flex,
  Form,
  Span,
} from 'honorable'
import { useParams } from 'react-router-dom'

import TerminalThemeSelector from 'components/terminal/TerminalThemeSelector'

import styled from 'styled-components'

import { ShellContext, Terminal, TerminalActions } from '../../terminal/Terminal'

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
    '&, *':
    {
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

const CodeWrap = styled.div<{ $isEditing: boolean }>(({ theme, $isEditing }) => ({
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
  setCommand: Dispatch<SetStateAction<string | null>>
  isDefault: boolean
  defaultCommand: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputVal, setInputVal] = useState(command)
  const { namespace, name, container } = useParams()
  const inputRef = useRef<any>()

  useEffect(() => {
    if (isEditing) {
      console.log('inputRef', inputRef.current)
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
    <Div
      display="flex"
      gap="xsmall"
      marginBottom="xsmall"
      onSubmit={e => {
        e.preventDefault()
        setIsEditing(false)
        console.log('inputVal', inputVal)
        setCommand(inputVal)
      }}
      width="100%"
    >
      <Flex
        className="flex outer"
        width="50%"
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
            ref={inputRef}
            placeholder={defaultCommand}
            value={inputVal}
            prefix={commandLeftTrunc}
            onChange={({ target: { value } }) => {
              setInputVal(value)
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
          onClick={() => {
            setIsEditing(false)
          }}
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
    </Div>
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

  console.log('command', command)

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
        defaultCommand={defaultCommand}
        isDefault={isDefault}
        setCommand={setCommand}
      />
      <Terminal
        room={`pod:${namespace}:${name}:${container}`}
        command={command}
        header={`connecting to pod ${name} using ${command}...`}
      />
    </Flex>
  )
}

export default function Shell() {
  const ref = useRef<TerminalActions>({ handleResetSize: () => {} })

  return (
    <ShellContext.Provider value={ref}>
      <ShellWithContext />
    </ShellContext.Provider>
  )
}
