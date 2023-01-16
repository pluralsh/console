import React, { useRef, useState } from 'react'
import { Box, Text } from 'grommet'

import { TooltipContent } from 'forge-core'

export function Icon({
  icon, iconAttrs, tooltip, onClick, hover,
}) {
  const dropRef = useRef()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Box
        ref={dropRef}
        pad="small"
        round="xsmall"
        onClick={onClick}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        hoverIndicator={hover || 'light-2'}
        focusIndicator={false}
      >
        {React.createElement(icon, { size: '14px', ...(iconAttrs || {}) })}
      </Box>
      {open && (
        <TooltipContent
          pad="xsmall"
          round="xsmall"
          justify="center"
          targetRef={dropRef}
          margin={{ bottom: 'xsmall' }}
          side="top"
          align={{ bottom: 'top' }}
        >
          <Text
            size="small"
            weight={500}
          >{tooltip}
          </Text>
        </TooltipContent>
      )}
    </>
  )
}
