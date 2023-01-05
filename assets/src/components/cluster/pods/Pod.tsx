import {
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { Box, Text } from 'grommet'
import {
  Confirm,
  TabContent,
  TabHeader,
  TabHeaderItem,
  Tabs,
} from 'forge-core'

import { useMutation, useQuery } from 'react-apollo'
import { Terminal } from 'grommet-icons'
import { cpuParser, memoryParser } from 'kubernetes-resource-parser'
import { filesize } from 'filesize'
import { useNavigate, useParams } from 'react-router-dom'

import { Readiness, containerStatusToReadiness } from 'utils/status'
import { ReadyIcon } from 'components/Component'
import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { asQuery } from 'components/utils/query'
import { LoopingLogo } from 'components/utils/AnimatedLogo'
import { ignoreEvent } from 'components/utils/events'

import { ComponentIcon } from '../../apps/app/components/misc'
import { DELETE_POD, POD_Q } from '../queries'
import { POLL_INTERVAL } from '../constants'
import { Metadata, MetadataRow } from '../Metadata'
import { Container as Con, LogLink } from '../utils'
import { DeleteIcon } from '../Job'

export const ReadinessColor = {
  [Readiness.Ready]: 'success',
  [Readiness.InProgress]: 'status-warning',
  [Readiness.Failed]: 'error',
  [Readiness.Complete]: 'tone-medium',
}

type Phase = 'Running' | 'Succeeded' | 'Pending' | 'Failed'

function phaseToReadiness(phase: Phase) {
  switch (phase) {
  case 'Running':
  case 'Succeeded':
    return Readiness.Ready
  case 'Pending':
    return Readiness.InProgress
  case 'Failed':
    return Readiness.Failed
  default:
    return null
  }
}

export function PodPhase({ phase, message }) {
  const readiness = phaseToReadiness(phase)

  return (
    <Box
      direction="row"
      gap="xsmall"
      align="center"
    >
      {readiness && <ReadyIcon readiness={readiness} />}
      <Text size="small">{phase}</Text>
      {message && (
        <Text
          size="small"
          color="dark-5"
        >
          {message}
        </Text>
      )}
    </Box>
  )
}

export function podResources(containers: Iterable<{
    resources: Record<
      string,
      {
        cpu?: number | null
        memory?: number | null
      }
    >
  }>,
type: string) {
  let memory: number | undefined
  let cpu: number | undefined

  for (const { resources } of containers) {
    const resourceSpec = resources[type]

    if (!resourceSpec) continue
    if (resourceSpec.cpu) {
      cpu = (cpu || 0) + cpuParser(resourceSpec.cpu)
    }
    if (resourceSpec.memory) {
      memory = (memory || 0) + memoryParser(resourceSpec.memory)
    }
  }

  return { cpu: cpu === undefined ? cpu : Math.ceil(100 * cpu) / 100, memory }
}

export function PodResources({ containers, dimension }) {
  const { cpu: cpuReq, memory: memReq } = podResources(containers, 'requests')
  const { cpu: cpuLim, memory: memLim } = podResources(containers, 'limits')

  if (dimension === 'memory') {
    return (
      <Box direction="row">
        <Text size="small">
          <>
            {memReq === undefined ? '--' : filesize(memReq)} /{' '}
            {memLim === undefined ? '--' : filesize(memLim)}
          </>
        </Text>
      </Box>
    )
  }

  return (
    <Box direction="row">
      <Text size="small">
        {cpuReq === undefined ? '--' : cpuReq} /{' '}
        {cpuLim === undefined ? '--' : cpuLim}
      </Text>
    </Box>
  )
}

export function HeaderItem({
  width, text, nobold = false, truncate = false,
}) {
  return (
    <Box
      flex={false}
      width={width}
    >
      <Text
        size="small"
        weight={nobold ? undefined : 500}
        truncate={!!truncate}
      >
        {text}
      </Text>
    </Box>
  )
}

export function RowItem({ width, text, truncate = false }: any) {
  return (
    <Box
      flex={false}
      width={width}
    >
      <Text
        size="small"
        truncate={!!truncate}
      >
        {text}
      </Text>
    </Box>
  )
}

export function PodHeader() {
  return (
    <Box
      flex={false}
      fill="horizontal"
      direction="row"
      border="bottom"
      pad={{ vertical: 'xsmall' }}
      gap="xsmall"
    >
      <HeaderItem
        width="15%"
        text="name"
      />
      <HeaderItem
        width="10%"
        text="status"
      />
      <HeaderItem
        width="7%"
        text="pod ip"
      />
      <HeaderItem
        width="10%"
        text="node name"
      />
      <HeaderItem
        width="7%"
        text="memory"
      />
      <HeaderItem
        width="7%"
        text="cpu"
      />
      <HeaderItem
        width="4%"
        text="restarts"
      />
      <HeaderItem
        width="50%"
        text="image"
      />
    </Box>
  )
}

export function DeletePod({ name, namespace, refetch }) {
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading }] = useMutation(DELETE_POD, {
    variables: { name, namespace },
    onCompleted: () => {
      setConfirm(false)
      refetch()
    },
  })

  const doConfirm = useCallback(e => {
    ignoreEvent(e)
    setConfirm(true)
  },
  [setConfirm])

  return (
    <>
      <DeleteIcon
        loading={loading}
        onClick={doConfirm}
      />
      {confirm && (
        <Confirm
          description="The pod will be replaced by it's managing controller"
          loading={loading}
          cancel={e => {
            ignoreEvent(e)
            setConfirm(false)
          }}
          submit={e => {
            ignoreEvent(e)
            mutation()
          }}
        />
      )}
    </>
  )
}

function PodState({ name, state: { running, terminated, waiting } }) {
  if (running) return <Text size="small">{name} is running</Text>
  if (waiting) return <Text size="small">{name} is waiting</Text>

  return (
    <Text size="small">
      {name} exited with code {terminated.exitCode}
    </Text>
  )
}

function PodReadiness({ status: { containerStatuses } }) {
  const unready = (containerStatuses || []).filter(({ ready }) => !ready)

  if (unready.length === 0) {
    return <Text size="small">running</Text>
  }

  return (
    <Box
      direction="row"
      gap="xsmall"
    >
      {unready.map((status, ind) => (
        <Box
          key={ind}
          align="center"
          direction="row"
          gap="xsmall"
        >
          <PodState {...status} />
        </Box>
      ))}
    </Box>
  )
}

function Status({ status, metadata: { namespace, name } }) {
  const query = asQuery({ pod: name })

  return (
    <Con header="Status">
      <Box
        flex={false}
        direction="row"
        gap="small"
      >
        <Box
          flex={false}
          width="40%"
          gap="xsmall"
        >
          <MetadataRow name="ip">
            <Text size="small">{status.podIp}</Text>
          </MetadataRow>
          <MetadataRow name="phase">
            <Text size="small">{status.phase}</Text>
          </MetadataRow>
          <MetadataRow name="readiness">
            <PodReadiness status={status} />
          </MetadataRow>
          <MetadataRow name="logs">
            <LogLink url={`/logs/${namespace}?${query}`} />
          </MetadataRow>
        </Box>
        <Box width="60%">
          <PodConditions conditions={status.conditions} />
        </Box>
      </Box>
    </Con>
  )
}

function Spec({ spec }) {
  return (
    <Con header="Spec">
      <MetadataRow name="node">
        <Text size="small">{spec.nodeName}</Text>
      </MetadataRow>
      <MetadataRow
        name="service account"
      >
        <Text size="small">{spec.serviceAccountName || 'default'}</Text>
      </MetadataRow>
    </Con>
  )
}

function resource({ requests, limits }, dim) {
  const request = (requests && requests[dim]) || 'n/a'
  const limit = (limits && limits[dim]) || 'n/a'

  return { request, limit }
}

function Resource({ resources, dim }) {
  const { request, limit } = resource(resources, dim)

  return (
    <Box
      direction="row"
      gap="xsmall"
    >
      <Text
        size="small"
        weight={500}
      >
        requests:
      </Text>
      <Text size="small">{request}</Text>
      <Text
        size="small"
        weight={500}
      >
        limits:
      </Text>
      <Text size="small">{limit}</Text>
    </Box>
  )
}

function ContainerState({ status }) {
  if (!status) return null
  const {
    state: { terminated, running, waiting },
  } = status

  return (
    <Box flex={false}>
      <Box>
        <Text size="small">Runtime State</Text>
      </Box>
      <Box flex={false}>
        {running && (
          <Box flex={false}>
            <MetadataRow name="state">
              <Text size="small">running</Text>
            </MetadataRow>
            <MetadataRow name="started at">
              <Text size="small">{running.startedAt}</Text>
            </MetadataRow>
          </Box>
        )}
        {terminated && (
          <Box flex={false}>
            <MetadataRow name="state">
              <Text size="small">terminated</Text>
            </MetadataRow>
            <MetadataRow name="exit code">
              <Text size="small">{terminated.exitCode}</Text>
            </MetadataRow>
            <MetadataRow name="message">
              <Text size="small">{terminated.message}</Text>
            </MetadataRow>
            <MetadataRow name="reason">
              <Text size="small">{terminated.reason}</Text>
            </MetadataRow>
          </Box>
        )}
        {waiting && (
          <Box flex={false}>
            <MetadataRow name="state">
              <Text size="small">waiting</Text>
            </MetadataRow>
            <MetadataRow name="message">
              <Text size="small">{waiting.message}</Text>
            </MetadataRow>
            <MetadataRow name="reason">
              <Text size="small">{waiting.reason}</Text>
            </MetadataRow>
          </Box>
        )}
      </Box>
    </Box>
  )
}

function PodConditions({ conditions }) {
  return (
    <Box
      flex={false}
      pad="small"
    >
      <Box
        direction="row"
        gap="xsmall"
        align="center"
      >
        <HeaderItem
          width="20%"
          text="timestamp"
        />
        <HeaderItem
          width="20%"
          text="type"
        />
        <HeaderItem
          width="10%"
          text="status"
        />
        <HeaderItem
          width="15%"
          text="reason"
        />
        <HeaderItem
          width="35%"
          text="message"
        />
      </Box>
      <Box flex={false}>
        {conditions.map((condition, ind) => (
          <Box
            key={ind}
            direction="row"
            gap="xsmall"
            align="center"
          >
            <RowItem
              width="20%"
              text={condition.lastTransitionTime}
            />
            <RowItem
              width="20%"
              text={condition.type}
            />
            <RowItem
              width="10%"
              text={condition.status}
            />
            <RowItem
              width="15%"
              text={condition.reason}
            />
            <RowItem
              width="35%"
              text={condition.message}
            />
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function Container({ container, containerStatus }) {
  const readiness = containerStatusToReadiness(containerStatus)

  return (
    <Box
      flex={false}
      gap="small"
      pad="small"
    >
      <Box flex={false}>
        <MetadataRow name="image">
          <Text size="small">{container.image}</Text>
        </MetadataRow>
        <MetadataRow name="readiness">
          <Box
            direction="row"
            gap="xsmall"
            align="center"
          >
            <ReadyIcon
              size="10px"
              readiness={readiness}
            />
            <Text size="small">
              {readiness === Readiness.Ready
                ? 'Running'
                : readiness === Readiness.Failed
                  ? 'Stopped'
                  : 'Pending'}
            </Text>
          </Box>
        </MetadataRow>
        <MetadataRow name="cpu">
          <Resource
            resources={container.resources}
            dim="cpu"
          />
        </MetadataRow>
        <MetadataRow name="memory">
          <Resource
            resources={container.resources}
            dim="memory"
          />
        </MetadataRow>
        <MetadataRow name="ports">
          <Box flex={false}>
            {(container.ports || []).map(({ containerPort, protocol }) => (
              <Text
                key={containerPort}
                size="small"
              >
                {protocol} {containerPort}
              </Text>
            ))}
          </Box>
        </MetadataRow>
      </Box>
      <ContainerState status={containerStatus} />
    </Box>
  )
}

function ContainerTabHeader({
  namespace, pod, container, containerStatus,
}) {
  const navigate = useNavigate()
  const readiness = containerStatusToReadiness(containerStatus[container])

  return (
    <TabHeaderItem
      key={container}
      name={`container:${container}`}
    >
      <Box
        direction="row"
        gap="xsmall"
        align="center"
      >
        <ReadyIcon
          size="12px"
          readiness={readiness}
        />
        <Text
          size="small"
          weight={500}
        >
          container: {container}
        </Text>
        {Readiness.Ready === readiness && (
          <Box
            pad="xsmall"
            round="xsmall"
            align="center"
            justify="center"
            hoverIndicator="card"
            onClick={() => navigate(`/shell/pod/${namespace}/${pod}/${container}`)}
          >
            <Terminal size="12px" />
          </Box>
        )}
      </Box>
    </TabHeaderItem>
  )
}

export function Pod() {
  const { name, namespace } = useParams()
  const { setBreadcrumbs } = useContext(BreadcrumbsContext)
  const { data } = useQuery(POD_Q, {
    variables: { name, namespace },
    pollInterval: POLL_INTERVAL,
  })

  useEffect(() => {
    if (name && namespace) {
      setBreadcrumbs([
        { text: 'pods', url: '/pods' },
        { text: 'pods', url: '/pods' },
        { text: namespace, url: namespace },
        { text: name, url: name },
      ])
    }
  }, [name, namespace, setBreadcrumbs])

  if (!data) return <LoopingLogo dark />

  const { pod } = data
  const containerStatus = (pod.status.containerStatuses || []).reduce((acc, container) => ({ ...acc, [container.name]: container }),
    {})
  const initContainerStatus = (pod.status.initContainerStatuses || []).reduce((acc, container) => ({ ...acc, [container.name]: container }),
    {})
  const containers = pod.spec.containers || []
  const initContainers = pod.spec.initContainers || []

  return (
    <Box
      fill
      background="backgroundColor"
    >
      <Box
        flex={false}
        direction="row"
        gap="small"
        align="center"
        margin={{ left: 'small', vertical: 'small' }}
        pad={{ horizontal: 'medium' }}
      >
        <ComponentIcon kind="pod" />
        <Text
          size="medium"
          weight={500}
        >
          pod/{name}
        </Text>
        <ReadyIcon
          readiness={containerStatusToReadiness(pod.status)}
          size="20px"
          showIcon
        />
      </Box>
      <Box
        fill
        style={{ overflow: 'auto' }}
        pad={{ horizontal: 'medium' }}
        gap="xsmall"
      >
        <Tabs defaultTab="info">
          <TabHeader>
            <TabHeaderItem name="info">
              <Text
                size="small"
                weight={500}
              >
                info
              </Text>
            </TabHeaderItem>
            {initContainers.map(({ name }) => (
              <TabHeaderItem
                key={name}
                name={`init-container:${name}`}
              >
                <Box
                  direction="row"
                  gap="xsmall"
                  align="center"
                >
                  <ReadyIcon
                    size="12px"
                    readiness={containerStatusToReadiness(initContainerStatus[name])}
                  />
                  <Text
                    size="small"
                    weight={500}
                  >
                    init: {name}
                  </Text>
                </Box>
              </TabHeaderItem>
            ))}
            {containers.map(({ name: container }, i) => (
              <ContainerTabHeader
                namespace={namespace}
                pod={name}
                container={container}
                containerStatus={containerStatus}
                key={i}
              />
            ))}
            <TabHeaderItem name="events">
              <Text
                size="small"
                weight={500}
              >
                events
              </Text>
            </TabHeaderItem>
            <TabHeaderItem name="raw">
              <Text
                size="small"
                weight={500}
              >
                raw
              </Text>
            </TabHeaderItem>
          </TabHeader>
          <TabContent name="info">
            <Metadata metadata={pod.metadata} />
            <Status
              status={pod.status}
              metadata={pod.metadata}
            />
            <Spec spec={pod.spec} />
          </TabContent>
          {initContainers.map(container => (
            <TabContent
              key={container.name}
              name={`init-container:${container.name}`}
            >
              <Container
                container={container}
                containerStatus={initContainerStatus[container.name]}
              />
            </TabContent>
          ))}
          {containers.map(container => (
            <TabContent
              key={container.name}
              name={`container:${container.name}`}
            >
              <Container
                container={container}
                containerStatus={containerStatus[container.name]}
              />
            </TabContent>
          ))}
          {/* <TabContent name="events">
            <Events events={pod.events} />
          </TabContent>
          <TabContent name="raw">
            <RawContent raw={pod.raw} />
          </TabContent> */}
        </Tabs>
      </Box>
    </Box>
  )
}
