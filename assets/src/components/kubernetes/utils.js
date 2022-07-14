import React from 'react'
import { Anchor, Box, Text } from 'grommet'

import { useHistory } from 'react-router'
import { Logs } from 'forge-core'

import { asQuery } from '../utils/query'

export function Container({ header, children, ...props }) {
  return (
    <Box
      flex={false}
      pad={{ vertical: 'xsmall', horizontal: 'small' }}
      round="xsmall"
      gap="xsmall"
      margin="xsmall"
      {...props}
    >
      <Box>
        <Text size="small">{header}</Text>
      </Box>
      {children}
    </Box>
  )
}

export function LogLink({ url }) {
  const history = useHistory()

  return (
    <Box
      direction="row"
      align="center"
      gap="xsmall"
    >
      <Logs size="small" />
      <Anchor
        size="small"
        onClick={() => history.push(url)}
      >view logs
      </Anchor>
    </Box>
  )
}

export function logUrl({ name, namespace, labels }) {
  const appLabel = labels.find(({ name }) => name === 'app' || name === 'app.kubernetes.io/name')

  return `/logs/${namespace}?${asQuery({ job: `${namespace}/${appLabel ? appLabel.value : name}` })}`
}
