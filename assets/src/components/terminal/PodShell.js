import React, { useCallback, useContext, useEffect, useState } from 'react'
import { useHistory, useParams } from 'react-router'
import { Box, Text, TextInput } from 'grommet'
import { Edit } from 'forge-core'
import { Checkmark } from 'grommet-icons'
import { BreadcrumbsContext } from '../Breadcrumbs'
import { useEnsureCurrent } from '../Installations'
import { TabSelector } from '../utils/TabSelector'
import { Shell } from './Shell'
import { POD_Q } from '../kubernetes/queries'
import { POLL_INTERVAL } from '../kubernetes/constants'
import { useQuery } from '@apollo/react-hooks'
import { LoopingLogo } from '../utils/AnimatedLogo'
import { Icon } from '../users/Group'

function ContainerSidebar({containers, container, namespace, name}) {
  let history = useHistory()
  const onClick = useCallback((c) => history.push(`/shell/pod/${namespace}/${name}/${c}`), [history, namespace, name])

  return (
    <Box border={{side: 'right'}} fill='vertical' width='150px'>
      {containers.map(({name}) => (
        <TabSelector hoverIndicator='card' enabled={name === container} onClick={() => onClick(name)}>
          <Text size='small' weight={500}>{name}</Text>
        </TabSelector>
      ))}
    </Box>
  )
}

function ShellTitle({command, setCommand}) {
  const [edit, setEdit] = useState(false)
  const [val, setVal] = useState(command || '/bin/sh')
  const {namespace, name, container} = useParams()

  return (
    <Box fill='horizontal' direction='row' align='center' gap='xsmall'>
      <Text size='small'>kubectl exec {name} -it -n {namespace} -c {container} --</Text>
      {!edit && <Text size='small'>{command || '/bin/sh'}</Text>}
      {edit && (
        <Box flex={false} width='80px'>
          <TextInput plain value={val} onChange={({target: {value}}) => setVal(value)} />
        </Box>
      )}
      {!edit && <Icon icon={Edit} tooltip='change command' hover='card' onClick={() => setEdit(true)} />}
      {edit && <Icon icon={Checkmark} tooltip='set command' hover='card' onClick={() => {
        setEdit(false)
        setCommand(val)
      }} />}
    </Box>
  )
}

export function PodShell() {
  const [command, setCommand] = useState(null)
  const {namespace, name, container} = useParams()
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  const {data} = useQuery(POD_Q, {variables: {name, namespace}, pollInterval: POLL_INTERVAL})

  useEffect(() => {
    setBreadcrumbs([
      {text: 'pods', url: `/components/${namespace}`, disable: true},
      {text: namespace, url: `/components/${namespace}`},
      {text: name, url: `/pods/${namespace}/${name}`},
      {text: container, url: `/shell/pod/${namespace}/${name}/${container}`}
    ])
  }, [namespace, name, container])
  useEnsureCurrent(namespace)

  if (!data) return <LoopingLogo dark />

  const containers = data.pod.spec.containers || []

  return (
    <Shell 
      room={`pod:${namespace}:${name}:${container}`}
      command={command} 
      header={`connecting to pod ${name} using ${command || '/bin/sh'}...`}>
      <ShellTitle command={command} setCommand={setCommand} />
      <ContainerSidebar 
        containers={containers} 
        container={container} 
        namespace={namespace}
        name={name} />
    </Shell>
  )
}