import { isEmpty } from 'lodash'

import { Chip } from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { TableText } from '../../cluster/TableElements'
import {
  Common_Endpoint as EndpointT,
  Maybe,
} from '../../../generated/graphql-kubernetes'

export const serviceTypeDisplayName = {
  clusterip: 'Cluster IP',
  externalname: 'External name',
  loadbalancer: 'Load balancer',
  nodeport: 'Node port',
}

export function TableEndpoints({
  endpoints,
}: {
  endpoints: Maybe<EndpointT>[]
}) {
  return endpoints.map((endpoint) =>
    isEmpty(endpoint?.ports) ? (
      <TableText>{endpoint?.host}</TableText>
    ) : (
      <div>
        {endpoint?.ports.map((port) => (
          <TableText>
            {endpoint?.host}:{port?.port ?? port?.nodePort} {port?.protocol}
          </TableText>
        ))}
      </div>
    )
  )
}

export function Endpoints({ endpoints }: { endpoints: Maybe<EndpointT>[] }) {
  const theme = useTheme()

  if (isEmpty(endpoints)) return '-'

  return (
    <div css={{ display: 'flex', gap: theme.spacing.xsmall, flexWrap: 'wrap' }}>
      {endpoints.map((endpoint) =>
        isEmpty(endpoint?.ports) ? (
          <Chip size="small">{endpoint?.host}</Chip>
        ) : (
          endpoint?.ports.map((port) => (
            <Chip size="small">
              {endpoint?.host}:{port?.port ?? port?.nodePort} {port?.protocol}
            </Chip>
          ))
        )
      )}
    </div>
  )
}
