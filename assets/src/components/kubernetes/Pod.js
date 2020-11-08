import React, { useState } from 'react'
import { Box, Layer, Text } from 'grommet'
import { Readiness, ReadyIcon } from '../Application'
import { useMutation } from 'react-apollo'
import { DELETE_POD } from './queries'
import { Close, Cube, Trash } from 'grommet-icons'
import { cpuParser, memoryParser } from 'kubernetes-resource-parser'
import filesize from 'filesize'

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

function statusToReadiness({phase, containerStatuses}) {
  if (phase === "Succeeded") return Readiness.Ready
  if (phase === "Failed") return Readiness.Failed
  if (phase === "Pending") return Readiness.InProgress
  const unready = containerStatuses.filter(({ready}) => !ready)
  if (unready.length === 0) return Readiness.Ready
  return Readiness.InProgress
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

export function podResources(containers, type) {
  let memory = undefined
  let cpu = undefined
  for (const {resources} of containers) {
    const resourceSpec = resources[type]
    if (!resourceSpec) continue
    if (resourceSpec.cpu) {
      cpu = (cpu || 0) + cpuParser(resourceSpec.cpu)
    }
    if (resourceSpec.memory) {
      memory = (memory || 0) + memoryParser(resourceSpec.memory)
    }
  }
  return {cpu: cpu === undefined ? cpu : Math.ceil(100 * cpu) / 100, memory}
}

export function PodResources({containers, dimension}) {
  const {cpu: cpuReq, memory: memReq} = podResources(containers, 'requests')
  const {cpu: cpuLim, memory: memLim} = podResources(containers, 'limits')
  if (dimension === 'memory') {
    return (
      <Box direction='row'>
        <Text size='small'>{memReq === undefined ? '--' : filesize(memReq)} / {memLim === undefined ? '--' : filesize(memLim)}</Text>
      </Box>
    )
  }

  return (
    <Box direction='row'>
        <Text size='small'>{cpuReq === undefined ? '--' : cpuReq} / {cpuLim === undefined ? '--' : cpuLim}</Text>
      </Box>
  )
}

export function HeaderItem({width, text}) {
  return (
    <Box flex={false} width={width}>
      <Text size='small' weight={500}>{text}</Text>
    </Box>
  )
}

export function RowItem({width, text, truncate}) {
  return (
    <Box flex={false} width={width}>
      <Text size='small' truncate={!!truncate}>{text}</Text>
    </Box>
  )
}

export function PodHeader() {
  return (
    <Box flex={false} fill='horizontal' direction='row' border='bottom' pad={{vertical: 'xsmall'}} gap='xsmall'>
      <HeaderItem width='10%' text='name' />
      <HeaderItem width='20%' text='ready' />
      <HeaderItem width='7%' text='pod ip' />
      <HeaderItem width='10%' text='node name' />
      <HeaderItem width='7%' text='memory' />
      <HeaderItem width='7%' text='cpu' />
      <HeaderItem width='4%' text='restarts' />
      <HeaderItem width='45%' text='image' />
    </Box>
  )
}

export function PodList({pods, namespace, refetch}) {
  console.log(pods)
  return (
    <Box flex={false} pad='small'>
      <Box pad={{vertical: 'small'}}>
        <Text size='small'>Pods</Text>
      </Box>
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
         onClick={loading ? null : mutation} hoverIndicator='backgroundDark' focusIndicator={false}>
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

function PodState({name, state: {running, terminated, waiting}}) {
  if (running) return <Text size='small'>{name} is running</Text>
  if (waiting) return <Text size='small'>{name} is waiting</Text>

  return (
    <Text size='small'>{name} exited with code {terminated.exitCode}: {terminated.message}</Text>
  )
}

function PodReadiness({status: {containerStatuses}}) {
  const unready = containerStatuses.filter(({ready}) => !ready)
  if (unready.length === 0) return (
    <Text size='small'>running</Text>
  )

  return (
    <Box direction='row' gap='xsmall'>
      {unready.map((status, ind) => (
        <Box key={ind} align='center' direction='row' gap='xsmall'>
          <PodState {...status} />
        </Box>
      ))}
    </Box>
  )
}

export function PodRow({pod: {metadata: {name}, status, spec}, namespace, refetch}) {
  const restarts = status.containerStatuses.reduce((count, {restartCount}) => count + (restartCount || 0), 0)
  return (
    <Box flex={false} fill='horizontal' direction='row' align='center' border='bottom' pad={{vertical: 'xsmall'}} gap='xsmall'>
      <Box flex={false} width='10%' direction='row' align='center' gap='xsmall'>
        <Cube size='small' />
        <Text size='small' truncate>{name}</Text>
      </Box>
      <Box flex={false} width='10%' direction='row' align='center' gap='xsmall'>
        <ReadyIcon readiness={statusToReadiness(status)} />
        <PodReadiness status={status} />
      </Box>
      <RowItem width='7%' text={status.podIp} />
      <RowItem width='10%' text={spec.nodeName} truncate />
      <Box flex={false} width='7%'>
        <PodResources containers={spec.containers} dimension='memory' />
      </Box>
      <Box flex={false} width='7%'>
        <PodResources containers={spec.containers} dimension='cpu' />
      </Box>
      <RowItem width='4%' text={restarts} />
      <Box fill='horizontal' direction='row' gap='small' justify='end' align='center' pad={{right: 'xsmall'}}>
        <Box fill='horizontal'>
          <Text size='small' truncate>{spec.containers.map(({image}) => image).join(', ')}</Text>
        </Box>
        <DeletePod name={name} namespace={namespace} refetch={refetch} />
      </Box>
    </Box>
  )
}