import {
  Flex,
  GlobeIcon,
  ListBoxItem,
  ReloadIcon,
  Select,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import {
  GlobalServiceFragment,
  useGetGlobalServiceQuery,
} from 'generated/graphql'
import { SyncGlobalServiceDocument } from 'generated/graphql-documents'
import { GlobalServicesDocument } from 'generated/graphql-documents'
import { useMemo } from 'react'
import { PageColumnSC } from 'components/layout/PageLayout'
import { PageToolbar } from 'components/layout/PageToolbar'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { GLOBAL_SERVICE_PARAM_ID } from 'routes/cdRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from '../../../../utils/graphql'
import { useProjectId } from '../../../contexts/ProjectsContext'
import { GqlError } from '../../../utils/Alert'
import { DistroProviderIcon } from '../../../utils/ClusterDistro'
import KickButton from '../../../utils/KickButton'

import { RectangleSkeleton } from 'components/utils/SkeletonLoaders.tsx'
import { RESPONSIVE_LAYOUT_CONTENT_WIDTH } from '../../../utils/layout/ResponsiveLayoutContentContainer.tsx'
import { useFetchPaginatedData } from '../../../utils/table/useFetchPaginatedData'
import { TRUNCATE } from '../../../utils/truncate'
import { crumbs } from '../GlobalServices.tsx'
import { GlobalServiceServices } from './GlobalServiceServices.tsx'
import { GlobalServiceSidecar } from './GlobalServiceSidecar.tsx'

export function GlobalService() {
  const globalServiceId = useParams()[GLOBAL_SERVICE_PARAM_ID] ?? ''

  const { data, loading, error } = useGetGlobalServiceQuery({
    variables: { serviceId: globalServiceId },
  })
  const globalService = data?.globalService
  const isLoading = !data && loading

  useSetBreadcrumbs(
    useMemo(
      () => [...crumbs, { label: globalService?.name ?? globalServiceId }],
      [globalService?.name, globalServiceId]
    )
  )

  if (error)
    return (
      <GqlError
        margin="large"
        error={error}
      />
    )

  return (
    <PageColumnSC>
      <PageToolbar>
        <GlobalServiceSelect selectedGlobalService={globalService} />
        <KickButton
          secondary
          small
          startIcon={<ReloadIcon />}
          kickMutation={SyncGlobalServiceDocument}
          message="Resync"
          tooltipMessage="Sync this service now instead of at the next poll interval"
          variables={{ id: globalServiceId }}
        />
      </PageToolbar>
      <WrapperSC>
        <Flex
          direction="column"
          gap="large"
          flexGrow={1}
          flexShrink={1}
          width={RESPONSIVE_LAYOUT_CONTENT_WIDTH}
        >
          <GlobalServiceServices
            globalServiceID={globalServiceId}
            seedService={globalService?.service}
          />
        </Flex>
        <GlobalServiceSidecar
          loading={isLoading}
          globalService={globalService}
        />
      </WrapperSC>
    </PageColumnSC>
  )
}

function GlobalServiceSelect({
  selectedGlobalService,
}: {
  selectedGlobalService: Nullable<GlobalServiceFragment>
}) {
  const globalServiceId = useParams()[GLOBAL_SERVICE_PARAM_ID] ?? ''
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const projectId = useProjectId()
  const { data, loading, error } = useFetchPaginatedData(
    { query: GlobalServicesDocument, keyPath: ['globalServices'] },
    { projectId }
  )

  const globalServices = useMemo(
    () => mapExistingNodes(data?.globalServices),
    [data?.globalServices]
  )

  if (error)
    return (
      <GqlError
        header="Failed to fetch global services"
        error={error}
      />
    )

  return (
    <div css={{ width: 280 }}>
      <Select
        size="small"
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
          navigate(
            pathname.replace(
              selectedGlobalService?.id ?? globalServiceId,
              `${id}`
            )
          )
        }
        selectedKey={selectedGlobalService?.id}
        label={
          loading ? (
            <RectangleSkeleton $width="100%" />
          ) : (
            'Select a global service'
          )
        }
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

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  minHeight: 0,
  gap: theme.spacing.large,
  maxWidth: theme.breakpoints.desktopLarge + 800,
  padding: theme.spacing.large,
}))
