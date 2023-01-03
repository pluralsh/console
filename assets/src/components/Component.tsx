import { useContext } from 'react'
import { Box, ThemeContext } from 'grommet'
import { Check } from 'forge-core'
import { normalizeColor } from 'grommet/utils'
import { StatusCritical } from 'grommet-icons'

import { Readiness } from 'utils/status'

import { PulsyDiv } from './utils/animations'

export function appState({ status: { conditions } }) {
  const ready = conditions.find(({ type }) => type === 'Ready')
  const error = conditions.find(({ type }) => type === 'Error')
  const readiness = error.status === 'True' ? Readiness.Failed : (ready.status === 'True' ? Readiness.Ready : Readiness.InProgress)

  return { ready, error, readiness }
}

export function ReadyIcon({ size, readiness, showIcon }) {
  const theme = useContext(ThemeContext)
  let color = 'error'
  let icon: any = <StatusCritical size="small" />
  let anim
  let defaultSize = '20px'

  switch (readiness) {
  case Readiness.Ready:
    color = 'success'
    icon = <Check size="small" />
    break
  case Readiness.InProgress:
    color = 'orange-dark'
    anim = PulsyDiv
    icon = undefined
    defaultSize = '16px'
    break
  case Readiness.Complete:
    color = 'tone-medium'
    icon = <Check size="small" />
    break
  default:
    break
  }

  return (
    <Box
      flex={false}
      as={anim}
      width={size || defaultSize}
      height={size || defaultSize}
      round="full"
      align="center"
      justify="center"
      background={color}
      style={{ boxShadow: `0 0 10px ${normalizeColor(color, theme)}` }}
    >
      {showIcon && icon}
    </Box>
  )
}

