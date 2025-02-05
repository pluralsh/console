import { Button, SubTab, TabList, TabPanel } from '@pluralsh/design-system'
import { ViewLogsButton } from 'components/component/ViewLogsButton'
import { useLogin } from 'components/contexts'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { LinkTabWrap } from 'components/utils/Tabs'
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useMatch, useNavigate } from 'react-router-dom'

import { GqlError } from 'components/utils/Alert'
import {
  ClusterMinimalFragment,
  ServiceDeploymentComponentFragment,
  ServiceDeploymentDetailsFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { useTheme } from 'styled-components'

import { useExplainWithAI } from 'components/ai/AIContext.tsx'
import { PageHeaderContext } from '../cd/ContinuousDeployment.tsx'
import { getDirectory } from './directory.tsx'
import {
  ComponentDetailsT,
  isUnstructured,
  useFetchComponentDetails,
} from './useFetchComponentDetails.tsx'

export type ComponentDetailsContext = {
  component: ServiceDeploymentComponentFragment
  refetch: () => void
  componentDetails: Nullable<ComponentDetailsT>
  loading: boolean
  cluster?: Nullable<ClusterMinimalFragment>
  serviceId?: string
}

export function ComponentDetails({
  component,
  pathMatchString,
  service,
  serviceComponents,
  hasPrometheus,
}: {
  component: ServiceDeploymentComponentFragment
  pathMatchString: string
  service?: Nullable<ServiceDeploymentDetailsFragment>
  serviceComponents: ServiceDeploymentComponentFragment[]
  hasPrometheus?: boolean
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const tabStateRef = useRef<any>(null)
  const { me } = useLogin()
  const componentKind = component.kind?.toLowerCase() || ''
  const componentName = component.name?.toLowerCase() || ''

  const { data, loading, refetch, error } = useFetchComponentDetails({
    component,
    service,
  })

  // To avoid mapping between component types and fields of data returned by API
  // we are picking first available value from API object for now.
  const value: Nullable<ComponentDetailsT> = useMemo(
    () =>
      data ? Object.values(data).find((value) => value !== undefined) : null,
    [data]
  )

  useExplainWithAI(
    value
      ? `Describe the following kubernetes resource: ${value?.raw}`
      : undefined
  )

  const subpath = useMatch(`${pathMatchString}/:subpath`)?.params?.subpath || ''
  const outletContext: ComponentDetailsContext = useMemo(
    () => ({
      component,
      componentDetails: value,
      loading,
      refetch,
      cluster: service?.cluster,
      serviceId: service?.id,
      serviceComponents,
    }),
    [component, value, loading, refetch, service, serviceComponents]
  )
  const pluralServiceDeploymentRef =
    value?.__typename === 'PluralServiceDeployment' ? value.reference : null

  const hasNotFoundError = useMemo(
    () => !data && error && error?.message?.includes('not found'),
    [data, error]
  )

  const filteredDirectory = getDirectory(component?.insight).filter(
    ({ onlyFor, onlyIfNoError, onlyIfDryRun, prometheus, path }) =>
      (!onlyFor || (componentKind && onlyFor.includes(componentKind))) &&
      (!prometheus || !service?.cluster?.id || hasPrometheus) &&
      (!onlyIfNoError || !hasNotFoundError) &&
      (!onlyIfDryRun || service?.dryRun) &&
      !(path === 'info' && isUnstructured(componentKind)) &&
      !(path === 'insights' && !component?.insight)
  )

  const currentTab = filteredDirectory.find(({ path }) => path === subpath)

  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const pageHeaderContext = useMemo(() => ({ setHeaderContent }), [])

  useEffect(() => {
    if (currentTab) return

    if (isEmpty(filteredDirectory)) {
      navigate(`/cd/clusters/${service?.cluster?.id}/services/${service?.id}`)
    } else {
      navigate(
        `/cd/clusters/${service?.cluster?.id}/services/${service?.id}/components/${component.id}/${filteredDirectory[0].path}`,
        { replace: true }
      )
    }
  }, [navigate, currentTab, filteredDirectory, service, component])

  if (!me || (!data && loading)) return <LoadingIndicator />

  return (
    <PageHeaderContext.Provider value={pageHeaderContext}>
      <ResponsivePageFullWidth
        scrollable={
          currentTab?.path === '' ||
          currentTab?.path === 'info' ||
          currentTab?.path === 'metadata'
        }
        heading={componentName}
        headingContent={
          <div>
            <div
              css={{
                display: 'flex',
                gap: theme.spacing.medium,
                className: 'DELETE',
                margin: `${theme.spacing.medium}px 0`,
              }}
            >
              <TabList
                stateRef={tabStateRef}
                stateProps={{
                  orientation: 'horizontal',
                  selectedKey: currentTab?.path,
                }}
              >
                {filteredDirectory.map(({ label, path }) => (
                  <LinkTabWrap
                    key={path}
                    to={path}
                    subTab
                  >
                    <SubTab>{label}</SubTab>
                  </LinkTabWrap>
                ))}
              </TabList>
              {pluralServiceDeploymentRef?.id &&
                pluralServiceDeploymentRef?.cluster?.id && (
                  <Button
                    as={Link}
                    to={getServiceDetailsPath({
                      serviceId: pluralServiceDeploymentRef?.id,
                      clusterId: pluralServiceDeploymentRef?.cluster.id,
                    })}
                  >
                    View service
                  </Button>
                )}
              {!service?.id && (
                <ViewLogsButton
                  metadata={value?.metadata}
                  kind={componentKind}
                />
              )}
              {headerContent}
            </div>
          </div>
        }
      >
        {error && currentTab?.path !== 'dryrun' && (
          <div css={{ marginBottom: theme.spacing.medium }}>
            <GqlError error={error} />
          </div>
        )}
        <TabPanel
          css={{ display: 'contents' }}
          stateRef={tabStateRef}
        >
          <Outlet context={outletContext} />
        </TabPanel>
      </ResponsivePageFullWidth>
    </PageHeaderContext.Provider>
  )
}
