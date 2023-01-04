import { ignoreEvent } from 'components/utils/events'
import { Box, Text } from 'grommet'
import React, { useContext, useEffect, useState } from 'react'
import { Portal } from 'react-portal'
import { useNavigate } from 'react-router-dom'

export const SubmenuContext = React.createContext({})

export function SubmenuPortal({ children, name }) {
  const { ref, setName } = useContext(SubmenuContext)

  useEffect(() => setName(name), [name, setName])

  return (
    <Portal node={ref}>
      <Box pad={{ vertical: 'xsmall' }}>
        {children}
      </Box>
    </Portal>
  )
}

export function Submenu() {
  const { setRef } = useContext(SubmenuContext)

  return (
    <Box
      ref={setRef}
      flex={false}
    />
  )
}

export function SubmenuItem({
  icon, label, selected, url,
}) {
  const navigate = useNavigate()

  return (
    <Box
      background={selected ? 'sidebarHover' : null}
      focusIndicator={false}
      hoverIndicator="sidebarHover"
      direction="row"
      align="center"
      gap="small"
      pad={{ right: 'small', vertical: '7px', left: '20px' }}
      onClick={e => {
        ignoreEvent(e); navigate(url)
      }}
    >
      {icon}
      <Box fill="horizontal">
        <Text size="small">{label}</Text>
      </Box>
    </Box>
  )
}

export function NavigationContext({ children }) {
  const [ref, setRef] = useState(null)
  const [name, setName] = useState('')

  return (
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    <SubmenuContext.Provider value={{
      ref, setRef, name, setName,
    }}
    >
      {children}
    </SubmenuContext.Provider>
  )
}
