import { Navigate, Route } from 'react-router-dom'

import Root from '../components/backups/Backups'
import Backups from '../components/backups/backups/Backups'
import ObjectStores from '../components/backups/objectstores/ObjectStores'
import ClusterBackups from '../components/backups/clusterbackups/ClusterBackups'

import {
  BACKUPS_ABS_PATH,
  BACKUPS_DEFAULT_REL_PATH,
  BACKUPS_REL_PATH,
  CLUSTER_BACKUPS_ABS_PATH,
  OBJECT_STORES_REL_PATH,
} from './backupRoutesConsts'

export const backupsRoutes = [
  <Route
    path={BACKUPS_ABS_PATH}
    element={<Root />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={BACKUPS_DEFAULT_REL_PATH}
        />
      }
    />
    <Route
      path={OBJECT_STORES_REL_PATH}
      element={<ObjectStores />}
    />
    <Route
      path={BACKUPS_REL_PATH}
      element={<Backups />}
    />
  </Route>,
  <Route
    path={CLUSTER_BACKUPS_ABS_PATH}
    element={<ClusterBackups />}
  />,
]
