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
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { InfoSectionH2 } from './common'

export default function Pods({ pods }) {
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
      />
    </div>
  )
}
