import { useContext } from 'react'
import { Box, Text } from 'grommet'
import { useParams } from 'react-router'

import { InstallationContext } from '../Installations'
import { ReadyIcon } from '../Application'

import Icon from './Icon'

export default function ComponentName() {
  const { kind, name } = useParams()
  const { currentApplication } = useContext(InstallationContext)

  if (!currentApplication) return null
  const component = currentApplication.status.components.find(c => c.kind.toLowerCase() === kind.toLowerCase() && c.name === name)

  return (
    <Box
      direction="row"
      gap="small"
      align="center"
      margin={{ left: 'small' }}
    >
      <Icon
        kind={kind}
        size="15px"
      />
      <Text
        size="medium"
        weight={500}
      >{kind.toLowerCase()}/{name}
      </Text>
      {component && (
        <ReadyIcon
          readiness={component.status}
          size="20px"
          showIcon
        />
      )}
    </Box>
  )
}
