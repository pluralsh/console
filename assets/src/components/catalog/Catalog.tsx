import {
  AppIcon,
  Button,
  Chip,
  Flex,
  PersonIcon,
  PrQueueIcon,
  Sidecar,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { CatalogFragment } from '../../generated/graphql.ts'
import { useTheme } from 'styled-components'
import { useMemo } from 'react'
import { breadcrumbs } from './Catalogs.tsx'
import { StackedText } from '../utils/table/StackedText.tsx'
import { catalogImageUrl } from './common.ts'
import { ResponsiveLayoutPage } from '../utils/layout/ResponsiveLayoutPage.tsx'

const catalog: CatalogFragment = {
  id: '0',
  icon: `/cluster-distros/eks-dark.svg`,
  name: 'Base catalog',
  author: 'Plural',
  description:
    'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
  category: 'Messaging',
}

export function Catalog() {
  const theme = useTheme()
  const id = '0'

  // const { data } = useCatalogQuery({ variables: { id } })
  //
  // const catalog = data?.catalog

  useSetBreadcrumbs(
    useMemo(() => [...breadcrumbs, { label: catalog.name ?? id }], [id])
  )

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
                url={catalogImageUrl(
                  catalog.icon,
                  catalog.darkIcon,
                  theme.mode
                )}
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
              >
                Permissions
              </Button>
            </div>
          </div>
          <Sidecar
            marginLeft={'large'}
            width={220}
          >
            <SidecarItem heading="Author">{catalog.author}</SidecarItem>
            <SidecarItem heading="Category">
              <Chip
                border="none"
                size="small"
              >
                {catalog.category}
              </Chip>
            </SidecarItem>
          </Sidecar>
        </Flex>
      </div>
    </ResponsiveLayoutPage>
  )
}
