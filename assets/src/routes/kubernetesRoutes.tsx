import { Navigate, Route } from 'react-router-dom'

import Kubernetes from '../components/kubernetes/Kubernetes'
import Workloads from '../components/kubernetes/workloads/Workloads'
import ServicesAndIngresses from '../components/kubernetes/services/ServicesAndIngresses'
import Services from '../components/kubernetes/services/Services'
import Storage from '../components/kubernetes/storage/Storage'
import Configuration from '../components/kubernetes/configuration/Configuration'
import Deployments from '../components/kubernetes/workloads/Deployments'
import Pods from '../components/kubernetes/workloads/Pods'
import ReplicaSets from '../components/kubernetes/workloads/ReplicaSets'
import StatefulSets from '../components/kubernetes/workloads/StatefulSets'
import DaemonSets from '../components/kubernetes/workloads/DaemonSets'
import Jobs from '../components/kubernetes/workloads/Jobs'
import CronJobs from '../components/kubernetes/workloads/CronJobs'
import ReplicationControllers from '../components/kubernetes/workloads/ReplicationControllers'
import Ingresses from '../components/kubernetes/services/Ingresses'
import PersistentVolumeClaims from '../components/kubernetes/storage/PersistentVolumeClaims'
import PersistentVolumes from '../components/kubernetes/storage/PersistentVolumes'
import StorageClasses from '../components/kubernetes/storage/StorageClasses'
import ConfigMaps from '../components/kubernetes/configuration/ConfigMaps'
import Secrets from '../components/kubernetes/configuration/Secrets'

import {
  CONFIGURATION_REL_PATH,
  CONFIG_MAPS_REL_PATH,
  CRON_JOBS_REL_PATH,
  DAEMON_SETS_REL_PATH,
  DEPLOYMENTS_REL_PATH,
  INGRESSES_REL_PATH,
  JOBS_REL_PATH,
  KUBERNETES_ABS_PATH,
  PERSISTENT_VOLUME_CLAIMS_REL_PATH,
  PERSISTENT_VOLUME_REL_PATH,
  PODS_REL_PATH,
  REPLICATION_CONTROLLERS_REL_PATH,
  REPLICA_SETS_REL_PATH,
  SECRETS_REL_PATH,
  SERVICES_AND_INGRESSES_REL_PATH,
  SERVICES_REL_PATH,
  STATEFUL_SETS_REL_PATH,
  STORAGE_CLASSES_REL_PATH,
  STORAGE_REL_PATH,
  WORKLOADS_REL_PATH,
} from './kubernetesRoutesConsts'

export const kubernetesRoutes = [
  <Route
    path={KUBERNETES_ABS_PATH}
    element={<Kubernetes />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={WORKLOADS_REL_PATH}
        />
      }
    />
    <Route
      path={WORKLOADS_REL_PATH}
      element={<Workloads />}
    >
      <Route
        index
        element={
          <Navigate
            replace
            to={DEPLOYMENTS_REL_PATH}
          />
        }
      />
      <Route
        path={DEPLOYMENTS_REL_PATH}
        element={<Deployments />}
      />
      <Route
        path={PODS_REL_PATH}
        element={<Pods />}
      />
      <Route
        path={REPLICA_SETS_REL_PATH}
        element={<ReplicaSets />}
      />
      <Route
        path={STATEFUL_SETS_REL_PATH}
        element={<StatefulSets />}
      />
      <Route
        path={DAEMON_SETS_REL_PATH}
        element={<DaemonSets />}
      />
      <Route
        path={JOBS_REL_PATH}
        element={<Jobs />}
      />
      <Route
        path={CRON_JOBS_REL_PATH}
        element={<CronJobs />}
      />
      <Route
        path={REPLICATION_CONTROLLERS_REL_PATH}
        element={<ReplicationControllers />}
      />
    </Route>
    <Route
      path={SERVICES_AND_INGRESSES_REL_PATH}
      element={<ServicesAndIngresses />}
    >
      <Route
        index
        element={
          <Navigate
            replace
            to={SERVICES_REL_PATH}
          />
        }
      />
      <Route
        path={SERVICES_REL_PATH}
        element={<Services />}
      />
      <Route
        path={INGRESSES_REL_PATH}
        element={<Ingresses />}
      />
    </Route>
    <Route
      path={STORAGE_REL_PATH}
      element={<Storage />}
    >
      <Route
        index
        element={
          <Navigate
            replace
            to={PERSISTENT_VOLUME_CLAIMS_REL_PATH}
          />
        }
      />
      <Route
        path={PERSISTENT_VOLUME_CLAIMS_REL_PATH}
        element={<PersistentVolumeClaims />}
      />
      <Route
        path={PERSISTENT_VOLUME_REL_PATH}
        element={<PersistentVolumes />}
      />
      <Route
        path={STORAGE_CLASSES_REL_PATH}
        element={<StorageClasses />}
      />
    </Route>
    <Route
      path={CONFIGURATION_REL_PATH}
      element={<Configuration />}
    >
      <Route
        index
        element={
          <Navigate
            replace
            to={CONFIG_MAPS_REL_PATH}
          />
        }
      />
      <Route
        path={CONFIG_MAPS_REL_PATH}
        element={<ConfigMaps />}
      />
      <Route
        path={SECRETS_REL_PATH}
        element={<Secrets />}
      />
    </Route>
  </Route>,
]
