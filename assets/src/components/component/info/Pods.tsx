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
import { useMemo } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import {
  SERVICE_PARAM_CLUSTER_ID,
  getPodDetailsPath,
} from '../../../routes/cdRoutesConsts'

import { InfoSectionH2 } from './common'

export default function Pods({ pods }) {
  const clusterId = useParams()[SERVICE_PARAM_CLUSTER_ID]
  const { refetch } = useOutletContext<any>()
  const theme = useTheme()
  const columns = useMemo(
    () => [
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
      ColDelete(refetch),
    ],
    [refetch]
  )

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
        {...(clusterId
          ? {
              linkBasePath: getPodDetailsPath({ clusterId }),
            }
          : {})}
      />
    </div>
  )
}
