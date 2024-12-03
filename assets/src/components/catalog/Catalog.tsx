import {
  AppIcon,
  Button,
  Chip,
  Flex,
  PersonIcon,
  PrQueueIcon,
  Sidecar,
  SidecarItem,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { useMemo } from 'react'
import { breadcrumbs } from './Catalogs.tsx'
import { StackedText } from '../utils/table/StackedText.tsx'
import { catalogImageUrl } from './common.ts'
import { ResponsiveLayoutPage } from '../utils/layout/ResponsiveLayoutPage.tsx'
import {
  useCatalogQuery,
  usePrAutomationsQuery,
} from '../../generated/graphql.ts'
import { CATALOG_PARAM_ID } from '../../routes/catalogRoutesConsts.tsx'
import { useParams } from 'react-router-dom'
import LoadingIndicator from '../utils/LoadingIndicator.tsx'
import { GqlError } from '../utils/Alert.tsx'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../utils/table/useFetchPaginatedData.tsx'
import { mapExistingNodes } from '../../utils/graphql.ts'
import { columns } from '../pr/automations/PrAutomationsColumns.tsx'
import { FullHeightTableWrap } from '../utils/layout/FullHeightTableWrap.tsx'

export function Catalog() {
  const theme = useTheme()
  const id = useParams()[CATALOG_PARAM_ID] as string

  const { data, error } = useCatalogQuery({ variables: { id } })

  const catalog = data?.catalog

  const {
    data: prAutomationsData,
    loading,
    error: prAutomationsError,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    {
      queryHook: usePrAutomationsQuery,
      keyPath: ['prAutomations'],
      skip: !id,
    },
    {
      catalogId: id,
    }
  )

  const prAutomations = useMemo(
    () => mapExistingNodes(prAutomationsData?.prAutomations),
    [prAutomationsData?.prAutomations]
  )

  useSetBreadcrumbs(
    useMemo(
      () => [...breadcrumbs, { label: catalog?.name ?? id }],
      [catalog?.name, id]
    )
  )

  if (error) return <GqlError error={error} />

  if (prAutomationsError) return <GqlError error={prAutomationsError} />

  if (!catalog || (!prAutomations && loading)) return <LoadingIndicator />

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
            <FullHeightTableWrap>
              <Table
                columns={columns}
                reactTableOptions={{ meta: { refetch } }}
                reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
                data={prAutomations || []}
                virtualizeRows
                hasNextPage={pageInfo?.hasNextPage}
                fetchNextPage={fetchNextPage}
                isFetchingNextPage={loading}
                onVirtualSliceChange={setVirtualSlice}
                css={{
                  maxHeight: 'unset',
                  height: '100%',
                }}
              />
            </FullHeightTableWrap>
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
