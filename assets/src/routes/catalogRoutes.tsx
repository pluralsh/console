import { Route } from 'react-router-dom'
import { CATALOG_ABS_PATH } from './catalogRoutesConsts.tsx'
import { Catalog } from '../components/catalog/Catalog.tsx'

export const catalogRoutes = [
  <Route
    path={CATALOG_ABS_PATH}
    element={<Catalog />}
  />,
]
