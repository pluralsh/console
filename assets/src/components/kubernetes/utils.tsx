import { Anchor, Box, Text } from 'grommet'

import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()

  return (
    <Box
      direction="row"
      align="center"
      gap="xsmall"
    >
      <Logs size="small" />
      <Anchor
        size="small"
        onClick={() => navigate(url)}
      >view logs
      </Anchor>
    </Box>
  )
}

export function logUrl({ name, namespace, labels }) {
  const appLabel = labels.find(({ name }) => name === 'app' || name === 'app.kubernetes.io/name')

  return `/logs/${namespace}?${asQuery({ job: `${namespace}/${appLabel ? appLabel.value : name}` })}`
}

export function roundToTwoPlaces(x:number) {
  return roundTo(x, 2)
}

export const roundTo = (x: number, decimalPlaces = 2) => {
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0) {
    throw Error('decimalPlaces must be positive integer')
  }
  const factor = 10 * Math.floor(decimalPlaces)

  return Math.round(x * factor) / factor
}

export const datum = ({ timestamp, value }) => ({
  x: new Date(timestamp * 1000),
  y: roundToTwoPlaces(parseFloat(value)),
})

export const cpuFmt = cpu => `${cpu}vcpu`

export const podContainers = pods => pods
  .filter(({ status: { phase } }) => phase !== 'Succeeded')
  .map(({ spec: { containers } }) => containers)
  .flat()
