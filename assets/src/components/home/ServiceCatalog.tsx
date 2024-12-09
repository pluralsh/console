import { HOME_CARD_CONTENT_HEIGHT, HomeCard } from './HomeCard.tsx'
import { CatalogIcon, EmptyState } from '@pluralsh/design-system'

import { CATALOGS_ABS_PATH } from '../../routes/catalogRoutesConsts.tsx'
import { CatalogsGrid } from '../catalog/CatalogsGrid.tsx'
import { useTheme } from 'styled-components'
import { useFetchPaginatedData } from '../utils/table/useFetchPaginatedData.tsx'
import { useCatalogsQuery } from '../../generated/graphql.ts'
import { useMemo } from 'react'
import { mapExistingNodes } from '../../utils/graphql.ts'
import { GqlError } from '../utils/Alert.tsx'
import LoadingIndicator from '../utils/LoadingIndicator.tsx'

export function ServiceCatalogs() {
  const theme = useTheme()

  const { data, error, loading, pageInfo, fetchNextPage } =
    useFetchPaginatedData({
      queryHook: useCatalogsQuery,
      keyPath: ['catalogs'],
    })

  const catalogs = useMemo(
    () => mapExistingNodes(data?.catalogs),
    [data?.catalogs]
  )

  if (error) return <GqlError error={error} />

  if (!catalogs && loading) return <LoadingIndicator />

  return (
    <HomeCard
      title="Service catalog"
      icon={<CatalogIcon />}
      link={CATALOGS_ABS_PATH}
      noPadding
    >
      <CatalogsGrid
        catalogs={catalogs}
        onBottomReached={() => {
          if (!loading && pageInfo?.hasNextPage) fetchNextPage()
        }}
        emptyState={
          <EmptyState
            message="There are no catalogs available."
            css={{ marginTop: theme.spacing.xxlarge }}
          />
        }
        styles={{
          maxHeight: HOME_CARD_CONTENT_HEIGHT,
          padding: theme.spacing.medium,
        }}
      />
    </HomeCard>
  )
}
