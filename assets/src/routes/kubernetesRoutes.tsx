import { Navigate, Route } from 'react-router-dom'

import Service, {
  ServiceEvents,
  ServiceInfo,
  ServicePods,
} from 'components/kubernetes/discovery/Service'
import PersistentVolume, {
  PersistentVolumeInfo,
} from 'components/kubernetes/storage/PersistentVolume'
import Secret, { SecretData } from 'components/kubernetes/configuration/Secret'
import RoleBinding, {
  RoleBindingSubjects,
} from 'components/kubernetes/access/RoleBinding'
import Role, { RolePolicyRules } from 'components/kubernetes/access/Role'
import ClusterRole from 'components/kubernetes/access/ClusterRole'
import ClusterRoleBinding, {
  ClusterRoleBindingSubjects,
} from 'components/kubernetes/access/ClusterRoleBinding'
import CustomResourceDefinition from 'components/kubernetes/customresources/CustomResourceDefinition'

import {
  Pod,
  PodContainers,
  PodEvents,
  PodInfo,
} from '../components/kubernetes/workloads/Pod'
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
import Node, {
  NodeConditions,
  NodeContainerImages,
  NodeEvents,
  NodeInfo,
  NodePods,
} from '../components/kubernetes/cluster/Node'
import Events from '../components/kubernetes/cluster/Events'
import Namespaces from '../components/kubernetes/cluster/Namespaces'
import CustomResourceDefinitions from '../components/kubernetes/customresources/CustomResourceDefinitions'
import NetworkPolicies from '../components/kubernetes/discovery/NetworkPolicies'
import ClusterRoleBindings from '../components/kubernetes/access/ClusterRoleBindings'
import ClusterRoles from '../components/kubernetes/access/ClusterRoles'
import RoleBindings from '../components/kubernetes/access/RoleBindings'
import Roles from '../components/kubernetes/access/Roles'
import Access from '../components/kubernetes/access/Access'
import Deployment, {
  DeploymentEvents,
  DeploymentHorizontalPodAutoscalers,
  DeploymentReplicaSets,
} from '../components/kubernetes/workloads/Deployment'
import ReplicaSet, {
  ReplicaSetEvents,
  ReplicaSetInfo,
  ReplicaSetPods,
  ReplicaSetServices,
} from '../components/kubernetes/workloads/ReplicaSet'
import StatefulSet from '../components/kubernetes/workloads/StatefulSet'
import DaemonSet from '../components/kubernetes/workloads/DaemonSet'
import Job from '../components/kubernetes/workloads/Job'
import CronJob from '../components/kubernetes/workloads/CronJob'
import ReplicationController from '../components/kubernetes/workloads/ReplicationController'
import Ingress from '../components/kubernetes/discovery/Ingress'
import IngressClass from '../components/kubernetes/discovery/IngressClass'
import NetworkPolicy from '../components/kubernetes/discovery/NetworkPolicy'
import PersistentVolumeClaim from '../components/kubernetes/storage/PersistentVolumeClaim'
import StorageClass, {
  StorageClassPersistentVolumes,
} from '../components/kubernetes/storage/StorageClass'
import ConfigMap, {
  ConfigMapData,
} from '../components/kubernetes/configuration/ConfigMap'
import Namespace, {
  NamespaceEvents,
  NamespaceInfo,
} from '../components/kubernetes/cluster/Namespace'

import Raw from '../components/kubernetes/common/Raw'

import ServiceAccounts from '../components/kubernetes/access/ServiceAccounts'

import ServiceAccount from '../components/kubernetes/access/ServiceAccount'

import HorizontalPodAutoscalers from '../components/kubernetes/cluster/HorizontalPodAutoscalers'

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
  HPAS_REL_PATH,
  INGRESSES_REL_PATH,
  INGRESS_CLASSES_REL_PATH,
  JOBS_REL_PATH,
  KUBERNETES_ABS_PATH,
  NAMESPACED_RESOURCE_DETAILS_REL_PATH,
  NAMESPACES_REL_PATH,
  NETWORK_POLICIES_REL_PATH,
  NODES_REL_PATH,
  PERSISTENT_VOLUMES_REL_PATH,
  PERSISTENT_VOLUME_CLAIMS_REL_PATH,
  PODS_REL_PATH,
  REPLICATION_CONTROLLERS_REL_PATH,
  REPLICA_SETS_REL_PATH,
  RESOURCE_DETAILS_REL_PATH,
  ROLES_REL_PATH,
  ROLE_BINDINGS_REL_PATH,
  SECRETS_REL_PATH,
  SERVICES_REL_PATH,
  SERVICE_ACCOUNTS_REL_PATH,
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
        element={<Services />}
      />
      <Route
        path={INGRESSES_REL_PATH}
        element={<Ingresses />}
      />
      <Route
        path={INGRESS_CLASSES_REL_PATH}
        element={<IngressClasses />}
      />
      <Route
        path={NETWORK_POLICIES_REL_PATH}
        element={<NetworkPolicies />}
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
        path={PERSISTENT_VOLUMES_REL_PATH}
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
        element={<Nodes />}
      />
      <Route
        path={EVENTS_REL_PATH}
        element={<Events />}
      />
      <Route
        path={NAMESPACES_REL_PATH}
        element={<Namespaces />}
      />
      <Route
        path={HPAS_REL_PATH}
        element={<HorizontalPodAutoscalers />}
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
        element={<Roles />}
      />
      <Route
        path={ROLE_BINDINGS_REL_PATH}
        element={<RoleBindings />}
      />
      <Route
        path={CLUSTER_ROLES_REL_PATH}
        element={<ClusterRoles />}
      />
      <Route
        path={CLUSTER_ROLE_BINDINGS_REL_PATH}
        element={<ClusterRoleBindings />}
      />
      <Route
        path={SERVICE_ACCOUNTS_REL_PATH}
        element={<ServiceAccounts />}
      />
    </Route>
    <Route
      path={CUSTOM_RESOURCES_REL_PATH}
      element={<CustomResourceDefinitions />}
    />
  </Route>,
  // Workloads
  <Route
    path={`${KUBERNETES_ABS_PATH}/${PODS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
    element={<Pod />}
  >
    <Route
      index
      path=""
      element={<PodInfo />}
    />
    <Route
      path="containers"
      element={<PodContainers />}
    />
    <Route
      path="events"
      element={<PodEvents />}
    />
    <Route
      path="raw"
      element={<Raw />}
    />
  </Route>,
  <Route
    path={`${KUBERNETES_ABS_PATH}/${DEPLOYMENTS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
    element={<Deployment />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to="replicasets"
        />
      }
    />
    <Route
      path="replicasets"
      element={<DeploymentReplicaSets />}
    />
    <Route
      path="hpas"
      element={<DeploymentHorizontalPodAutoscalers />}
    />
    <Route
      path="events"
      element={<DeploymentEvents />}
    />
    <Route
      path="raw"
      element={<Raw />}
    />
  </Route>,
  <Route
    path={`${KUBERNETES_ABS_PATH}/${REPLICA_SETS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
    element={<ReplicaSet />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to="pods"
        />
      }
    />
    <Route
      path="hpas"
      element={<ReplicaSetInfo />}
    />
    <Route
      path="pods"
      element={<ReplicaSetPods />}
    />
    <Route
      path="events"
      element={<ReplicaSetEvents />}
    />
    <Route
      path="services"
      element={<ReplicaSetServices />}
    />
    <Route
      path="raw"
      element={<Raw />}
    />
  </Route>,
  <Route
    index
    path={`${KUBERNETES_ABS_PATH}/${STATEFUL_SETS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
    element={<StatefulSet />}
  />,
  <Route
    index
    path={`${KUBERNETES_ABS_PATH}/${DAEMON_SETS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
    element={<DaemonSet />}
  />,
  <Route
    index
    path={`${KUBERNETES_ABS_PATH}/${JOBS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
    element={<Job />}
  />,
  <Route
    index
    path={`${KUBERNETES_ABS_PATH}/${CRON_JOBS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
    element={<CronJob />}
  />,
  <Route
    index
    path={`${KUBERNETES_ABS_PATH}/${REPLICATION_CONTROLLERS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
    element={<ReplicationController />}
  />,
  // Discovery
  <Route
    path={`${KUBERNETES_ABS_PATH}/${SERVICES_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
    element={<Service />}
  >
    <Route
      path=""
      element={<ServiceInfo />}
    />
    <Route
      path="pods"
      element={<ServicePods />}
    />
    <Route
      path="events"
      element={<ServiceEvents />}
    />
    <Route
      path="raw"
      element={<Raw />}
    />
  </Route>,
  <Route
    index
    path={`${KUBERNETES_ABS_PATH}/${INGRESSES_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
    element={<Ingress />}
  />,
  <Route
    path={`${KUBERNETES_ABS_PATH}/${INGRESS_CLASSES_REL_PATH}/${RESOURCE_DETAILS_REL_PATH}`}
    element={<IngressClass />}
  >
    <Route
      index
      path=""
      element={<Raw />}
    />
  </Route>,
  <Route
    index
    path={`${KUBERNETES_ABS_PATH}/${NETWORK_POLICIES_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
    element={<NetworkPolicy />}
  />,
  // Storage
  <Route
    path={`${KUBERNETES_ABS_PATH}/${PERSISTENT_VOLUME_CLAIMS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
    element={<PersistentVolumeClaim />}
  >
    <Route
      index
      path=""
      element={<Raw />}
    />
  </Route>,
  <Route
    path={`${KUBERNETES_ABS_PATH}/${PERSISTENT_VOLUMES_REL_PATH}/${RESOURCE_DETAILS_REL_PATH}`}
    element={<PersistentVolume />}
  >
    <Route
      index
      path=""
      element={<PersistentVolumeInfo />}
    />
    <Route
      path="raw"
      element={<Raw />}
    />
  </Route>,
  <Route
    path={`${KUBERNETES_ABS_PATH}/${STORAGE_CLASSES_REL_PATH}/${RESOURCE_DETAILS_REL_PATH}`}
    element={<StorageClass />}
  >
    <Route
      index
      path=""
      element={<StorageClassPersistentVolumes />}
    />
    <Route
      path="raw"
      element={<Raw />}
    />
  </Route>,
  // Configuration
  <Route
    path={`${KUBERNETES_ABS_PATH}/${CONFIG_MAPS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
    element={<ConfigMap />}
  >
    <Route
      index
      path=""
      element={<ConfigMapData />}
    />
    <Route
      path="raw"
      element={<Raw />}
    />
  </Route>,
  <Route
    path={`${KUBERNETES_ABS_PATH}/${SECRETS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
    element={<Secret />}
  >
    <Route
      index
      path=""
      element={<SecretData />}
    />
    <Route
      path="raw"
      element={<Raw />}
    />
  </Route>,
  // Cluster
  <Route
    path={`${KUBERNETES_ABS_PATH}/${NODES_REL_PATH}/${RESOURCE_DETAILS_REL_PATH}`}
    element={<Node />}
  >
    <Route
      index
      path=""
      element={<NodeInfo />}
    />
    <Route
      path="conditions"
      element={<NodeConditions />}
    />
    <Route
      path="images"
      element={<NodeContainerImages />}
    />
    <Route
      path="pods"
      element={<NodePods />}
    />
    <Route
      path="events"
      element={<NodeEvents />}
    />
    <Route
      path="raw"
      element={<Raw />}
    />
  </Route>,
  <Route
    path={`${KUBERNETES_ABS_PATH}/${NAMESPACES_REL_PATH}/${RESOURCE_DETAILS_REL_PATH}`}
    element={<Namespace />}
  >
    <Route
      index
      path=""
      element={<NamespaceInfo />}
    />
    <Route
      path="events"
      element={<NamespaceEvents />}
    />
    <Route
      path="raw"
      element={<Raw />}
    />
  </Route>,
  // Access
  <Route
    path={`${KUBERNETES_ABS_PATH}/${ROLES_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
    element={<Role />}
  >
    <Route
      index
      path=""
      element={<RolePolicyRules />}
    />
    <Route
      path="raw"
      element={<Raw />}
    />
  </Route>,
  <Route
    path={`${KUBERNETES_ABS_PATH}/${ROLE_BINDINGS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
    element={<RoleBinding />}
  >
    <Route
      index
      path=""
      element={<RoleBindingSubjects />}
    />
    <Route
      path="raw"
      element={<Raw />}
    />
  </Route>,
  <Route
    path={`${KUBERNETES_ABS_PATH}/${SERVICE_ACCOUNTS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
    element={<ServiceAccount />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to="raw"
        />
      }
    />
    <Route
      path="raw"
      element={<Raw />}
    />
  </Route>,
  <Route
    path={`${KUBERNETES_ABS_PATH}/${CLUSTER_ROLES_REL_PATH}/${RESOURCE_DETAILS_REL_PATH}`}
    element={<ClusterRole />}
  >
    <Route
      index
      path=""
      element={<RolePolicyRules />}
    />
    <Route
      path="raw"
      element={<Raw />}
    />
  </Route>,
  <Route
    path={`${KUBERNETES_ABS_PATH}/${CLUSTER_ROLE_BINDINGS_REL_PATH}/${RESOURCE_DETAILS_REL_PATH}`}
    element={<ClusterRoleBinding />}
  >
    <Route
      index
      path=""
      element={<ClusterRoleBindingSubjects />}
    />
    <Route
      path="raw"
      element={<Raw />}
    />
  </Route>,
  // Custom Resource Definition
  <Route
    path={`${KUBERNETES_ABS_PATH}/${CUSTOM_RESOURCES_REL_PATH}/${RESOURCE_DETAILS_REL_PATH}`}
    element={<CustomResourceDefinition />}
  />,
]
