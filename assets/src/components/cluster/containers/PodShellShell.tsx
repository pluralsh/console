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

import {
  MutableRefObject,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useResizeDetector } from 'react-resize-detector'

import { XTerm } from 'xterm-for-react'
import { FitAddon } from 'xterm-addon-fit'

import { socket } from 'helpers/client'

import { normalizedThemes } from 'components/terminal/themes'
import TerminalThemeContext from 'components/terminal/TerminalThemeContext'
import TerminalThemeSelector from 'components/terminal/TerminalThemeSelector'
import { Flex, Form } from 'honorable'
import debounce from 'lodash/debounce'
import { useParams } from 'react-router-dom'
import styled from 'styled-components'

const ShellStyleWrapper = styled.div<{ $backgroundColor: string }>(({ theme, $backgroundColor }) => ({
  backgroundColor: $backgroundColor,
  display: 'flex',
  flexGrow: 1,
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.default,
  padding: theme.spacing.medium,
  height: '100%',
  width: '100%',
  position: 'relative',
  '.terminal': {
    height: '100%',
    width: '100%',
    overflowY: 'auto',
  },
  '.xterm-viewport': {
    overflowY: 'auto',
  },
  '.xterm-screen': {
    width: 'auto !important',
  },
}))

function Terminal({
  room,
  header,
  command,
}: {
  room
  header
  command: string
}) {
  const xterm = useRef<any>(null)
  const [channel, setChannel] = useState<any>(null)
  const [dimensions, setDimensions] = useState<any>({})
  const fitAddon = useMemo(() => new FitAddon(), [])
  const [terminalTheme] = useContext(TerminalThemeContext)
  const [restart, setRestart] = useState(false)
  const [fitted, setFitted] = useState(false)
  const [retry, setRetry] = useState(0)
  const shellContext = useContext(ShellContext)

  /* Stolen from app.plural.sh */

  useEffect(() => {
    if (!xterm?.current?.terminal || restart) {
      // eslint-disable-next-line no-unused-expressions
      restart && setRestart(false)

      return
    }

    const term = xterm.current.terminal

    term.options = {} // hack around an xterm-addon-fit bug
    const params = command ? { command } : {}
    const chan = socket.channel(room, params)

    term.write(`${header}\r\n\r\n`)
    chan.onError(err => console.error(`Unknown error during booting into your shell: ${JSON.stringify(err)}`))
    chan.on('stdo', ({ message }) => {
      term.write(message)

      // this seems to death spiral sometimes, reverting for now (@mjg)
      // if (!restart && decoded.includes(detachedMessage)) {
      //   setRestart(true)
      // }
    })
    chan.join()
    setChannel(chan)

    return () => {
      chan.leave()
    }
  }, [xterm, restart, command, room, header])

  const handleResize = useCallback(({ cols, rows }) => {
    if (!channel) return
    channel.push('resize', { width: cols, height: rows })
  },
  [channel])

  useEffect(() => {
    if (fitted || !xterm?.current?.terminal || !channel) return

    try {
      fitAddon.fit()
      const { cols, rows } = fitAddon.proposeDimensions() as any

      handleResize({ cols, rows })
      setDimensions({ cols, rows })
      setFitted(true)
    }
    catch (error) {
      console.error(error)
      console.log(`retrying fitting window, retries ${retry}`)
      setTimeout(() => setRetry(retry + 1), 1000)
    }
  }, [
    xterm,
    fitAddon,
    setFitted,
    fitted,
    channel,
    handleResize,
    retry,
    setRetry,
    setDimensions,
  ])

  const handleResetSize = useCallback(() => {
    console.log('handleResetSize')
    if (!channel) return
    channel.push('resize', { width: dimensions.cols, height: dimensions.rows })
  }, [channel, dimensions])

  useImperativeHandle(shellContext, () => ({ handleResetSize }), [
    handleResetSize,
  ])

  const { ref } = useResizeDetector({
    onResize: debounce(() => {
      if (!channel) return
      fitAddon.fit()
      handleResize(fitAddon.proposeDimensions() as any as any)
    },
    500,
    { leading: true }),
  })

  const handleData = useCallback(text => channel.push('command', { cmd: text }),
    [channel])

  return (
    <ShellStyleWrapper
      ref={ref}
      $backgroundColor={normalizedThemes[terminalTheme].background}
    >
      <XTerm
        className="terminal"
        ref={xterm}
        addons={[fitAddon]}
        options={{ theme: normalizedThemes[terminalTheme] }}
        onResize={({ cols, rows }) => {
          if (channel) channel.push('resize', { width: cols, height: rows })
        }}
        onData={handleData}
      />
    </ShellStyleWrapper>
  )
}

function ShellTitle({ command, setCommand }) {
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
        {`kubectl exec ${name} -it -n ${namespace} -c ${container}`}
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

const DEFAULT_COMMAND = '/bin/sh'

type ShellContextVal = { handleResetSize: () => void }
const ShellContext = createContext<MutableRefObject<ShellContextVal>>({
  current: { handleResetSize: () => {} },
})

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
      <ShellTitle
        command={command}
        setCommand={setCommand}
      />
      <Terminal
        room={`pod:${namespace}:${name}:${container}`}
        command={command || DEFAULT_COMMAND}
        header={`connecting to pod ${name} using ${
          command || DEFAULT_COMMAND
        }...`}
      />
    </Flex>
  )
}

export default function Shell() {
  const ref = useRef<ShellContextVal>({ handleResetSize: () => {} })

  return (
    <ShellContext.Provider value={ref}>
      <ShellWithContext />
    </ShellContext.Provider>
  )
}
