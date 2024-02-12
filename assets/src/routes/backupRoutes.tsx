import { Navigate, Route } from 'react-router-dom'

import Root from '../components/backups/Backups'
import Backups from '../components/backups/backups/Backups'
import ObjectStores from '../components/backups/objectstores/ObjectStores'

export const backupsRoutes = [
  <Route
    path="backups"
    element={<Root />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to="objectstores"
        />
      }
    />
    <Route
      path="objectstores"
      element={<ObjectStores />}
    />
    <Route
      path="backups"
      element={<Backups />}
    />
  </Route>,
]
