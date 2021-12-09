import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box } from 'grommet'
import { socket } from '../../helpers/client'
import { XTerm } from 'xterm-for-react'
import { Dracula } from 'xterm-theme'
import { FitAddon } from 'xterm-addon-fit'
import './shell.css'

export function Shell({room, header}) {
  const xterm = useRef(null)
  const [channel, setChannel] = useState(null)
  const fitAddon = useMemo(() => new FitAddon(), [])

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
      <XTerm 
        className='terminal'
        ref={xterm}
        addons={[fitAddon]}
        options={{theme: Dracula}}
        onData={(text) => (
          channel.push("command", {cmd: text})
        )} />
    </Box>
  )
}