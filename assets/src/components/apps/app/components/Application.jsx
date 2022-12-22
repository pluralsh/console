import { useContext } from 'react'
import { Box, Text, ThemeContext } from 'grommet'
import { Check } from 'forge-core'
import { useNavigate, useParams } from 'react-router-dom'
import { normalizeColor } from 'grommet/utils'
import { StatusCritical } from 'grommet-icons'

import { Readiness } from 'utils/status'

import { InstallationContext } from '../../../Installations'

import { Container } from '../../../utils/Container'
import { PulsyDiv } from '../../../utils/animations'

import Icon from './kubernetes/Icon'

export const ReadinessColor = {
  [Readiness.Ready]: 'success',
  [Readiness.InProgress]: 'status-warning',
  [Readiness.Failed]: 'error',
  [Readiness.Complete]: 'tone-medium',
}

export function appState({ status: { conditions } }) {
  const ready = conditions.find(({ type }) => type === 'Ready')
  const error = conditions.find(({ type }) => type === 'Error')
  const readiness = error.status === 'True' ? Readiness.Failed : (ready.status === 'True' ? Readiness.Ready : Readiness.InProgress)

  return { ready, error, readiness }
}

export function ReadyIcon({ size, readiness, showIcon }) {
  const theme = useContext(ThemeContext)
  let color = 'error'
  let icon = <StatusCritical size="small" />
  let anim = null
  let defaultSize = '20px'

  switch (readiness) {
  case Readiness.Ready:
    color = 'success'
    icon = <Check size="small" />
    break
  case Readiness.InProgress:
    color = 'orange-dark'
    anim = PulsyDiv
    icon = null
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

export function Component({
  component: {
    group, kind, name, status,
  },
}) {
  const { repo } = useParams()
  const navigate = useNavigate()

  return (
    <Container onClick={() => navigate(`/components/${repo}/${kind.toLowerCase()}/${name}`)}>
      <ReadyIcon
        readiness={status}
        size="10px"
      />
      <Icon kind={kind} />
      <Text
        size="small"
        color="dark-6"
      >{group || 'v1'}/{kind.toLowerCase()}
      </Text>
      <Text size="small">{name}</Text>
    </Container>
  )
}

export default function Application() {
  const { currentApplication } = useContext(InstallationContext)
  const { error } = appState(currentApplication)

  return <Text size="small">{error.message}</Text>
}
