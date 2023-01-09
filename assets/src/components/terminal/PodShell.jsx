import {
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Text, TextInput } from 'grommet'
import { Edit } from 'forge-core'
import { Checkmark } from 'grommet-icons'

import { useQuery } from '@apollo/react-hooks'

import { BreadcrumbsContext } from '../Breadcrumbs'
import { useEnsureCurrent } from '../Installations'
import { TabSelector } from '../utils/TabSelector'

import { POD_Q } from '../cluster/queries'
import { POLL_INTERVAL } from '../cluster/constants'
import { LoopingLogo } from '../utils/AnimatedLogo'
import { Icon } from '../users/Group'

import { Shell } from './Shell'

function ContainerSidebar({
  containers, container, namespace, name,
}) {
  const navigate = useNavigate()
  const onClick = useCallback(c => navigate(`/shell/pod/${namespace}/${name}/${c}`), [navigate, namespace, name])

  return (
    <Box
      border={{ side: 'right' }}
      fill="vertical"
      width="150px"
    >
      {containers.map(({ name }) => (
        <TabSelector
          key={name}
          hoverIndicator="card"
          enabled={name === container}
          onClick={() => onClick(name)}
        >
          <Text
            size="small"
            weight={500}
          >{name}
          </Text>
        </TabSelector>
      ))}
    </Box>
  )
}

function ShellTitle({ command, setCommand }) {
  const [edit, setEdit] = useState(false)
  const [val, setVal] = useState(command || '/bin/sh')
  const { namespace, name, container } = useParams()

  return (
    <Box
      fill="horizontal"
      direction="row"
      align="center"
      gap="xsmall"
    >
      <Text size="small">kubectl exec {name} -it -n {namespace} -c {container} --</Text>
      {!edit && <Text size="small">{command || '/bin/sh'}</Text>}
      {edit && (
        <Box
          flex={false}
          width="80px"
        >
          <TextInput
            plain
            value={val}
            onChange={({ target: { value } }) => setVal(value)}
          />
        </Box>
      )}
      {!edit && (
        <Icon
          icon={Edit}
          tooltip="change command"
          hover="card"
          onClick={() => setEdit(true)}
        />
      )}
      {edit && (
        <Icon
          icon={Checkmark}
          tooltip="set command"
          hover="card"
          onClick={() => {
            setEdit(false)
            setCommand(val)
          }}
        />
      )}
    </Box>
  )
}

export function PodShell() {
  const [command, setCommand] = useState(null)
  const { namespace, name, container } = useParams()
  const { setBreadcrumbs } = useContext(BreadcrumbsContext)
  const { data } = useQuery(POD_Q, { variables: { name, namespace }, pollInterval: POLL_INTERVAL })

  useEffect(() => {
    setBreadcrumbs([
      { text: 'pods', url: `/components/${namespace}`, disable: true },
      { text: namespace, url: `/components/${namespace}` },
      { text: name, url: `/pods/${namespace}/${name}` },
      { text: container, url: `/shell/pod/${namespace}/${name}/${container}` },
    ])
  }, [namespace, name, container, setBreadcrumbs])
  useEnsureCurrent(namespace)

  if (!data) return <LoopingLogo dark />

  const containers = data.pod.spec.containers || []

  return (
    <Shell
      room={`pod:${namespace}:${name}:${container}`}
      command={command}
      header={`connecting to pod ${name} using ${command || '/bin/sh'}...`}
    >
      <ShellTitle
        command={command}
        setCommand={setCommand}
      />
      <ContainerSidebar
        containers={containers}
        container={container}
        namespace={namespace}
        name={name}
      />
    </Shell>
  )
}
