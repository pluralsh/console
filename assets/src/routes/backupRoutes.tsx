import { Navigate, Route } from 'react-router-dom'

import Root from '../components/backups/Backups'
import Clusters from '../components/backups/clusters/Clusters'
import ObjectStores from '../components/backups/objectstores/ObjectStores'
import Cluster from '../components/backups/cluster/Cluster'

import {
  BACKUPS_ABS_PATH,
  BACKUPS_DEFAULT_REL_PATH,
  CLUSTERS_REL_PATH,
  CLUSTER_ABS_PATH,
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
      path={CLUSTERS_REL_PATH}
      element={<Clusters />}
    />
  </Route>,
  <Route
    path={CLUSTER_ABS_PATH}
    element={<Cluster />}
  />,
]
