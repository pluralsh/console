import React, { useContext, useRef, useState } from 'react'
import { Checkmark, Previous } from 'grommet-icons'
import { Box, Drop, Text, ThemeContext } from 'grommet'
import { normalizeColor } from 'grommet/utils'
import { ignore } from '../kubernetes/Pod'
import { SEVERITY_COLORS } from './constants'
import { MetadataRow, MetadataTag } from '../kubernetes/Metadata'
import moment from 'moment'

function Warning({size, color}) {
  return <Text size={size} color={color}>!!</Text>
}

const ICON_DATA = {
  Healthy: {icon: Checkmark, color: 'success'},
  Alert: {icon: Warning, color: 'orange'},
}

const shadow = (color, theme) => ({boxShadow: `0 0 10px ${normalizeColor(color, theme)}`})

function SeverityNub({sev}) {
  return (
    <Box flex={false} background={SEVERITY_COLORS[sev]} round='1px' pad={{horizontal: 'small', vertical: 'xsmall'}}>
      <Text size='small' color='plrl-white'>{sev}</Text>
    </Box>
  )
}

function AlertDetail({alert, setAlert}) {
  const sev = alert.labels.severity || 'info'
  const {summary, description, ...rest} = alert.annotations

  return (
    <Box pad='small' gap='small' background='plrl-white'>
      <Box direction='row' align='center' gap='small'>
        <Box flex={false} pad='small' round='xsmall' hoverIndicator='tone-light' 
             onClick={(e) => { ignore(e); setAlert(null)}}>
          <Previous size='15px' color='brand' />
        </Box>
        <SeverityNub sev={sev} />
        <Text size='small' weight={500}>{alert.name}</Text>
      </Box>
      <Box>
        <MetadataRow name='summary'>
          <Text size='small'>{summary}</Text>
        </MetadataRow>
        <MetadataRow name='description'>
          <Text size='small'>{description}</Text>
        </MetadataRow>
        <MetadataRow name='labels'>
          {Object.entries(alert.labels).map(([name, value]) => <MetadataTag key={name} background='tone-light' name={name} value={value} />)}
        </MetadataRow>
        <MetadataRow name='annotations' final>
          {Object.entries(rest).map(([name, value]) => <MetadataTag key={name} background='tone-light' name={name} value={value} />)}
        </MetadataRow>
      </Box>
    </Box>
  )
}

function Alert({alert, hasNext, setAlert}) {
  const sev = alert.labels.severity || 'info'
  return (
    <Box direction='row' gap='small' align='center' pad='small' border={hasNext ? 'bottom' : null}
         onClick={(e) => { ignore(e); setAlert(alert) }} hoverIndicator='tone-light' round='xsmall'>
      <SeverityNub sev={sev} />
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
  const [alert, setAlert] = useState(null)

  if (alert) return <AlertDetail alert={alert} setAlert={setAlert} />

  return (
    <Box style={{maxWidth: '600px'}} background='plrl-white' pad='xsmall'>
      {alerts.map((alert, ind) => (
        <Alert
           key={`${ind}`} 
           alert={alert} 
           setAlert={setAlert}
           hasNext={ind < len - 1} />
      ))}
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