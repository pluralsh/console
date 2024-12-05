import { Route } from 'react-router-dom'
import { CATALOG_ABS_PATH, CATALOGS_ABS_PATH } from './catalogRoutesConsts.tsx'
import { Catalogs } from '../components/catalog/Catalogs.tsx'
import { Catalog } from '../components/catalog/Catalog.tsx'

export const catalogRoutes = [
  <Route
    path={CATALOGS_ABS_PATH}
    element={<Catalogs />}
  />,
  <Route
    path={CATALOG_ABS_PATH}
    element={<Catalog />}
  />,
]
