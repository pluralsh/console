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
import styled from 'styled-components'
import { XTerm } from 'xterm-for-react'
import { FitAddon } from 'xterm-addon-fit'
import { useResizeDetector } from 'react-resize-detector'
import debounce from 'lodash/debounce'

import { socket } from 'helpers/client'

import { normalizedThemes } from './themes'
import TerminalThemeContext from './TerminalThemeContext'

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

/* Stolen and adapted from app.plural.sh */
export function Terminal({
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
  const shellContext = useContext(ShellContext)
  const isFirstConnect = useRef(true)

  const getDimensions = useCallback(() => {
    let cols = 80
    let rows = 24

    try {
      if (!xterm.current.terminal.options) {
        // hack around an xterm-addon-fit bug
        xterm.current.terminal.options = {}
      }
      ({ cols, rows } = fitAddon.proposeDimensions() as any)
    }
    catch (error) {
      console.error(error)
    }
    if (cols !== dimensions.cols || rows !== dimensions.rows) {
      setDimensions({ cols, rows })
    }

    return { cols, rows }
  }, [dimensions.cols, dimensions.rows, fitAddon])

  useEffect(() => {
    if (!xterm?.current?.terminal || restart) {
      // eslint-disable-next-line no-unused-expressions
      restart && setRestart(false)

      return
    }

    const term = xterm.current.terminal
    const params = command ? { command } : {}
    const chan = socket.channel(room, params)

    try {
      fitAddon.fit()
    }
    catch (error) {
      console.error(error)
    }

    term.write(`${isFirstConnect.current ? '' : '\r\n\r\n'}${header}\r\n`)
    chan.onError(err => console.error(`Unknown error during booting into your shell: ${JSON.stringify(err)}`))
    chan.on('stdo', ({ message }) => {
      term.write(message)

      // this seems to death spiral sometimes, reverting for now (@mjg)
      // if (!restart && decoded.includes(detachedMessage)) {
      //   setRestart(true)
      // }
    })
    chan.join()

    const { cols, rows } = getDimensions()

    setChannel(chan)

    const ref = socket.onOpen(() => setTimeout(() => chan.push('resize', { width: cols, height: rows }), 1000))

    isFirstConnect.current = false

    return () => {
      socket.off([ref])
      chan.leave()
    }
  }, [xterm, fitAddon, restart, header, command, room, getDimensions])

  const handleResetSize = useCallback(() => {
    if (!channel) return
    channel.push('resize', { width: dimensions.cols, height: dimensions.rows })
  }, [channel, dimensions])

  useEffect(() => {
    handleResetSize()
  }, [handleResetSize])

  const handleResize = useCallback(({ cols, rows }) => {
    if (!channel) return
    channel.push('resize', { width: cols, height: rows })
  },
  [channel])

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

  useImperativeHandle(shellContext, () => ({ handleResetSize }), [
    handleResetSize,
  ])

  return (
    <TerminalWrapper
      ref={ref}
      $backgroundColor={normalizedThemes[terminalTheme].background}
    >
      <XTerm
        className="terminal"
        ref={xterm}
        addons={[fitAddon]}
        options={{ theme: normalizedThemes[terminalTheme] }}
        onResize={handleResize}
        onData={handleData}
      />
    </TerminalWrapper>
  )
}

export type TerminalActions = { handleResetSize: () => void }
export const ShellContext = createContext<MutableRefObject<TerminalActions>>({
  current: { handleResetSize: () => {} },
})
