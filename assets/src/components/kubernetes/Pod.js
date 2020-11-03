import React, { useState } from 'react'
import { Box, Layer, Text } from 'grommet'
import { Readiness, ReadyIcon } from '../Application'
import { findLastKey, rest } from 'lodash'
import { useMutation } from 'react-apollo'
import { DELETE_POD } from './queries'
import { Close, Trash } from 'grommet-icons'

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
    <Box flex={false} fill='horizontal' direction='row' border='bottom' pad={{vertical: 'xsmall'}} gap='xsmall'>
      <HeaderItem width='10%' text='name' />
      <HeaderItem width='10%' text='status' />
      <HeaderItem width='7%' text='pod ip' />
      <HeaderItem width='15%' text='node name' />
      <HeaderItem width='5%' text='memory' />
      <HeaderItem width='5%' text='cpu' />
      <HeaderItem width='4%' text='restarts' />
      <HeaderItem width='45%' text='image' />
    </Box>
  )
}

export function PodList({pods, namespace, refetch}) {
  return (
    <Box fill pad='small' style={{overflow: 'auto'}}>
      <PodHeader />
      {pods.map((pod, ind) => <PodRow key={ind} pod={pod} namespace={namespace} refetch={refetch} />)}
    </Box>
  )
}

export function DeletePod({name, namespace, refetch}) {
  const [open, setOpen] = useState(true)
  const [mutation, {loading, data}] = useMutation(DELETE_POD, {
    variables: {name, namespace},
    onCompleted: refetch
  })

  return (
    <>
    <Box flex={false} pad='small' round='xsmall' align='center' justify='center'
         onClick={loading ? null : mutation} hoverIndicator='backgroundDark'>
      <Trash color={loading ? 'dark-6' : 'error'} size='small' />
    </Box>
    {data && open && (
      <Layer modal>
        <Box width='30vw' pad='small'>
          <Box direction='row' justify='end'>
            <Box flex={false} pad='xsmall' round='xsmall' hoverIndicator='light-3' onClick={() => setOpen(false)}>
              <Close size='small' />
            </Box>
          </Box>
          <Box pad='small'>
            <Text size='small'>pod {name} is deleted, it should recycle shortly</Text>
          </Box>
        </Box>
      </Layer>
    )}
    </>
  )
}

export function PodRow({pod: {metadata: {name}, status, spec}, namespace, refetch}) {
  const restarts = status.containerStatuses.reduce((count, {restartCount}) => count + (restartCount || 0), 0)
  return (
    <Box flex={false} fill='horizontal' direction='row' align='center' border='bottom' pad={{vertical: 'xsmall'}} gap='xsmall'>
      <Box flex={false} width='10%'>
        <Text size='small' truncate>{name}</Text>
      </Box>
      <Box flex={false} width='10%'>
        <PodPhase phase={status.phase} message={status.message} />
      </Box>
      <Box flex={false} width='7%'>
        <Text size='small'>{status.podIp}</Text>
      </Box>
      <Box flex={false} width='15%'>
        <Text size='small' truncate>{spec.nodeName}</Text>
      </Box>
      <Box flex={false} width='5%'>
        <PodResources container={spec.containers[0]} dimension='memory' />
      </Box>
      <Box flex={false} width='5%'>
        <PodResources container={spec.containers[0]} dimension='cpu' />
      </Box>
      <Box flex={false} width='4%'>
        <Text size='small'>{restarts}</Text>
      </Box>
      <Box fill='horizontal' direction='row' gap='small' justify='end' align='center' pad={{right: 'xsmall'}}>
        <Box fill='horizontal'>
          <Text size='small' truncate>{spec.containers.map(({image}) => image).join(', ')}</Text>
        </Box>
        <DeletePod name={name} namespace={namespace} refetch={refetch} />
      </Box>
    </Box>
  )
}