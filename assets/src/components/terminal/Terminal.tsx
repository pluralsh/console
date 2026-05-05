import 'xterm/css/xterm.css'

import { debounce } from 'lodash'
import { use, useCallback, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'

import { socket } from 'helpers/client'

import TerminalThemeContext from './TerminalThemeContext'
import { normalizedThemes } from './themes'

enum ChannelEvent {
  OnData = 'command',
  OnResize = 'resize',
  OnResponse = 'stdo',
}

const onConnectionError = (err) =>
  console.error(
    `Unknown error during booting into your shell: ${JSON.stringify(err)}`
  )

const TerminalWrapper = styled.div<{ $backgroundColor: string }>(
  ({ theme, $backgroundColor }) => ({
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
  })
)

export function TerminalScreen({
  room,
  header,
  command,
}: {
  room: string
  header: string
  command: string
}) {
  const [terminalTheme] = use(TerminalThemeContext)
  const isFirstConnect = useRef(true)

  const terminalElRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const channelRef = useRef<any>(null)
  const themeRef = useRef(terminalTheme)

  const onResize = useCallback(() => {
    const fitAddon = fitAddonRef.current
    const xterm = xtermRef.current
    if (!fitAddon || !xterm) return

    let { cols = 0, rows = 0 } = fitAddon.proposeDimensions() || {}
    cols = Number.isNaN(cols) ? 0 : cols
    rows = Number.isNaN(rows) ? 0 : rows
    xterm.resize(cols, rows)
    channelRef.current?.push(ChannelEvent.OnResize, {
      width: cols,
      height: rows,
    })
  }, [])

  useEffect(() => {
    if (!terminalElRef.current) return

    const xterm = new Terminal({
      cursorBlink: true,
      theme: normalizedThemes[themeRef.current],
    })
    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)
    xterm.open(terminalElRef.current)
    xterm.write(`${isFirstConnect.current ? '' : '\r\n\r\n'}${header}\r\n`)
    fitAddon.fit()

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    const channel = socket.channel(room, command ? { command } : {})
    channelRef.current = channel

    xterm.onData((text) => channel.push(ChannelEvent.OnData, { cmd: text }))
    channel.onError(onConnectionError)

    let didResizeAfterFirstMessage = false
    channel.on(ChannelEvent.OnResponse, ({ message }) => {
      xterm.write(message)
      if (!didResizeAfterFirstMessage && message.trim() !== '') {
        didResizeAfterFirstMessage = true
        onResize()
      }
    })
    channel.join()

    onResize()
    isFirstConnect.current = false

    return () => {
      channel.leave()
      xterm.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
      channelRef.current = null
      isFirstConnect.current = true
    }
  }, [header, command, room, onResize])

  useEffect(() => {
    themeRef.current = terminalTheme
    if (xtermRef.current)
      xtermRef.current.options.theme = normalizedThemes[terminalTheme]
  }, [terminalTheme])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const debounced = debounce(onResize, 250)
    const observer = new ResizeObserver(() => debounced())
    observer.observe(el)
    return () => {
      observer.disconnect()
      debounced.cancel()
    }
  }, [onResize])

  return (
    <TerminalWrapper
      id="terminal-wrapper"
      ref={containerRef}
      $backgroundColor={normalizedThemes[terminalTheme].background}
    >
      <div
        id="terminal"
        className="terminal"
        ref={terminalElRef}
      />
    </TerminalWrapper>
  )
}
