import { Navigate, Route } from 'react-router-dom'

import Root from '../components/backups/Backups'
import Clusters from '../components/backups/clusters/Clusters'
import ObjectStores from '../components/backups/objectstores/ObjectStores'

import Cluster from '../components/backups/cluster/Cluster'
import ClusterBackups from '../components/backups/cluster/backups/Backups'
import ClusterRestores from '../components/backups/cluster/restores/Restores'

import {
  BACKUPS_ABS_PATH,
  BACKUPS_DEFAULT_REL_PATH,
  CLUSTERS_REL_PATH,
  CLUSTER_ABS_PATH,
  CLUSTER_BACKUPS_DEFAULT_REL_PATH,
  CLUSTER_BACKUPS_REL_PATH,
  CLUSTER_RESTORES_REL_PATH,
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
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={CLUSTER_BACKUPS_DEFAULT_REL_PATH}
        />
      }
    />
    <Route
      path={CLUSTER_BACKUPS_REL_PATH}
      element={<ClusterBackups />}
    />
    <Route
      path={CLUSTER_RESTORES_REL_PATH}
      element={<ClusterRestores />}
    />
  </Route>,
]
