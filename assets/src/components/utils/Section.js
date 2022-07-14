import React, { useContext, useMemo, useState } from 'react'
import { Portal } from 'react-portal'
import { Box, Text } from 'grommet'
import { v4 as uuidv4 } from 'uuid'

export const SectionContext = React.createContext({})

export function SectionPortal({ children }) {
  const { ref } = useContext(SectionContext)

  return (
    <Portal node={ref}>
      {children}
    </Portal>
  )
}

export function SectionChoice({ label, icon, selected, onClick }) {
  return (
    <Box
      focusIndicator={false}
      hoverIndicator="sidebar"
      background={selected ? 'sidebar' : null}
      direction="row"
      align="center"
      gap="small"
      pad="small"
      round="xsmall"
      onClick={onClick}
    >
      {React.createElement(icon, { size: '15px' })}
      <Text size="small">{label}</Text>
    </Box>
  )
}

export function SectionContentContainer({ header, children }) {
  const [ref, setRef] = useState(null)
  const id = useMemo(() => uuidv4(), [])

  return (
    <SectionContext.Provider value={{ id, ref }}>
      <Box fill>
        <Box
          flex={false}
          direction="row"
          pad="small"
          height="45px"
          border={{ side: 'bottom' }}
          align="center"
        >
          <Box fill="horizontal">
            <Text
              size="small"
              weight={500}
            >{header}
            </Text>
          </Box>
          <Box
            ref={setRef}
            id={id}
            flex={false}
          />
        </Box>
        <Box fill>
          {children}
        </Box>
      </Box>
    </SectionContext.Provider>
  )
}
