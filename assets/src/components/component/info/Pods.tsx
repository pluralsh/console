import {
  ColContainers,
  ColCpuReservation,
  ColDelete,
  ColImages,
  ColMemoryReservation,
  ColName,
  ColRestarts,
  PodsList,
} from 'components/cluster/pods/PodsList'
import { useOutletContext, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import {
  SERVICE_PARAM_CLUSTER_ID,
  getPodDetailsPath,
  getServicePodDetailsPath,
} from '../../../routes/cdRoutesConsts'

import { InfoSectionH2 } from './common'

const columns = [
  ColName,
  {
    ...ColMemoryReservation,
    meta: {
      truncate: true,
    },
  },
  ColCpuReservation,
  ColRestarts,
  ColContainers,
  ColImages,
  ColDelete,
]

export default function Pods({ pods }) {
  const clusterId = useParams()[SERVICE_PARAM_CLUSTER_ID]
  const { refetch, ...rest } = useOutletContext<any>()
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
      }}
    >
      <InfoSectionH2 css={{ marginBottom: theme.spacing.medium }}>
        Pods
      </InfoSectionH2>
      <PodsList
        pods={pods}
        columns={columns}
        serviceId={rest?.serviceId}
        refetch={refetch}
        {...(clusterId && rest?.serviceId
          ? {
              linkBasePath: getServicePodDetailsPath({
                serviceId: rest?.serviceId,
                clusterId,
              }),
            }
          : {})}
      />
    </div>
  )
}
