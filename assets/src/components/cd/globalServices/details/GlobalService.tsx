import {
  GlobeIcon,
  ListBoxItem,
  ReloadIcon,
  Select,
} from '@pluralsh/design-system'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import {
  GlobalServiceFragment,
  ServiceDeployment,
  useGetGlobalServiceQuery,
  useGlobalServicesQuery,
  useSyncGlobalServiceMutation,
} from 'generated/graphql'
import { ReactNode, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { GLOBAL_SERVICE_PARAM_ID } from 'routes/cdRoutesConsts'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from '../../../../utils/graphql'
import { useProjectId } from '../../../contexts/ProjectsContext'
import { GqlError } from '../../../utils/Alert'
import { DistroProviderIcon } from '../../../utils/ClusterDistro'
import KickButton from '../../../utils/KickButton'
import { ResponsiveLayoutContentContainer } from '../../../utils/layout/ResponsiveLayoutContentContainer.tsx'
import { ResponsiveLayoutPage } from '../../../utils/layout/ResponsiveLayoutPage.tsx'
import { ResponsiveLayoutSidecarContainer } from '../../../utils/layout/ResponsiveLayoutSidecarContainer.tsx'
import { ResponsiveLayoutSpacer } from '../../../utils/layout/ResponsiveLayoutSpacer.tsx'
import { useFetchPaginatedData } from '../../../utils/table/useFetchPaginatedData'
import { TRUNCATE } from '../../../utils/truncate'
import { PluralErrorBoundary } from '../../PluralErrorBoundary'
import { GlobalServiceServices } from './GlobalServiceServices.tsx'
import GlobalServiceSidecar from './GlobalServiceSidecar.tsx'

export default function GlobalService() {
  const theme = useTheme()
  const projectId = useProjectId()
  const globalServiceId = useParams()[GLOBAL_SERVICE_PARAM_ID] ?? ''

  const { data, error } = useGetGlobalServiceQuery({
    variables: { serviceId: globalServiceId },
  })

  const globalService = data?.globalService

  const { data: globalServicesData, error: globalServicesError } =
    useFetchPaginatedData(
      {
        queryHook: useGlobalServicesQuery,
        keyPath: ['globalServices'],
      },
      { projectId }
    )

  const globalServices = useMemo(
    () => mapExistingNodes(globalServicesData?.globalServices),
    [globalServicesData?.globalServices]
  )

  if (error || globalServicesError)
    return <GqlError error={error ?? globalServicesError} />
  if (!globalService || !globalServices) return <LoadingIndicator />

  return (
    <ResponsivePageFullWidth
      scrollable={false}
      headingContent={
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.large,
            flexGrow: 1,
            width: '100%',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.xsmall,
          }}
        >
          <div
            css={{
              display: 'flex',
              gap: theme.spacing.small,
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <GlobalServiceSelect
              selectedGlobalService={globalService}
              globalServices={globalServices}
            />
            <KickButton
              secondary
              startIcon={<ReloadIcon />}
              kickMutationHook={useSyncGlobalServiceMutation}
              message="Resync"
              tooltipMessage="Sync this service now instead of at the next poll interval"
              variables={{ id: globalServiceId }}
            />
          </div>
        </div>
      }
    >
      <PluralErrorBoundary>
        <ResponsiveLayoutPage css={{ padding: 0 }}>
          <ResponsiveLayoutSpacer />
          <ResponsiveLayoutContentContainer>
            <GlobalServiceServices
              globalServiceID={globalServiceId}
              seedService={globalService?.service as ServiceDeployment}
            />
          </ResponsiveLayoutContentContainer>
          <ResponsiveLayoutSpacer />
          <ResponsiveLayoutSidecarContainer
            css={{
              gap: theme.spacing.medium,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <GlobalServiceSidecar globalService={globalService} />
          </ResponsiveLayoutSidecarContainer>
        </ResponsiveLayoutPage>
      </PluralErrorBoundary>
    </ResponsivePageFullWidth>
  )
}

interface GlobalServiceSelectProps {
  selectedGlobalService: GlobalServiceFragment
  globalServices: Array<GlobalServiceFragment>
}

function GlobalServiceSelect({
  selectedGlobalService,
  globalServices,
}: GlobalServiceSelectProps): ReactNode {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <div css={{ minWidth: 320 }}>
      <Select
        titleContent={
          selectedGlobalService?.distro ? (
            <DistroProviderIcon
              distro={selectedGlobalService.distro}
              provider={selectedGlobalService.provider?.name}
              size={16}
            />
          ) : (
            <GlobeIcon size={16} />
          )
        }
        onSelectionChange={(id) =>
          navigate(pathname.replace(selectedGlobalService?.id, id as string))
        }
        selectedKey={selectedGlobalService?.id}
      >
        {globalServices.map((gs) => (
          <ListBoxItem
            key={gs?.id}
            label={<div css={{ ...TRUNCATE, maxWidth: 210 }}>{gs?.name}</div>}
            textValue={gs?.name}
            leftContent={
              gs?.distro ? (
                <DistroProviderIcon
                  distro={gs.distro}
                  provider={gs.provider?.name}
                  size={16}
                />
              ) : (
                <GlobeIcon size={16} />
              )
            }
          />
        ))}
      </Select>
    </div>
  )
}
