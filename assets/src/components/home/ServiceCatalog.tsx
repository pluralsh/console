import { HOME_CARD_CONTENT_HEIGHT, HomeCard } from './HomeCard.tsx'
import { CatalogIcon } from '@pluralsh/design-system'

import { CATALOGS_ABS_PATH } from '../../routes/catalogRoutesConsts.tsx'
import { CatalogsGrid } from '../catalog/CatalogsGrid.tsx'
import { catalogs } from '../catalog/Catalogs.tsx'
import { useTheme } from 'styled-components'

export function ServiceCatalogs() {
  const theme = useTheme()

  // const { data } = useFetchPaginatedData({
  //   queryHook: useCatalogsQuery,
  //   keyPath: ['catalogs'],
  // })
  //
  // const catalogs = useMemo(
  //   () => mapExistingNodes(data?.catalogs),
  //   [data?.catalogs]
  // )

  return (
    <HomeCard
      title="Service catalog"
      icon={<CatalogIcon />}
      link={CATALOGS_ABS_PATH}
      noPadding
    >
      <div
        css={{
          padding: theme.spacing.large,
          overflow: 'auto',
          height: HOME_CARD_CONTENT_HEIGHT,
        }}
      >
        <CatalogsGrid catalogs={catalogs} />
      </div>
    </HomeCard>
  )
}
