import 'xterm/css/xterm.css'

import {
  MutableRefObject,
  Ref,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import styled from 'styled-components'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { useResizeDetector } from 'react-resize-detector'

import { socket } from 'helpers/client'

import { Div } from 'honorable'

import { normalizedThemes } from './themes'
import TerminalThemeContext from './TerminalThemeContext'

enum ChannelEvent {
  OnData = 'command',
  OnResize = 'resize',
  OnResponse = 'stdo',
}

const onConnectionError = err => console.error(`Unknown error during booting into your shell: ${JSON.stringify(err)}`)

const resize = (fitAddon: FitAddon, channel: any, terminal: Terminal) => {
  let { cols = 0, rows = 0 } = fitAddon.proposeDimensions() || {}

  cols = Number.isNaN(cols) ? 0 : cols
  rows = Number.isNaN(rows) ? 0 : rows

  terminal.resize(cols, rows)
  if (channel) {
    channel.push(ChannelEvent.OnResize, { width: cols, height: rows })
  }
}

const TerminalWrapper = styled.div<{ $backgroundColor: string }>(({ theme, $backgroundColor }) => ({
  backgroundColor: $backgroundColor,
  display: 'flex',
  flexGrow: 1,
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.default,
  padding: theme.spacing.medium,
  '.terminal': {
    height: '100%',
    width: '100%',
  },
  '.xterm-screen': {
    width: 'auto !important',
  },
}))

/* Stolen and adapted from app.plural.sh */
export function TerminalScreen({
  room,
  header,
  command,
}: {
  room: string
  header: string
  command: string
}) {
  const shellContext = useContext(ShellContext)
  const isFirstConnect = useRef(true)

  const terminalRef = useRef<HTMLElement>()
  const [terminalTheme] = useContext(TerminalThemeContext)

  const [channel, setChannel] = useState()
  const [loaded, setLoaded] = useState(false)

  const terminal = useMemo(() => new Terminal({
    cursorBlink: true,
    theme: normalizedThemes[terminalTheme],
  }),
  [terminalTheme])
  const fitAddon = useMemo(() => new FitAddon(), [])

  const onResize = useCallback(() => {
    resize(fitAddon, channel, terminal)
  }, [channel, fitAddon, terminal])

  useImperativeHandle(shellContext, () => ({ handleResetSize: onResize }), [
    onResize,
  ])

  useEffect(() => {
    onResize()
  }, [onResize])

  const { ref: terminalContainerRef } = useResizeDetector({
    onResize,
    refreshMode: 'debounce',
    refreshRate: 250,
  })

  const [terminalMounted, setTerminalMounted] = useState(false)

  // Mount the terminal
  useEffect(() => {
    if (!terminalRef.current) return

    // Load addon
    terminal.loadAddon(fitAddon)

    // Set up the terminal
    terminal.open(terminalRef.current!)

    // Welcome message
    // terminal.write(`${isFirstConnect.current ? '' : '\r\n\r\n'}${header}\r\n`)
    setTerminalMounted(true)
  }, [fitAddon, terminal])

  // Init the connection
  //   Needs to be separate so we don't open new terminals every time we connect
  //   with a new command
  useEffect(() => {
    if (!terminalMounted) return

    // Welcome message
    terminal.write(`${isFirstConnect.current ? '' : '\r\n\r\n'}${header}\r\n`)

    // Fit the size of terminal element
    fitAddon.fit()

    // Init the connection
    const params = command ? { command } : {}
    const channel = socket.channel(room, params)

    // Handle input
    terminal.onData(text => channel.push(ChannelEvent.OnData, { cmd: text }))

    channel.onError(onConnectionError)
    channel.on(ChannelEvent.OnResponse, ({ message }) => {
      if (message.trim() !== '') {
        setLoaded(true)
      }

      terminal.write(message)
    })
    channel.join()

    setChannel(channel)
    isFirstConnect.current = false

    return () => channel.leave() || terminal.dispose()
  }, [terminalMounted, fitAddon, header, command, room, terminal])

  // Resize after initial response when shell is loaded
  useEffect(() => {
    if (loaded) resize(fitAddon, channel, terminal)
  }, [channel, fitAddon, loaded, terminal])

  return (
    <TerminalWrapper
      id="terminal-wrapper"
      ref={terminalContainerRef}
      $backgroundColor={normalizedThemes[terminalTheme].background}
    >
      <Div
        id="terminal"
        className="terminal"
        ref={terminalRef as Ref<any>}
      />
    </TerminalWrapper>
  )
}

export type TerminalActions = { handleResetSize: () => void }
export const ShellContext = createContext<MutableRefObject<TerminalActions>>({
  current: { handleResetSize: () => {} },
})
