import { useOutletContext, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import {
  SERVICE_PARAM_CLUSTER_ID,
  getServicePodDetailsPath,
} from '../../../routes/cdRoutesConsts'

import { ComponentDetailsContext } from '../ComponentDetails'

import { InfoSectionH2 } from './common'
import {
  ColContainers,
  ColCpuReservation,
  ColCreation,
  ColDelete,
  ColImages,
  ColMemoryReservation,
  ColName,
  ColRestarts,
  PodsList,
} from '../../cd/cluster/pod/PodsList.tsx'

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
  ColCreation,
  ColDelete,
]

export default function Pods({ pods }) {
  const clusterId = useParams()[SERVICE_PARAM_CLUSTER_ID]
  const { refetch, component, ...rest } =
    useOutletContext<ComponentDetailsContext>()
  const theme = useTheme()

  const linkToK8sDashboard =
    component.kind.toLowerCase() === 'job' ||
    component.kind.toLowerCase() === 'cronjob'

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
        linkToK8sDashboard={linkToK8sDashboard}
        clusterId={clusterId}
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
