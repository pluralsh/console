import React, { useCallback, useContext, useEffect } from 'react'
import { Box, Text } from 'grommet'
import { useHistory, useParams } from 'react-router'
import { BreadcrumbsContext } from '../Breadcrumbs'
import { useEnsureCurrent } from '../Installations'
import { TabSelector } from '../utils/TabSelector'
import { Shell } from './Shell'
import { POD_Q } from '../kubernetes/queries'
import { POLL_INTERVAL } from '../kubernetes/constants'
import { useQuery } from '@apollo/react-hooks'
import { LoopingLogo } from '../utils/AnimatedLogo'

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

export function PodShell() {
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
      title={`pod / ${name} / ${container}`}
      room={`pod:${namespace}:${name}:${container}`} 
      header={`connecting to pod ${name}...`}>
      <ContainerSidebar 
        containers={containers} 
        container={container} 
        namespace={namespace}
        name={name} />
    </Shell>
  )
}