import React, { useEffect, useRef, useState } from 'react'
import { Box } from 'grommet'
import { socket } from '../../helpers/client'
import { XTerm } from 'xterm-for-react'
import { Dracula } from 'xterm-theme'

export function Shell({room, header}) {
  const xterm = useRef(null)
  const [channel, setChannel] = useState(null)
  useEffect(() => {
    if (!xterm && !xterm.current && !xterm.current.terminal) return
    xterm.current.terminal.writeln(header + "\n\n")
    console.log(socket)
    const chan = socket.channel(room)
    chan.on("stdo", ({message}) => xterm.current.terminal.writeln(message))
    console.log(chan)
    chan.join()
    setChannel(chan)
    return chan.leave
  }, [room, xterm])

  return (
    <Box fill background='backgroundColor'>
      <XTerm 
        ref={xterm}
        options={{theme: Dracula}}
        onData={(text) => (
          channel.push("command", {cmd: text})
            .receive("ok", console.log)
            .receive("error", console.log)
        )} />
    </Box>
  )
}