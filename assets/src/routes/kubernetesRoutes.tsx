import { Navigate, Route } from 'react-router-dom'

import Kubernetes from '../components/kubernetes/Kubernetes'
import Workloads from '../components/kubernetes/workloads/Workloads'
import Discovery from '../components/kubernetes/discovery/Discovery'
import Services from '../components/kubernetes/discovery/Services'
import Ingresses from '../components/kubernetes/discovery/Ingresses'
import IngressClasses from '../components/kubernetes/discovery/IngressClasses'
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
import PersistentVolumeClaims from '../components/kubernetes/storage/PersistentVolumeClaims'
import PersistentVolumes from '../components/kubernetes/storage/PersistentVolumes'
import StorageClasses from '../components/kubernetes/storage/StorageClasses'
import ConfigMaps from '../components/kubernetes/configuration/ConfigMaps'
import Secrets from '../components/kubernetes/configuration/Secrets'
import Cluster from '../components/kubernetes/cluster/Cluster'
import Nodes from '../components/kubernetes/cluster/Nodes'
import Events from '../components/kubernetes/cluster/Events'
import Namespaces from '../components/kubernetes/cluster/Namespaces'
import CustomResources from '../components/kubernetes/customresources/CustomResources'
import NetworkPolicies from '../components/kubernetes/discovery/NetworkPolicies'
import ClusterRoleBindings from '../components/kubernetes/access/ClusterRoleBindings'
import ClusterRoles from '../components/kubernetes/access/ClusterRoles'
import RoleBindings from '../components/kubernetes/access/RoleBindings'
import Roles from '../components/kubernetes/access/Roles'
import Access from '../components/kubernetes/access/Access'
import ResourceListProxy from '../components/kubernetes/ResourceList'

import {
  ACCESS_REL_PATH,
  CLUSTER_REL_PATH,
  CLUSTER_ROLES_REL_PATH,
  CLUSTER_ROLE_BINDINGS_REL_PATH,
  CONFIGURATION_REL_PATH,
  CONFIG_MAPS_REL_PATH,
  CRON_JOBS_REL_PATH,
  CUSTOM_RESOURCES_REL_PATH,
  DAEMON_SETS_REL_PATH,
  DEPLOYMENTS_REL_PATH,
  DISCOVERY_REL_PATH,
  EVENTS_REL_PATH,
  INGRESSES_REL_PATH,
  INGRESS_CLASSES_REL_PATH,
  JOBS_REL_PATH,
  KUBERNETES_ABS_PATH,
  NAMESPACES_REL_PATH,
  NETWORK_POLICIES_REL_PATH,
  NODES_REL_PATH,
  PERSISTENT_VOLUME_CLAIMS_REL_PATH,
  PERSISTENT_VOLUME_REL_PATH,
  PODS_REL_PATH,
  REPLICATION_CONTROLLERS_REL_PATH,
  REPLICA_SETS_REL_PATH,
  ROLES_REL_PATH,
  ROLE_BINDINGS_REL_PATH,
  SECRETS_REL_PATH,
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
        element={
          <ResourceListProxy namespaced>
            <Deployments />
          </ResourceListProxy>
        }
      />
      <Route
        path={PODS_REL_PATH}
        element={
          <ResourceListProxy namespaced>
            <Pods />
          </ResourceListProxy>
        }
      />
      <Route
        path={REPLICA_SETS_REL_PATH}
        element={
          <ResourceListProxy namespaced>
            <ReplicaSets />
          </ResourceListProxy>
        }
      />
      <Route
        path={STATEFUL_SETS_REL_PATH}
        element={
          <ResourceListProxy namespaced>
            <StatefulSets />
          </ResourceListProxy>
        }
      />
      <Route
        path={DAEMON_SETS_REL_PATH}
        element={
          <ResourceListProxy namespaced>
            <DaemonSets />
          </ResourceListProxy>
        }
      />
      <Route
        path={JOBS_REL_PATH}
        element={
          <ResourceListProxy namespaced>
            <Jobs />
          </ResourceListProxy>
        }
      />
      <Route
        path={CRON_JOBS_REL_PATH}
        element={
          <ResourceListProxy namespaced>
            <CronJobs />
          </ResourceListProxy>
        }
      />
      <Route
        path={REPLICATION_CONTROLLERS_REL_PATH}
        element={
          <ResourceListProxy namespaced>
            <ReplicationControllers />
          </ResourceListProxy>
        }
      />
    </Route>
    <Route
      path={DISCOVERY_REL_PATH}
      element={<Discovery />}
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
        element={
          <ResourceListProxy namespaced>
            <Services />
          </ResourceListProxy>
        }
      />
      <Route
        path={INGRESSES_REL_PATH}
        element={
          <ResourceListProxy namespaced>
            <Ingresses />
          </ResourceListProxy>
        }
      />
      <Route
        path={INGRESS_CLASSES_REL_PATH}
        element={
          <ResourceListProxy>
            <IngressClasses />
          </ResourceListProxy>
        }
      />
      <Route
        path={NETWORK_POLICIES_REL_PATH}
        element={
          <ResourceListProxy namespaced>
            <NetworkPolicies />
          </ResourceListProxy>
        }
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
        element={
          <ResourceListProxy namespaced>
            <PersistentVolumeClaims />
          </ResourceListProxy>
        }
      />
      <Route
        path={PERSISTENT_VOLUME_REL_PATH}
        element={
          <ResourceListProxy>
            <PersistentVolumes />
          </ResourceListProxy>
        }
      />
      <Route
        path={STORAGE_CLASSES_REL_PATH}
        element={
          <ResourceListProxy>
            <StorageClasses />
          </ResourceListProxy>
        }
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
        element={
          <ResourceListProxy namespaced>
            <ConfigMaps />
          </ResourceListProxy>
        }
      />
      <Route
        path={SECRETS_REL_PATH}
        element={
          <ResourceListProxy namespaced>
            <Secrets />
          </ResourceListProxy>
        }
      />
    </Route>
    <Route
      path={CLUSTER_REL_PATH}
      element={<Cluster />}
    >
      <Route
        index
        element={
          <Navigate
            replace
            to={NODES_REL_PATH}
          />
        }
      />
      <Route
        path={NODES_REL_PATH}
        element={
          <ResourceListProxy>
            <Nodes />
          </ResourceListProxy>
        }
      />
      <Route
        path={EVENTS_REL_PATH}
        element={
          <ResourceListProxy namespaced>
            <Events />
          </ResourceListProxy>
        }
      />
      <Route
        path={NAMESPACES_REL_PATH}
        element={
          <ResourceListProxy>
            <Namespaces />
          </ResourceListProxy>
        }
      />
    </Route>
    <Route
      path={ACCESS_REL_PATH}
      element={<Access />}
    >
      <Route
        index
        element={
          <Navigate
            replace
            to={ROLES_REL_PATH}
          />
        }
      />
      <Route
        path={ROLES_REL_PATH}
        element={
          <ResourceListProxy namespaced>
            <Roles />
          </ResourceListProxy>
        }
      />
      <Route
        path={ROLE_BINDINGS_REL_PATH}
        element={
          <ResourceListProxy namespaced>
            <RoleBindings />
          </ResourceListProxy>
        }
      />
      <Route
        path={CLUSTER_ROLES_REL_PATH}
        element={
          <ResourceListProxy>
            <ClusterRoles />
          </ResourceListProxy>
        }
      />
      <Route
        path={CLUSTER_ROLE_BINDINGS_REL_PATH}
        element={
          <ResourceListProxy>
            <ClusterRoleBindings />
          </ResourceListProxy>
        }
      />
    </Route>
    <Route
      path={CUSTOM_RESOURCES_REL_PATH}
      element={
        <ResourceListProxy>
          <CustomResources />
        </ResourceListProxy>
      }
    />
  </Route>,
]
