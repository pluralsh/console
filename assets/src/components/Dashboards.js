import React, { useContext, useEffect, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { useQuery } from 'react-apollo'
import { Box, Text, Select } from 'grommet'
import { Loading } from 'forge-core'
import { BreadcrumbsContext } from './Breadcrumbs'
import { BUILD_PADDING } from './Builds'
import { DASHBOARDS_Q } from './graphql/dashboards'
import Dashboard from './Dashboard'
import { InstallationContext, useEnsureCurrent } from './Installations'


export function DashboardHeader({name, label}) {
  return (
    <Box gap='xxsmall'>
      <Text weight='bold' size='small'>{name} {label}</Text>
    </Box>
  )
}

function IndividualHeader({current}) {
  return (
    <Box>
      <Text weight='bold' size='small'>{current.spec.name}</Text>
      <Text size='small' color='dark-3'>{current.spec.description}</Text>
    </Box>
  )
}

export default function Dashboards() {
  const {repo} = useParams()
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  const {setOnChange, currentInstallation} = useContext(InstallationContext)
  const repository = currentInstallation.repository
  let history = useHistory()
  useEffect(() => {
    setBreadcrumbs([
      {text: 'dashboards', url: '/dashboards'},
      {text: repository.name, url: `/dashboards/${repository.name}`}
    ])
  }, [repository])
  useEffect(() => {
    setOnChange({func: ({repository: {name}}) => {
      history.push(`/dashboards/${name}`)
    }})
  }, [])
  useEnsureCurrent(repo)

  const [current, setCurrent] = useState(null)
  const {data} = useQuery(DASHBOARDS_Q, {
    variables: {repo: repository.name},
    fetchPolicy: 'cache-and-network'
  })
  useEffect(() => {
    if (data && data.dashboards.length > 0) {
      setCurrent(data.dashboards[0])
    }
  }, [data, repository])

  if (!data) return <Loading />

  return (
    <Box fill>
      <Box gap='small' flex={false}>
        <Box
          pad={{vertical: 'small', ...BUILD_PADDING}}
          direction='row' align='center' height='60px'>
          <Box direction='row' fill='horizontal' gap='small' align='center'>
            {repository.icon && <img alt='' src={repository.icon} height='40px' width='40px' />}
            {current ? <IndividualHeader current={current} /> :
              <DashboardHeader name={repository.name} label='dashboards' />}
          </Box>
          {current && (
            <Select
              options={data.dashboards}
              value={current}
              labelKey={({spec: {name}}) => name}
              onChange={({value}) => setCurrent(value)} />
          )}
        </Box>
      </Box>
      <Box fill>
        {data.dashboards.length > 0 ? (
          current ? <Dashboard repo={repository.name} name={current.id} /> : <Loading />
        ) : <Text size='small'>No dashboards for this repository, contact the developer to fix this</Text>
        }
      </Box>
    </Box>
  )
}