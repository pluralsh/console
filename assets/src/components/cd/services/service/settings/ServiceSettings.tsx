import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { SubtabDirectory, SubTabs } from 'components/utils/SubTabs'
import { useFlowQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { Outlet, useMatch, useParams } from 'react-router-dom'
import {
  CD_SERVICE_PATH_MATCHER_ABS,
  FLOW_SERVICE_PATH_MATCHER_ABS,
  SERVICE_SETTINGS_GIT_REL_PATH,
  SERVICE_SETTINGS_HELM_REL_PATH,
  SERVICE_SETTINGS_REVISIONS_REL_PATH,
  SERVICE_SETTINGS_SECRETS_REL_PATH,
} from 'routes/cdRoutesConsts'
import {
  getServiceDetailsBreadcrumbs,
  useServiceContext,
} from '../ServiceDetails'

const getDirectory = ({
  gitEnabled,
  helmEnabled,
}: {
  gitEnabled: boolean
  helmEnabled: boolean
}): SubtabDirectory => {
  return [
    { path: SERVICE_SETTINGS_GIT_REL_PATH, label: 'Git', enabled: gitEnabled },
    {
      path: SERVICE_SETTINGS_HELM_REL_PATH,
      label: 'Helm',
      enabled: helmEnabled,
    },
    { path: SERVICE_SETTINGS_SECRETS_REL_PATH, label: 'Secrets' },
    { path: SERVICE_SETTINGS_REVISIONS_REL_PATH, label: 'Revisions' },
  ]
}

const getServiceSettingsBreadcrumbs = ({
  cluster,
  service,
  flow,
  tab,
}: Parameters<typeof getServiceDetailsBreadcrumbs>[0]) => {
  const detailsCrumbs = getServiceDetailsBreadcrumbs({
    cluster,
    service,
    flow,
  })
  const detailsUrl = detailsCrumbs.at(-1)?.url
  return [
    ...detailsCrumbs,
    { label: 'settings', url: `${detailsUrl}/settings` },
    { label: tab ?? '', url: `${detailsUrl}/settings/${tab}` },
  ]
}

export function ServiceSettings() {
  const ctx = useServiceContext()
  const { serviceId, flowId } = useParams()
  const { tab } =
    useMatch(
      `${flowId ? FLOW_SERVICE_PATH_MATCHER_ABS : CD_SERVICE_PATH_MATCHER_ABS}/settings/:tab/*`
    )?.params ?? {}
  const { data: flowData } = useFlowQuery({
    variables: { id: flowId ?? '' },
    skip: !flowId,
  })

  const directory = useMemo(() => {
    const hasGitRepo = !!ctx.service.repository
    const hasHelmRepo = !!ctx.service.helm?.chart || !!ctx.service.helm?.values

    return getDirectory({ gitEnabled: hasGitRepo, helmEnabled: hasHelmRepo })
  }, [ctx.service])

  const breadcrumbs = useMemo(
    () =>
      getServiceSettingsBreadcrumbs({
        cluster: ctx?.service?.cluster,
        service: ctx?.service ?? { id: serviceId ?? '' },
        flow: flowData?.flow,
        tab: tab ?? '',
      }),
    [ctx?.service, flowData?.flow, serviceId, tab]
  )
  useSetBreadcrumbs(breadcrumbs)

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      width="100%"
    >
      <SubTabs directory={directory} />
      <Outlet context={ctx} />
    </Flex>
  )
}
