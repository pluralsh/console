import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { isEmpty } from 'lodash'
import { ReactElement, useEffect, useMemo } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AxiosInstance } from '../../../helpers/axios.ts'

import {
  TypesCustomResourceObjectDetail as CustomResourceT,
  TypesCustomResourceObjectList as CustomResourceListT,
  TypesCustomResourceDefinitionDetail,
} from '../../../generated/kubernetes'
import {
  getCustomResourceDefinitionOptions,
  getCustomResourceObjectsInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { useSetPageHeaderContent } from '../../cd/ContinuousDeployment'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { GqlError } from '../../utils/Alert'
import { useCluster } from '../Cluster'
import Conditions from '../common/Conditions'
import { DataSelectInputs, useDataSelect } from '../common/DataSelect'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { ResourceList } from '../common/ResourceList.tsx'

import { Kind } from '../common/types'

import { MetadataSidecar, useDefaultColumns } from '../common/utils'

import { getBreadcrumbs } from './CustomResourceDefinitions'
import { CRDEstablishedChip } from './utils'

const directory: Array<TabEntry> = [
  { path: '', label: 'Objects' },
  { path: 'conditions', label: 'Conditions' },
  { path: 'raw', label: 'Raw' },
] as const

export default function CustomResourceDefinition(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId = '', name = '' } = useParams()
  const {
    data: crd,
    isLoading,
    error,
  } = useQuery({
    ...getCustomResourceDefinitionOptions({
      client: AxiosInstance(clusterId),
      path: { crd: name },
    }),
    refetchInterval: 30_000,
  })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            Kind.CustomResourceDefinition,
            name
          ),
        },
      ],
      [cluster, clusterId, name]
    )
  )

  if (error) {
    return <GqlError error={error} />
  }

  if (isLoading) {
    return <LoadingIndicator />
  }

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={crd}>
          <SidecarItem heading="Group">{crd?.group}</SidecarItem>
          <SidecarItem heading="Version">{crd?.version}</SidecarItem>
          <SidecarItem heading="Kind">{crd?.names.kind}</SidecarItem>
          <SidecarItem heading="Scope">{crd?.scope}</SidecarItem>
          <SidecarItem heading="Established">
            <CRDEstablishedChip established={crd?.established} />
          </SidecarItem>
          <SidecarItem heading="Subresources">
            <ChipList
              size="small"
              limit={5}
              values={crd?.subresources ?? []}
              emptyState={<div>-</div>}
            />
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={crd} />
    </ResourceDetails>
  )
}

const columnHelper = createColumnHelper<CustomResourceT>()

export function CustomResourceDefinitionObjects() {
  const crd = useOutletContext() as TypesCustomResourceDefinitionDetail
  const namespaced = crd?.scope.toLowerCase() === 'namespaced'
  const dataSelect = useDataSelect()
  const { name = '' } = useParams()
  const { colAction, colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      ...(namespaced ? [colNamespace] : []),
      colLabels,
      colCreationTimestamp,
      colAction,
    ],
    [
      namespaced,
      colName,
      colNamespace,
      colLabels,
      colCreationTimestamp,
      colAction,
    ]
  )

  useEffect(() => {
    dataSelect.setNamespaced(namespaced)
  }, [namespaced, dataSelect])

  const headerContent = useMemo(() => <DataSelectInputs />, [])

  useSetPageHeaderContent(headerContent)

  return (
    <ResourceList<CustomResourceListT, CustomResourceT>
      namespaced={namespaced}
      customResource
      columns={columns}
      queryOptions={getCustomResourceObjectsInfiniteOptions}
      pathParams={{
        crd: name,
        namespace: isEmpty(dataSelect.namespace) ? ' ' : dataSelect.namespace,
      }}
      itemsKey="items"
    />
  )
}

export function CustomResourceDefinitionConditions(): ReactElement<any> {
  const { conditions } =
    useOutletContext() as TypesCustomResourceDefinitionDetail

  return <Conditions conditions={conditions} />
}
