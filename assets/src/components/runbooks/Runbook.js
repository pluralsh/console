import React, { useContext, useEffect } from 'react'
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
import { useState } from 'react'
import { DURATIONS, RangePicker } from '../Dashboard'

const POLL_INTERVAL = 30 * 1000

export function Runbook() {
  const [duration, setDuration] = useState(DURATIONS[0])
  const {namespace, name} = useParams()
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
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

  if (!data) return <LoopingLogo />

  const {runbook} = data

  return (
    <Box fill pad='small' background='backgroundColor'>
      <Box height={HEADER_HEIGHT} border={{side: 'bottom', color: 'sidebar'}} direction='row' gap='small' align='center'>
        <Box flex={false}>
          <StatusIcon status={runbook.status} size={35} innerSize={20} />
        </Box>
        <Box fill='horizontal'>
          <Text size='small' weight='bold'>{runbook.spec.name}</Text>
          <Text size='small'>{runbook.spec.description}</Text>
        </Box>
        <Box flex={false}>
          <RangePicker duration={duration} setDuration={setDuration} />
        </Box>
      </Box>
      <Box style={{overflow: 'auto'}} pad='small' fill>
        <Display root={runbook.spec.display} data={runbook.data} />
      </Box>
    </Box>
  )
}