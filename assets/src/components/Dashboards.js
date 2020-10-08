import React, { useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from 'react-apollo'
import { Box, Text, Select, Anchor } from 'grommet'
import { Scroller, Loading } from 'forge-core'
import { RepositoryChoice } from './Configuration'
import { BreadcrumbsContext } from './Breadcrumbs'
import { apiHost, secure } from '../helpers/hostname'
import { BUILD_PADDING } from './Builds'
import { CONFIGURATIONS_Q } from './graphql/forge'
import { Next } from 'grommet-icons'
import { chunk } from '../utils/array'
import { DASHBOARDS_Q } from './graphql/dashboards'
import yaml from 'js-yaml'
import AceEditor from "react-ace"
import "ace-builds/src-noconflict/mode-yaml"
import "ace-builds/src-noconflict/theme-terminal"

function grafanaHost() {
  const [_, ...rest] = apiHost().split(".")
  return `watchman-grafana.${rest.join('.')}`
}

const PROTOCOL = secure() ? 'https' : 'http'
const GRAFANA_URL = `${PROTOCOL}://${grafanaHost()}`

function logUrl(grafana, name) {
  const query = [
    "now-1h",
    "now",
    "Loki",
    {"expr": `{namespace="${name}"}`},
    {"mode":"Logs"},
    {"ui":[true,true,true,"none"]}
  ]

  return `https://${grafana}/explore?orgId=1&left=${encodeURI(JSON.stringify(query))}`
}

function ViewDashboards({repository: {icon, name}}) {
  const [current, setCurrent] = useState(null)
  const {data} = useQuery(DASHBOARDS_Q, {variables: {repo: name}, fetchPolicy: 'cache-and-network'})
  useEffect(() => {
    if (data && data.dashboards.length > 0) {
      setCurrent(data.dashboards[0])
    }
  }, [data])
  if (!data) return <Loading />

  return (
    <Box height='calc(100vh - 45px)'>
      <Box gap='small'>
        <Box
          pad={{vertical: 'small', ...BUILD_PADDING}}
          direction='row'
          align='center'
          border='bottom'
          height='60px'>
          <Box direction='row' fill='horizontal' gap='small' align='center'>
            {icon && <img alt='' src={icon} height='40px' width='40px' />}
            <Box gap='xxsmall'>
              <Text weight='bold' size='small'>{name} dashboards</Text>
            </Box>
          </Box>
          {data.dashboards.length > 0 && (
            <Select
              options={data.dashboards}
              value={current}
              labelKey={({spec: {name}}) => name}
              onChange={({value}) => setCurrent(value)} />
          )}
        </Box>
      </Box>
      <Box height='calc(100vh - 105px)'>
        {data.dashboards.length <= 0 ? (
          <Box pad='medium'>
            <Text>No dashboards for this repository, contact the publisher to fix this</Text>
          </Box>
        ) : (
          <AceEditor
            mode='yaml'
            theme='terminal'
            height='calc(100vh - 105px)'
            width='100%'
            name={name}
            value={current ? yaml.safeDump(current) : ''}
            showGutter
            showPrintMargin
            highlightActiveLine
            editorProps={{ $blockScrolling: true }} />
        )}
      </Box>
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
    return <ViewDashboards repository={selected.node.repository} />
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