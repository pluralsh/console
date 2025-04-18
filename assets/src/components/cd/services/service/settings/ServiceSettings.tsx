import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { SubtabDirectory, SubTabs } from 'components/utils/SubTabs'
import { useMemo } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import {
  CLUSTER_ABS_PATH,
  SERVICE_SETTINGS_REPO_REL_PATH,
  SERVICE_SETTINGS_REVISIONS_REL_PATH,
  SERVICE_SETTINGS_SECRETS_REL_PATH,
} from 'routes/cdRoutesConsts'
import {
  getServiceDetailsBreadcrumbs,
  useServiceContext,
} from '../ServiceDetails'

const DIRECTORY: SubtabDirectory = [
  { path: SERVICE_SETTINGS_REPO_REL_PATH, label: 'Repository' },
  { path: SERVICE_SETTINGS_SECRETS_REL_PATH, label: 'Secrets' },
  { path: SERVICE_SETTINGS_REVISIONS_REL_PATH, label: 'Revisions' },
]

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
    >
      <SubTabs directory={DIRECTORY} />
      <Outlet context={ctx} />
    </Flex>
  )
}
