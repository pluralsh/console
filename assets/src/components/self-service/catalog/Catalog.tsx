import {
  useSetBreadcrumbs,
  Flex,
  AppIcon,
  PrQueueIcon,
  Button,
  PersonIcon,
  Sidecar,
  SidecarItem,
  Chip,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { StackedText } from 'components/utils/table/StackedText'
import { useCatalogQuery } from 'generated/graphql'
import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { CATALOG_PARAM_ID } from 'routes/selfServiceRoutesConsts'
import { useTheme } from 'styled-components'
import { iconUrl } from 'utils/icon'
import { CatalogPermissions } from './CatalogPermissions'
import { CatalogPRAutomations } from './CatalogPRAutomations'
import { breadcrumbs } from './Catalogs'

export function Catalog() {
  const theme = useTheme()
  const id = useParams()[CATALOG_PARAM_ID] as string
  const [permissionsOpen, setPermissionsOpen] = useState(false)

  const { data, refetch, error } = useCatalogQuery({ variables: { id } })

  const catalog = data?.catalog

  useSetBreadcrumbs(
    useMemo(
      () => [...breadcrumbs, { label: catalog?.name ?? id }],
      [catalog?.name, id]
    )
  )

  if (error) return <GqlError error={error} />

  if (!catalog) return <LoadingIndicator />

  return (
    <ResponsiveLayoutPage css={{ flexDirection: 'column' }}>
      <div
        css={{
          alignSelf: 'center',
          maxWidth: theme.breakpoints.desktop,
          overflow: 'hidden',
          width: '100%',

          [`@media (min-width: 1833px)`]: {
            maxWidth: theme.breakpoints.desktop + theme.spacing.large + 220, // Increased by sidecar and spacing size.
          },
        }}
      >
        <Flex height="100%">
          <Flex
            direction="column"
            grow={1}
          >
            <div
              css={{
                alignItems: 'center',
                borderBottom: theme.borders['fill-two'],
                display: 'flex',
                gap: theme.spacing.large,
                justifyContent: 'space-between',
                paddingBottom: theme.spacing.large,
                marginBottom: theme.spacing.large,
              }}
            >
              <Flex
                align="center"
                gap="medium"
              >
                <AppIcon
                  size="xsmall"
                  url={iconUrl(catalog.icon, catalog.darkIcon, theme.mode)}
                  icon={<PrQueueIcon size={32} />}
                />
                <StackedText
                  first={catalog.name}
                  second={catalog.description}
                  firstPartialType="subtitle1"
                  secondPartialType="body2"
                />
              </Flex>
              <div
                css={{
                  display: 'flex',
                  gap: theme.spacing.medium,
                }}
              >
                <Button
                  secondary
                  startIcon={<PersonIcon />}
                  onClick={() => setPermissionsOpen(true)}
                >
                  Permissions
                </Button>
                <CatalogPermissions
                  catalog={catalog}
                  refetch={refetch}
                  open={permissionsOpen}
                  onClose={() => setPermissionsOpen(false)}
                />
              </div>
            </div>
            <CatalogPRAutomations catalogId={id} />
          </Flex>
          <Sidecar
            height={'fit-content'}
            marginLeft={'large'}
            width={220}
          >
            <SidecarItem heading="Author">{catalog.author}</SidecarItem>
            {catalog.category && (
              <SidecarItem heading="Category">
                <Chip
                  border="none"
                  size="small"
                >
                  {catalog.category}
                </Chip>
              </SidecarItem>
            )}
          </Sidecar>
        </Flex>
      </div>
    </ResponsiveLayoutPage>
  )
}
