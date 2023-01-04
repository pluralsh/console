import { useContext, useEffect } from 'react'
import { useQuery } from 'react-apollo'
import { useParams } from 'react-router-dom'

import type { Event } from 'generated/graphql'

import { Code, PageTitle } from '@pluralsh/design-system'

import yaml from 'yaml'

import { Div } from 'honorable'

import { LoopingLogo } from '../../utils/AnimatedLogo'
import { BreadcrumbsContext } from '../../Breadcrumbs'
import { POLL_INTERVAL } from '../constants'
import { NODE_RAW_Q } from '../queries'

import { RawContent } from '../Component'

import { ScrollablePage } from './Node'

export default function NodeEvents() {
  const { name } = useParams()
  const { data, refetch: _refetch } = useQuery<{
    node: {
      raw: string
    }
  }>(NODE_RAW_Q, {
    variables: { name },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })
  const { setBreadcrumbs } = useContext(BreadcrumbsContext)

  useEffect(() => {
    setBreadcrumbs([
      { text: 'nodes', url: '/nodes' },
      { text: name || '', url: `/nodes/${name}` },
    ])
  }, [name, setBreadcrumbs])

  if (!data) return <LoopingLogo dark />

  const { node: { raw } } = data

  const content = yaml.stringify(JSON.parse(raw))

  return (
    <Div
      paddingBottom="xlarge"
      height="100%"
      maxHeight="100%"
    >
      <PageTitle heading="Raw" />
      <Code
        height="calc(100% - 120px)"
        maxHeight="100%"
        language="yaml"
      >{content }
      </Code>
    </Div>
  )
}

