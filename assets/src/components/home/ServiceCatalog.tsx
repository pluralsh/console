import { HomeCard } from './HomeCard.tsx'
import { CatalogIcon, Flex } from '@pluralsh/design-system'

import { CATALOGS_ABS_PATH } from '../../routes/catalogRoutesConsts.tsx'
import { CatalogsGrid } from '../catalog/CatalogsGrid.tsx'
import { catalogs } from '../catalog/Catalogs.tsx'

export function ServiceCatalog() {
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
      <Flex
        direction={'column'}
        overflow={'scroll'}
        backgroundColor={'red'}
        padding={'medium'}
      >
        <CatalogsGrid catalogs={catalogs} />
      </Flex>
    </HomeCard>
  )
}
