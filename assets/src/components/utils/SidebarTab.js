import React, { useCallback, useState } from 'react'
import { Box, Collapsible, Text } from "grommet"
import { Down, Next } from 'grommet-icons'
import { TabSelector } from './TabSelector'

function SubTab({name, enabled, onClick}) {
  return (
    <TabSelector hoverIndicator='card' enabled={enabled} onClick={onClick}>
      <Text size='small' weight={500}>{name}</Text>
    </TabSelector>
  )
}

export function SidebarTab({tab, subtab, setTab, setSubTab, name, subnames}) {
  const [open, setOpen] = useState(tab === name)
  const select = useCallback(() => {
    setTab(tab)
    setOpen(!open)
  }, [tab, setTab, open, setOpen])

  return (
    <>
    <Box flex={false} direction='row' align='center' pad='small' hoverIndicator='card' gap='small' 
         border={{side: 'bottom'}} onClick={select} focusIndicator={false}>
      <Box fill='horizontal'>
        <Text size='small' weight={500}>{name}</Text>
      </Box>
      <Box flex={false}>
        {open ? <Down size='small' /> : <Next size='small' />}
      </Box>
    </Box>
    <Collapsible direction='vertical' open={open}>
      <Box animation='slideDown'>
        {subnames.map((name) => (
          <SubTab 
            key={name} 
            name={name} 
            enabled={name === subtab} 
            onClick={() => setSubTab(name)} />
        ))}
      </Box>
    </Collapsible>
    </>
  )
}