import React, { useContext } from 'react'
import { Box, Text } from 'grommet'
import { useParams } from 'react-router'
import { InstallationContext } from '../Installations'
import { ReadyIcon } from '../Application'
import Icon from './Icon'

export default function ComponentName() {
  const {kind, name} = useParams()
  const {currentApplication} = useContext(InstallationContext)
  if (!currentApplication) return  null
  const component = currentApplication.status.components.find((c) => c.kind.toLowerCase() === kind.toLowerCase() && c.name === name)
  if (!component) return null

  return (
    <Box direction='row' gap='small' align='center' margin={{left: 'small'}}>
      <Icon kind={component.kind} size='15px' />
      <Text size='medium' weight={500}>{kind.toLowerCase()}/{name}</Text>
      <ReadyIcon readiness={component.status} size='20px' showIcon />
    </Box>
  )
}