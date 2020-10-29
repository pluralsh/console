import React, { useContext, useEffect } from 'react'
import { Box, Text, ThemeContext } from 'grommet'
import { useHistory, useParams } from 'react-router'
import { BreadcrumbsContext } from './Breadcrumbs'
import { ApplicationIcon, hasIcon, InstallationContext, useEnsureCurrent } from './Installations'
import { BUILD_PADDING } from './Builds'
import { normalizeColor } from 'grommet/utils'
import { chunk } from '../utils/array'
import { Checkmark, StatusCritical, Update } from 'grommet-icons'

const Readiness = {
  Ready: 'Ready',
  InProgress: 'InProgress',
  Failed: 'Failed'
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
      icon = <Checkmark size='small' />
      break
    case Readiness.InProgress:
      color = 'status-warning'
      icon = <Update size='small' />
      break
    default:
      break
  }

  return (
    <Box flex={false} width={size || '10px'} height={size || '10px'} round='full' align='center' justify='center'
         background={color} style={{boxShadow: `0 0 10px ${normalizeColor(color, theme)}`}}>
      {showIcon && icon}
    </Box>
  )
}

function Component({component: {group, kind, name, status}, width}) {
  return (
    <Box width={width} direction='row' gap='small' align='center' background='backgroundLight'
         pad='small' round='xsmall' hoverIndicator='backgroundDark'>
      <ReadyIcon readiness={status} size='10px' />
      <Text size='small'>{group || 'v1'}/{kind}</Text>
      <Text size='small'>{name}</Text>
    </Box>
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

  console.log(currentApplication)
  return (
    <Box fill background='backgroundColor'>
      <Box flex={false} pad={{vertical: 'small', ...BUILD_PADDING}} direction='row' align='center' height='60px'>
        <Box direction='row' fill='horizontal' gap='small' align='center'>
          {hasIcon(currentApplication) && <ApplicationIcon application={currentApplication} size='40px' />}
          <Box>
            <Text weight='bold' size='small'>{currentApplication.name}</Text>
            <Text size='small' color='dark-6'>{currentApplication.status.componentsReady} components ready</Text>
          </Box>
          <ApplicationReadyIcon application={currentApplication} size='20px' showIcon />
        </Box>
      </Box>
      <Box fill style={{overflow: 'auto'}} pad={{horizontal: 'medium'}} gap='xsmall'>
        {[...chunk(currentApplication.status.components, 2)].map((chunk) => (
          <Box flex={false} fill='horizontal' direction='row' gap='xsmall'>
            {chunk.map((component) => <Component width='50%' key={`${component.group}:${component.name}`} component={component} />)}
          </Box>
        ))}
      </Box>
    </Box>
  )
}