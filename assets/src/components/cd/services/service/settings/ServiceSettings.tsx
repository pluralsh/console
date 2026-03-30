import { EmptyState, Flex } from '@pluralsh/design-system'
import { useLogin } from 'components/contexts'
import FractionalChip from 'components/utils/FractionalChip'
import { SubtabDirectory, SubTabs } from 'components/utils/SubTabs'
import {
  ServiceDeploymentDetailsFragment,
  ServiceDeploymentStatus,
} from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { useMemo } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import {
  SERVICE_SETTINGS_CONTEXTS_REL_PATH,
  SERVICE_SETTINGS_DEPENDENCIES_REL_PATH,
  SERVICE_SETTINGS_GIT_REL_PATH,
  SERVICE_SETTINGS_HELM_REL_PATH,
  SERVICE_SETTINGS_REVISIONS_REL_PATH,
  SERVICE_SETTINGS_SECRETS_REL_PATH,
  SERVICE_SETTINGS_STACK_IMPORTS_REL_PATH,
} from 'routes/cdRoutesConsts'
import { useServiceSubPageBreadcrumbs } from '../ServiceDetails'
import { useServiceContext } from '../ServiceDetailsContext'

type ServicePersonaType =
  | 'all-settings'
  | 'secrets-only'
  | 'exclude-secrets'
  | 'no-settings'

const getDirectory = ({
  service,
  personaType,
}: {
  service: ServiceDeploymentDetailsFragment
  personaType: ServicePersonaType
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

export function ServiceSettings() {
  const ctx = useServiceContext()
  const { tab } = useServiceSubPageBreadcrumbs('settings')

  const personaType = useServicePersonaType()

  const directory = useMemo(
    () =>
      ctx.service ? getDirectory({ service: ctx.service, personaType }) : [],
    [ctx.service, personaType]
  )

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
        <EmptyState message="Service settings are not enabled for your persona." />
      ) : (
        <Outlet context={ctx} />
      )}
    </Flex>
  )
}

export function useServicePersonaType(): ServicePersonaType {
  const { personaConfiguration } = useLogin()
  const svcConfig = personaConfiguration?.services
  const settingsDisabled = svcConfig?.configuration === false
  const secretsDisabled = svcConfig?.secrets === false

  if (personaConfiguration?.all) return 'all-settings'
  if (settingsDisabled && secretsDisabled) return 'no-settings'
  if (settingsDisabled) return 'secrets-only'
  if (secretsDisabled) return 'exclude-secrets'
  return 'all-settings'
}
