import React, { useContext, useEffect, useState } from 'react'
import { Box, ThemeContext } from 'grommet'
import { socket } from '../../helpers/client'
import Terminal from 'terminal-in-react'
import { normalizeColor } from 'grommet/utils'

export function Shell({room, header}) {
  const theme = useContext(ThemeContext)
  const [channel, setChannel] = useState(null)
  useEffect(() => {
    const channel = socket.channel(room)
    setChannel(channel)
    channel.join()
    return channel.leave
  }, [room])

  return (
    <Box fill background='backgroundColor'>
      <Terminal
        backgroundColor={normalizeColor('backgroundColor', theme)}
        color='white'
        prompt='white'
        msg={header}
        hideTopBar={true}
        commandPassThrough={(cmd, print) => {
          channel.push('command', {cmd}, 10000)
            .receive('ok', ({stdout}) => print(stdout))
        }} />
    </Box>
  )
}