import React, { useContext, useRef, useState } from 'react'
import { Checkmark, StatusWarning } from 'grommet-icons'
import { Box, Drop, Text, ThemeContext } from 'grommet'
import { normalizeColor } from 'grommet/utils'
import { ignore } from '../kubernetes/Pod'
import moment from 'moment'
import { SEVERITY_COLORS } from './constants'

function Warning({size, color}) {
  return <Text size={size} color={color}>!!</Text>
}

const ICON_DATA = {
  Healthy: {icon: Checkmark, color: 'success'},
  Alert: {icon: Warning, color: 'orange'},
}

const shadow = (color, theme) => ({boxShadow: `0 0 10px ${normalizeColor(color, theme)}`})

function Alert({alert, hasNext}) {
  const sev = alert.labels.severity || 'info'
  return (
    <Box direction='row' gap='small' align='center' border={hasNext ? 'bottom' : null}>
      <Box flex={false} background={SEVERITY_COLORS[sev]} round='1px' pad={{horizontal: 'small', vertical: 'xsmall'}}>
        <Text size='small' color='plrl-white'>{sev}</Text>
      </Box>
      <Box>
        <Text size='small' weight={500}>{alert.name}</Text>
        <Box direction='row' align='center' gap='xsmall'>
          <Text size='small' truncate>{alert.annotations && alert.annotations.summary}</Text>
          <Box flex={false}>
            <Text size='small' color='dark-3'>-- {moment(alert.startsAt).format('lll')}</Text>
          </Box>
        </Box>
      </Box>
    </Box> 
  )
}

function Alerts({alerts}) {
  const len = alerts.length
  return (
    <Box style={{maxWidth: '600px'}} background='plrl-white' pad='small'>
      {alerts.map((alert, ind) => <Alert key={`${ind}`} alert={alert} hasNext={ind < len - 1} />)}
    </Box>
  )
}

export function StatusIcon({status, size, innerSize}) {
  const ref = useRef()
  const theme = useContext(ThemeContext)
  const [hover, setHover] = useState(false)
  const [open, setOpen] = useState(false)
  const outer = `${size}px`
  const alerts = status ? status.alerts : []
  const healthy = alerts.length == 0
  const {icon, color} = ICON_DATA[healthy ? 'Healthy' : 'Alert']

  return (
    <>
    <Box ref={ref} round='full' height={outer} width={outer} 
         align='center' justify='center' background={color}
         onClick={(e) => { ignore(e); !healthy && setOpen(true) }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
         style={hover && !healthy ? null : shadow(color, theme)}>
      {React.createElement(icon, {size: `${innerSize}px`, color: 'plrl-white'})}
    </Box>
    {open && !healthy && (
      <Drop target={ref.current} align={{left: 'right'}} onClickOutside={() => setOpen(false)}>
        <Alerts alerts={alerts} />
      </Drop>
    )}
    </>
  )
}