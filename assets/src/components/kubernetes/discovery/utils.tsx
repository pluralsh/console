import { isEmpty } from 'lodash'

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
