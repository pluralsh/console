import { ReactElement, ReactNode, useCallback, useMemo, useState } from 'react'
import styled from 'styled-components'
import { useMatch, useParams, useResolvedPath } from 'react-router-dom'
import pluralize from 'pluralize'
import { useQuery } from '@tanstack/react-query'

import { PageColumnSC, PageContentSC, PageRowSC } from '../../layout/PageLayout'
import { PageToolbar } from '../../layout/PageToolbar'
import { PageHeaderContext } from '../../cd/ContinuousDeployment'
import { getKubernetesAbsPath } from '../../../routes/kubernetesRoutesConsts.tsx'
import { AxiosInstance } from '../../../helpers/axios.ts'
import { GqlError } from '../../utils/Alert'
import {
  getNamespacedResourceOptions,
  getResourceOptions,
} from 'generated/kubernetes/@tanstack/react-query.gen.ts'

export interface TabEntry {
  label: string
  path: string
}

interface ResourceDetailsProps {
  tabs: Array<TabEntry>
  additionalHeaderContent?: Array<ReactElement<any>> | ReactElement<any>
  sidecar: ReactElement<any>
  children?: Array<ReactElement<any>> | ReactElement<any>
}

export default function ResourceDetails({
  tabs,
  additionalHeaderContent,
  sidecar,
  children,
}: ResourceDetailsProps): ReactElement<any> {
  const { pathname: basePath } = useResolvedPath('.')
  const pathMatch = useMatch(`${basePath}/:tab`)
  const tab = pathMatch?.params?.tab || ''
  const getTabPath = useCallback(
    (path: string) => (path ? `${basePath}/${path}` : basePath),
    [basePath]
  )
  const toolbarTabs = useMemo(
    () => tabs.map(({ label, path }) => ({ label, path: getTabPath(path) })),
    [tabs, getTabPath]
  )
  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const pageHeaderContext = useMemo(() => ({ setHeaderContent }), [])
  const { clusterId, name = '', namespace, crd } = useParams()
  const kindPathMatch = useMatch(`${getKubernetesAbsPath(clusterId)}/:kind/*`)
  const kind = useMemo(
    () => crd ?? pluralize(kindPathMatch?.params?.kind || '', 1),
    [crd, kindPathMatch?.params?.kind]
  )

  const namespacedQuery = useQuery({
    ...getNamespacedResourceOptions({
      client: AxiosInstance(clusterId ?? ''),
      path: { kind, name, namespace: namespace! },
    }),
    enabled: !!clusterId && !!namespace && kind !== 'secret',
    gcTime: 0,
    refetchInterval: 30_000,
  })

  const clusterQuery = useQuery({
    ...getResourceOptions({
      client: AxiosInstance(clusterId ?? ''),
      path: { kind, name },
    }),
    enabled: !!clusterId && !namespace && kind !== 'secret',
    gcTime: 0,
    refetchInterval: 30_000,
  })

  const { error } = namespace ? namespacedQuery : clusterQuery

  if (error) {
    return <GqlError error={error} />
  }

  return (
    <PageColumnSC>
      <PageToolbar
        tabs={toolbarTabs}
        activeFn={(path) => path === getTabPath(tab)}
      >
        {headerContent}
        {additionalHeaderContent}
      </PageToolbar>
      <PageRowSC>
        <PageContentSC>
          <PageHeaderContext.Provider value={pageHeaderContext}>
            {children}
          </PageHeaderContext.Provider>
        </PageContentSC>
        <SidecarSC>{sidecar}</SidecarSC>
      </PageRowSC>
    </PageColumnSC>
  )
}

const SidecarSC = styled.div(({ theme }) => ({
  flexShrink: 0,
  width: 360,
  minHeight: 0,
  overflowY: 'auto',
  padding: theme.spacing.large,
  paddingLeft: 0,
}))
