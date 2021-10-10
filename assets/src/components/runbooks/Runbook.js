import React, { useContext, useEffect, useState } from 'react'
import { useQuery } from '@apollo/react-hooks'
import { useParams } from 'react-router'
import { BreadcrumbsContext } from '../Breadcrumbs'
import { HEADER_HEIGHT } from '../Builds'
import { LoopingLogo } from '../utils/AnimatedLogo'
import { Display } from './Display'
import { RUNBOOK_Q } from './queries'
import { useEnsureCurrent } from '../Installations'
import { Box, Text } from 'grommet'
import { StatusIcon } from './StatusIcon'
import { Portal } from 'react-portal'
import { DURATIONS, RangePicker } from '../Dashboard'

const POLL_INTERVAL = 30 * 1000

export const ActionContext = React.createContext({})

function ActionContainer() {
  const {setRef} = useContext(ActionContext)

  return <Box ref={setRef} flex={false} />
}

export function ActionPortal({children, name}) {
  const {ref, setName} = useContext(ActionContext)

  return (
    <Portal node={ref}>
      <Box pad={{vertical: 'xsmall'}}>
        {children}
      </Box>
    </Portal>
  )
}

export function Runbook() {
  const [duration, setDuration] = useState(DURATIONS[0])
  const {namespace, name} = useParams()
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  const [ref, setRef] = useState(null)
  const {data} = useQuery(RUNBOOK_Q, {
    variables: {
      namespace, name, 
      context: {timeseriesStart: -duration.offset, timeseriesStep: duration.step}},
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL
  })

  useEffect(() => {
    setBreadcrumbs([
      {text: 'runbooks', url: '/runbooks'},
      {text: namespace, url: `/runbooks/${namespace}`},
      {text: name, url: `/runbooks/${namespace}/${name}`},
    ])
  }, [namespace, name])

  useEnsureCurrent(namespace)

  if (!data) return <LoopingLogo dark />

  const {runbook} = data

  return (
    <ActionContext.Provider value={{ref, setRef}}>
    <Box fill  background='backgroundColor' gap='small'>
      <Box pad='small' border={{side: 'bottom'}} direction='row' gap='small' align='center'>
        <Box flex={false}>
          <StatusIcon status={runbook.status} size={35} innerSize={20} />
        </Box>
        <Box fill='horizontal'>
          <Text size='small' weight='bold'>{runbook.spec.name}</Text>
          <Text size='small' color='dark-3'>{runbook.spec.description}</Text>
        </Box>
        <Box flex={false}>
          <RangePicker duration={duration} setDuration={setDuration} />
        </Box>
        <ActionContainer />
      </Box>
      <Box style={{overflow: 'auto'}} pad='small' fill>
        <Display root={runbook.spec.display} data={runbook.data} />
      </Box>
    </Box>
    </ActionContext.Provider>
  )
}