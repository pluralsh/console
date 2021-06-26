import React, { useContext, useEffect } from 'react'
import { Box, Text } from 'grommet'
import { Scroller } from 'forge-core'
import { FormNext } from 'grommet-icons'
import { useHistory } from 'react-router'
import { chunk } from '../utils/array'
import { BUILD_PADDING } from './Builds'
import { BreadcrumbsContext } from './Breadcrumbs'
import { ApplicationIcon, hasIcon, InstallationContext } from './Installations'

export function RepositoryChoice({application, link}) {
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
        {hasIcon(application) && <ApplicationIcon application={application} size='40px' dark />}
        <Box>
          <Text size='small' style={{fontWeight: 500}}>{application.name}</Text>
          <Text size='small' color='dark-6'>{application.spec.descriptor.version} -- {application.spec.descriptor.description}</Text>
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
  const {setOnChange, applications, setCurrentApplication} = useContext(InstallationContext)
  let history = useHistory()
  useEffect(() => {
    setBreadcrumbs([{text: title.toLowerCase(), url: `/${prefix}`}])
  }, [])
  useEffect(() => {
    setOnChange({func: ({name}) => history.push(`/${prefix}/${name}`)})
  }, [prefix])

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
          edges={[...chunk(applications, 2)]}
          mapper={(chunk) => (
            <Box direction='row' height='100px' gap='small' margin={{bottom: 'small'}}>
               {chunk.map((application) => (
                  <RepositoryChoice
                    key={application.name}
                    link={() => setCurrentApplication(application)}
                    application={application} />))}
            </Box>
          )} />
      </Box>
    </Box>
  )
}