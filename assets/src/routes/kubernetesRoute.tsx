import { Navigate, Route } from 'react-router-dom'

import Service, {
  ServiceEvents,
  ServiceInfo,
  ServiceIngresses,
  ServicePods,
} from 'components/kubernetes/network/Service'
import PersistentVolume, {
  PersistentVolumeInfo,
} from 'components/kubernetes/storage/PersistentVolume'
import Secret, { SecretData } from 'components/kubernetes/configuration/Secret'
import RoleBinding, {
  RoleBindingSubjects,
} from 'components/kubernetes/rbac/RoleBinding'
import Role, { RolePolicyRules } from 'components/kubernetes/rbac/Role'
import ClusterRole from 'components/kubernetes/rbac/ClusterRole'
import ClusterRoleBinding, {
  ClusterRoleBindingSubjects,
} from 'components/kubernetes/rbac/ClusterRoleBinding'
import CustomResourceDefinition, {
  CustomResourceDefinitionObjects,
  CustomResourceDefinitionConditions,
} from 'components/kubernetes/customresources/CustomResourceDefinition'

import {
  Pod,
  PodContainers,
  PodEvents,
  PodExec,
  PodInfo,
  PodLogs,
} from '../components/kubernetes/workloads/Pod'
import Navigation from '../components/kubernetes/Navigation'
import Workloads from '../components/kubernetes/workloads/Workloads'
import Network from '../components/kubernetes/network/Network'
import Services from '../components/kubernetes/network/Services'
import Ingresses from '../components/kubernetes/network/Ingresses'
import IngressClasses from '../components/kubernetes/network/IngressClasses'
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
import NetworkPolicies from '../components/kubernetes/network/NetworkPolicies'
import ClusterRoleBindings from '../components/kubernetes/rbac/ClusterRoleBindings'
import ClusterRoles from '../components/kubernetes/rbac/ClusterRoles'
import RoleBindings from '../components/kubernetes/rbac/RoleBindings'
import Roles from '../components/kubernetes/rbac/Roles'
import Rbac from '../components/kubernetes/rbac/Rbac'
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
import StatefulSet, {
  StatefulSetEvents,
  StatefulSetPods,
} from '../components/kubernetes/workloads/StatefulSet'
import DaemonSet, {
  DaemonSetEvents,
  DaemonSetPods,
  DaemonSetServices,
} from '../components/kubernetes/workloads/DaemonSet'
import Job, {
  JobConditions,
  JobEvents,
  JobPods,
} from '../components/kubernetes/workloads/Job'
import ReplicationController, {
  ReplicationControllerEvents,
  ReplicationControllerPods,
  ReplicationControllerServices,
} from '../components/kubernetes/workloads/ReplicationController'
import Ingress, {
  IngressEvents,
  IngressInfo,
} from '../components/kubernetes/network/Ingress'
import CronJob, {
  CronJobEvents,
  CronJobJobs,
} from '../components/kubernetes/workloads/CronJob'
import IngressClass from '../components/kubernetes/network/IngressClass'
import NetworkPolicy, {
  NetworkPolicyInfo,
} from '../components/kubernetes/network/NetworkPolicy'
import PersistentVolumeClaim from '../components/kubernetes/storage/PersistentVolumeClaim'
import StorageClass, {
  StorageClassPersistentVolumes,
} from '../components/kubernetes/storage/StorageClass'
import ConfigMap, {
  ConfigMapData,
} from '../components/kubernetes/configuration/ConfigMap'
import Namespace, {
  NamespaceEvents,
} from '../components/kubernetes/cluster/Namespace'

import Raw from '../components/kubernetes/common/Raw'

import ServiceAccounts from '../components/kubernetes/rbac/ServiceAccounts'

import ServiceAccount from '../components/kubernetes/rbac/ServiceAccount'

import HorizontalPodAutoscalers from '../components/kubernetes/cluster/HorizontalPodAutoscalers'

import CustomResource, {
  CustomResourceEvents,
} from '../components/kubernetes/customresources/CustomResource'

import Root from '../components/kubernetes/Cluster'

import {
  CLUSTER_REL_PATH,
  CLUSTER_ROLES_REL_PATH,
  CLUSTER_ROLE_BINDINGS_REL_PATH,
  CONFIGURATION_REL_PATH,
  CONFIG_MAPS_REL_PATH,
  CRON_JOBS_REL_PATH,
  CUSTOM_RESOURCES_REL_PATH,
  DAEMON_SETS_REL_PATH,
  DEPLOYMENTS_REL_PATH,
  EVENTS_REL_PATH,
  HPAS_REL_PATH,
  INGRESSES_REL_PATH,
  INGRESS_CLASSES_REL_PATH,
  JOBS_REL_PATH,
  KUBERNETES_ABS_PATH,
  NAMESPACED_RESOURCE_DETAILS_REL_PATH,
  NAMESPACES_REL_PATH,
  NETWORK_POLICIES_REL_PATH,
  NETWORK_REL_PATH,
  NODES_REL_PATH,
  PERSISTENT_VOLUMES_REL_PATH,
  PERSISTENT_VOLUME_CLAIMS_REL_PATH,
  PODS_REL_PATH,
  RBAC_REL_PATH,
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

export const kubernetesRoutes = (
  <Route
    path={KUBERNETES_ABS_PATH}
    element={<Root />}
  >
    <Route
      path=""
      element={<Navigation />}
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
        path={NETWORK_REL_PATH}
        element={<Network />}
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
        path={RBAC_REL_PATH}
        element={<Rbac />}
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
    </Route>
    <Route
      path={`${PODS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
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
        path="logs"
        element={<PodLogs />}
      />
      <Route
        path="exec"
        element={<PodExec />}
      />
      <Route
        path="raw"
        element={<Raw />}
      />
    </Route>
    <Route
      path={`${DEPLOYMENTS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
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
    </Route>
    <Route
      path={`${REPLICA_SETS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
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
    </Route>
    <Route
      path={`${STATEFUL_SETS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
      element={<StatefulSet />}
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
        path="pods"
        element={<StatefulSetPods />}
      />
      <Route
        path="events"
        element={<StatefulSetEvents />}
      />
      <Route
        path="raw"
        element={<Raw />}
      />
    </Route>
    <Route
      path={`${DAEMON_SETS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
      element={<DaemonSet />}
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
        path="pods"
        element={<DaemonSetPods />}
      />
      <Route
        path="services"
        element={<DaemonSetServices />}
      />
      <Route
        path="events"
        element={<DaemonSetEvents />}
      />
      <Route
        path="raw"
        element={<Raw />}
      />
    </Route>
    <Route
      path={`${JOBS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
      element={<Job />}
    >
      <Route
        index
        element={
          <Navigate
            replace
            to="conditions"
          />
        }
      />
      <Route
        path="conditions"
        element={<JobConditions />}
      />
      <Route
        path="pods"
        element={<JobPods />}
      />
      <Route
        path="events"
        element={<JobEvents />}
      />
      <Route
        path="raw"
        element={<Raw />}
      />
    </Route>
    <Route
      path={`${CRON_JOBS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
      element={<CronJob />}
    >
      <Route
        index
        element={
          <Navigate
            replace
            to="jobs"
          />
        }
      />
      <Route
        path="jobs"
        element={<CronJobJobs />}
      />
      <Route
        path="events"
        element={<CronJobEvents />}
      />
      <Route
        path="raw"
        element={<Raw />}
      />
    </Route>
    <Route
      path={`${REPLICATION_CONTROLLERS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
      element={<ReplicationController />}
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
        path="pods"
        element={<ReplicationControllerPods />}
      />
      <Route
        path="services"
        element={<ReplicationControllerServices />}
      />
      <Route
        path="events"
        element={<ReplicationControllerEvents />}
      />
      <Route
        path="raw"
        element={<Raw />}
      />
    </Route>
    <Route
      path={`${SERVICES_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
      element={<Service />}
    >
      <Route
        path=""
        element={<ServiceInfo />}
      />
      <Route
        path="ingresses"
        element={<ServiceIngresses />}
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
    </Route>
    <Route
      path={`${INGRESSES_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
      element={<Ingress />}
    >
      <Route
        path=""
        element={<IngressInfo />}
      />
      <Route
        path="events"
        element={<IngressEvents />}
      />
      <Route
        path="raw"
        element={<Raw />}
      />
    </Route>
    <Route
      path={`${INGRESS_CLASSES_REL_PATH}/${RESOURCE_DETAILS_REL_PATH}`}
      element={<IngressClass />}
    >
      <Route
        index
        path=""
        element={<Raw />}
      />
    </Route>
    <Route
      path={`${NETWORK_POLICIES_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
      element={<NetworkPolicy />}
    >
      <Route
        path=""
        element={<NetworkPolicyInfo />}
      />
      <Route
        path="raw"
        element={<Raw />}
      />
    </Route>
    <Route
      path={`${PERSISTENT_VOLUME_CLAIMS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
      element={<PersistentVolumeClaim />}
    >
      <Route
        index
        path=""
        element={<Raw />}
      />
    </Route>
    <Route
      path={`${PERSISTENT_VOLUMES_REL_PATH}/${RESOURCE_DETAILS_REL_PATH}`}
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
    </Route>
    ,
    <Route
      path={`${STORAGE_CLASSES_REL_PATH}/${RESOURCE_DETAILS_REL_PATH}`}
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
    </Route>
    <Route
      path={`${CONFIG_MAPS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
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
    </Route>
    ,
    <Route
      path={`${SECRETS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
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
    </Route>
    <Route
      path={`${NODES_REL_PATH}/${RESOURCE_DETAILS_REL_PATH}`}
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
    </Route>
    <Route
      path={`${NAMESPACES_REL_PATH}/${RESOURCE_DETAILS_REL_PATH}`}
      element={<Namespace />}
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
        path="events"
        element={<NamespaceEvents />}
      />
      <Route
        path="raw"
        element={<Raw />}
      />
    </Route>
    <Route
      path={`${ROLES_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
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
    </Route>
    <Route
      path={`${ROLE_BINDINGS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
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
    </Route>
    <Route
      path={`${SERVICE_ACCOUNTS_REL_PATH}/${NAMESPACED_RESOURCE_DETAILS_REL_PATH}`}
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
    </Route>
    <Route
      path={`${CLUSTER_ROLES_REL_PATH}/${RESOURCE_DETAILS_REL_PATH}`}
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
    </Route>
    <Route
      path={`${CLUSTER_ROLE_BINDINGS_REL_PATH}/${RESOURCE_DETAILS_REL_PATH}`}
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
    </Route>
    <Route
      path={`${CUSTOM_RESOURCES_REL_PATH}/${RESOURCE_DETAILS_REL_PATH}`}
      element={<CustomResourceDefinition />}
    >
      <Route
        index
        path=""
        element={<CustomResourceDefinitionObjects />}
      />
      <Route
        path="conditions"
        element={<CustomResourceDefinitionConditions />}
      />
      <Route
        path="raw"
        element={<Raw />}
      />
    </Route>
    <Route
      path={`${CUSTOM_RESOURCES_REL_PATH}/:crd/:namespace?/:name`}
      element={<CustomResource />}
    >
      <Route
        index
        path=""
        element={<Raw />}
      />
      <Route
        path="events"
        element={<CustomResourceEvents />}
      />
    </Route>
  </Route>
)
