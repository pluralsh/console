import React from 'react'
import { Box, Text } from 'grommet'
import { Readiness, ReadyIcon } from '../Application'
import { rest } from 'lodash'

function phaseToReadiness(phase) {
  switch (phase) {
    case "Running":
    case "Succeeded":
      return Readiness.Ready
    case "Pending":
      return Readiness.InProgress
    case "Failed":
      return Readiness.Failed
    default:
      return null
  }
}

export function PodPhase({phase, message}) {
  const readiness = phaseToReadiness(phase)
  return (
    <Box direction='row' gap='xsmall' align='center'>
      {readiness && <ReadyIcon readiness={readiness} />}
      <Text size='small'>{phase}</Text>
      {message && <Text size='small' color='dark-5'>{message}</Text>}
    </Box>
  )
}

export function PodResources({container: {resources: {limits, requests}}, dimension}) {
  if (!limits && !requests) {
    return <Text size='small'>n/a</Text>
  }

  return (
    <Box direction='row'>
      <Text size='small'>{(requests || {})[dimension] || '--'} / {(limits || {})[dimension] || '--'}</Text>
    </Box>
  )
}

function HeaderItem({width, text}) {
  return (
    <Box flex={false} width={width}>
      <Text size='small' weight={500}>{text}</Text>
    </Box>
  )
}

export function PodHeader() {
  return (
    <Box flex={false} fill='horizontal' direction='row' border='bottom' pad={{vertical: 'xsmall'}}>
      <HeaderItem width='10%' text='name' />
      <HeaderItem width='15%' text='status' />
      <HeaderItem width='10%' text='restarts' />
      <HeaderItem width='10%' text='host ip' />
      <HeaderItem width='10%' text='memory' />
      <HeaderItem width='10%' text='cpu' />
      <HeaderItem width='45%' text='image' />
    </Box>
  )
}

export function PodList({pods}) {
  return (
    <Box fill pad='small' style={{overflow: 'auto'}}>
      <PodHeader />
      {pods.map((pod, ind) => <PodRow key={ind} pod={pod} />)}
    </Box>
  )
}

export function PodRow({pod: {metadata: {name}, status, spec}}) {
  const restarts = status.containerStatuses.reduce((count, {restartCount}) => count + (restartCount || 0), 0)
  return (
    <Box flex={false} fill='horizontal' direction='row' align='center' border='bottom' pad={{vertical: 'xsmall'}}>
      <Box flex={false} width='10%'>
        <Text size='small' truncate>{name}</Text>
      </Box>
      <Box flex={false} width='15%'>
        <PodPhase phase={status.phase} message={status.message} />
      </Box>
      <Box flex={false} width='10%'>
        <Text size='small'>{restarts}</Text>
      </Box>
      <Box flex={false} width='10%'>
        <Text size='small'>{status.hostIp}</Text>
      </Box>
      <Box flex={false} width='10%'>
        <PodResources container={spec.containers[0]} dimension='memory' />
      </Box>
      <Box flex={false} width='10%'>
        <PodResources container={spec.containers[0]} dimension='cpu' />
      </Box>
      <Box flex={false} width='45%'>
        <Text size='small' truncate>{spec.containers.map(({image}) => image).join(', ')}</Text>
      </Box>
    </Box>
  )
}