import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { SubtabDirectory, SubTabs } from 'components/utils/SubTabs'
import { useMemo } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import {
  CLUSTER_ABS_PATH,
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
  tab,
}: Parameters<typeof getServiceDetailsBreadcrumbs>[0] & {
  tab: string
}) => {
  const detailsCrumbs = getServiceDetailsBreadcrumbs({ cluster, service })
  const detailsUrl = detailsCrumbs.at(-1)?.url
  return [
    ...detailsCrumbs,
    { label: 'settings', url: `${detailsUrl}/settings` },
    { label: tab, url: `${detailsUrl}/settings/${tab}` },
  ]
}

export function ServiceSettings() {
  const ctx = useServiceContext()
  const { clusterId, serviceId, tab } =
    useMatch(`${CLUSTER_ABS_PATH}/services/:serviceId/settings/:tab/*`)
      ?.params ?? {}

  const directory = useMemo(() => {
    const hasGitRepo = !!ctx.service.repository
    const hasHelmRepo = !!ctx.service.helm?.chart

    return getDirectory({ gitEnabled: hasGitRepo, helmEnabled: hasHelmRepo })
  }, [ctx.service.helm?.chart, ctx.service.repository])

  const breadcrumbs = useMemo(
    () =>
      getServiceSettingsBreadcrumbs({
        cluster: ctx?.service?.cluster ?? { id: clusterId ?? '' },
        service: ctx?.service ?? { id: serviceId ?? '' },
        tab: tab ?? '',
      }),
    [clusterId, ctx?.service, serviceId, tab]
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
