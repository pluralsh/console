import { useLocation, useOutletContext, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { getPodDetailsPath } from '../../../routes/cdRoutesConsts'

import { ComponentDetailsContext } from '../ComponentDetails'

import { PodFragment } from 'generated/graphql.ts'
import { FLOWS_ABS_PATH } from 'routes/flowRoutesConsts.tsx'
import { isNonNullable } from 'utils/isNonNullable.ts'
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
  ColCreation,
  ColDelete,
]

export default function Pods({ pods }: { pods: Nullable<PodFragment>[] }) {
  const theme = useTheme()
  const referrer = useLocation().pathname.includes(FLOWS_ABS_PATH)
    ? 'flow'
    : 'service'
  const { flowId } = useParams()
  const { refetch, component, ...rest } =
    useOutletContext<ComponentDetailsContext>()
  const clusterId = rest.cluster?.id

  const linkToK8sDashboard =
    component.kind.toLowerCase() === 'job' ||
    component.kind.toLowerCase() === 'cronjob'

  const filteredPods = pods.filter(isNonNullable)

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
        pods={filteredPods}
        columns={columns}
        linkToK8sDashboard={linkToK8sDashboard}
        clusterId={rest.cluster?.id}
        serviceId={rest?.serviceId}
        refetch={refetch}
        {...((clusterId || flowId) && rest?.serviceId
          ? {
              linkBasePath: getPodDetailsPath({
                type: referrer,
                serviceId: rest?.serviceId,
                clusterId,
                flowId,
              }),
            }
          : {})}
      />
    </div>
  )
}
