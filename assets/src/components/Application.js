import React, { useContext, useEffect } from 'react'
import { Box, Text, ThemeContext } from 'grommet'
import { Check } from 'forge-core'
import { useHistory, useParams } from 'react-router'
import { BreadcrumbsContext } from './Breadcrumbs'
import { ApplicationIcon, hasIcon, InstallationContext, useEnsureCurrent } from './Installations'
import { BUILD_PADDING } from './Builds'
import { normalizeColor } from 'grommet/utils'
import { chunk } from '../utils/array'
import { StatusCritical } from 'grommet-icons'
import Icon from './kubernetes/Icon'
import { Container } from './utils/Container'
import PulseDot from 'react-pulse-dot'

export const Readiness = {
  Ready: 'Ready',
  InProgress: 'InProgress',
  Failed: 'Failed',
  Complete: 'Complete',
}

export const ReadinessColor = {
  [Readiness.Ready]: 'success',
  [Readiness.InProgress]: 'status-warning',
  [Readiness.Failed]: 'error',
  [Readiness.Complete]: 'tone-medium',
}

export function appState({status: {conditions}}) {
  const ready = conditions.find(({type}) => type === 'Ready')
  const error = conditions.find(({type}) => type === 'Error')
  const readiness = error.status === 'True' ? Readiness.Failed : (ready.status === 'True' ? Readiness.Ready : Readiness.InProgress)
  return {ready, error, readiness}
}

export function ApplicationReadyIcon({application, size, showIcon}) {
  const {readiness} = appState(application)
  return <ReadyIcon readiness={readiness} size={size} showIcon={showIcon} />
}

export function ReadyIcon({size, readiness, showIcon}) {
  const theme = useContext(ThemeContext)
  let color = 'error'
  let icon = <StatusCritical size='small' />
  switch (readiness) {
    case Readiness.Ready:
      color = 'success'
      icon = <Check size='small' />
      break
    case Readiness.InProgress:
      color = 'orange-dark'
      return (
        <PulseDot 
          color={normalizeColor('orange-dark', theme)} 
          style={{fontSize: size || '20px'}} />
      )
    case Readiness.Complete:
      color = 'tone-medium'
      icon = <Check size='small' />
    default:
      break
  }

  return (
    <Box flex={false}
         width={size || '20px'} 
         height={size || '20px'} 
         round='full' 
         align='center'
         justify='center'
         background={color}
         style={{boxShadow: `0 0 10px ${normalizeColor(color, theme)}`}}>
      {showIcon && icon}
    </Box>
  )
}

function Component({component: {group, kind, name, status}, width}) {
  const {repo} = useParams()
  let history = useHistory()

  return (
    <Container width={width} onClick={() => history.push(`/components/${repo}/${kind.toLowerCase()}/${name}`)}>
      <ReadyIcon readiness={status} size='10px' />
      <Icon kind={kind} />
      <Text size='small' color='dark-6'>{group || 'v1'}/{kind.toLowerCase()}</Text>
      <Text size='small'>{name}</Text>
    </Container>
  )
}

export default function Application() {
  const {repo} = useParams()
  let history = useHistory()
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  const {setOnChange, currentApplication} = useContext(InstallationContext)
  useEffect(() => {
    setBreadcrumbs([
      {text: 'components', url: '/components'},
      {text: currentApplication.name, url: `/components/${currentApplication.name}`}
    ])
  }, [currentApplication])
  useEffect(() => {
    setOnChange({func: ({name}) => history.push(`/components/${name}`)})
  }, [])
  useEnsureCurrent(repo)
  const {error} = appState(currentApplication)

  return (
    <Box fill background='backgroundColor' gap='small'>
      <Box flex={false} pad={{vertical: 'small', ...BUILD_PADDING}} direction='row' 
           align='center' border={{side: 'bottom'}} gap='small'>
        {hasIcon(currentApplication) && <ApplicationIcon application={currentApplication} size='40px' dark />}
        <Box>
          <Text weight='bold' size='small'>{currentApplication.name}</Text>
          <Text size='small' color='dark-6'>{currentApplication.status.componentsReady} ready; {error.message}</Text>
        </Box>
        <ApplicationReadyIcon application={currentApplication} size='20px' showIcon />
      </Box>
      <Box fill style={{overflow: 'auto'}} pad={{horizontal: 'medium', bottom: 'small'}} gap='xsmall'>
        {[...chunk(currentApplication.status.components, 2)].map((chunk, ind) => (
          <Box key={ind} flex={false} fill='horizontal' direction='row' gap='xsmall'>
            {chunk.map((component) => <Component width='50%' key={`${component.group}:${component.name}`} component={component} />)}
          </Box>
        ))}
      </Box>
    </Box>
  )
}