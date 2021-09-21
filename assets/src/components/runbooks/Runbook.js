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

const POLL_INTERVAL = 30 * 1000

export function Runbook() {
  const {namespace, name} = useParams()
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  const {data} = useQuery(RUNBOOK_Q, {
    variables: {namespace, name},
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
      <Box height={HEADER_HEIGHT}>
        <Text size='small' weight='bold'>{runbook.spec.name}</Text>
        <Text size='small'>{runbook.spec.description}</Text>
      </Box>
      <Display root={runbook.spec.display} data={runbook.data} />
    </Box>
  )
}