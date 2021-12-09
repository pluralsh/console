import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Text } from 'grommet'
import { socket } from '../../helpers/client'
import { XTerm } from 'xterm-for-react'
import { Dracula } from 'xterm-theme'
import { FitAddon } from 'xterm-addon-fit'
import './shell.css'
import { normalizedThemes, savedTheme } from './themes'
import { ThemeSelector } from './ThemeSelector'

export function Shell({title, room, header}) {
  const xterm = useRef(null)
  const [channel, setChannel] = useState(null)
  const fitAddon = useMemo(() => new FitAddon(), [])
  const [theme, setTheme] = useState(savedTheme() || 'argonaut')

  useEffect(() => {
    if (!xterm.current?.terminal) return
    fitAddon.fit()
    xterm.current.terminal.write(header + "\r\n")
    const chan = socket.channel(room)
    chan.on("stdo", ({message}) => xterm.current?.terminal?.write(message))
    chan.join()
    setChannel(chan)
    return () => chan.leave()
  }, [room, xterm, fitAddon])

  return (
    <Box fill background='backgroundColor'>
      <Box flex={false} pad='small' direction='row' align='center'>
        <Box fill='horizontal' direction='row' align='center'>
          <Text size='small'>{title}</Text>
        </Box>
        <ThemeSelector theme={theme} setTheme={setTheme} />
      </Box>
      <Box fill pad={{horizontal: 'small', bottom: 'small'}} border>
        <XTerm 
          className='terminal'
          ref={xterm}
          addons={[fitAddon]}
          options={{theme: normalizedThemes[theme]}}
          onData={(text) => (
            channel.push("command", {cmd: text})
          )} />
      </Box>
    </Box>
  )
}