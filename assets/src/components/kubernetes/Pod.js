import React, { useCallback, useContext, useEffect, useState } from 'react'
import { Anchor, Box, Layer, Text } from 'grommet'
import { Loading, Tabs, TabHeader, TabHeaderItem, TabContent } from 'forge-core'
import { Readiness, ReadyIcon } from '../Application'
import { useMutation, useQuery } from 'react-apollo'
import { DELETE_POD, POD_Q } from './queries'
import { Close, Cube, Trash } from 'grommet-icons'
import { cpuParser, memoryParser } from 'kubernetes-resource-parser'
import filesize from 'filesize'
import { useHistory, useParams } from 'react-router'
import Icon from './Icon'
import { POLL_INTERVAL } from './constants'
import { Metadata, MetadataRow } from './Metadata'
import { RawContent } from './Component'
import { BreadcrumbsContext } from '../Breadcrumbs'
import { Container as Con } from './utils'
import { asQuery } from '../utils/query'

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

function containerReadiness({ready, state: {terminated}}) {
  if (ready) return Readiness.Ready
  if (!terminated) return Readiness.InProgress
  return Readiness.Failed
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
      <HeaderItem width='15%' text='status' />
      <HeaderItem width='7%' text='pod ip' />
      <HeaderItem width='10%' text='node name' />
      <HeaderItem width='7%' text='memory' />
      <HeaderItem width='7%' text='cpu' />
      <HeaderItem width='4%' text='restarts' />
      <HeaderItem width='50%' text='image' />
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
  const doDelete = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    mutation()
  }, [mutation])

  return (
    <>
    <Box flex={false} pad='small' round='xsmall' align='center' justify='center'
         onClick={loading ? null : doDelete} hoverIndicator='backgroundDark' focusIndicator={false}>
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
    <Text size='small'>{name} exited with code {terminated.exitCode}</Text>
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

export function PodRow({pod: {metadata: {name, namespace}, status, spec}, refetch}) {
  let history = useHistory()
  const restarts = status.containerStatuses.reduce((count, {restartCount}) => count + (restartCount || 0), 0)
  return (
    <Box flex={false} fill='horizontal' direction='row' align='center' hoverIndicator='backgroundDark'
          border='bottom' pad={{vertical: 'xsmall'}} gap='xsmall' focusIndicator={false}
          onClick={() => history.push(`/pods/${namespace}/${name}`)}>
      <Box flex={false} width='10%' direction='row' align='center' gap='xsmall'>
        <Cube size='small' />
        <Text size='small' truncate>{name}</Text>
      </Box>
      <Box flex={false} width='15%' direction='row' align='center' gap='xsmall'>
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

function Status({status, metadata: {namespace, name}}) {
  let history = useHistory()
  const query = asQuery({pod: name})
  return (
    <Con header='Status'>
      <Box flex={false} direction='row' gap='small'>
        <Box flex={false} width='40%' gap='xsmall'>
          <MetadataRow name='ip'>
            <Text size='small'>{status.podIp}</Text>
          </MetadataRow>
          <MetadataRow name='phase'>
            <Text size='small'>{status.phase}</Text>
          </MetadataRow>
          <MetadataRow name='readiness'>
            <PodReadiness status={status} />
          </MetadataRow>
          <MetadataRow name='logs'>
            <Anchor size='small' onClick={() => history.push(`/logs/${namespace}?${query}`)}>view logs</Anchor>
          </MetadataRow>
        </Box>
        <Box width='60%'>
          <PodConditions conditions={status.conditions} />
        </Box>
      </Box>
    </Con>
  )
}

function Spec({spec}) {
  return (
    <Con header='Spec'>
      <MetadataRow name='node'>
        <Text size='small'>{spec.nodeName}</Text>
      </MetadataRow>
      <MetadataRow name='service account' final>
        <Text size='small'>{spec.serviceAccountName || 'default'}</Text>
      </MetadataRow>
    </Con>
  )
}

function resource({requests, limits}, dim) {
  const request = (requests && requests[dim]) || 'n/a'
  const limit = (limits && limits[dim]) || 'n/a'
  return {request, limit}
}

function Resource({resources, dim}) {
  const {request, limit} = resource(resources, dim)
  return (
    <Box direction='row' gap='xsmall'>
      <Text size='small' weight={500}>requests:</Text>
      <Text size='small'>{request}</Text>
      <Text size='small' weight={500}>limits:</Text>
      <Text size='small'>{limit}</Text>
    </Box>
  )
}

function ContainerState({status: {state: {terminated, running, waiting}}}) {
  return (
    <Box flex={false}>
      <Box>
        <Text size='small'>Runtime State</Text>
      </Box>
      <Box flex={false}>
        {running && (
          <Box flex={false}>
            <MetadataRow name='state'>
              <Text size='small'>running</Text>
            </MetadataRow>
            <MetadataRow name='started at'>
              <Text size='small'>{running.startedAt}</Text>
            </MetadataRow>
          </Box>
        )}
        {terminated && (
          <Box flex={false}>
            <MetadataRow name='state'>
              <Text size='small'>terminated</Text>
            </MetadataRow>
            <MetadataRow name='exit code'>
              <Text size='small'>{terminated.exitCode}</Text>
            </MetadataRow>
            <MetadataRow name='message'>
              <Text size='small'>{terminated.message}</Text>
            </MetadataRow>
            <MetadataRow name='reason'>
              <Text size='small'>{terminated.reason}</Text>
            </MetadataRow>
          </Box>
        )}
        {waiting && (
          <Box flex={false}>
            <MetadataRow name='state'>
              <Text size='small'>waiting</Text>
            </MetadataRow>
            <MetadataRow name='message'>
              <Text size='small'>{waiting.message}</Text>
            </MetadataRow>
            <MetadataRow name='reason'>
              <Text size='small'>{waiting.reason}</Text>
            </MetadataRow>
          </Box>
        )}
      </Box>
    </Box>
  )
}

function PodConditions({conditions}) {
  return (
    <Box flex={false} pad='small'>
      <Box direction='row' gap='xsmall' align='center'>
        <HeaderItem width='20%' text='timestamp' />
        <HeaderItem width='20%' text='type' />
        <HeaderItem width='10%' text='status' />
        <HeaderItem width='15%' text='reason' />
        <HeaderItem width='35%' text='message' />
      </Box>
      <Box flex={false}>
        {conditions.map((condition, ind) => (
          <Box key={ind} direction='row' gap='xsmall' align='center'>
            <RowItem width='20%' text={condition.lastTransitionTime} />
            <RowItem width='20%' text={condition.type} />
            <RowItem width='10%' text={condition.status} />
            <RowItem width='15%' text={condition.reason} />
            <RowItem width='35%' text={condition.message} />
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function Container({container, containerStatus}) {
  const readiness = containerReadiness(containerStatus)
  return (
    <Box flex={false} gap='small' pad='small'>
      <Box flex={false}>
        <MetadataRow name='image'>
          <Text size='small'>{container.image}</Text>
        </MetadataRow>
        <MetadataRow name='readiness'>
          <Box direction='row' gap='xsmall' align='center'>
            <ReadyIcon readiness={readiness} />
            <Text size='small'>{readiness === Readiness.Ready ? 'Running' : (readiness === Readiness.Failed ? 'Stopped' : 'Pending')}</Text>
          </Box>
        </MetadataRow>
        <MetadataRow name='cpu'>
          <Resource resources={container.resources} dim='cpu' />
        </MetadataRow>
        <MetadataRow name='memory'>
          <Resource resources={container.resources} dim='memory' />
        </MetadataRow>
        <MetadataRow name='ports'>
          <Box flex={false}>
            {(container.ports || []).map(({containerPort, protocol}) => (
              <Text key={containerPort} size='small'>{protocol} {containerPort}</Text>
            ))}
          </Box>
        </MetadataRow>
      </Box>
      <ContainerState status={containerStatus} />
    </Box>
  )
}

export function Pod() {
  const {name, namespace} = useParams()
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  const {data} = useQuery(POD_Q, {variables: {name, namespace}, pollInterval: POLL_INTERVAL})
  useEffect(() => {
    setBreadcrumbs([
      {text: 'pods', url: '/pods', disable: true},
      {text: namespace, url: namespace, disable: true},
      {text: name, url: name, disable: true}
    ])
  }, [])

  if (!data) return <Loading />

  const {pod} = data
  const containerStatus = pod.status.containerStatuses.reduce((acc, container) => ({...acc, [container.name]: container}), {})
  const containers = pod.spec.containers
  console.log(containers)
  return (
    <Box fill background='backgroundColor'>
      <Box flex={false} direction='row' gap='small' align='center' margin={{left: 'small', vertical: 'small'}} pad={{horizontal: 'medium'}}>
        <Icon kind='pod' size='15px' />
        <Text size='medium' weight={500}>pod/{name}</Text>
        <ReadyIcon readiness={statusToReadiness(pod.status)} size='20px' showIcon />
      </Box>
      <Box fill style={{overflow: 'auto'}} pad={{horizontal: 'medium'}} gap='xsmall'>
        <Tabs defaultTab='info' border='dark-3'>
          <TabHeader>
            <TabHeaderItem name='info'>
              <Text size='small' weight={500}>info</Text>
            </TabHeaderItem>
            {containers.map(({name}) => (
              <TabHeaderItem key={name} name={`container:${name}`}>
                <Box direction='row' gap='xsmall' align='center'>
                  <ReadyIcon readiness={containerReadiness(containerStatus[name])} />
                  <Text size='small' weight={500}>container: {name}</Text>
                </Box>
              </TabHeaderItem>
            ))}
            <TabHeaderItem name='raw'>
              <Text size='small' weight={500}>raw</Text>
            </TabHeaderItem>
          </TabHeader>
          <TabContent name='info'>
            <Metadata metadata={pod.metadata} />
            <Status status={pod.status} metadata={pod.metadata} />
            <Spec spec={pod.spec} />
          </TabContent>
          {containers.map((container) => (
            <TabContent key={container.name} name={`container:${container.name}`}>
              <Container container={container} containerStatus={containerStatus[container.name]} />
            </TabContent>
          ))}
          <TabContent name='raw'>
            <RawContent raw={pod.raw} />
          </TabContent>
        </Tabs>
      </Box>
    </Box>
  )
}