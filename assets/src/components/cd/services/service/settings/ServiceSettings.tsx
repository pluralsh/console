import { EmptyState, Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { SubtabDirectory, SubTabs } from 'components/utils/SubTabs'
import {
  PersonaConfigurationFragment,
  ServiceDeploymentDetailsFragment,
  ServiceDeploymentStatus,
  useFlowQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import { Navigate, Outlet, useMatch, useParams } from 'react-router-dom'
import {
  CD_SERVICE_PATH_MATCHER_ABS,
  FLOW_SERVICE_PATH_MATCHER_ABS,
  SERVICE_SETTINGS_CONTEXTS_REL_PATH,
  SERVICE_SETTINGS_DEPENDENCIES_REL_PATH,
  SERVICE_SETTINGS_GIT_REL_PATH,
  SERVICE_SETTINGS_HELM_REL_PATH,
  SERVICE_SETTINGS_REVISIONS_REL_PATH,
  SERVICE_SETTINGS_SECRETS_REL_PATH,
  SERVICE_SETTINGS_STACK_IMPORTS_REL_PATH,
} from 'routes/cdRoutesConsts'
import FractionalChip from 'components/utils/FractionalChip'
import isEmpty from 'lodash/isEmpty'
import {
  getServiceDetailsBreadcrumbs,
  useServiceContext,
} from '../ServiceDetails'
import { useLogin } from 'components/contexts'

type PersonaType =
  | 'all-settings'
  | 'secrets-only'
  | 'exclude-secrets'
  | 'no-settings'

const getDirectory = ({
  service,
  personaType,
}: {
  service: ServiceDeploymentDetailsFragment
  personaType: PersonaType
}): SubtabDirectory => {
  const gitEnabled = !!service.repository
  const helmEnabled = !!service.helm?.chart || !!service.helm?.values
  const healthyDependencies =
    service.dependencies?.filter(
      (dep) => dep?.status === ServiceDeploymentStatus.Healthy
    ).length ?? 0
  const totalDependencies = service.dependencies?.length ?? 0

  if (personaType === 'secrets-only')
    return [{ path: SERVICE_SETTINGS_SECRETS_REL_PATH, label: 'Secrets' }]
  if (personaType === 'no-settings') return []

  return [
    { path: SERVICE_SETTINGS_GIT_REL_PATH, label: 'Git', enabled: gitEnabled },
    {
      path: SERVICE_SETTINGS_HELM_REL_PATH,
      label: 'Helm',
      enabled: helmEnabled,
    },
    {
      path: SERVICE_SETTINGS_SECRETS_REL_PATH,
      label: 'Secrets',
      enabled: personaType !== 'exclude-secrets',
    },
    { path: SERVICE_SETTINGS_REVISIONS_REL_PATH, label: 'Revisions' },
    {
      path: SERVICE_SETTINGS_CONTEXTS_REL_PATH,
      label: 'Contexts',
      enabled: !isEmpty(service.contexts),
    },
    {
      path: SERVICE_SETTINGS_STACK_IMPORTS_REL_PATH,
      label: 'Stack imports',
      enabled: !isEmpty(service.imports),
    },
    {
      path: SERVICE_SETTINGS_DEPENDENCIES_REL_PATH,
      label: (
        <FractionalChip
          label="Dependencies"
          fraction={`${healthyDependencies}/${totalDependencies}`}
        />
      ),
      enabled: !isEmpty(service.dependencies),
    },
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

  const { personaConfiguration } = useLogin()
  const personaType = getPersonaType(personaConfiguration?.services)

  const directory = useMemo(
    () =>
      getDirectory({
        service: ctx.service,
        personaType,
      }),
    [ctx.service, personaType]
  )

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

  if (
    personaType === 'secrets-only' &&
    tab !== SERVICE_SETTINGS_SECRETS_REL_PATH
  )
    return <Navigate to={SERVICE_SETTINGS_SECRETS_REL_PATH} />

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      width="100%"
    >
      <SubTabs directory={directory} />
      {personaType === 'no-settings' ? (
        <EmptyState message="Service settings are not enabled for this persona." />
      ) : (
        <Outlet context={ctx} />
      )}
    </Flex>
  )
}

const getPersonaType = (
  personaConfig: PersonaConfigurationFragment['services']
): PersonaType => {
  if (personaConfig?.configuration && personaConfig?.secrets)
    return 'all-settings'
  if (personaConfig?.secrets) return 'secrets-only'
  if (personaConfig?.configuration) return 'exclude-secrets'
  return 'no-settings'
}
