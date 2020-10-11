import React, { useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from 'react-apollo'
import { Box, Text, Select } from 'grommet'
import { Scroller, Loading, Tabs, TabHeader, TabHeaderItem, TabContent } from 'forge-core'
import { RepositoryChoice } from './Configuration'
import { BreadcrumbsContext } from './Breadcrumbs'
import { BUILD_PADDING } from './Builds'
import { CONFIGURATIONS_Q } from './graphql/forge'
import { chunk } from '../utils/array'
import { DASHBOARDS_Q } from './graphql/dashboards'
import Dashboard from './Dashboard'

function ViewDashboards({repository: {name}, setModifier, setSelect}) {
  const [current, setCurrent] = useState(null)
  const {data} = useQuery(DASHBOARDS_Q, {variables: {repo: name}, fetchPolicy: 'cache-and-network'})
  useEffect(() => {
    if (data && data.dashboards.length > 0) {
      !current && setCurrent(data.dashboards[0])
      setSelect(
        <Select
          options={data.dashboards}
          value={current}
          labelKey={({spec: {name}}) => name}
          onChange={({value}) => setCurrent(value)} />
      )
    }
  }, [data, current])
  useEffect(() => {
    setModifier(current ? (<Box>
        <Text weight='bold' size='small'>{current.spec.name}</Text>
        <Text size='small' color='dark-3'>{current.spec.description}</Text>
      </Box>) : (<Box gap='xxsmall'><Text weight='bold' size='small'>{name} dashboards</Text></Box>))
  }, [current])
  if (!data) return <Loading />

  return (
    <Box fill>
      {data.dashboards.length <= 0 ? (
        <Box pad='medium'>
          <Text>No dashboards for this repository, contact the publisher to fix this</Text>
        </Box>
      ) : (current && <Dashboard repo={name} name={current.id} />)}
    </Box>
  )
}

function Observability({repository}) {
  const [modifier, setModifier] = useState(null)
  const [select, setSelect] = useState(null)
  return (
    <Box fill>
      <Box gap='small' flex={false}>
        <Box
          pad={{vertical: 'small', ...BUILD_PADDING}}
          direction='row' align='center' height='60px'>
          <Box direction='row' fill='horizontal' gap='small' align='center'>
            {repository.icon && <img alt='' src={repository.icon} height='40px' width='40px' />}
            {modifier}
          </Box>
          {select}
        </Box>
      </Box>
      <Tabs defaultTab='dashboards'>
        <TabHeader>
          <TabHeaderItem name='dashboards'>
            <Text style={{fontWeight: 500}} size='small'>Dashboards</Text>
          </TabHeaderItem>
          <TabHeaderItem name='logs'>
            <Text style={{fontWeight: 500}} size='small'>Logs</Text>
          </TabHeaderItem>
        </TabHeader>
        <TabContent name='dashboards'>
          <ViewDashboards repository={repository} setModifier={setModifier} setSelect={setSelect} />
        </TabContent>
        <TabContent name='logs'>
          <ViewDashboards repository={repository} setModifier={setModifier} setSelect={setSelect} />
        </TabContent>
      </Tabs>
    </Box>
  )
}

export default function Dashboards() {
  const {repo} = useParams()
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  useEffect(() => {
    const additional = repo ? [{text: repo, url: `/dashboards/${repo}`}] : []
    setBreadcrumbs([{text: 'dashboards', url: '/dashboards'}, ...additional])
  }, [repo])
  const {data} = useQuery(CONFIGURATIONS_Q, {fetchPolicy: 'cache-and-network'})

  if (!data) return <Loading />
  const {edges} = data.installations
  const selected = edges.find(({node: {repository: {name}}}) => name === repo)
  if (repo && selected) {
    return <Observability repository={selected.node.repository} />
  }

  return (
    <Box height='calc(100vh - 45px)'>
      <Box gap='small'>
        <Box
          pad={{vertical: 'small', ...BUILD_PADDING}}
          direction='row'
          align='center'
          border='bottom'
          background='backgroundColor'
          height='60px'>
          <Box fill='horizontal' pad={{horizontal: 'small'}}>
            <Text weight='bold' size='small'>Dashboards</Text>
            <Text size='small' color='dark-6'>See runtime data for each of your installations</Text>
          </Box>
        </Box>
      </Box>
      <Box height='calc(100vh - 105px)' background='backgroundColor' pad='small'>
        <Scroller
          id='configuration'
          style={{height: '100%', overflow: 'auto'}}
          edges={[...chunk(edges, 2)]}
          mapper={(chunk) => (
            <Box direction='row' height='100px' gap='small' margin={{bottom: 'small'}}>
              {chunk.map(({node: {repository}}) => (
                <RepositoryChoice
                  key={repository.id}
                  link={`/dashboards/${repository.name}`}
                  config={repository} />))}
            </Box>
          )} />
      </Box>
    </Box>
  )
}