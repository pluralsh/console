import React, { useContext, useEffect } from 'react'
import { Box, Text } from 'grommet'
import { Scroller, Loading } from 'forge-core'
import { FormNext } from 'grommet-icons'
import { useHistory } from 'react-router'
import { chunk } from '../utils/array'
import { BUILD_PADDING } from './Builds'
import { BreadcrumbsContext } from './Breadcrumbs'
import { useQuery } from 'react-apollo'
import { CONFIGURATIONS_Q } from './graphql/forge'
import { InstallationContext } from './Installations'

export function RepositoryChoice({config: {name, icon, description}, link}) {
  return (
    <Box
      onClick={link}
      width='50%'
      hoverIndicator='backgroundDark'
      background='cardDetailLight'
      direction='row'
      align='center'
      justify='center'
      round='xsmall'
      pad='medium'>
      <Box direction='row' fill='horizontal' gap='small' align='center'>
        {icon && <img alt='' src={icon} height='40px' width='40px' />}
        <Box>
          <Text size='small' style={{fontWeight: 500}}>{name}</Text>
          <Text size='small' color='dark-6'>{description}</Text>
        </Box>
      </Box>
      <Box flex={false}>
        <FormNext size='25px' />
      </Box>
    </Box>
  )
}

export default function RepositorySelector({title, description, prefix}) {
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  const {setOnChange, setCurrentInstallation} = useContext(InstallationContext)
  let history = useHistory()
  const {data} = useQuery(CONFIGURATIONS_Q, {fetchPolicy: 'cache-and-network'})
  useEffect(() => {
    setBreadcrumbs([{text: title.toLowerCase(), url: `/${prefix}`}])
  }, [])
  useEffect(() => {
    setOnChange({func: ({repository: {name}}) => history.push(`/${prefix}/${name}`)})
  }, [prefix])

  if (!data) return <Loading />

  const {edges} = data.installations

  return (
    <Box height='calc(100vh - 45px)'>
      <Box gap='small' background='backgroundColor'>
        <Box
          pad={{vertical: 'small', ...BUILD_PADDING}} direction='row' align='center' height='60px'>
          <Box fill='horizontal' pad={{horizontal: 'small'}}>
            <Text weight='bold' size='small'>{title}</Text>
            <Text size='small' color='dark-6'>{description}</Text>
          </Box>
        </Box>
      </Box>
      <Box height='calc(100vh - 105px)' background='backgroundColor' pad='small'>
        <Scroller
          id={prefix}
          style={{height: '100%', overflow: 'auto'}}
          edges={[...chunk(edges, 2)]}
          mapper={(chunk) => (
            <Box direction='row' height='100px' gap='small' margin={{bottom: 'small'}}>
               {chunk.map(({node}) => (
                  <RepositoryChoice
                    key={node.id}
                    link={() => setCurrentInstallation(node)}
                    config={node.repository} />))}
            </Box>
          )} />
      </Box>
    </Box>
  )
}