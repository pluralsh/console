import React, { useContext, useEffect, useRef, useState } from 'react'
import { Box, Drop, Select, Text } from 'grommet'
import { canEdit } from './Incident'
import { Down } from 'grommet-icons'
import { LoginContext } from '../Login'

const severityOptions = [0, 1, 2, 3, 4, 5].map((sev) => ({value: sev, label: `SEV ${sev}`}))

const SeverityStatusOption = ({value}, {active}) => {
  const color = severityColor(value)

  return (
    <Box direction='row' background={active ? 'active' : null} gap='xsmall' align='center' 
         pad={{vertical: 'xsmall', horizontal: 'small'}}>
      <Box flex={false} background={color} round='xsmall' pad={{horizontal: 'xsmall', vertical: '1px'}}>
        <Text size='small' weight={500}>SEV {value}</Text> 
      </Box>
    </Box>
  )
}

function SeverityOption({value, active, setActive}) {
  const color = severityColor(value)

  return (
    <Box direction='row' background={active ? 'active' : null} gap='xsmall' align='center' hoverIndicator='light-2'
         pad={{vertical: 'xsmall', horizontal: 'small'}} onClick={() => setActive(value)}>
      <Box flex={false} background={color} round='xsmall' pad={{horizontal: 'xsmall', vertical: '1px'}}>
        <Text size='small' weight={500}>SEV {value}</Text> 
      </Box>
    </Box>
  )
}

export function SeveritySelect({severity, setSeverity}) {
  return (
    <Select 
      multiple={false}
      options={severityOptions}
      valueKey={{key: 'value', reduce: true}}
      labelKey='label'
      value={severity}
      onChange={({value}) => setSeverity(value)}
    >
      {SeverityStatusOption}
    </Select>
  )
}

export function severityColor(severity) {
  if (severity < 2) return 'error'
  if (severity >= 2 && severity < 4) return 'status-warning'
  if (severity === 4) return 'light-4'
  return 'progress'
}

export function Severity({incident: {severity}, setSeverity}) {
  const ref = useRef()
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)
  const color = severityColor(severity)
  useEffect(() => setOpen(false), [severity])

  return (
    <>
    <Box ref={ref} flex={false} background={color} round='xsmall' align='center' direction='row' gap='xsmall'
         pad={{horizontal: 'xsmall', vertical: '1px'}} onClick={() => setOpen(true)} focusIndicator={false}
         onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Text size='small' weight={500}>SEV {severity}</Text> 
      {(hover || open) && <Down size='small' />}
    </Box>
    {open && (
      <Drop target={ref.current} align={{top: 'bottom'}} onClickOutside={() => setOpen(false)}>
        <Box width='150px'>
          {severityOptions.map(({value, label}) => (
            <SeverityOption key={value} value={value} label={label} active={severity === value} setActive={setSeverity || (() => null)} />
          ))}
        </Box>
      </Drop>
    )}
    </>
  )
}