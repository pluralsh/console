/* eslint-disable */
/* prettier-ignore */
import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** The `BigInt` scalar type represents non-fractional signed whole numeric values. */
  BigInt: { input: any; output: any; }
  /** A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the `date-time` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar. */
  DateTime: { input: string; output: string; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: any; output: any; }
  ObjMap: { input: any; output: any; }
  /** Represents empty values */
  Void: { input: any; output: any; }
};

export enum ContainerState {
  Failed = 'Failed',
  Running = 'Running',
  Terminated = 'Terminated',
  Unknown = 'Unknown',
  Waiting = 'Waiting'
}

export enum HttpMethod {
  Connect = 'CONNECT',
  Delete = 'DELETE',
  Get = 'GET',
  Head = 'HEAD',
  Options = 'OPTIONS',
  Patch = 'PATCH',
  Post = 'POST',
  Put = 'PUT',
  Trace = 'TRACE'
}

export type Map = {
  __typename?: 'Map';
  map: Scalars['ObjMap']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** stores ImagePullSecret in a Kubernetes Secret */
  handleCreateImagePullSecret?: Maybe<Secret_Secret>;
  /** create a Namespace */
  handleCreateNamespace: Namespace_NamespaceSpec;
  /** rollout restart of the Daemon Set */
  handleDaemonSetRestart?: Maybe<Daemonset_DaemonSetDetail>;
  /** deletes a resource from a namespace */
  handleDeleteResource?: Maybe<Scalars['Void']['output']>;
  /** creates an application based on provided deployment.AppDeploymentSpec */
  handleDeploy: Deployment_AppDeploymentSpec;
  /** create an application from file */
  handleDeployFromFile?: Maybe<Deployment_AppDeploymentFromFileResponse>;
  /** pauses the Deployment */
  handleDeploymentPause?: Maybe<Deployment_DeploymentDetail>;
  /** rollout restart of the Deployment */
  handleDeploymentRestart: Deployment_RolloutSpec;
  /** resumes the Deployment */
  handleDeploymentResume?: Maybe<Deployment_DeploymentDetail>;
  /** rolls back the Deployment to the target revision */
  handleDeploymentRollback: Deployment_RolloutSpec;
  /** checks if provided image is valid */
  handleImageReferenceValidity?: Maybe<Validation_ImageReferenceValidity>;
  /** checks if provided name is valid */
  handleNameValidity?: Maybe<Validation_AppNameValidity>;
  /** drains Node */
  handleNodeDrain?: Maybe<Scalars['JSON']['output']>;
  /** checks if provided service protocol is valid */
  handleProtocolValidity?: Maybe<Validation_ProtocolValidity>;
  /** creates or updates a resource in a namespace */
  handlePutResource?: Maybe<Scalars['Void']['output']>;
  /** scales a non-namespaced resource */
  handleScaleResource?: Maybe<Scaling_ReplicaCounts>;
  /** rollout restart of the Daemon Set */
  handleStatefulSetRestart?: Maybe<Statefulset_StatefulSetDetail>;
  /** triggers a Job based on CronJob */
  handleTriggerCronJob?: Maybe<Scalars['JSON']['output']>;
  /** scales ReplicationController to a number of replicas */
  handleUpdateReplicasCount?: Maybe<Scalars['JSON']['output']>;
};


export type MutationHandleCreateImagePullSecretArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  input: Secret_ImagePullSecretSpec_Input;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type MutationHandleCreateNamespaceArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  input: Namespace_NamespaceSpec_Input;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type MutationHandleDaemonSetRestartArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  daemonSet: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type MutationHandleDeleteResourceArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  deleteNow?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  kind: Scalars['String']['input'];
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  propagation?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type MutationHandleDeployArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  input: Deployment_AppDeploymentSpec_Input;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type MutationHandleDeployFromFileArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  input: Deployment_AppDeploymentFromFileSpec_Input;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type MutationHandleDeploymentPauseArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  deployment: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type MutationHandleDeploymentRestartArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  deployment: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type MutationHandleDeploymentResumeArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  deployment: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type MutationHandleDeploymentRollbackArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  deployment: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  input: Deployment_RolloutSpec_Input;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type MutationHandleImageReferenceValidityArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  input: Validation_ImageReferenceValiditySpec_Input;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type MutationHandleNameValidityArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  input: Validation_AppNameValiditySpec_Input;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type MutationHandleNodeDrainArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  input: Node_NodeDrainSpec_Input;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type MutationHandleProtocolValidityArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  input: Validation_ProtocolValiditySpec_Input;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type MutationHandlePutResourceArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  input: Scalars['JSON']['input'];
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  kind: Scalars['String']['input'];
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type MutationHandleScaleResourceArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  kind: Scalars['String']['input'];
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  scaleBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type MutationHandleStatefulSetRestartArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  statefulset: Scalars['String']['input'];
};


export type MutationHandleTriggerCronJobArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type MutationHandleUpdateReplicasCountArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  input: Replicationcontroller_ReplicationControllerSpec_Input;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  replicationController: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};

export type Query = {
  __typename?: 'Query';
  /** handles exec into pod */
  handleExecShell?: Maybe<Handler_TerminalResponse>;
  /** returns a list of available protocols for the service */
  handleGetAvailableProtocols?: Maybe<Deployment_Protocols>;
  /** returns detailed information about ClusterRoleBinding */
  handleGetClusterRoleBindingDetail?: Maybe<Clusterrolebinding_ClusterRoleBindingDetail>;
  /** returns a list of ClusterRoleBindings */
  handleGetClusterRoleBindingList?: Maybe<Clusterrolebinding_ClusterRoleBindingList>;
  /** returns detailed information about ClusterRole */
  handleGetClusterRoleDetail?: Maybe<Clusterrole_ClusterRoleDetail>;
  /** returns a list of ClusterRoles */
  handleGetClusterRoleList?: Maybe<Clusterrole_ClusterRoleList>;
  /** returns detailed information about ConfigMap */
  handleGetConfigMapDetail?: Maybe<Configmap_ConfigMapDetail>;
  /** returns a list of ConfigMaps in a namespaces */
  handleGetConfigMapList?: Maybe<Configmap_ConfigMapList>;
  /** returns detailed information about CronJob */
  handleGetCronJobDetail?: Maybe<Cronjob_CronJobDetail>;
  /** returns a list of Events for CronJob */
  handleGetCronJobEvents?: Maybe<Common_EventList>;
  /** returns a list of Jobs for CronJob */
  handleGetCronJobJobs?: Maybe<Job_JobList>;
  /** returns a list of CronJobs in a namespaces */
  handleGetCronJobList?: Maybe<Cronjob_CronJobList>;
  /** generates a one-time CSRF token that can be used by POST request */
  handleGetCsrfToken?: Maybe<Csrf_Response>;
  /** returns detailed information about CustomResourceDefinition */
  handleGetCustomResourceDefinitionDetail?: Maybe<Types_CustomResourceDefinitionDetail>;
  /** returns a list of CustomResourceDefinition */
  handleGetCustomResourceDefinitionList?: Maybe<Types_CustomResourceDefinitionList>;
  /** returns detailed information about custom resource object */
  handleGetCustomResourceObjectDetail?: Maybe<Types_CustomResourceObjectDetail>;
  /** returns Events for custom resource object */
  handleGetCustomResourceObjectEvents?: Maybe<Common_EventList>;
  /** returns a list of objects of CustomResourceDefinition */
  handleGetCustomResourceObjectList?: Maybe<Types_CustomResourceObjectList>;
  /** returns detailed information about DaemonSet */
  handleGetDaemonSetDetail?: Maybe<Daemonset_DaemonSetDetail>;
  /** returns a list of Events for DaemonSet */
  handleGetDaemonSetEvents?: Maybe<Common_EventList>;
  /** returns a list of DaemonSets in a namespaces */
  handleGetDaemonSetList?: Maybe<Daemonset_DaemonSetList>;
  /** returns a list of Pods for DaemonSet */
  handleGetDaemonSetPods?: Maybe<Pod_PodList>;
  /** returns a list of Services for DaemonSet */
  handleGetDaemonSetServices?: Maybe<Service_ServiceList>;
  /** returns detailed information about Deployment */
  handleGetDeploymentDetail?: Maybe<Deployment_DeploymentDetail>;
  /** returns a list of Events for Deployment */
  handleGetDeploymentEvents?: Maybe<Common_EventList>;
  /** returns a list of new ReplicaSets for Deployment */
  handleGetDeploymentNewReplicaSet?: Maybe<Replicaset_ReplicaSet>;
  /** returns a list of old ReplicaSets for Deployment */
  handleGetDeploymentOldReplicaSets?: Maybe<Replicaset_ReplicaSetList>;
  /** returns a list of Deployments in a namespaces */
  handleGetDeployments?: Maybe<Deployment_DeploymentList>;
  /** returns a list of Events in a namespace */
  handleGetEventList?: Maybe<Common_EventList>;
  /** returns detailed information about HorizontalPodAutoscaler */
  handleGetHorizontalPodAutoscalerDetail?: Maybe<Horizontalpodautoscaler_HorizontalPodAutoscalerDetail>;
  /** returns a list of HorizontalPodAutoscalers in a namespaces */
  handleGetHorizontalPodAutoscalerList?: Maybe<Horizontalpodautoscaler_HorizontalPodAutoscalerList>;
  /** returns a list of HorizontalPodAutoscalers for resource */
  handleGetHorizontalPodAutoscalerListForResource?: Maybe<Horizontalpodautoscaler_HorizontalPodAutoscalerList>;
  /** returns detailed information about IngressClass */
  handleGetIngressClass?: Maybe<Ingressclass_IngressClass>;
  /** returns a list of IngressClasses */
  handleGetIngressClassList?: Maybe<Ingressclass_IngressClassList>;
  /** returns detailed information about Ingress */
  handleGetIngressDetail?: Maybe<Ingress_IngressDetail>;
  /** returns a list of Events for Ingress */
  handleGetIngressEvent?: Maybe<Common_EventList>;
  /** returns a list of Ingresses in a namespaces */
  handleGetIngressList?: Maybe<Ingress_IngressList>;
  /** returns detailed information about Job */
  handleGetJobDetail?: Maybe<Job_JobDetail>;
  /** returns a list of Events for Job */
  handleGetJobEvents?: Maybe<Common_EventList>;
  /** returns a list of Jobs in a namespaces */
  handleGetJobList?: Maybe<Job_JobList>;
  /** returns a list of Pods for Job */
  handleGetJobPods?: Maybe<Pod_PodList>;
  /** returns detailed information about Namespace */
  handleGetNamespaceDetail?: Maybe<Namespace_NamespaceDetail>;
  /** returns a list of Events for Namespace */
  handleGetNamespaceEvents?: Maybe<Common_EventList>;
  /** returns a list of Namespaces */
  handleGetNamespaces?: Maybe<Namespace_NamespaceList>;
  /** returns detailed information about NetworkPolicy */
  handleGetNetworkPolicyDetail?: Maybe<Networkpolicy_NetworkPolicyDetail>;
  /** returns a list of NetworkPolicies in a namespaces */
  handleGetNetworkPolicyList?: Maybe<Networkpolicy_NetworkPolicyList>;
  /** returns detailed information about Node */
  handleGetNodeDetail?: Maybe<Node_NodeDetail>;
  /** returns a list of Events for Node */
  handleGetNodeEvents?: Maybe<Common_EventList>;
  /** returns a list of Nodes */
  handleGetNodeList?: Maybe<Node_NodeList>;
  /** returns a list of Pods for Node */
  handleGetNodePods?: Maybe<Pod_PodList>;
  /** returns detailed information about PersistentVolumeClaim */
  handleGetPersistentVolumeClaimDetail?: Maybe<Persistentvolumeclaim_PersistentVolumeClaimDetail>;
  /** returns a list of PersistentVolumeClaim from specified namespace */
  handleGetPersistentVolumeClaimList?: Maybe<Persistentvolumeclaim_PersistentVolumeClaimList>;
  /** returns detailed information about PersistentVolume */
  handleGetPersistentVolumeDetail?: Maybe<Persistentvolume_PersistentVolumeDetail>;
  /** returns a list of PersistentVolumes from all namespaces */
  handleGetPersistentVolumeList?: Maybe<Persistentvolume_PersistentVolumeList>;
  /** returns a list of containers for Pod */
  handleGetPodContainers?: Maybe<Pod_PodDetail>;
  /** returns detailed information about Pod */
  handleGetPodDetail?: Maybe<Pod_PodDetail>;
  /** returns detailed information about PodDisruptionBudget */
  handleGetPodDisruptionBudgetDetail?: Maybe<Poddisruptionbudget_PodDisruptionBudgetDetail>;
  /** returns a list of PodDisruptionBudget from specified namespace */
  handleGetPodDisruptionBudgetList?: Maybe<Poddisruptionbudget_PodDisruptionBudgetList>;
  /** returns a list of Events for Pod */
  handleGetPodEvents?: Maybe<Common_EventList>;
  /** returns a list of containers for Pod */
  handleGetPodPersistentVolumeClaims?: Maybe<Persistentvolumeclaim_PersistentVolumeClaimList>;
  /** returns a list of Pods in a namespaces */
  handleGetPods?: Maybe<Pod_PodList>;
  /** returns a number of replicas of non-namespaced resource */
  handleGetReplicaCount?: Maybe<Scaling_ReplicaCounts>;
  /** returns detailed information about ReplicaSet */
  handleGetReplicaSetDetail?: Maybe<Replicaset_ReplicaSetDetail>;
  /** returns a list of Events for ReplicaSet */
  handleGetReplicaSetEvents?: Maybe<Common_EventList>;
  /** returns a list of Pods for ReplicaSet */
  handleGetReplicaSetPods?: Maybe<Pod_PodList>;
  /** returns a list of Services for ReplicaSet */
  handleGetReplicaSetServices?: Maybe<Service_ServiceList>;
  /** returns a list of ReplicaSets in a namespace */
  handleGetReplicaSets?: Maybe<Replicaset_ReplicaSetList>;
  /** returns detailed information about ReplicationController */
  handleGetReplicationControllerDetail?: Maybe<Replicationcontroller_ReplicationControllerDetail>;
  /** returns a list of Events for ReplicationController */
  handleGetReplicationControllerEvents?: Maybe<Common_EventList>;
  /** returns a list of ReplicationController in a namespace */
  handleGetReplicationControllerList?: Maybe<Replicationcontroller_ReplicationControllerList>;
  /** returns a list of Pods for ReplicationController */
  handleGetReplicationControllerPods?: Maybe<Pod_PodList>;
  /** returns a list of Services for ReplicationController */
  handleGetReplicationControllerServices?: Maybe<Service_ServiceList>;
  /** returns unstructured resource from a namespace */
  handleGetResource?: Maybe<Unstructured_Unstructured>;
  /** returns detailed information about RoleBinding */
  handleGetRoleBindingDetail?: Maybe<Rolebinding_RoleBindingDetail>;
  /** returns a list of RoleBindings in a namespace */
  handleGetRoleBindingList?: Maybe<Rolebinding_RoleBindingList>;
  /** returns detailed information about Role */
  handleGetRoleDetail?: Maybe<Role_RoleDetail>;
  /** returns a list of Roles in a namespace */
  handleGetRoleList?: Maybe<Role_RoleList>;
  /** returns detailed information about Secret */
  handleGetSecretDetail?: Maybe<Secret_SecretDetail>;
  /** returns a list of Secrets in a namespace */
  handleGetSecretList?: Maybe<Secret_SecretList>;
  /** returns detailed information about ServiceAccount */
  handleGetServiceAccountDetail?: Maybe<Serviceaccount_ServiceAccountDetail>;
  /** returns a list of ImagePullSecret Secrets for ServiceAccount */
  handleGetServiceAccountImagePullSecrets?: Maybe<Secret_SecretList>;
  /** returns a list of ServiceAccounts in a namespaces */
  handleGetServiceAccountList?: Maybe<Serviceaccount_ServiceAccountList>;
  /** returns a list of Secrets for ServiceAccount */
  handleGetServiceAccountSecrets?: Maybe<Secret_SecretList>;
  /** returns detailed information about Service */
  handleGetServiceDetail?: Maybe<Service_ServiceDetail>;
  /** returns a list of Events for Service */
  handleGetServiceEvent?: Maybe<Common_EventList>;
  /** returns a list of Ingresses for Service */
  handleGetServiceIngressList?: Maybe<Ingress_IngressList>;
  /** returns a list of Services in a namespace */
  handleGetServiceList?: Maybe<Service_ServiceList>;
  /** returns a list of Pods for Service */
  handleGetServicePods?: Maybe<Pod_PodList>;
  handleGetState?: Maybe<Scalars['JSON']['output']>;
  /** returns detailed information about StatefulSets */
  handleGetStatefulSetDetail?: Maybe<Statefulset_StatefulSetDetail>;
  /** returns a list of Events for StatefulSets */
  handleGetStatefulSetEvents?: Maybe<Common_EventList>;
  /** returns a list of StatefulSets in a namespaces */
  handleGetStatefulSetList?: Maybe<Statefulset_StatefulSetList>;
  /** returns  a list of Pods for StatefulSets */
  handleGetStatefulSetPods?: Maybe<Pod_PodList>;
  /** returns detailed information about StorageClass */
  handleGetStorageClass?: Maybe<Storageclass_StorageClass>;
  /** returns a list of StorageClasses */
  handleGetStorageClassList?: Maybe<Storageclass_StorageClassList>;
  /** returns a list of PersistentVolumes assigned to StorageClass */
  handleGetStorageClassPersistentVolumes?: Maybe<Persistentvolume_PersistentVolumeList>;
  /** returns a text file with logs from a Container */
  handleLogFile?: Maybe<Array<Maybe<Scalars['Int']['output']>>>;
  /** returns log sources for a resource */
  handleLogSource?: Maybe<Controller_LogSources>;
  /** returns logs from a Container */
  handleLogs?: Maybe<Logs_LogDetails>;
};


export type QueryHandleExecShellArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  container: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  pod: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetAvailableProtocolsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetClusterRoleBindingDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetClusterRoleBindingListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetClusterRoleDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetClusterRoleListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetConfigMapDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  configmap: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetConfigMapListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetCronJobDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetCronJobEventsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetCronJobJobsArgs = {
  active?: InputMaybe<Scalars['String']['input']>;
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetCronJobListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetCsrfTokenArgs = {
  action: Scalars['String']['input'];
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetCustomResourceDefinitionDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  crd: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetCustomResourceDefinitionListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetCustomResourceObjectDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  crd: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  object: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetCustomResourceObjectEventsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  crd: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  object: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetCustomResourceObjectListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  crd: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetDaemonSetDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  daemonSet: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetDaemonSetEventsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  daemonSet: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetDaemonSetListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetDaemonSetPodsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  daemonSet: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetDaemonSetServicesArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  daemonSet: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetDeploymentDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  deployment: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetDeploymentEventsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  deployment: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetDeploymentNewReplicaSetArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  deployment: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetDeploymentOldReplicaSetsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  deployment: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetDeploymentsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetEventListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetHorizontalPodAutoscalerDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  horizontalpodautoscaler: Scalars['String']['input'];
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetHorizontalPodAutoscalerListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetHorizontalPodAutoscalerListForResourceArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  kind: Scalars['String']['input'];
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetIngressClassArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  ingressclass: Scalars['String']['input'];
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetIngressClassListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetIngressDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetIngressEventArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  ingress: Scalars['String']['input'];
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetIngressListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetJobDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetJobEventsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetJobListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetJobPodsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetNamespaceDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetNamespaceEventsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetNamespacesArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetNetworkPolicyDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  networkpolicy: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetNetworkPolicyListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetNodeDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetNodeEventsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetNodeListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetNodePodsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetPersistentVolumeClaimDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetPersistentVolumeClaimListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetPersistentVolumeDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  persistentvolume: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetPersistentVolumeListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetPodContainersArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  pod: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetPodDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  pod: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetPodDisruptionBudgetDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetPodDisruptionBudgetListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetPodEventsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  pod: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetPodPersistentVolumeClaimsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  pod: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetPodsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetReplicaCountArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  kind: Scalars['String']['input'];
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetReplicaSetDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  replicaSet: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetReplicaSetEventsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  replicaSet: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetReplicaSetPodsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  replicaSet: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetReplicaSetServicesArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  replicaSet: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetReplicaSetsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetReplicationControllerDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  replicationController: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetReplicationControllerEventsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  replicationController: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetReplicationControllerListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetReplicationControllerPodsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  replicationController: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetReplicationControllerServicesArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  replicationController: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetResourceArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  kind: Scalars['String']['input'];
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetRoleBindingDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetRoleBindingListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetRoleDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetRoleListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetSecretDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetSecretListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetServiceAccountDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  serviceaccount: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetServiceAccountImagePullSecretsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  serviceaccount: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetServiceAccountListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetServiceAccountSecretsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  serviceaccount: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetServiceDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  service: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetServiceEventArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  service: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetServiceIngressListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  service: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetServiceListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetServicePodsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  service: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetStateArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetStatefulSetDetailArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  statefulset: Scalars['String']['input'];
};


export type QueryHandleGetStatefulSetEventsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  statefulset: Scalars['String']['input'];
};


export type QueryHandleGetStatefulSetListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetStatefulSetPodsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  statefulset: Scalars['String']['input'];
};


export type QueryHandleGetStorageClassArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  storageclass: Scalars['String']['input'];
};


export type QueryHandleGetStorageClassListArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleGetStorageClassPersistentVolumesArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  storageclass: Scalars['String']['input'];
};


export type QueryHandleLogFileArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  container: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  pod: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleLogSourceArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  resourceName: Scalars['String']['input'];
  resourceType: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHandleLogsArgs = {
  aggregations?: InputMaybe<Scalars['String']['input']>;
  container: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Scalars['String']['input']>;
  namespace: Scalars['String']['input'];
  page?: InputMaybe<Scalars['String']['input']>;
  pod: Scalars['String']['input'];
  sortBy?: InputMaybe<Scalars['String']['input']>;
};

export type StateWrapper = {
  __typename?: 'StateWrapper';
  state: ContainerState;
};

export type StringWrapper = {
  __typename?: 'StringWrapper';
  optionalString?: Maybe<Scalars['String']['output']>;
  string: Scalars['String']['output'];
};

export type Api_DataPoint = {
  __typename?: 'api_DataPoint';
  x: Scalars['BigInt']['output'];
  y: Scalars['BigInt']['output'];
};

export type Api_Metric = {
  __typename?: 'api_Metric';
  aggregation?: Maybe<Scalars['String']['output']>;
  dataPoints: Array<Maybe<Api_DataPoint>>;
  metricName: Scalars['String']['output'];
  metricPoints: Array<Maybe<Api_MetricPoint>>;
};

export type Api_MetricPoint = {
  __typename?: 'api_MetricPoint';
  timestamp: Scalars['DateTime']['output'];
  value: Scalars['Int']['output'];
};

export type Big_Int = {
  __typename?: 'big_Int';
  abs: Array<Maybe<Scalars['Int']['output']>>;
  neg: Scalars['Boolean']['output'];
};

export type Big_Int_Input = {
  abs: Array<InputMaybe<Scalars['Int']['input']>>;
  neg: Scalars['Boolean']['input'];
};

export type Clusterrole_ClusterRole = {
  __typename?: 'clusterrole_ClusterRole';
  objectMeta: Types_ObjectMeta;
  typeMeta: Types_TypeMeta;
};

export type Clusterrole_ClusterRoleDetail = {
  __typename?: 'clusterrole_ClusterRoleDetail';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  objectMeta: Types_ObjectMeta;
  rules: Array<Maybe<V1_PolicyRule>>;
  typeMeta: Types_TypeMeta;
};

export type Clusterrole_ClusterRoleList = {
  __typename?: 'clusterrole_ClusterRoleList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  items: Array<Maybe<Clusterrole_ClusterRole>>;
  listMeta: Types_ListMeta;
};

export type Clusterrolebinding_ClusterRoleBinding = {
  __typename?: 'clusterrolebinding_ClusterRoleBinding';
  objectMeta: Types_ObjectMeta;
  typeMeta: Types_TypeMeta;
};

export type Clusterrolebinding_ClusterRoleBindingDetail = {
  __typename?: 'clusterrolebinding_ClusterRoleBindingDetail';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  objectMeta: Types_ObjectMeta;
  roleRef: V1_RoleRef;
  subjects?: Maybe<Array<Maybe<V1_Subject>>>;
  typeMeta: Types_TypeMeta;
};

export type Clusterrolebinding_ClusterRoleBindingList = {
  __typename?: 'clusterrolebinding_ClusterRoleBindingList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  items: Array<Maybe<Clusterrolebinding_ClusterRoleBinding>>;
  listMeta: Types_ListMeta;
};

export type Common_Condition = {
  __typename?: 'common_Condition';
  lastProbeTime: Scalars['String']['output'];
  lastTransitionTime: Scalars['String']['output'];
  message: Scalars['String']['output'];
  reason: Scalars['String']['output'];
  status: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type Common_Endpoint = {
  __typename?: 'common_Endpoint';
  host: Scalars['String']['output'];
  ports: Array<Maybe<Common_ServicePort>>;
};

export type Common_Event = {
  __typename?: 'common_Event';
  count: Scalars['Int']['output'];
  firstSeen: Scalars['String']['output'];
  lastSeen: Scalars['String']['output'];
  message: Scalars['String']['output'];
  object: Scalars['String']['output'];
  objectKind?: Maybe<Scalars['String']['output']>;
  objectMeta: Types_ObjectMeta;
  objectName?: Maybe<Scalars['String']['output']>;
  objectNamespace?: Maybe<Scalars['String']['output']>;
  reason: Scalars['String']['output'];
  sourceComponent: Scalars['String']['output'];
  sourceHost: Scalars['String']['output'];
  type: Scalars['String']['output'];
  typeMeta: Types_TypeMeta;
};

export type Common_EventList = {
  __typename?: 'common_EventList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  events: Array<Maybe<Common_Event>>;
  listMeta: Types_ListMeta;
};

export type Common_PodInfo = {
  __typename?: 'common_PodInfo';
  current: Scalars['Int']['output'];
  desired?: Maybe<Scalars['Int']['output']>;
  failed: Scalars['Int']['output'];
  pending: Scalars['Int']['output'];
  running: Scalars['Int']['output'];
  succeeded: Scalars['Int']['output'];
  warnings: Array<Maybe<Common_Event>>;
};

export type Common_ResourceStatus = {
  __typename?: 'common_ResourceStatus';
  failed: Scalars['Int']['output'];
  pending: Scalars['Int']['output'];
  running: Scalars['Int']['output'];
  succeeded: Scalars['Int']['output'];
  terminating: Scalars['Int']['output'];
};

export type Common_ServicePort = {
  __typename?: 'common_ServicePort';
  nodePort: Scalars['Int']['output'];
  port: Scalars['Int']['output'];
  protocol: Scalars['String']['output'];
};

export type Configmap_ConfigMap = {
  __typename?: 'configmap_ConfigMap';
  objectMeta: Types_ObjectMeta;
  typeMeta: Types_TypeMeta;
};

export type Configmap_ConfigMapDetail = {
  __typename?: 'configmap_ConfigMapDetail';
  data?: Maybe<Scalars['JSON']['output']>;
  objectMeta: Types_ObjectMeta;
  typeMeta: Types_TypeMeta;
};

export type Configmap_ConfigMapList = {
  __typename?: 'configmap_ConfigMapList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  items: Array<Maybe<Configmap_ConfigMap>>;
  listMeta: Types_ListMeta;
};

export type Controller_LogSources = {
  __typename?: 'controller_LogSources';
  containerNames: Array<Maybe<Scalars['String']['output']>>;
  initContainerNames: Array<Maybe<Scalars['String']['output']>>;
  podNames: Array<Maybe<Scalars['String']['output']>>;
};

export type Controller_ResourceOwner = {
  __typename?: 'controller_ResourceOwner';
  containerImages: Array<Maybe<Scalars['String']['output']>>;
  initContainerImages: Array<Maybe<Scalars['String']['output']>>;
  objectMeta: Types_ObjectMeta;
  pods: Common_PodInfo;
  typeMeta: Types_TypeMeta;
};

export type Cronjob_CronJob = {
  __typename?: 'cronjob_CronJob';
  active: Scalars['Int']['output'];
  containerImages: Array<Maybe<Scalars['String']['output']>>;
  lastSchedule: Scalars['String']['output'];
  objectMeta: Types_ObjectMeta;
  schedule: Scalars['String']['output'];
  suspend: Scalars['Boolean']['output'];
  typeMeta: Types_TypeMeta;
};

export type Cronjob_CronJobDetail = {
  __typename?: 'cronjob_CronJobDetail';
  active: Scalars['Int']['output'];
  concurrencyPolicy: Scalars['String']['output'];
  containerImages: Array<Maybe<Scalars['String']['output']>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  lastSchedule: Scalars['String']['output'];
  objectMeta: Types_ObjectMeta;
  schedule: Scalars['String']['output'];
  startingDeadlineSeconds: Scalars['BigInt']['output'];
  suspend: Scalars['Boolean']['output'];
  typeMeta: Types_TypeMeta;
};

export type Cronjob_CronJobList = {
  __typename?: 'cronjob_CronJobList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  items: Array<Maybe<Cronjob_CronJob>>;
  listMeta: Types_ListMeta;
  status: Common_ResourceStatus;
};

export type Csrf_Response = {
  __typename?: 'csrf_Response';
  token: Scalars['String']['output'];
};

export type Daemonset_DaemonSet = {
  __typename?: 'daemonset_DaemonSet';
  containerImages: Array<Maybe<Scalars['String']['output']>>;
  initContainerImages: Array<Maybe<Scalars['String']['output']>>;
  objectMeta: Types_ObjectMeta;
  podInfo: Common_PodInfo;
  typeMeta: Types_TypeMeta;
};

export type Daemonset_DaemonSetDetail = {
  __typename?: 'daemonset_DaemonSetDetail';
  containerImages: Array<Maybe<Scalars['String']['output']>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  initContainerImages: Array<Maybe<Scalars['String']['output']>>;
  labelSelector?: Maybe<V1_LabelSelector>;
  objectMeta: Types_ObjectMeta;
  podInfo: Common_PodInfo;
  typeMeta: Types_TypeMeta;
};

export type Daemonset_DaemonSetList = {
  __typename?: 'daemonset_DaemonSetList';
  cumulativeMetrics: Array<Maybe<Api_Metric>>;
  daemonSets: Array<Maybe<Daemonset_DaemonSet>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  listMeta: Types_ListMeta;
  status: Common_ResourceStatus;
};

export type Deployment_AppDeploymentFromFileResponse = {
  __typename?: 'deployment_AppDeploymentFromFileResponse';
  content: Scalars['String']['output'];
  error: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type Deployment_AppDeploymentFromFileSpec_Input = {
  content: Scalars['String']['input'];
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  validate: Scalars['Boolean']['input'];
};

export type Deployment_AppDeploymentSpec = {
  __typename?: 'deployment_AppDeploymentSpec';
  containerCommand: Scalars['String']['output'];
  containerCommandArgs: Scalars['String']['output'];
  containerImage: Scalars['String']['output'];
  cpuRequirement: Scalars['String']['output'];
  description: Scalars['String']['output'];
  imagePullSecret: Scalars['String']['output'];
  isExternal: Scalars['Boolean']['output'];
  labels: Array<Maybe<Deployment_Label>>;
  memoryRequirement: Scalars['String']['output'];
  name: Scalars['String']['output'];
  namespace: Scalars['String']['output'];
  portMappings: Array<Maybe<Deployment_PortMapping>>;
  replicas: Scalars['Int']['output'];
  runAsPrivileged: Scalars['Boolean']['output'];
  variables: Array<Maybe<Deployment_EnvironmentVariable>>;
};

export type Deployment_AppDeploymentSpec_Input = {
  containerCommand: Scalars['String']['input'];
  containerCommandArgs: Scalars['String']['input'];
  containerImage: Scalars['String']['input'];
  cpuRequirement: Resource_Quantity_Input5;
  description: Scalars['String']['input'];
  imagePullSecret: Scalars['String']['input'];
  isExternal: Scalars['Boolean']['input'];
  labels: Array<InputMaybe<Deployment_Label_Input>>;
  memoryRequirement: Resource_Quantity_Input5;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  portMappings: Array<InputMaybe<Deployment_PortMapping_Input>>;
  replicas: Scalars['Int']['input'];
  runAsPrivileged: Scalars['Boolean']['input'];
  variables: Array<InputMaybe<Deployment_EnvironmentVariable_Input>>;
};

export type Deployment_Deployment = {
  __typename?: 'deployment_Deployment';
  containerImages: Array<Maybe<Scalars['String']['output']>>;
  initContainerImages: Array<Maybe<Scalars['String']['output']>>;
  objectMeta: Types_ObjectMeta;
  pods: Common_PodInfo;
  typeMeta: Types_TypeMeta;
};

export type Deployment_DeploymentDetail = {
  __typename?: 'deployment_DeploymentDetail';
  conditions: Array<Maybe<Common_Condition>>;
  containerImages: Array<Maybe<Scalars['String']['output']>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  initContainerImages: Array<Maybe<Scalars['String']['output']>>;
  minReadySeconds: Scalars['Int']['output'];
  objectMeta: Types_ObjectMeta;
  pods: Common_PodInfo;
  revisionHistoryLimit: Scalars['Int']['output'];
  rollingUpdateStrategy?: Maybe<Deployment_RollingUpdateStrategy>;
  selector: Scalars['JSON']['output'];
  statusInfo: Deployment_StatusInfo;
  strategy: Scalars['String']['output'];
  typeMeta: Types_TypeMeta;
};

export type Deployment_DeploymentList = {
  __typename?: 'deployment_DeploymentList';
  cumulativeMetrics: Array<Maybe<Api_Metric>>;
  deployments: Array<Maybe<Deployment_Deployment>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  listMeta: Types_ListMeta;
  status: Common_ResourceStatus;
};

export type Deployment_EnvironmentVariable = {
  __typename?: 'deployment_EnvironmentVariable';
  name: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type Deployment_EnvironmentVariable_Input = {
  name: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type Deployment_Label = {
  __typename?: 'deployment_Label';
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type Deployment_Label_Input = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type Deployment_PortMapping = {
  __typename?: 'deployment_PortMapping';
  port: Scalars['Int']['output'];
  protocol: Scalars['String']['output'];
  targetPort: Scalars['Int']['output'];
};

export type Deployment_PortMapping_Input = {
  port: Scalars['Int']['input'];
  protocol: Scalars['String']['input'];
  targetPort: Scalars['Int']['input'];
};

export type Deployment_Protocols = {
  __typename?: 'deployment_Protocols';
  protocols: Array<Maybe<Scalars['String']['output']>>;
};

export type Deployment_RollingUpdateStrategy = {
  __typename?: 'deployment_RollingUpdateStrategy';
  maxSurge: Scalars['String']['output'];
  maxUnavailable: Scalars['String']['output'];
};

export type Deployment_RolloutSpec = {
  __typename?: 'deployment_RolloutSpec';
  revision: Scalars['String']['output'];
};

export type Deployment_RolloutSpec_Input = {
  revision: Scalars['String']['input'];
};

export type Deployment_StatusInfo = {
  __typename?: 'deployment_StatusInfo';
  available: Scalars['Int']['output'];
  replicas: Scalars['Int']['output'];
  unavailable: Scalars['Int']['output'];
  updated: Scalars['Int']['output'];
};

export type Endpoint_Endpoint = {
  __typename?: 'endpoint_Endpoint';
  host: Scalars['String']['output'];
  nodeName: Scalars['String']['output'];
  objectMeta: Types_ObjectMeta;
  ports: Array<Maybe<V1_EndpointPort>>;
  ready: Scalars['Boolean']['output'];
  typeMeta: Types_TypeMeta;
};

export type Endpoint_EndpointList = {
  __typename?: 'endpoint_EndpointList';
  endpoints: Array<Maybe<Endpoint_Endpoint>>;
  listMeta: Types_ListMeta;
};

export type Handler_TerminalResponse = {
  __typename?: 'handler_TerminalResponse';
  id: Scalars['String']['output'];
};

export type Horizontalpodautoscaler_HorizontalPodAutoscaler = {
  __typename?: 'horizontalpodautoscaler_HorizontalPodAutoscaler';
  currentCPUUtilizationPercentage: Scalars['Int']['output'];
  maxReplicas: Scalars['Int']['output'];
  minReplicas: Scalars['Int']['output'];
  objectMeta: Types_ObjectMeta;
  scaleTargetRef: Horizontalpodautoscaler_ScaleTargetRef;
  targetCPUUtilizationPercentage: Scalars['Int']['output'];
  typeMeta: Types_TypeMeta;
};

export type Horizontalpodautoscaler_HorizontalPodAutoscalerDetail = {
  __typename?: 'horizontalpodautoscaler_HorizontalPodAutoscalerDetail';
  currentCPUUtilizationPercentage: Scalars['Int']['output'];
  currentReplicas: Scalars['Int']['output'];
  desiredReplicas: Scalars['Int']['output'];
  lastScaleTime: Scalars['String']['output'];
  maxReplicas: Scalars['Int']['output'];
  minReplicas: Scalars['Int']['output'];
  objectMeta: Types_ObjectMeta;
  scaleTargetRef: Horizontalpodautoscaler_ScaleTargetRef;
  targetCPUUtilizationPercentage: Scalars['Int']['output'];
  typeMeta: Types_TypeMeta;
};

export type Horizontalpodautoscaler_HorizontalPodAutoscalerList = {
  __typename?: 'horizontalpodautoscaler_HorizontalPodAutoscalerList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  horizontalpodautoscalers: Array<Maybe<Horizontalpodautoscaler_HorizontalPodAutoscaler>>;
  listMeta: Types_ListMeta;
};

export type Horizontalpodautoscaler_ScaleTargetRef = {
  __typename?: 'horizontalpodautoscaler_ScaleTargetRef';
  kind: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type Inf_Dec = {
  __typename?: 'inf_Dec';
  scale: Scalars['Int']['output'];
  unscaled: Big_Int;
};

export type Inf_Dec_Input = {
  scale: Scalars['Int']['input'];
  unscaled: Big_Int_Input;
};

export type Ingress_Ingress = {
  __typename?: 'ingress_Ingress';
  endpoints: Array<Maybe<Common_Endpoint>>;
  hosts: Array<Maybe<Scalars['String']['output']>>;
  objectMeta: Types_ObjectMeta;
  typeMeta: Types_TypeMeta;
};

export type Ingress_IngressDetail = {
  __typename?: 'ingress_IngressDetail';
  endpoints: Array<Maybe<Common_Endpoint>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  hosts: Array<Maybe<Scalars['String']['output']>>;
  objectMeta: Types_ObjectMeta;
  spec: V1_IngressSpec;
  status: V1_IngressStatus;
  typeMeta: Types_TypeMeta;
};

export type Ingress_IngressList = {
  __typename?: 'ingress_IngressList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  items: Array<Maybe<Ingress_Ingress>>;
  listMeta: Types_ListMeta;
};

export type Ingressclass_IngressClass = {
  __typename?: 'ingressclass_IngressClass';
  controller: Scalars['String']['output'];
  objectMeta: Types_ObjectMeta;
  typeMeta: Types_TypeMeta;
};

export type Ingressclass_IngressClassList = {
  __typename?: 'ingressclass_IngressClassList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  items: Array<Maybe<Ingressclass_IngressClass>>;
  listMeta: Types_ListMeta;
};

export type Intstr_IntOrString = {
  __typename?: 'intstr_IntOrString';
  IntVal: Scalars['Int']['output'];
  StrVal: Scalars['String']['output'];
  Type: Scalars['BigInt']['output'];
};

export type Job_Job = {
  __typename?: 'job_Job';
  containerImages: Array<Maybe<Scalars['String']['output']>>;
  initContainerImages: Array<Maybe<Scalars['String']['output']>>;
  jobStatus: Job_JobStatus;
  objectMeta: Types_ObjectMeta;
  parallelism: Scalars['Int']['output'];
  podInfo: Common_PodInfo;
  typeMeta: Types_TypeMeta;
};

export type Job_JobDetail = {
  __typename?: 'job_JobDetail';
  completions: Scalars['Int']['output'];
  containerImages: Array<Maybe<Scalars['String']['output']>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  initContainerImages: Array<Maybe<Scalars['String']['output']>>;
  jobStatus: Job_JobStatus;
  objectMeta: Types_ObjectMeta;
  parallelism: Scalars['Int']['output'];
  podInfo: Common_PodInfo;
  typeMeta: Types_TypeMeta;
};

export type Job_JobList = {
  __typename?: 'job_JobList';
  cumulativeMetrics: Array<Maybe<Api_Metric>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  jobs: Array<Maybe<Job_Job>>;
  listMeta: Types_ListMeta;
  status: Common_ResourceStatus;
};

export type Job_JobStatus = {
  __typename?: 'job_JobStatus';
  conditions: Array<Maybe<Common_Condition>>;
  message: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type Limitrange_LimitRangeItem = {
  __typename?: 'limitrange_LimitRangeItem';
  default?: Maybe<Scalars['String']['output']>;
  defaultRequest?: Maybe<Scalars['String']['output']>;
  max?: Maybe<Scalars['String']['output']>;
  maxLimitRequestRatio?: Maybe<Scalars['String']['output']>;
  min?: Maybe<Scalars['String']['output']>;
  resourceName?: Maybe<Scalars['String']['output']>;
  resourceType?: Maybe<Scalars['String']['output']>;
};

export type Logs_LogDetails = {
  __typename?: 'logs_LogDetails';
  info: Logs_LogInfo;
  logs: Array<Maybe<Logs_LogLine>>;
  selection: Logs_Selection;
};

export type Logs_LogInfo = {
  __typename?: 'logs_LogInfo';
  containerName: Scalars['String']['output'];
  fromDate: Scalars['String']['output'];
  initContainerName: Scalars['String']['output'];
  podName: Scalars['String']['output'];
  toDate: Scalars['String']['output'];
  truncated: Scalars['Boolean']['output'];
};

export type Logs_LogLine = {
  __typename?: 'logs_LogLine';
  content: Scalars['String']['output'];
  timestamp: Scalars['String']['output'];
};

export type Logs_LogLineId = {
  __typename?: 'logs_LogLineId';
  lineNum: Scalars['Int']['output'];
  timestamp: Scalars['String']['output'];
};

export type Logs_Selection = {
  __typename?: 'logs_Selection';
  logFilePosition: Scalars['String']['output'];
  offsetFrom: Scalars['Int']['output'];
  offsetTo: Scalars['Int']['output'];
  referencePoint: Logs_LogLineId;
};

export type Namespace_Namespace = {
  __typename?: 'namespace_Namespace';
  objectMeta: Types_ObjectMeta;
  phase: Scalars['String']['output'];
  typeMeta: Types_TypeMeta;
};

export type Namespace_NamespaceDetail = {
  __typename?: 'namespace_NamespaceDetail';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  objectMeta: Types_ObjectMeta;
  phase: Scalars['String']['output'];
  resourceLimits: Array<Maybe<Limitrange_LimitRangeItem>>;
  resourceQuotaList: Resourcequota_ResourceQuotaDetailList;
  typeMeta: Types_TypeMeta;
};

export type Namespace_NamespaceList = {
  __typename?: 'namespace_NamespaceList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  listMeta: Types_ListMeta;
  namespaces: Array<Maybe<Namespace_Namespace>>;
};

export type Namespace_NamespaceSpec = {
  __typename?: 'namespace_NamespaceSpec';
  name: Scalars['String']['output'];
};

export type Namespace_NamespaceSpec_Input = {
  name: Scalars['String']['input'];
};

export type Networkpolicy_NetworkPolicy = {
  __typename?: 'networkpolicy_NetworkPolicy';
  objectMeta: Types_ObjectMeta;
  typeMeta: Types_TypeMeta;
};

export type Networkpolicy_NetworkPolicyDetail = {
  __typename?: 'networkpolicy_NetworkPolicyDetail';
  egress?: Maybe<Array<Maybe<V1_NetworkPolicyEgressRule>>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  ingress?: Maybe<Array<Maybe<V1_NetworkPolicyIngressRule>>>;
  objectMeta: Types_ObjectMeta;
  podSelector: V1_LabelSelector;
  policyTypes?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  typeMeta: Types_TypeMeta;
};

export type Networkpolicy_NetworkPolicyList = {
  __typename?: 'networkpolicy_NetworkPolicyList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  items: Array<Maybe<Networkpolicy_NetworkPolicy>>;
  listMeta: Types_ListMeta;
};

export type Node_Node = {
  __typename?: 'node_Node';
  allocatedResources: Node_NodeAllocatedResources;
  objectMeta: Types_ObjectMeta;
  ready: Scalars['String']['output'];
  typeMeta: Types_TypeMeta;
};

export type Node_NodeAllocatedResources = {
  __typename?: 'node_NodeAllocatedResources';
  allocatedPods: Scalars['Int']['output'];
  cpuCapacity: Scalars['BigInt']['output'];
  cpuLimits: Scalars['BigInt']['output'];
  cpuLimitsFraction: Scalars['Float']['output'];
  cpuRequests: Scalars['BigInt']['output'];
  cpuRequestsFraction: Scalars['Float']['output'];
  memoryCapacity: Scalars['BigInt']['output'];
  memoryLimits: Scalars['BigInt']['output'];
  memoryLimitsFraction: Scalars['Float']['output'];
  memoryRequests: Scalars['BigInt']['output'];
  memoryRequestsFraction: Scalars['Float']['output'];
  podCapacity: Scalars['BigInt']['output'];
  podFraction: Scalars['Float']['output'];
};

export type Node_NodeDetail = {
  __typename?: 'node_NodeDetail';
  addresses?: Maybe<Array<Maybe<V1_NodeAddress>>>;
  allocatedResources: Node_NodeAllocatedResources;
  conditions: Array<Maybe<Common_Condition>>;
  containerImages: Array<Maybe<Scalars['String']['output']>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  eventList: Common_EventList;
  metrics: Array<Maybe<Api_Metric>>;
  nodeInfo: V1_NodeSystemInfo;
  objectMeta: Types_ObjectMeta;
  phase: Scalars['String']['output'];
  podCIDR: Scalars['String']['output'];
  podList: Pod_PodList;
  providerID: Scalars['String']['output'];
  ready: Scalars['String']['output'];
  taints?: Maybe<Array<Maybe<V1_Taint>>>;
  typeMeta: Types_TypeMeta;
  unschedulable: Scalars['Boolean']['output'];
};

export type Node_NodeDrainSpec_Input = {
  deleteEmptyDirData?: InputMaybe<Scalars['Boolean']['input']>;
  force?: InputMaybe<Scalars['Boolean']['input']>;
  gracePeriodSeconds?: InputMaybe<Scalars['Int']['input']>;
  ignoreAllDaemonSets?: InputMaybe<Scalars['Boolean']['input']>;
  timeout?: InputMaybe<Scalars['BigInt']['input']>;
};

export type Node_NodeList = {
  __typename?: 'node_NodeList';
  cumulativeMetrics: Array<Maybe<Api_Metric>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  listMeta: Types_ListMeta;
  nodes: Array<Maybe<Node_Node>>;
};

export type Persistentvolume_PersistentVolume = {
  __typename?: 'persistentvolume_PersistentVolume';
  accessModes: Array<Maybe<Scalars['String']['output']>>;
  capacity: Scalars['ObjMap']['output'];
  claim: Scalars['String']['output'];
  mountOptions: Array<Maybe<Scalars['String']['output']>>;
  objectMeta: Types_ObjectMeta;
  reason: Scalars['String']['output'];
  reclaimPolicy: Scalars['String']['output'];
  status: Scalars['String']['output'];
  storageClass: Scalars['String']['output'];
  typeMeta: Types_TypeMeta;
};

export type Persistentvolume_PersistentVolumeDetail = {
  __typename?: 'persistentvolume_PersistentVolumeDetail';
  accessModes: Array<Maybe<Scalars['String']['output']>>;
  capacity: Scalars['ObjMap']['output'];
  claim: Scalars['String']['output'];
  message: Scalars['String']['output'];
  mountOptions: Array<Maybe<Scalars['String']['output']>>;
  objectMeta: Types_ObjectMeta;
  persistentVolumeSource: V1_PersistentVolumeSource;
  reason: Scalars['String']['output'];
  reclaimPolicy: Scalars['String']['output'];
  status: Scalars['String']['output'];
  storageClass: Scalars['String']['output'];
  typeMeta: Types_TypeMeta;
};

export type Persistentvolume_PersistentVolumeList = {
  __typename?: 'persistentvolume_PersistentVolumeList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  items: Array<Maybe<Persistentvolume_PersistentVolume>>;
  listMeta: Types_ListMeta;
};

export type Persistentvolumeclaim_PersistentVolumeClaim = {
  __typename?: 'persistentvolumeclaim_PersistentVolumeClaim';
  accessModes: Array<Maybe<Scalars['String']['output']>>;
  capacity: Scalars['ObjMap']['output'];
  objectMeta: Types_ObjectMeta;
  status: Scalars['String']['output'];
  storageClass: Scalars['String']['output'];
  typeMeta: Types_TypeMeta;
  volume: Scalars['String']['output'];
};

export type Persistentvolumeclaim_PersistentVolumeClaimDetail = {
  __typename?: 'persistentvolumeclaim_PersistentVolumeClaimDetail';
  accessModes: Array<Maybe<Scalars['String']['output']>>;
  capacity: Scalars['ObjMap']['output'];
  objectMeta: Types_ObjectMeta;
  status: Scalars['String']['output'];
  storageClass: Scalars['String']['output'];
  typeMeta: Types_TypeMeta;
  volume: Scalars['String']['output'];
};

export type Persistentvolumeclaim_PersistentVolumeClaimList = {
  __typename?: 'persistentvolumeclaim_PersistentVolumeClaimList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  items: Array<Maybe<Persistentvolumeclaim_PersistentVolumeClaim>>;
  listMeta: Types_ListMeta;
};

export type Pod_Container = {
  __typename?: 'pod_Container';
  args: Array<Maybe<Scalars['String']['output']>>;
  commands: Array<Maybe<Scalars['String']['output']>>;
  env: Array<Maybe<Pod_EnvVar>>;
  image: Scalars['String']['output'];
  livenessProbe: V1_Probe;
  name: Scalars['String']['output'];
  readinessProbe: V1_Probe;
  resources?: Maybe<V1_ResourceRequirements>;
  securityContext: V1_SecurityContext;
  startupProbe: V1_Probe;
  state: ContainerState;
  status: V1_ContainerStatus;
  volumeMounts: Array<Maybe<Pod_VolumeMount>>;
};

export type Pod_ContainerStatus = {
  __typename?: 'pod_ContainerStatus';
  name: Scalars['String']['output'];
  ready: Scalars['Boolean']['output'];
  state: ContainerState;
};

export type Pod_EnvVar = {
  __typename?: 'pod_EnvVar';
  name: Scalars['String']['output'];
  value: Scalars['String']['output'];
  valueFrom: V1_EnvVarSource;
};

export type Pod_Pod = {
  __typename?: 'pod_Pod';
  allocatedResources: Pod_PodAllocatedResources;
  containerImages: Array<Maybe<Scalars['String']['output']>>;
  containerStatuses: Array<Maybe<Pod_ContainerStatus>>;
  metrics: Pod_PodMetrics;
  nodeName: Scalars['String']['output'];
  objectMeta: Types_ObjectMeta;
  restartCount: Scalars['Int']['output'];
  status: Scalars['String']['output'];
  typeMeta: Types_TypeMeta;
  warnings: Array<Maybe<Common_Event>>;
};

export type Pod_PodAllocatedResources = {
  __typename?: 'pod_PodAllocatedResources';
  cpuLimits: Scalars['BigInt']['output'];
  cpuRequests: Scalars['BigInt']['output'];
  memoryLimits: Scalars['BigInt']['output'];
  memoryRequests: Scalars['BigInt']['output'];
};

export type Pod_PodDetail = {
  __typename?: 'pod_PodDetail';
  conditions: Array<Maybe<Common_Condition>>;
  containers: Array<Maybe<Pod_Container>>;
  controller?: Maybe<Controller_ResourceOwner>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  eventList: Common_EventList;
  imagePullSecrets?: Maybe<Array<Maybe<V1_LocalObjectReference>>>;
  initContainers: Array<Maybe<Pod_Container>>;
  metrics: Array<Maybe<Api_Metric>>;
  nodeName: Scalars['String']['output'];
  objectMeta: Types_ObjectMeta;
  persistentVolumeClaimList: Persistentvolumeclaim_PersistentVolumeClaimList;
  podIP: Scalars['String']['output'];
  podPhase: Scalars['String']['output'];
  qosClass: Scalars['String']['output'];
  restartCount: Scalars['Int']['output'];
  securityContext: V1_PodSecurityContext;
  serviceAccountName: Scalars['String']['output'];
  typeMeta: Types_TypeMeta;
};

export type Pod_PodList = {
  __typename?: 'pod_PodList';
  cumulativeMetrics: Array<Maybe<Api_Metric>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  listMeta: Types_ListMeta;
  pods: Array<Maybe<Pod_Pod>>;
  status: Common_ResourceStatus;
};

export type Pod_PodMetrics = {
  __typename?: 'pod_PodMetrics';
  cpuUsage: Scalars['Int']['output'];
  cpuUsageHistory: Array<Maybe<Api_MetricPoint>>;
  memoryUsage: Scalars['Int']['output'];
  memoryUsageHistory: Array<Maybe<Api_MetricPoint>>;
};

export type Pod_VolumeMount = {
  __typename?: 'pod_VolumeMount';
  mountPath: Scalars['String']['output'];
  name: Scalars['String']['output'];
  readOnly: Scalars['Boolean']['output'];
  subPath: Scalars['String']['output'];
  volume: V1_Volume;
};

export type Poddisruptionbudget_PodDisruptionBudget = {
  __typename?: 'poddisruptionbudget_PodDisruptionBudget';
  currentHealthy: Scalars['Int']['output'];
  desiredHealthy: Scalars['Int']['output'];
  disruptionsAllowed: Scalars['Int']['output'];
  expectedPods: Scalars['Int']['output'];
  labelSelector?: Maybe<V1_LabelSelector>;
  maxUnavailable: Intstr_IntOrString;
  minAvailable: Intstr_IntOrString;
  objectMeta: Types_ObjectMeta;
  typeMeta: Types_TypeMeta;
  unhealthyPodEvictionPolicy: Scalars['String']['output'];
};

export type Poddisruptionbudget_PodDisruptionBudgetDetail = {
  __typename?: 'poddisruptionbudget_PodDisruptionBudgetDetail';
  currentHealthy: Scalars['Int']['output'];
  desiredHealthy: Scalars['Int']['output'];
  disruptedPods: Scalars['JSON']['output'];
  disruptionsAllowed: Scalars['Int']['output'];
  expectedPods: Scalars['Int']['output'];
  labelSelector?: Maybe<V1_LabelSelector>;
  maxUnavailable: Intstr_IntOrString;
  minAvailable: Intstr_IntOrString;
  objectMeta: Types_ObjectMeta;
  typeMeta: Types_TypeMeta;
  unhealthyPodEvictionPolicy: Scalars['String']['output'];
};

export type Poddisruptionbudget_PodDisruptionBudgetList = {
  __typename?: 'poddisruptionbudget_PodDisruptionBudgetList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  items: Array<Maybe<Poddisruptionbudget_PodDisruptionBudget>>;
  listMeta: Types_ListMeta;
};

export type Query_HandleGetNamespaceDetail_ResourceQuotaList_Items_Items_StatusList = {
  __typename?: 'query_handleGetNamespaceDetail_resourceQuotaList_items_items_statusList';
  additionalProperties?: Maybe<Array<Maybe<Resourcequota_ResourceStatus_Entry>>>;
};

export type Query_HandleGetPersistentVolumeClaimDetail_Capacity = {
  __typename?: 'query_handleGetPersistentVolumeClaimDetail_capacity';
  additionalProperties?: Maybe<Array<Maybe<Resource_Quantity4_Entry>>>;
};

export type Query_HandleGetPersistentVolumeClaimList_Items_Items_Capacity = {
  __typename?: 'query_handleGetPersistentVolumeClaimList_items_items_capacity';
  additionalProperties?: Maybe<Array<Maybe<Resource_Quantity3_Entry>>>;
};

export type Query_HandleGetPersistentVolumeDetail_Capacity = {
  __typename?: 'query_handleGetPersistentVolumeDetail_capacity';
  additionalProperties?: Maybe<Array<Maybe<Resource_Quantity2_Entry>>>;
};

export type Query_HandleGetPersistentVolumeList_Items_Items_Capacity = {
  __typename?: 'query_handleGetPersistentVolumeList_items_items_capacity';
  additionalProperties?: Maybe<Array<Maybe<Resource_Quantity_Entry>>>;
};

/** Limits describes the maximum amount of compute resources allowed. More info: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/ */
export type Query_HandleGetPodDetail_Containers_Items_Resources_Limits = {
  __typename?: 'query_handleGetPodDetail_containers_items_resources_limits';
  additionalProperties?: Maybe<Array<Maybe<Resource_Quantity6_Entry>>>;
};

/** Requests describes the minimum amount of compute resources required. If Requests is omitted for a container, it defaults to Limits if that is explicitly specified, otherwise to an implementation-defined value. Requests cannot exceed Limits. More info: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/ */
export type Query_HandleGetPodDetail_Containers_Items_Resources_Requests = {
  __typename?: 'query_handleGetPodDetail_containers_items_resources_requests';
  additionalProperties?: Maybe<Array<Maybe<Resource_Quantity7_Entry>>>;
};

/** AllocatedResources represents the compute resources allocated for this container by the node. Kubelet sets this value to Container.Resources.Requests upon successful pod admission and after successfully admitting desired pod resize. */
export type Query_HandleGetPodDetail_Containers_Items_Status_AllocatedResources = {
  __typename?: 'query_handleGetPodDetail_containers_items_status_allocatedResources';
  additionalProperties?: Maybe<Array<Maybe<Resource_Quantity8_Entry>>>;
};

/** Limits describes the maximum amount of compute resources allowed. More info: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/ */
export type Query_HandleGetPodDetail_Containers_Items_VolumeMounts_Items_Volume_Ephemeral_VolumeClaimTemplate_Spec_Resources_Limits = {
  __typename?: 'query_handleGetPodDetail_containers_items_volumeMounts_items_volume_ephemeral_volumeClaimTemplate_spec_resources_limits';
  additionalProperties?: Maybe<Array<Maybe<Resource_Quantity9_Entry>>>;
};

/** Requests describes the minimum amount of compute resources required. If Requests is omitted for a container, it defaults to Limits if that is explicitly specified, otherwise to an implementation-defined value. Requests cannot exceed Limits. More info: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/ */
export type Query_HandleGetPodDetail_Containers_Items_VolumeMounts_Items_Volume_Ephemeral_VolumeClaimTemplate_Spec_Resources_Requests = {
  __typename?: 'query_handleGetPodDetail_containers_items_volumeMounts_items_volume_ephemeral_volumeClaimTemplate_spec_resources_requests';
  additionalProperties?: Maybe<Array<Maybe<Resource_Quantity10_Entry>>>;
};

export type Replicaset_ReplicaSet = {
  __typename?: 'replicaset_ReplicaSet';
  containerImages: Array<Maybe<Scalars['String']['output']>>;
  initContainerImages: Array<Maybe<Scalars['String']['output']>>;
  objectMeta: Types_ObjectMeta;
  podInfo: Common_PodInfo;
  typeMeta: Types_TypeMeta;
};

export type Replicaset_ReplicaSetDetail = {
  __typename?: 'replicaset_ReplicaSetDetail';
  containerImages: Array<Maybe<Scalars['String']['output']>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  horizontalPodAutoscalerList: Horizontalpodautoscaler_HorizontalPodAutoscalerList;
  initContainerImages: Array<Maybe<Scalars['String']['output']>>;
  objectMeta: Types_ObjectMeta;
  podInfo: Common_PodInfo;
  selector: V1_LabelSelector;
  typeMeta: Types_TypeMeta;
};

export type Replicaset_ReplicaSetList = {
  __typename?: 'replicaset_ReplicaSetList';
  cumulativeMetrics: Array<Maybe<Api_Metric>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  listMeta: Types_ListMeta;
  replicaSets: Array<Maybe<Replicaset_ReplicaSet>>;
  status: Common_ResourceStatus;
};

export type Replicationcontroller_ReplicationController = {
  __typename?: 'replicationcontroller_ReplicationController';
  containerImages: Array<Maybe<Scalars['String']['output']>>;
  initContainerImages: Array<Maybe<Scalars['String']['output']>>;
  objectMeta: Types_ObjectMeta;
  podInfo: Common_PodInfo;
  typeMeta: Types_TypeMeta;
};

export type Replicationcontroller_ReplicationControllerDetail = {
  __typename?: 'replicationcontroller_ReplicationControllerDetail';
  containerImages: Array<Maybe<Scalars['String']['output']>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  initContainerImages: Array<Maybe<Scalars['String']['output']>>;
  labelSelector: Scalars['JSON']['output'];
  objectMeta: Types_ObjectMeta;
  podInfo: Common_PodInfo;
  typeMeta: Types_TypeMeta;
};

export type Replicationcontroller_ReplicationControllerList = {
  __typename?: 'replicationcontroller_ReplicationControllerList';
  cumulativeMetrics: Array<Maybe<Api_Metric>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  listMeta: Types_ListMeta;
  replicationControllers: Array<Maybe<Replicationcontroller_ReplicationController>>;
  status: Common_ResourceStatus;
};

export type Replicationcontroller_ReplicationControllerSpec_Input = {
  replicas: Scalars['Int']['input'];
};

export type Resource_Quantity = {
  __typename?: 'resource_Quantity';
  Format: Scalars['String']['output'];
  d: Resource_InfDecAmount;
  i: Resource_Int64Amount;
  s: Scalars['String']['output'];
};

export type Resource_Quantity2 = {
  __typename?: 'resource_Quantity2';
  Format: Scalars['String']['output'];
  d: Resource_InfDecAmount;
  i: Resource_Int64Amount;
  s: Scalars['String']['output'];
};

export type Resource_Quantity2_Entry = {
  __typename?: 'resource_Quantity2_entry';
  key: Scalars['ID']['output'];
  value?: Maybe<Resource_Quantity2>;
};

export type Resource_Quantity3 = {
  __typename?: 'resource_Quantity3';
  Format: Scalars['String']['output'];
  d: Resource_InfDecAmount;
  i: Resource_Int64Amount;
  s: Scalars['String']['output'];
};

export type Resource_Quantity3_Entry = {
  __typename?: 'resource_Quantity3_entry';
  key: Scalars['ID']['output'];
  value?: Maybe<Resource_Quantity3>;
};

export type Resource_Quantity4 = {
  __typename?: 'resource_Quantity4';
  Format: Scalars['String']['output'];
  d: Resource_InfDecAmount;
  i: Resource_Int64Amount;
  s: Scalars['String']['output'];
};

export type Resource_Quantity4_Entry = {
  __typename?: 'resource_Quantity4_entry';
  key: Scalars['ID']['output'];
  value?: Maybe<Resource_Quantity4>;
};

export type Resource_Quantity5 = {
  __typename?: 'resource_Quantity5';
  Format: Scalars['String']['output'];
  d: Resource_InfDecAmount;
  i: Resource_Int64Amount;
  s: Scalars['String']['output'];
};

export type Resource_Quantity6 = {
  __typename?: 'resource_Quantity6';
  Format: Scalars['String']['output'];
  d: Resource_InfDecAmount;
  i: Resource_Int64Amount;
  s: Scalars['String']['output'];
};

export type Resource_Quantity6_Entry = {
  __typename?: 'resource_Quantity6_entry';
  key: Scalars['ID']['output'];
  value?: Maybe<Resource_Quantity6>;
};

export type Resource_Quantity7 = {
  __typename?: 'resource_Quantity7';
  Format: Scalars['String']['output'];
  d: Resource_InfDecAmount;
  i: Resource_Int64Amount;
  s: Scalars['String']['output'];
};

export type Resource_Quantity7_Entry = {
  __typename?: 'resource_Quantity7_entry';
  key: Scalars['ID']['output'];
  value?: Maybe<Resource_Quantity7>;
};

export type Resource_Quantity8 = {
  __typename?: 'resource_Quantity8';
  Format: Scalars['String']['output'];
  d: Resource_InfDecAmount;
  i: Resource_Int64Amount;
  s: Scalars['String']['output'];
};

export type Resource_Quantity8_Entry = {
  __typename?: 'resource_Quantity8_entry';
  key: Scalars['ID']['output'];
  value?: Maybe<Resource_Quantity8>;
};

export type Resource_Quantity9 = {
  __typename?: 'resource_Quantity9';
  Format: Scalars['String']['output'];
  d: Resource_InfDecAmount;
  i: Resource_Int64Amount;
  s: Scalars['String']['output'];
};

export type Resource_Quantity9_Entry = {
  __typename?: 'resource_Quantity9_entry';
  key: Scalars['ID']['output'];
  value?: Maybe<Resource_Quantity9>;
};

export type Resource_Quantity10 = {
  __typename?: 'resource_Quantity10';
  Format: Scalars['String']['output'];
  d: Resource_InfDecAmount;
  i: Resource_Int64Amount;
  s: Scalars['String']['output'];
};

export type Resource_Quantity10_Entry = {
  __typename?: 'resource_Quantity10_entry';
  key: Scalars['ID']['output'];
  value?: Maybe<Resource_Quantity10>;
};

export type Resource_Quantity_Input5 = {
  Format: Scalars['String']['input'];
  d: Resource_InfDecAmount_Input;
  i: Resource_Int64Amount_Input;
  s: Scalars['String']['input'];
};

export type Resource_Quantity_Entry = {
  __typename?: 'resource_Quantity_entry';
  key: Scalars['ID']['output'];
  value?: Maybe<Resource_Quantity>;
};

export type Resource_InfDecAmount = {
  __typename?: 'resource_infDecAmount';
  Dec: Inf_Dec;
};

export type Resource_InfDecAmount_Input = {
  Dec: Inf_Dec_Input;
};

export type Resource_Int64Amount = {
  __typename?: 'resource_int64Amount';
  scale: Scalars['Int']['output'];
  value: Scalars['BigInt']['output'];
};

export type Resource_Int64Amount_Input = {
  scale: Scalars['Int']['input'];
  value: Scalars['BigInt']['input'];
};

export type Resourcequota_ResourceQuotaDetail = {
  __typename?: 'resourcequota_ResourceQuotaDetail';
  objectMeta: Types_ObjectMeta;
  scopes?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  statusList: Scalars['ObjMap']['output'];
  typeMeta: Types_TypeMeta;
};

export type Resourcequota_ResourceQuotaDetailList = {
  __typename?: 'resourcequota_ResourceQuotaDetailList';
  items: Array<Maybe<Resourcequota_ResourceQuotaDetail>>;
  listMeta: Types_ListMeta;
};

export type Resourcequota_ResourceStatus = {
  __typename?: 'resourcequota_ResourceStatus';
  hard?: Maybe<Scalars['String']['output']>;
  used?: Maybe<Scalars['String']['output']>;
};

export type Resourcequota_ResourceStatus_Entry = {
  __typename?: 'resourcequota_ResourceStatus_entry';
  key: Scalars['ID']['output'];
  value?: Maybe<Resourcequota_ResourceStatus>;
};

export type Role_Role = {
  __typename?: 'role_Role';
  objectMeta: Types_ObjectMeta;
  typeMeta: Types_TypeMeta;
};

export type Role_RoleDetail = {
  __typename?: 'role_RoleDetail';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  objectMeta: Types_ObjectMeta;
  rules: Array<Maybe<V1_PolicyRule>>;
  typeMeta: Types_TypeMeta;
};

export type Role_RoleList = {
  __typename?: 'role_RoleList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  items: Array<Maybe<Role_Role>>;
  listMeta: Types_ListMeta;
};

export type Rolebinding_RoleBinding = {
  __typename?: 'rolebinding_RoleBinding';
  objectMeta: Types_ObjectMeta;
  typeMeta: Types_TypeMeta;
};

export type Rolebinding_RoleBindingDetail = {
  __typename?: 'rolebinding_RoleBindingDetail';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  objectMeta: Types_ObjectMeta;
  roleRef: V1_RoleRef;
  subjects?: Maybe<Array<Maybe<V1_Subject>>>;
  typeMeta: Types_TypeMeta;
};

export type Rolebinding_RoleBindingList = {
  __typename?: 'rolebinding_RoleBindingList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  items: Array<Maybe<Rolebinding_RoleBinding>>;
  listMeta: Types_ListMeta;
};

export type Scaling_ReplicaCounts = {
  __typename?: 'scaling_ReplicaCounts';
  actualReplicas: Scalars['Int']['output'];
  desiredReplicas: Scalars['Int']['output'];
};

export type Secret_ImagePullSecretSpec_Input = {
  data: Scalars['String']['input'];
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};

export type Secret_Secret = {
  __typename?: 'secret_Secret';
  objectMeta: Types_ObjectMeta;
  type: Scalars['String']['output'];
  typeMeta: Types_TypeMeta;
};

export type Secret_SecretDetail = {
  __typename?: 'secret_SecretDetail';
  data: Scalars['JSON']['output'];
  objectMeta: Types_ObjectMeta;
  type: Scalars['String']['output'];
  typeMeta: Types_TypeMeta;
};

export type Secret_SecretList = {
  __typename?: 'secret_SecretList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  listMeta: Types_ListMeta;
  secrets: Array<Maybe<Secret_Secret>>;
};

export type Service_Service = {
  __typename?: 'service_Service';
  clusterIP: Scalars['String']['output'];
  externalEndpoints: Array<Maybe<Common_Endpoint>>;
  internalEndpoint: Common_Endpoint;
  objectMeta: Types_ObjectMeta;
  selector: Scalars['JSON']['output'];
  type: Scalars['String']['output'];
  typeMeta: Types_TypeMeta;
};

export type Service_ServiceDetail = {
  __typename?: 'service_ServiceDetail';
  clusterIP: Scalars['String']['output'];
  endpointList: Endpoint_EndpointList;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  externalEndpoints: Array<Maybe<Common_Endpoint>>;
  internalEndpoint: Common_Endpoint;
  objectMeta: Types_ObjectMeta;
  selector: Scalars['JSON']['output'];
  sessionAffinity: Scalars['String']['output'];
  type: Scalars['String']['output'];
  typeMeta: Types_TypeMeta;
};

export type Service_ServiceList = {
  __typename?: 'service_ServiceList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  listMeta: Types_ListMeta;
  services: Array<Maybe<Service_Service>>;
};

export type Serviceaccount_ServiceAccount = {
  __typename?: 'serviceaccount_ServiceAccount';
  objectMeta: Types_ObjectMeta;
  typeMeta: Types_TypeMeta;
};

export type Serviceaccount_ServiceAccountDetail = {
  __typename?: 'serviceaccount_ServiceAccountDetail';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  objectMeta: Types_ObjectMeta;
  typeMeta: Types_TypeMeta;
};

export type Serviceaccount_ServiceAccountList = {
  __typename?: 'serviceaccount_ServiceAccountList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  items: Array<Maybe<Serviceaccount_ServiceAccount>>;
  listMeta: Types_ListMeta;
};

export type Statefulset_StatefulSet = {
  __typename?: 'statefulset_StatefulSet';
  containerImages: Array<Maybe<Scalars['String']['output']>>;
  initContainerImages: Array<Maybe<Scalars['String']['output']>>;
  objectMeta: Types_ObjectMeta;
  podInfo: Common_PodInfo;
  typeMeta: Types_TypeMeta;
};

export type Statefulset_StatefulSetDetail = {
  __typename?: 'statefulset_StatefulSetDetail';
  containerImages: Array<Maybe<Scalars['String']['output']>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  initContainerImages: Array<Maybe<Scalars['String']['output']>>;
  objectMeta: Types_ObjectMeta;
  podInfo: Common_PodInfo;
  typeMeta: Types_TypeMeta;
};

export type Statefulset_StatefulSetList = {
  __typename?: 'statefulset_StatefulSetList';
  cumulativeMetrics: Array<Maybe<Api_Metric>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  listMeta: Types_ListMeta;
  statefulSets: Array<Maybe<Statefulset_StatefulSet>>;
  status: Common_ResourceStatus;
};

export type Storageclass_StorageClass = {
  __typename?: 'storageclass_StorageClass';
  objectMeta: Types_ObjectMeta;
  parameters: Scalars['JSON']['output'];
  provisioner: Scalars['String']['output'];
  typeMeta: Types_TypeMeta;
};

export type Storageclass_StorageClassList = {
  __typename?: 'storageclass_StorageClassList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  items: Array<Maybe<Storageclass_StorageClass>>;
  listMeta: Types_ListMeta;
};

export type Types_CustomResourceDefinition = {
  __typename?: 'types_CustomResourceDefinition';
  established: Scalars['String']['output'];
  group: Scalars['String']['output'];
  names: Types_CustomResourceDefinitionNames;
  objectMeta: Types_ObjectMeta;
  scope: Scalars['String']['output'];
  typeMeta: Types_TypeMeta;
  version?: Maybe<Scalars['String']['output']>;
};

export type Types_CustomResourceDefinitionDetail = {
  __typename?: 'types_CustomResourceDefinitionDetail';
  conditions: Array<Maybe<Common_Condition>>;
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  established: Scalars['String']['output'];
  group: Scalars['String']['output'];
  names: Types_CustomResourceDefinitionNames;
  objectMeta: Types_ObjectMeta;
  objects: Types_CustomResourceObjectList;
  scope: Scalars['String']['output'];
  subresources: Array<Maybe<Scalars['String']['output']>>;
  typeMeta: Types_TypeMeta;
  version?: Maybe<Scalars['String']['output']>;
  versions?: Maybe<Array<Maybe<Types_CustomResourceDefinitionVersion>>>;
};

export type Types_CustomResourceDefinitionList = {
  __typename?: 'types_CustomResourceDefinitionList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  items: Array<Maybe<Types_CustomResourceDefinition>>;
  listMeta: Types_ListMeta;
};

export type Types_CustomResourceDefinitionNames = {
  __typename?: 'types_CustomResourceDefinitionNames';
  categories?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  kind: Scalars['String']['output'];
  listKind?: Maybe<Scalars['String']['output']>;
  plural: Scalars['String']['output'];
  shortNames?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  singular?: Maybe<Scalars['String']['output']>;
};

export type Types_CustomResourceDefinitionVersion = {
  __typename?: 'types_CustomResourceDefinitionVersion';
  name: Scalars['String']['output'];
  served: Scalars['Boolean']['output'];
  storage: Scalars['Boolean']['output'];
};

export type Types_CustomResourceObject = {
  __typename?: 'types_CustomResourceObject';
  objectMeta: Types_ObjectMeta;
  typeMeta: Types_TypeMeta;
};

export type Types_CustomResourceObjectDetail = {
  __typename?: 'types_CustomResourceObjectDetail';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  objectMeta: Types_ObjectMeta;
  typeMeta: Types_TypeMeta;
};

export type Types_CustomResourceObjectList = {
  __typename?: 'types_CustomResourceObjectList';
  errors: Array<Maybe<Scalars['JSON']['output']>>;
  items: Array<Maybe<Types_CustomResourceObject>>;
  listMeta: Types_ListMeta;
  typeMeta: V1_TypeMeta;
};

export type Types_ListMeta = {
  __typename?: 'types_ListMeta';
  totalItems: Scalars['Int']['output'];
};

export type Types_ObjectMeta = {
  __typename?: 'types_ObjectMeta';
  annotations?: Maybe<Scalars['JSON']['output']>;
  creationTimestamp?: Maybe<Scalars['String']['output']>;
  labels?: Maybe<Scalars['JSON']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  namespace?: Maybe<Scalars['String']['output']>;
  ownerReferences?: Maybe<Array<Maybe<Types_OwnerReference>>>;
  uid?: Maybe<Scalars['String']['output']>;
};

export type Types_OwnerReference = {
  __typename?: 'types_OwnerReference';
  kind: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type Types_TypeMeta = {
  __typename?: 'types_TypeMeta';
  kind?: Maybe<Scalars['String']['output']>;
  restartable?: Maybe<Scalars['Boolean']['output']>;
  scalable?: Maybe<Scalars['Boolean']['output']>;
};

export type Unstructured_Unstructured = {
  __typename?: 'unstructured_Unstructured';
  Object: Scalars['JSON']['output'];
};

/**
 * Represents a Persistent Disk resource in AWS.
 *
 * An AWS EBS disk must exist before mounting to a container. The disk must also be in the same AWS zone as the kubelet. An AWS EBS disk can only be mounted as read/write once. AWS EBS volumes support ownership management and SELinux relabeling.
 */
export type V1_AwsElasticBlockStoreVolumeSource = {
  __typename?: 'v1_AWSElasticBlockStoreVolumeSource';
  /** fsType is the filesystem type of the volume that you want to mount. Tip: Ensure that the filesystem type is supported by the host operating system. Examples: "ext4", "xfs", "ntfs". Implicitly inferred to be "ext4" if unspecified. More info: https://kubernetes.io/docs/concepts/storage/volumes#awselasticblockstore */
  fsType?: Maybe<Scalars['String']['output']>;
  /** partition is the partition in the volume that you want to mount. If omitted, the default is to mount by volume name. Examples: For volume /dev/sda1, you specify the partition as "1". Similarly, the volume partition for /dev/sda is "0" (or you can leave the property empty). */
  partition?: Maybe<Scalars['Int']['output']>;
  /** readOnly value true will force the readOnly setting in VolumeMounts. More info: https://kubernetes.io/docs/concepts/storage/volumes#awselasticblockstore */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  /** volumeID is unique ID of the persistent disk resource in AWS (Amazon EBS volume). More info: https://kubernetes.io/docs/concepts/storage/volumes#awselasticblockstore */
  volumeID: Scalars['String']['output'];
};

/** AppArmorProfile defines a pod or container's AppArmor settings. */
export type V1_AppArmorProfile = {
  __typename?: 'v1_AppArmorProfile';
  /** localhostProfile indicates a profile loaded on the node that should be used. The profile must be preconfigured on the node to work. Must match the loaded name of the profile. Must be set if and only if type is "Localhost". */
  localhostProfile?: Maybe<Scalars['String']['output']>;
  /**
   * type indicates which kind of AppArmor profile will be applied. Valid options are:
   * Localhost - a profile pre-loaded on the node.
   * RuntimeDefault - the container runtime's default profile.
   * Unconfined - no AppArmor enforcement.
   */
  type: Scalars['String']['output'];
};

/** AzureDisk represents an Azure Data Disk mount on the host and bind mount to the pod. */
export type V1_AzureDiskVolumeSource = {
  __typename?: 'v1_AzureDiskVolumeSource';
  /** cachingMode is the Host Caching mode: None, Read Only, Read Write. */
  cachingMode?: Maybe<Scalars['String']['output']>;
  /** diskName is the Name of the data disk in the blob storage */
  diskName: Scalars['String']['output'];
  /** diskURI is the URI of data disk in the blob storage */
  diskURI: Scalars['String']['output'];
  /** fsType is Filesystem type to mount. Must be a filesystem type supported by the host operating system. Ex. "ext4", "xfs", "ntfs". Implicitly inferred to be "ext4" if unspecified. */
  fsType?: Maybe<Scalars['String']['output']>;
  /** kind expected values are Shared: multiple blob disks per storage account  Dedicated: single blob disk per storage account  Managed: azure managed data disk (only in managed availability set). defaults to shared */
  kind?: Maybe<Scalars['String']['output']>;
  /** readOnly Defaults to false (read/write). ReadOnly here will force the ReadOnly setting in VolumeMounts. */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
};

/** AzureFile represents an Azure File Service mount on the host and bind mount to the pod. */
export type V1_AzureFilePersistentVolumeSource = {
  __typename?: 'v1_AzureFilePersistentVolumeSource';
  /** readOnly defaults to false (read/write). ReadOnly here will force the ReadOnly setting in VolumeMounts. */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  /** secretName is the name of secret that contains Azure Storage Account Name and Key */
  secretName: Scalars['String']['output'];
  /** secretNamespace is the namespace of the secret that contains Azure Storage Account Name and Key default is the same as the Pod */
  secretNamespace: Scalars['String']['output'];
  /** shareName is the azure Share Name */
  shareName: Scalars['String']['output'];
};

/** AzureFile represents an Azure File Service mount on the host and bind mount to the pod. */
export type V1_AzureFileVolumeSource = {
  __typename?: 'v1_AzureFileVolumeSource';
  /** readOnly defaults to false (read/write). ReadOnly here will force the ReadOnly setting in VolumeMounts. */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  /** secretName is the  name of secret that contains Azure Storage Account Name and Key */
  secretName: Scalars['String']['output'];
  /** shareName is the azure share Name */
  shareName: Scalars['String']['output'];
};

/** Represents storage that is managed by an external CSI volume driver */
export type V1_CsiPersistentVolumeSource = {
  __typename?: 'v1_CSIPersistentVolumeSource';
  controllerExpandSecretRef?: Maybe<V1_SecretReference>;
  controllerPublishSecretRef?: Maybe<V1_SecretReference>;
  /** driver is the name of the driver to use for this volume. Required. */
  driver: Scalars['String']['output'];
  /** fsType to mount. Must be a filesystem type supported by the host operating system. Ex. "ext4", "xfs", "ntfs". */
  fsType?: Maybe<Scalars['String']['output']>;
  nodeExpandSecretRef?: Maybe<V1_SecretReference>;
  nodePublishSecretRef?: Maybe<V1_SecretReference>;
  nodeStageSecretRef?: Maybe<V1_SecretReference>;
  /** readOnly value to pass to ControllerPublishVolumeRequest. Defaults to false (read/write). */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  /** volumeAttributes of the volume to publish. */
  volumeAttributes?: Maybe<Scalars['JSON']['output']>;
  /** volumeHandle is the unique volume name returned by the CSI volume plugin’s CreateVolume to refer to the volume on all subsequent calls. Required. */
  volumeHandle: Scalars['String']['output'];
};

/** Represents a source location of a volume to mount, managed by an external CSI driver */
export type V1_CsiVolumeSource = {
  __typename?: 'v1_CSIVolumeSource';
  /** driver is the name of the CSI driver that handles this volume. Consult with your admin for the correct name as registered in the cluster. */
  driver: Scalars['String']['output'];
  /** fsType to mount. Ex. "ext4", "xfs", "ntfs". If not provided, the empty value is passed to the associated CSI driver which will determine the default filesystem to apply. */
  fsType?: Maybe<Scalars['String']['output']>;
  nodePublishSecretRef?: Maybe<V1_LocalObjectReference>;
  /** readOnly specifies a read-only configuration for the volume. Defaults to false (read/write). */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  /** volumeAttributes stores driver-specific properties that are passed to the CSI driver. Consult your driver's documentation for supported values. */
  volumeAttributes?: Maybe<Scalars['JSON']['output']>;
};

/** Adds and removes POSIX capabilities from running containers. */
export type V1_Capabilities = {
  __typename?: 'v1_Capabilities';
  /** Added capabilities */
  add?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** Removed capabilities */
  drop?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

/** Represents a Ceph Filesystem mount that lasts the lifetime of a pod Cephfs volumes do not support ownership management or SELinux relabeling. */
export type V1_CephFsPersistentVolumeSource = {
  __typename?: 'v1_CephFSPersistentVolumeSource';
  /** monitors is Required: Monitors is a collection of Ceph monitors More info: https://examples.k8s.io/volumes/cephfs/README.md#how-to-use-it */
  monitors: Array<Maybe<Scalars['String']['output']>>;
  /** path is Optional: Used as the mounted root, rather than the full Ceph tree, default is / */
  path?: Maybe<Scalars['String']['output']>;
  /** readOnly is Optional: Defaults to false (read/write). ReadOnly here will force the ReadOnly setting in VolumeMounts. More info: https://examples.k8s.io/volumes/cephfs/README.md#how-to-use-it */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  /** secretFile is Optional: SecretFile is the path to key ring for User, default is /etc/ceph/user.secret More info: https://examples.k8s.io/volumes/cephfs/README.md#how-to-use-it */
  secretFile?: Maybe<Scalars['String']['output']>;
  secretRef?: Maybe<V1_SecretReference>;
  /** user is Optional: User is the rados user name, default is admin More info: https://examples.k8s.io/volumes/cephfs/README.md#how-to-use-it */
  user?: Maybe<Scalars['String']['output']>;
};

/** Represents a Ceph Filesystem mount that lasts the lifetime of a pod Cephfs volumes do not support ownership management or SELinux relabeling. */
export type V1_CephFsVolumeSource = {
  __typename?: 'v1_CephFSVolumeSource';
  /** monitors is Required: Monitors is a collection of Ceph monitors More info: https://examples.k8s.io/volumes/cephfs/README.md#how-to-use-it */
  monitors: Array<Maybe<Scalars['String']['output']>>;
  /** path is Optional: Used as the mounted root, rather than the full Ceph tree, default is / */
  path?: Maybe<Scalars['String']['output']>;
  /** readOnly is Optional: Defaults to false (read/write). ReadOnly here will force the ReadOnly setting in VolumeMounts. More info: https://examples.k8s.io/volumes/cephfs/README.md#how-to-use-it */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  /** secretFile is Optional: SecretFile is the path to key ring for User, default is /etc/ceph/user.secret More info: https://examples.k8s.io/volumes/cephfs/README.md#how-to-use-it */
  secretFile?: Maybe<Scalars['String']['output']>;
  secretRef?: Maybe<V1_LocalObjectReference>;
  /** user is optional: User is the rados user name, default is admin More info: https://examples.k8s.io/volumes/cephfs/README.md#how-to-use-it */
  user?: Maybe<Scalars['String']['output']>;
};

/** Represents a cinder volume resource in Openstack. A Cinder volume must exist before mounting to a container. The volume must also be in the same region as the kubelet. Cinder volumes support ownership management and SELinux relabeling. */
export type V1_CinderPersistentVolumeSource = {
  __typename?: 'v1_CinderPersistentVolumeSource';
  /** fsType Filesystem type to mount. Must be a filesystem type supported by the host operating system. Examples: "ext4", "xfs", "ntfs". Implicitly inferred to be "ext4" if unspecified. More info: https://examples.k8s.io/mysql-cinder-pd/README.md */
  fsType?: Maybe<Scalars['String']['output']>;
  /** readOnly is Optional: Defaults to false (read/write). ReadOnly here will force the ReadOnly setting in VolumeMounts. More info: https://examples.k8s.io/mysql-cinder-pd/README.md */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  secretRef?: Maybe<V1_SecretReference>;
  /** volumeID used to identify the volume in cinder. More info: https://examples.k8s.io/mysql-cinder-pd/README.md */
  volumeID: Scalars['String']['output'];
};

/** Represents a cinder volume resource in Openstack. A Cinder volume must exist before mounting to a container. The volume must also be in the same region as the kubelet. Cinder volumes support ownership management and SELinux relabeling. */
export type V1_CinderVolumeSource = {
  __typename?: 'v1_CinderVolumeSource';
  /** fsType is the filesystem type to mount. Must be a filesystem type supported by the host operating system. Examples: "ext4", "xfs", "ntfs". Implicitly inferred to be "ext4" if unspecified. More info: https://examples.k8s.io/mysql-cinder-pd/README.md */
  fsType?: Maybe<Scalars['String']['output']>;
  /** readOnly defaults to false (read/write). ReadOnly here will force the ReadOnly setting in VolumeMounts. More info: https://examples.k8s.io/mysql-cinder-pd/README.md */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  secretRef?: Maybe<V1_LocalObjectReference>;
  /** volumeID used to identify the volume in cinder. More info: https://examples.k8s.io/mysql-cinder-pd/README.md */
  volumeID: Scalars['String']['output'];
};

/** ClusterTrustBundleProjection describes how to select a set of ClusterTrustBundle objects and project their contents into the pod filesystem. */
export type V1_ClusterTrustBundleProjection = {
  __typename?: 'v1_ClusterTrustBundleProjection';
  labelSelector?: Maybe<V1_LabelSelector>;
  /** Select a single ClusterTrustBundle by object name.  Mutually-exclusive with signerName and labelSelector. */
  name?: Maybe<Scalars['String']['output']>;
  /** If true, don't block pod startup if the referenced ClusterTrustBundle(s) aren't available.  If using name, then the named ClusterTrustBundle is allowed not to exist.  If using signerName, then the combination of signerName and labelSelector is allowed to match zero ClusterTrustBundles. */
  optional?: Maybe<Scalars['Boolean']['output']>;
  /** Relative path from the volume root to write the bundle. */
  path: Scalars['String']['output'];
  /** Select all ClusterTrustBundles that match this signer name. Mutually-exclusive with name.  The contents of all selected ClusterTrustBundles will be unified and deduplicated. */
  signerName?: Maybe<Scalars['String']['output']>;
};

/** Selects a key from a ConfigMap. */
export type V1_ConfigMapKeySelector = {
  __typename?: 'v1_ConfigMapKeySelector';
  /** The key to select. */
  key: Scalars['String']['output'];
  /** Name of the referent. This field is effectively required, but due to backwards compatibility is allowed to be empty. Instances of this type with an empty value here are almost certainly wrong. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names */
  name?: Maybe<Scalars['String']['output']>;
  /** Specify whether the ConfigMap or its key must be defined */
  optional?: Maybe<Scalars['Boolean']['output']>;
};

/**
 * Adapts a ConfigMap into a projected volume.
 *
 * The contents of the target ConfigMap's Data field will be presented in a projected volume as files using the keys in the Data field as the file names, unless the items element is populated with specific mappings of keys to paths. Note that this is identical to a configmap volume source without the default mode.
 */
export type V1_ConfigMapProjection = {
  __typename?: 'v1_ConfigMapProjection';
  /** items if unspecified, each key-value pair in the Data field of the referenced ConfigMap will be projected into the volume as a file whose name is the key and content is the value. If specified, the listed keys will be projected into the specified paths, and unlisted keys will not be present. If a key is specified which is not present in the ConfigMap, the volume setup will error unless it is marked optional. Paths must be relative and may not contain the '..' path or start with '..'. */
  items?: Maybe<Array<Maybe<V1_KeyToPath>>>;
  /** Name of the referent. This field is effectively required, but due to backwards compatibility is allowed to be empty. Instances of this type with an empty value here are almost certainly wrong. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names */
  name?: Maybe<Scalars['String']['output']>;
  /** optional specify whether the ConfigMap or its keys must be defined */
  optional?: Maybe<Scalars['Boolean']['output']>;
};

/**
 * Adapts a ConfigMap into a volume.
 *
 * The contents of the target ConfigMap's Data field will be presented in a volume as files using the keys in the Data field as the file names, unless the items element is populated with specific mappings of keys to paths. ConfigMap volumes support ownership management and SELinux relabeling.
 */
export type V1_ConfigMapVolumeSource = {
  __typename?: 'v1_ConfigMapVolumeSource';
  /** defaultMode is optional: mode bits used to set permissions on created files by default. Must be an octal value between 0000 and 0777 or a decimal value between 0 and 511. YAML accepts both octal and decimal values, JSON requires decimal values for mode bits. Defaults to 0644. Directories within the path are not affected by this setting. This might be in conflict with other options that affect the file mode, like fsGroup, and the result can be other mode bits set. */
  defaultMode?: Maybe<Scalars['Int']['output']>;
  /** items if unspecified, each key-value pair in the Data field of the referenced ConfigMap will be projected into the volume as a file whose name is the key and content is the value. If specified, the listed keys will be projected into the specified paths, and unlisted keys will not be present. If a key is specified which is not present in the ConfigMap, the volume setup will error unless it is marked optional. Paths must be relative and may not contain the '..' path or start with '..'. */
  items?: Maybe<Array<Maybe<V1_KeyToPath>>>;
  /** Name of the referent. This field is effectively required, but due to backwards compatibility is allowed to be empty. Instances of this type with an empty value here are almost certainly wrong. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names */
  name?: Maybe<Scalars['String']['output']>;
  /** optional specify whether the ConfigMap or its keys must be defined */
  optional?: Maybe<Scalars['Boolean']['output']>;
};

/** ContainerState holds a possible state of container. Only one of its members may be specified. If none of them is specified, the default one is ContainerStateWaiting. */
export type V1_ContainerState = {
  __typename?: 'v1_ContainerState';
  running?: Maybe<V1_ContainerStateRunning>;
  terminated?: Maybe<V1_ContainerStateTerminated>;
  waiting?: Maybe<V1_ContainerStateWaiting>;
};

/** ContainerStateRunning is a running state of a container. */
export type V1_ContainerStateRunning = {
  __typename?: 'v1_ContainerStateRunning';
  startedAt?: Maybe<Scalars['String']['output']>;
};

/** ContainerStateTerminated is a terminated state of a container. */
export type V1_ContainerStateTerminated = {
  __typename?: 'v1_ContainerStateTerminated';
  /** Container's ID in the format '<type>://<container_id>' */
  containerID?: Maybe<Scalars['String']['output']>;
  /** Exit status from the last termination of the container */
  exitCode: Scalars['Int']['output'];
  finishedAt?: Maybe<Scalars['String']['output']>;
  /** Message regarding the last termination of the container */
  message?: Maybe<Scalars['String']['output']>;
  /** (brief) reason from the last termination of the container */
  reason?: Maybe<Scalars['String']['output']>;
  /** Signal from the last termination of the container */
  signal?: Maybe<Scalars['Int']['output']>;
  startedAt?: Maybe<Scalars['String']['output']>;
};

/** ContainerStateWaiting is a waiting state of a container. */
export type V1_ContainerStateWaiting = {
  __typename?: 'v1_ContainerStateWaiting';
  /** Message regarding why the container is not yet running. */
  message?: Maybe<Scalars['String']['output']>;
  /** (brief) reason the container is not yet running. */
  reason?: Maybe<Scalars['String']['output']>;
};

/** ContainerStatus contains details for the current status of this container. */
export type V1_ContainerStatus = {
  __typename?: 'v1_ContainerStatus';
  allocatedResources: Scalars['ObjMap']['output'];
  /** AllocatedResourcesStatus represents the status of various resources allocated for this Pod. */
  allocatedResourcesStatus?: Maybe<Array<Maybe<V1_ResourceStatus>>>;
  /** ContainerID is the ID of the container in the format '<type>://<container_id>'. Where type is a container runtime identifier, returned from Version call of CRI API (for example "containerd"). */
  containerID?: Maybe<Scalars['String']['output']>;
  /** Image is the name of container image that the container is running. The container image may not match the image used in the PodSpec, as it may have been resolved by the runtime. More info: https://kubernetes.io/docs/concepts/containers/images. */
  image: Scalars['String']['output'];
  /** ImageID is the image ID of the container's image. The image ID may not match the image ID of the image used in the PodSpec, as it may have been resolved by the runtime. */
  imageID: Scalars['String']['output'];
  lastState?: Maybe<V1_ContainerState>;
  /** Name is a DNS_LABEL representing the unique name of the container. Each container in a pod must have a unique name across all container types. Cannot be updated. */
  name: Scalars['String']['output'];
  /**
   * Ready specifies whether the container is currently passing its readiness check. The value will change as readiness probes keep executing. If no readiness probes are specified, this field defaults to true once the container is fully started (see Started field).
   *
   * The value is typically used to determine whether a container is ready to accept traffic.
   */
  ready: Scalars['Boolean']['output'];
  resources?: Maybe<V1_ResourceRequirements>;
  /** RestartCount holds the number of times the container has been restarted. Kubelet makes an effort to always increment the value, but there are cases when the state may be lost due to node restarts and then the value may be reset to 0. The value is never negative. */
  restartCount: Scalars['Int']['output'];
  /** Started indicates whether the container has finished its postStart lifecycle hook and passed its startup probe. Initialized as false, becomes true after startupProbe is considered successful. Resets to false when the container is restarted, or if kubelet loses state temporarily. In both cases, startup probes will run again. Is always true when no startupProbe is defined and container is running and has passed the postStart lifecycle hook. The null value must be treated the same as false. */
  started?: Maybe<Scalars['Boolean']['output']>;
  state?: Maybe<V1_ContainerState>;
  user?: Maybe<V1_ContainerUser>;
  /** Status of volume mounts. */
  volumeMounts?: Maybe<Array<Maybe<V1_VolumeMountStatus>>>;
};

/** ContainerUser represents user identity information */
export type V1_ContainerUser = {
  __typename?: 'v1_ContainerUser';
  linux?: Maybe<V1_LinuxContainerUser>;
};

/** Represents downward API info for projecting into a projected volume. Note that this is identical to a downwardAPI volume source without the default mode. */
export type V1_DownwardApiProjection = {
  __typename?: 'v1_DownwardAPIProjection';
  /** Items is a list of DownwardAPIVolume file */
  items?: Maybe<Array<Maybe<V1_DownwardApiVolumeFile>>>;
};

/** DownwardAPIVolumeFile represents information to create the file containing the pod field */
export type V1_DownwardApiVolumeFile = {
  __typename?: 'v1_DownwardAPIVolumeFile';
  fieldRef?: Maybe<V1_ObjectFieldSelector>;
  /** Optional: mode bits used to set permissions on this file, must be an octal value between 0000 and 0777 or a decimal value between 0 and 511. YAML accepts both octal and decimal values, JSON requires decimal values for mode bits. If not specified, the volume defaultMode will be used. This might be in conflict with other options that affect the file mode, like fsGroup, and the result can be other mode bits set. */
  mode?: Maybe<Scalars['Int']['output']>;
  /** Required: Path is  the relative path name of the file to be created. Must not be absolute or contain the '..' path. Must be utf-8 encoded. The first item of the relative path must not start with '..' */
  path: Scalars['String']['output'];
  resourceFieldRef?: Maybe<V1_ResourceFieldSelector>;
};

/** DownwardAPIVolumeSource represents a volume containing downward API info. Downward API volumes support ownership management and SELinux relabeling. */
export type V1_DownwardApiVolumeSource = {
  __typename?: 'v1_DownwardAPIVolumeSource';
  /** Optional: mode bits to use on created files by default. Must be a Optional: mode bits used to set permissions on created files by default. Must be an octal value between 0000 and 0777 or a decimal value between 0 and 511. YAML accepts both octal and decimal values, JSON requires decimal values for mode bits. Defaults to 0644. Directories within the path are not affected by this setting. This might be in conflict with other options that affect the file mode, like fsGroup, and the result can be other mode bits set. */
  defaultMode?: Maybe<Scalars['Int']['output']>;
  /** Items is a list of downward API volume file */
  items?: Maybe<Array<Maybe<V1_DownwardApiVolumeFile>>>;
};

/** Represents an empty directory for a pod. Empty directory volumes support ownership management and SELinux relabeling. */
export type V1_EmptyDirVolumeSource = {
  __typename?: 'v1_EmptyDirVolumeSource';
  /** medium represents what type of storage medium should back this directory. The default is "" which means to use the node's default medium. Must be an empty string (default) or Memory. More info: https://kubernetes.io/docs/concepts/storage/volumes#emptydir */
  medium?: Maybe<Scalars['String']['output']>;
  sizeLimit?: Maybe<Scalars['String']['output']>;
};

/** EndpointPort is a tuple that describes a single port. */
export type V1_EndpointPort = {
  __typename?: 'v1_EndpointPort';
  /**
   * The application protocol for this port. This is used as a hint for implementations to offer richer behavior for protocols that they understand. This field follows standard Kubernetes label syntax. Valid values are either:
   *
   * * Un-prefixed protocol names - reserved for IANA standard service names (as per RFC-6335 and https://www.iana.org/assignments/service-names).
   *
   * * Kubernetes-defined prefixed names:
   * * 'kubernetes.io/h2c' - HTTP/2 prior knowledge over cleartext as described in https://www.rfc-editor.org/rfc/rfc9113.html#name-starting-http-2-with-prior-
   * * 'kubernetes.io/ws'  - WebSocket over cleartext as described in https://www.rfc-editor.org/rfc/rfc6455
   * * 'kubernetes.io/wss' - WebSocket over TLS as described in https://www.rfc-editor.org/rfc/rfc6455
   *
   * * Other protocols should use implementation-defined prefixed names such as mycompany.com/my-custom-protocol.
   */
  appProtocol?: Maybe<Scalars['String']['output']>;
  /** The name of this port.  This must match the 'name' field in the corresponding ServicePort. Must be a DNS_LABEL. Optional only if one port is defined. */
  name?: Maybe<Scalars['String']['output']>;
  /** The port number of the endpoint. */
  port: Scalars['Int']['output'];
  /** The IP protocol for this port. Must be UDP, TCP, or SCTP. Default is TCP. */
  protocol?: Maybe<Scalars['String']['output']>;
};

/** EnvVarSource represents a source for the value of an EnvVar. */
export type V1_EnvVarSource = {
  __typename?: 'v1_EnvVarSource';
  configMapKeyRef?: Maybe<V1_ConfigMapKeySelector>;
  fieldRef?: Maybe<V1_ObjectFieldSelector>;
  resourceFieldRef?: Maybe<V1_ResourceFieldSelector>;
  secretKeyRef?: Maybe<V1_SecretKeySelector>;
};

/** Represents an ephemeral volume that is handled by a normal storage driver. */
export type V1_EphemeralVolumeSource = {
  __typename?: 'v1_EphemeralVolumeSource';
  volumeClaimTemplate?: Maybe<V1_PersistentVolumeClaimTemplate>;
};

/** ExecAction describes a "run in container" action. */
export type V1_ExecAction = {
  __typename?: 'v1_ExecAction';
  /** Command is the command line to execute inside the container, the working directory for the command  is root ('/') in the container's filesystem. The command is simply exec'd, it is not run inside a shell, so traditional shell instructions ('|', etc) won't work. To use a shell, you need to explicitly call out to that shell. Exit status of 0 is treated as live/healthy and non-zero is unhealthy. */
  command?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

/** Represents a Fibre Channel volume. Fibre Channel volumes can only be mounted as read/write once. Fibre Channel volumes support ownership management and SELinux relabeling. */
export type V1_FcVolumeSource = {
  __typename?: 'v1_FCVolumeSource';
  /** fsType is the filesystem type to mount. Must be a filesystem type supported by the host operating system. Ex. "ext4", "xfs", "ntfs". Implicitly inferred to be "ext4" if unspecified. */
  fsType?: Maybe<Scalars['String']['output']>;
  /** lun is Optional: FC target lun number */
  lun?: Maybe<Scalars['Int']['output']>;
  /** readOnly is Optional: Defaults to false (read/write). ReadOnly here will force the ReadOnly setting in VolumeMounts. */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  /** targetWWNs is Optional: FC target worldwide names (WWNs) */
  targetWWNs?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** wwids Optional: FC volume world wide identifiers (wwids) Either wwids or combination of targetWWNs and lun must be set, but not both simultaneously. */
  wwids?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

/** FlexPersistentVolumeSource represents a generic persistent volume resource that is provisioned/attached using an exec based plugin. */
export type V1_FlexPersistentVolumeSource = {
  __typename?: 'v1_FlexPersistentVolumeSource';
  /** driver is the name of the driver to use for this volume. */
  driver: Scalars['String']['output'];
  /** fsType is the Filesystem type to mount. Must be a filesystem type supported by the host operating system. Ex. "ext4", "xfs", "ntfs". The default filesystem depends on FlexVolume script. */
  fsType?: Maybe<Scalars['String']['output']>;
  /** options is Optional: this field holds extra command options if any. */
  options?: Maybe<Scalars['JSON']['output']>;
  /** readOnly is Optional: defaults to false (read/write). ReadOnly here will force the ReadOnly setting in VolumeMounts. */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  secretRef?: Maybe<V1_SecretReference>;
};

/** FlexVolume represents a generic volume resource that is provisioned/attached using an exec based plugin. */
export type V1_FlexVolumeSource = {
  __typename?: 'v1_FlexVolumeSource';
  /** driver is the name of the driver to use for this volume. */
  driver: Scalars['String']['output'];
  /** fsType is the filesystem type to mount. Must be a filesystem type supported by the host operating system. Ex. "ext4", "xfs", "ntfs". The default filesystem depends on FlexVolume script. */
  fsType?: Maybe<Scalars['String']['output']>;
  /** options is Optional: this field holds extra command options if any. */
  options?: Maybe<Scalars['JSON']['output']>;
  /** readOnly is Optional: defaults to false (read/write). ReadOnly here will force the ReadOnly setting in VolumeMounts. */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  secretRef?: Maybe<V1_LocalObjectReference>;
};

/** Represents a Flocker volume mounted by the Flocker agent. One and only one of datasetName and datasetUUID should be set. Flocker volumes do not support ownership management or SELinux relabeling. */
export type V1_FlockerVolumeSource = {
  __typename?: 'v1_FlockerVolumeSource';
  /** datasetName is Name of the dataset stored as metadata -> name on the dataset for Flocker should be considered as deprecated */
  datasetName?: Maybe<Scalars['String']['output']>;
  /** datasetUUID is the UUID of the dataset. This is unique identifier of a Flocker dataset */
  datasetUUID?: Maybe<Scalars['String']['output']>;
};

/**
 * Represents a Persistent Disk resource in Google Compute Engine.
 *
 * A GCE PD must exist before mounting to a container. The disk must also be in the same GCE project and zone as the kubelet. A GCE PD can only be mounted as read/write once or read-only many times. GCE PDs support ownership management and SELinux relabeling.
 */
export type V1_GcePersistentDiskVolumeSource = {
  __typename?: 'v1_GCEPersistentDiskVolumeSource';
  /** fsType is filesystem type of the volume that you want to mount. Tip: Ensure that the filesystem type is supported by the host operating system. Examples: "ext4", "xfs", "ntfs". Implicitly inferred to be "ext4" if unspecified. More info: https://kubernetes.io/docs/concepts/storage/volumes#gcepersistentdisk */
  fsType?: Maybe<Scalars['String']['output']>;
  /** partition is the partition in the volume that you want to mount. If omitted, the default is to mount by volume name. Examples: For volume /dev/sda1, you specify the partition as "1". Similarly, the volume partition for /dev/sda is "0" (or you can leave the property empty). More info: https://kubernetes.io/docs/concepts/storage/volumes#gcepersistentdisk */
  partition?: Maybe<Scalars['Int']['output']>;
  /** pdName is unique name of the PD resource in GCE. Used to identify the disk in GCE. More info: https://kubernetes.io/docs/concepts/storage/volumes#gcepersistentdisk */
  pdName: Scalars['String']['output'];
  /** readOnly here will force the ReadOnly setting in VolumeMounts. Defaults to false. More info: https://kubernetes.io/docs/concepts/storage/volumes#gcepersistentdisk */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
};

/** GRPCAction specifies an action involving a GRPC service. */
export type V1_GrpcAction = {
  __typename?: 'v1_GRPCAction';
  /** Port number of the gRPC service. Number must be in the range 1 to 65535. */
  port: Scalars['Int']['output'];
  /**
   * Service is the name of the service to place in the gRPC HealthCheckRequest (see https://github.com/grpc/grpc/blob/master/doc/health-checking.md).
   *
   * If this is not specified, the default behavior is defined by gRPC.
   */
  service: Scalars['String']['output'];
};

/**
 * Represents a volume that is populated with the contents of a git repository. Git repo volumes do not support ownership management. Git repo volumes support SELinux relabeling.
 *
 * DEPRECATED: GitRepo is deprecated. To provision a container with a git repo, mount an EmptyDir into an InitContainer that clones the repo using git, then mount the EmptyDir into the Pod's container.
 */
export type V1_GitRepoVolumeSource = {
  __typename?: 'v1_GitRepoVolumeSource';
  /** directory is the target directory name. Must not contain or start with '..'.  If '.' is supplied, the volume directory will be the git repository.  Otherwise, if specified, the volume will contain the git repository in the subdirectory with the given name. */
  directory?: Maybe<Scalars['String']['output']>;
  /** repository is the URL */
  repository: Scalars['String']['output'];
  /** revision is the commit hash for the specified revision. */
  revision?: Maybe<Scalars['String']['output']>;
};

/** Represents a Glusterfs mount that lasts the lifetime of a pod. Glusterfs volumes do not support ownership management or SELinux relabeling. */
export type V1_GlusterfsPersistentVolumeSource = {
  __typename?: 'v1_GlusterfsPersistentVolumeSource';
  /** endpoints is the endpoint name that details Glusterfs topology. More info: https://examples.k8s.io/volumes/glusterfs/README.md#create-a-pod */
  endpoints: Scalars['String']['output'];
  /** endpointsNamespace is the namespace that contains Glusterfs endpoint. If this field is empty, the EndpointNamespace defaults to the same namespace as the bound PVC. More info: https://examples.k8s.io/volumes/glusterfs/README.md#create-a-pod */
  endpointsNamespace?: Maybe<Scalars['String']['output']>;
  /** path is the Glusterfs volume path. More info: https://examples.k8s.io/volumes/glusterfs/README.md#create-a-pod */
  path: Scalars['String']['output'];
  /** readOnly here will force the Glusterfs volume to be mounted with read-only permissions. Defaults to false. More info: https://examples.k8s.io/volumes/glusterfs/README.md#create-a-pod */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
};

/** Represents a Glusterfs mount that lasts the lifetime of a pod. Glusterfs volumes do not support ownership management or SELinux relabeling. */
export type V1_GlusterfsVolumeSource = {
  __typename?: 'v1_GlusterfsVolumeSource';
  /** endpoints is the endpoint name that details Glusterfs topology. More info: https://examples.k8s.io/volumes/glusterfs/README.md#create-a-pod */
  endpoints: Scalars['String']['output'];
  /** path is the Glusterfs volume path. More info: https://examples.k8s.io/volumes/glusterfs/README.md#create-a-pod */
  path: Scalars['String']['output'];
  /** readOnly here will force the Glusterfs volume to be mounted with read-only permissions. Defaults to false. More info: https://examples.k8s.io/volumes/glusterfs/README.md#create-a-pod */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
};

/** HTTPGetAction describes an action based on HTTP Get requests. */
export type V1_HttpGetAction = {
  __typename?: 'v1_HTTPGetAction';
  /** Host name to connect to, defaults to the pod IP. You probably want to set "Host" in httpHeaders instead. */
  host?: Maybe<Scalars['String']['output']>;
  /** Custom headers to set in the request. HTTP allows repeated headers. */
  httpHeaders?: Maybe<Array<Maybe<V1_HttpHeader>>>;
  /** Path to access on the HTTP server. */
  path?: Maybe<Scalars['String']['output']>;
  port: Scalars['String']['output'];
  /** Scheme to use for connecting to the host. Defaults to HTTP. */
  scheme?: Maybe<Scalars['String']['output']>;
};

/** HTTPHeader describes a custom header to be used in HTTP probes */
export type V1_HttpHeader = {
  __typename?: 'v1_HTTPHeader';
  /** The header field name. This will be canonicalized upon output, so case-variant names will be understood as the same header. */
  name: Scalars['String']['output'];
  /** The header field value */
  value: Scalars['String']['output'];
};

/** HTTPIngressPath associates a path with a backend. Incoming urls matching the path are forwarded to the backend. */
export type V1_HttpIngressPath = {
  __typename?: 'v1_HTTPIngressPath';
  backend: V1_IngressBackend;
  /** path is matched against the path of an incoming request. Currently it can contain characters disallowed from the conventional "path" part of a URL as defined by RFC 3986. Paths must begin with a '/' and must be present when using PathType with value "Exact" or "Prefix". */
  path?: Maybe<Scalars['String']['output']>;
  /**
   * pathType determines the interpretation of the path matching. PathType can be one of the following values: * Exact: Matches the URL path exactly. * Prefix: Matches based on a URL path prefix split by '/'. Matching is
   * done on a path element by element basis. A path element refers is the
   * list of labels in the path split by the '/' separator. A request is a
   * match for path p if every p is an element-wise prefix of p of the
   * request path. Note that if the last element of the path is a substring
   * of the last element in request path, it is not a match (e.g. /foo/bar
   * matches /foo/bar/baz, but does not match /foo/barbaz).
   * * ImplementationSpecific: Interpretation of the Path matching is up to
   * the IngressClass. Implementations can treat this as a separate PathType
   * or treat it identically to Prefix or Exact path types.
   * Implementations are required to support all path types.
   */
  pathType: Scalars['String']['output'];
};

/** HTTPIngressRuleValue is a list of http selectors pointing to backends. In the example: http://<host>/<path>?<searchpart> -> backend where where parts of the url correspond to RFC 3986, this resource will be used to match against everything after the last '/' and before the first '?' or '#'. */
export type V1_HttpIngressRuleValue = {
  __typename?: 'v1_HTTPIngressRuleValue';
  /** paths is a collection of paths that map requests to backends. */
  paths: Array<Maybe<V1_HttpIngressPath>>;
};

/** Represents a host path mapped into a pod. Host path volumes do not support ownership management or SELinux relabeling. */
export type V1_HostPathVolumeSource = {
  __typename?: 'v1_HostPathVolumeSource';
  /** path of the directory on the host. If the path is a symlink, it will follow the link to the real path. More info: https://kubernetes.io/docs/concepts/storage/volumes#hostpath */
  path: Scalars['String']['output'];
  /** type for HostPath Volume Defaults to "" More info: https://kubernetes.io/docs/concepts/storage/volumes#hostpath */
  type?: Maybe<Scalars['String']['output']>;
};

/** IPBlock describes a particular CIDR (Ex. "192.168.1.0/24","2001:db8::/64") that is allowed to the pods matched by a NetworkPolicySpec's podSelector. The except entry describes CIDRs that should not be included within this rule. */
export type V1_IpBlock = {
  __typename?: 'v1_IPBlock';
  /** cidr is a string representing the IPBlock Valid examples are "192.168.1.0/24" or "2001:db8::/64" */
  cidr: Scalars['String']['output'];
  /** except is a slice of CIDRs that should not be included within an IPBlock Valid examples are "192.168.1.0/24" or "2001:db8::/64" Except values will be rejected if they are outside the cidr range */
  except?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

/** ISCSIPersistentVolumeSource represents an ISCSI disk. ISCSI volumes can only be mounted as read/write once. ISCSI volumes support ownership management and SELinux relabeling. */
export type V1_IscsiPersistentVolumeSource = {
  __typename?: 'v1_ISCSIPersistentVolumeSource';
  /** chapAuthDiscovery defines whether support iSCSI Discovery CHAP authentication */
  chapAuthDiscovery?: Maybe<Scalars['Boolean']['output']>;
  /** chapAuthSession defines whether support iSCSI Session CHAP authentication */
  chapAuthSession?: Maybe<Scalars['Boolean']['output']>;
  /** fsType is the filesystem type of the volume that you want to mount. Tip: Ensure that the filesystem type is supported by the host operating system. Examples: "ext4", "xfs", "ntfs". Implicitly inferred to be "ext4" if unspecified. More info: https://kubernetes.io/docs/concepts/storage/volumes#iscsi */
  fsType?: Maybe<Scalars['String']['output']>;
  /** initiatorName is the custom iSCSI Initiator Name. If initiatorName is specified with iscsiInterface simultaneously, new iSCSI interface <target portal>:<volume name> will be created for the connection. */
  initiatorName?: Maybe<Scalars['String']['output']>;
  /** iqn is Target iSCSI Qualified Name. */
  iqn: Scalars['String']['output'];
  /** iscsiInterface is the interface Name that uses an iSCSI transport. Defaults to 'default' (tcp). */
  iscsiInterface?: Maybe<Scalars['String']['output']>;
  /** lun is iSCSI Target Lun number. */
  lun: Scalars['Int']['output'];
  /** portals is the iSCSI Target Portal List. The Portal is either an IP or ip_addr:port if the port is other than default (typically TCP ports 860 and 3260). */
  portals?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** readOnly here will force the ReadOnly setting in VolumeMounts. Defaults to false. */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  secretRef?: Maybe<V1_SecretReference>;
  /** targetPortal is iSCSI Target Portal. The Portal is either an IP or ip_addr:port if the port is other than default (typically TCP ports 860 and 3260). */
  targetPortal: Scalars['String']['output'];
};

/** Represents an ISCSI disk. ISCSI volumes can only be mounted as read/write once. ISCSI volumes support ownership management and SELinux relabeling. */
export type V1_IscsiVolumeSource = {
  __typename?: 'v1_ISCSIVolumeSource';
  /** chapAuthDiscovery defines whether support iSCSI Discovery CHAP authentication */
  chapAuthDiscovery?: Maybe<Scalars['Boolean']['output']>;
  /** chapAuthSession defines whether support iSCSI Session CHAP authentication */
  chapAuthSession?: Maybe<Scalars['Boolean']['output']>;
  /** fsType is the filesystem type of the volume that you want to mount. Tip: Ensure that the filesystem type is supported by the host operating system. Examples: "ext4", "xfs", "ntfs". Implicitly inferred to be "ext4" if unspecified. More info: https://kubernetes.io/docs/concepts/storage/volumes#iscsi */
  fsType?: Maybe<Scalars['String']['output']>;
  /** initiatorName is the custom iSCSI Initiator Name. If initiatorName is specified with iscsiInterface simultaneously, new iSCSI interface <target portal>:<volume name> will be created for the connection. */
  initiatorName?: Maybe<Scalars['String']['output']>;
  /** iqn is the target iSCSI Qualified Name. */
  iqn: Scalars['String']['output'];
  /** iscsiInterface is the interface Name that uses an iSCSI transport. Defaults to 'default' (tcp). */
  iscsiInterface?: Maybe<Scalars['String']['output']>;
  /** lun represents iSCSI Target Lun number. */
  lun: Scalars['Int']['output'];
  /** portals is the iSCSI Target Portal List. The portal is either an IP or ip_addr:port if the port is other than default (typically TCP ports 860 and 3260). */
  portals?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** readOnly here will force the ReadOnly setting in VolumeMounts. Defaults to false. */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  secretRef?: Maybe<V1_LocalObjectReference>;
  /** targetPortal is iSCSI Target Portal. The Portal is either an IP or ip_addr:port if the port is other than default (typically TCP ports 860 and 3260). */
  targetPortal: Scalars['String']['output'];
};

/** ImageVolumeSource represents a image volume resource. */
export type V1_ImageVolumeSource = {
  __typename?: 'v1_ImageVolumeSource';
  /** Policy for pulling OCI objects. Possible values are: Always: the kubelet always attempts to pull the reference. Container creation will fail If the pull fails. Never: the kubelet never pulls the reference and only uses a local image or artifact. Container creation will fail if the reference isn't present. IfNotPresent: the kubelet pulls if the reference isn't already present on disk. Container creation will fail if the reference isn't present and the pull fails. Defaults to Always if :latest tag is specified, or IfNotPresent otherwise. */
  pullPolicy?: Maybe<Scalars['String']['output']>;
  /** Required: Image or artifact reference to be used. Behaves in the same way as pod.spec.containers[*].image. Pull secrets will be assembled in the same way as for the container image by looking up node credentials, SA image pull secrets, and pod spec image pull secrets. More info: https://kubernetes.io/docs/concepts/containers/images This field is optional to allow higher level config management to default or override container images in workload controllers like Deployments and StatefulSets. */
  reference?: Maybe<Scalars['String']['output']>;
};

/** IngressBackend describes all endpoints for a given service and port. */
export type V1_IngressBackend = {
  __typename?: 'v1_IngressBackend';
  resource?: Maybe<V1_TypedLocalObjectReference>;
  service?: Maybe<V1_IngressServiceBackend>;
};

/** IngressLoadBalancerIngress represents the status of a load-balancer ingress point. */
export type V1_IngressLoadBalancerIngress = {
  __typename?: 'v1_IngressLoadBalancerIngress';
  /** hostname is set for load-balancer ingress points that are DNS based. */
  hostname?: Maybe<Scalars['String']['output']>;
  /** ip is set for load-balancer ingress points that are IP based. */
  ip?: Maybe<Scalars['String']['output']>;
  /** ports provides information about the ports exposed by this LoadBalancer. */
  ports?: Maybe<Array<Maybe<V1_IngressPortStatus>>>;
};

/** IngressLoadBalancerStatus represents the status of a load-balancer. */
export type V1_IngressLoadBalancerStatus = {
  __typename?: 'v1_IngressLoadBalancerStatus';
  /** ingress is a list containing ingress points for the load-balancer. */
  ingress?: Maybe<Array<Maybe<V1_IngressLoadBalancerIngress>>>;
};

/** IngressPortStatus represents the error condition of a service port */
export type V1_IngressPortStatus = {
  __typename?: 'v1_IngressPortStatus';
  /**
   * error is to record the problem with the service port The format of the error shall comply with the following rules: - built-in error values shall be specified in this file and those shall use
   * CamelCase names
   * - cloud provider specific error values must have names that comply with the
   * format foo.example.com/CamelCase.
   */
  error?: Maybe<Scalars['String']['output']>;
  /** port is the port number of the ingress port. */
  port: Scalars['Int']['output'];
  /** protocol is the protocol of the ingress port. The supported values are: "TCP", "UDP", "SCTP" */
  protocol: Scalars['String']['output'];
};

/** IngressRule represents the rules mapping the paths under a specified host to the related backend services. Incoming requests are first evaluated for a host match, then routed to the backend associated with the matching IngressRuleValue. */
export type V1_IngressRule = {
  __typename?: 'v1_IngressRule';
  /**
   * host is the fully qualified domain name of a network host, as defined by RFC 3986. Note the following deviations from the "host" part of the URI as defined in RFC 3986: 1. IPs are not allowed. Currently an IngressRuleValue can only apply to
   * the IP in the Spec of the parent Ingress.
   * 2. The `:` delimiter is not respected because ports are not allowed.
   * Currently the port of an Ingress is implicitly :80 for http and
   * :443 for https.
   * Both these may change in the future. Incoming requests are matched against the host before the IngressRuleValue. If the host is unspecified, the Ingress routes all traffic based on the specified IngressRuleValue.
   *
   * host can be "precise" which is a domain name without the terminating dot of a network host (e.g. "foo.bar.com") or "wildcard", which is a domain name prefixed with a single wildcard label (e.g. "*.foo.com"). The wildcard character '*' must appear by itself as the first DNS label and matches only a single label. You cannot have a wildcard label by itself (e.g. Host == "*"). Requests will be matched against the Host field in the following way: 1. If host is precise, the request matches this rule if the http host header is equal to Host. 2. If host is a wildcard, then the request matches this rule if the http host header is to equal to the suffix (removing the first label) of the wildcard rule.
   */
  host?: Maybe<Scalars['String']['output']>;
  http?: Maybe<V1_HttpIngressRuleValue>;
};

/** IngressServiceBackend references a Kubernetes Service as a Backend. */
export type V1_IngressServiceBackend = {
  __typename?: 'v1_IngressServiceBackend';
  /** name is the referenced service. The service must exist in the same namespace as the Ingress object. */
  name: Scalars['String']['output'];
  port?: Maybe<V1_ServiceBackendPort>;
};

/** IngressSpec describes the Ingress the user wishes to exist. */
export type V1_IngressSpec = {
  __typename?: 'v1_IngressSpec';
  defaultBackend?: Maybe<V1_IngressBackend>;
  /** ingressClassName is the name of an IngressClass cluster resource. Ingress controller implementations use this field to know whether they should be serving this Ingress resource, by a transitive connection (controller -> IngressClass -> Ingress resource). Although the `kubernetes.io/ingress.class` annotation (simple constant name) was never formally defined, it was widely supported by Ingress controllers to create a direct binding between Ingress controller and Ingress resources. Newly created Ingress resources should prefer using the field. However, even though the annotation is officially deprecated, for backwards compatibility reasons, ingress controllers should still honor that annotation if present. */
  ingressClassName?: Maybe<Scalars['String']['output']>;
  /** rules is a list of host rules used to configure the Ingress. If unspecified, or no rule matches, all traffic is sent to the default backend. */
  rules?: Maybe<Array<Maybe<V1_IngressRule>>>;
  /** tls represents the TLS configuration. Currently the Ingress only supports a single TLS port, 443. If multiple members of this list specify different hosts, they will be multiplexed on the same port according to the hostname specified through the SNI TLS extension, if the ingress controller fulfilling the ingress supports SNI. */
  tls?: Maybe<Array<Maybe<V1_IngressTls>>>;
};

/** IngressStatus describe the current state of the Ingress. */
export type V1_IngressStatus = {
  __typename?: 'v1_IngressStatus';
  loadBalancer?: Maybe<V1_IngressLoadBalancerStatus>;
};

/** IngressTLS describes the transport layer security associated with an ingress. */
export type V1_IngressTls = {
  __typename?: 'v1_IngressTLS';
  /** hosts is a list of hosts included in the TLS certificate. The values in this list must match the name/s used in the tlsSecret. Defaults to the wildcard host setting for the loadbalancer controller fulfilling this Ingress, if left unspecified. */
  hosts?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** secretName is the name of the secret used to terminate TLS traffic on port 443. Field is left optional to allow TLS routing based on SNI hostname alone. If the SNI host in a listener conflicts with the "Host" header field used by an IngressRule, the SNI host is used for termination and value of the "Host" header is used for routing. */
  secretName?: Maybe<Scalars['String']['output']>;
};

/** Maps a string key to a path within a volume. */
export type V1_KeyToPath = {
  __typename?: 'v1_KeyToPath';
  /** key is the key to project. */
  key: Scalars['String']['output'];
  /** mode is Optional: mode bits used to set permissions on this file. Must be an octal value between 0000 and 0777 or a decimal value between 0 and 511. YAML accepts both octal and decimal values, JSON requires decimal values for mode bits. If not specified, the volume defaultMode will be used. This might be in conflict with other options that affect the file mode, like fsGroup, and the result can be other mode bits set. */
  mode?: Maybe<Scalars['Int']['output']>;
  /** path is the relative path of the file to map the key to. May not be an absolute path. May not contain the path element '..'. May not start with the string '..'. */
  path: Scalars['String']['output'];
};

/** A label selector is a label query over a set of resources. The result of matchLabels and matchExpressions are ANDed. An empty label selector matches all objects. A null label selector matches no objects. */
export type V1_LabelSelector = {
  __typename?: 'v1_LabelSelector';
  /** matchExpressions is a list of label selector requirements. The requirements are ANDed. */
  matchExpressions?: Maybe<Array<Maybe<V1_LabelSelectorRequirement>>>;
  /** matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels map is equivalent to an element of matchExpressions, whose key field is "key", the operator is "In", and the values array contains only "value". The requirements are ANDed. */
  matchLabels?: Maybe<Scalars['JSON']['output']>;
};

/** A label selector requirement is a selector that contains values, a key, and an operator that relates the key and values. */
export type V1_LabelSelectorRequirement = {
  __typename?: 'v1_LabelSelectorRequirement';
  /** key is the label key that the selector applies to. */
  key: Scalars['String']['output'];
  /** operator represents a key's relationship to a set of values. Valid operators are In, NotIn, Exists and DoesNotExist. */
  operator: Scalars['String']['output'];
  /** values is an array of string values. If the operator is In or NotIn, the values array must be non-empty. If the operator is Exists or DoesNotExist, the values array must be empty. This array is replaced during a strategic merge patch. */
  values?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

/** LinuxContainerUser represents user identity information in Linux containers */
export type V1_LinuxContainerUser = {
  __typename?: 'v1_LinuxContainerUser';
  /** GID is the primary gid initially attached to the first process in the container */
  gid: Scalars['BigInt']['output'];
  /** SupplementalGroups are the supplemental groups initially attached to the first process in the container */
  supplementalGroups?: Maybe<Array<Maybe<Scalars['BigInt']['output']>>>;
  /** UID is the primary uid initially attached to the first process in the container */
  uid: Scalars['BigInt']['output'];
};

/** LocalObjectReference contains enough information to let you locate the referenced object inside the same namespace. */
export type V1_LocalObjectReference = {
  __typename?: 'v1_LocalObjectReference';
  /** Name of the referent. This field is effectively required, but due to backwards compatibility is allowed to be empty. Instances of this type with an empty value here are almost certainly wrong. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names */
  name?: Maybe<Scalars['String']['output']>;
};

/** Local represents directly-attached storage with node affinity */
export type V1_LocalVolumeSource = {
  __typename?: 'v1_LocalVolumeSource';
  /** fsType is the filesystem type to mount. It applies only when the Path is a block device. Must be a filesystem type supported by the host operating system. Ex. "ext4", "xfs", "ntfs". The default value is to auto-select a filesystem if unspecified. */
  fsType?: Maybe<Scalars['String']['output']>;
  /** path of the full path to the volume on the node. It can be either a directory or block device (disk, partition, ...). */
  path: Scalars['String']['output'];
};

/** ManagedFieldsEntry is a workflow-id, a FieldSet and the group version of the resource that the fieldset applies to. */
export type V1_ManagedFieldsEntry = {
  __typename?: 'v1_ManagedFieldsEntry';
  /** APIVersion defines the version of this resource that this field set applies to. The format is "group/version" just like the top-level APIVersion field. It is necessary to track the version of a field set because it cannot be automatically converted. */
  apiVersion?: Maybe<Scalars['String']['output']>;
  /** FieldsType is the discriminator for the different fields format and version. There is currently only one possible value: "FieldsV1" */
  fieldsType?: Maybe<Scalars['String']['output']>;
  /**
   * FieldsV1 stores a set of fields in a data structure like a Trie, in JSON format.
   *
   * Each key is either a '.' representing the field itself, and will always map to an empty set, or a string representing a sub-field or item. The string will follow one of these four formats: 'f:<name>', where <name> is the name of a field in a struct, or key in a map 'v:<value>', where <value> is the exact json formatted value of a list item 'i:<index>', where <index> is position of a item in a list 'k:<keys>', where <keys> is a map of  a list item's key fields to their unique values If a key maps to an empty Fields value, the field that key represents is part of the set.
   *
   * The exact format is defined in sigs.k8s.io/structured-merge-diff
   */
  fieldsV1?: Maybe<Scalars['JSON']['output']>;
  /** Manager is an identifier of the workflow managing these fields. */
  manager?: Maybe<Scalars['String']['output']>;
  /** Operation is the type of operation which lead to this ManagedFieldsEntry being created. The only valid values for this field are 'Apply' and 'Update'. */
  operation?: Maybe<Scalars['String']['output']>;
  /** Subresource is the name of the subresource used to update that object, or empty string if the object was updated through the main resource. The value of this field is used to distinguish between managers, even if they share the same name. For example, a status update will be distinct from a regular update using the same manager name. Note that the APIVersion field is not related to the Subresource field and it always corresponds to the version of the main resource. */
  subresource?: Maybe<Scalars['String']['output']>;
  time?: Maybe<Scalars['String']['output']>;
};

/** Represents an NFS mount that lasts the lifetime of a pod. NFS volumes do not support ownership management or SELinux relabeling. */
export type V1_NfsVolumeSource = {
  __typename?: 'v1_NFSVolumeSource';
  /** path that is exported by the NFS server. More info: https://kubernetes.io/docs/concepts/storage/volumes#nfs */
  path: Scalars['String']['output'];
  /** readOnly here will force the NFS export to be mounted with read-only permissions. Defaults to false. More info: https://kubernetes.io/docs/concepts/storage/volumes#nfs */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  /** server is the hostname or IP address of the NFS server. More info: https://kubernetes.io/docs/concepts/storage/volumes#nfs */
  server: Scalars['String']['output'];
};

/** NetworkPolicyEgressRule describes a particular set of traffic that is allowed out of pods matched by a NetworkPolicySpec's podSelector. The traffic must match both ports and to. This type is beta-level in 1.8 */
export type V1_NetworkPolicyEgressRule = {
  __typename?: 'v1_NetworkPolicyEgressRule';
  /** ports is a list of destination ports for outgoing traffic. Each item in this list is combined using a logical OR. If this field is empty or missing, this rule matches all ports (traffic not restricted by port). If this field is present and contains at least one item, then this rule allows traffic only if the traffic matches at least one port in the list. */
  ports?: Maybe<Array<Maybe<V1_NetworkPolicyPort>>>;
  /** to is a list of destinations for outgoing traffic of pods selected for this rule. Items in this list are combined using a logical OR operation. If this field is empty or missing, this rule matches all destinations (traffic not restricted by destination). If this field is present and contains at least one item, this rule allows traffic only if the traffic matches at least one item in the to list. */
  to?: Maybe<Array<Maybe<V1_NetworkPolicyPeer>>>;
};

/** NetworkPolicyIngressRule describes a particular set of traffic that is allowed to the pods matched by a NetworkPolicySpec's podSelector. The traffic must match both ports and from. */
export type V1_NetworkPolicyIngressRule = {
  __typename?: 'v1_NetworkPolicyIngressRule';
  /** from is a list of sources which should be able to access the pods selected for this rule. Items in this list are combined using a logical OR operation. If this field is empty or missing, this rule matches all sources (traffic not restricted by source). If this field is present and contains at least one item, this rule allows traffic only if the traffic matches at least one item in the from list. */
  from?: Maybe<Array<Maybe<V1_NetworkPolicyPeer>>>;
  /** ports is a list of ports which should be made accessible on the pods selected for this rule. Each item in this list is combined using a logical OR. If this field is empty or missing, this rule matches all ports (traffic not restricted by port). If this field is present and contains at least one item, then this rule allows traffic only if the traffic matches at least one port in the list. */
  ports?: Maybe<Array<Maybe<V1_NetworkPolicyPort>>>;
};

/** NetworkPolicyPeer describes a peer to allow traffic to/from. Only certain combinations of fields are allowed */
export type V1_NetworkPolicyPeer = {
  __typename?: 'v1_NetworkPolicyPeer';
  ipBlock?: Maybe<V1_IpBlock>;
  namespaceSelector?: Maybe<V1_LabelSelector>;
  podSelector?: Maybe<V1_LabelSelector>;
};

/** NetworkPolicyPort describes a port to allow traffic on */
export type V1_NetworkPolicyPort = {
  __typename?: 'v1_NetworkPolicyPort';
  /** endPort indicates that the range of ports from port to endPort if set, inclusive, should be allowed by the policy. This field cannot be defined if the port field is not defined or if the port field is defined as a named (string) port. The endPort must be equal or greater than port. */
  endPort?: Maybe<Scalars['Int']['output']>;
  port?: Maybe<Scalars['String']['output']>;
  /** protocol represents the protocol (TCP, UDP, or SCTP) which traffic must match. If not specified, this field defaults to TCP. */
  protocol?: Maybe<Scalars['String']['output']>;
};

/** NodeAddress contains information for the node's address. */
export type V1_NodeAddress = {
  __typename?: 'v1_NodeAddress';
  /** The node address. */
  address: Scalars['String']['output'];
  /** Node address type, one of Hostname, ExternalIP or InternalIP. */
  type: Scalars['String']['output'];
};

/** NodeSystemInfo is a set of ids/uuids to uniquely identify the node. */
export type V1_NodeSystemInfo = {
  __typename?: 'v1_NodeSystemInfo';
  /** The Architecture reported by the node */
  architecture: Scalars['String']['output'];
  /** Boot ID reported by the node. */
  bootID: Scalars['String']['output'];
  /** ContainerRuntime Version reported by the node through runtime remote API (e.g. containerd://1.4.2). */
  containerRuntimeVersion: Scalars['String']['output'];
  /** Kernel Version reported by the node from 'uname -r' (e.g. 3.16.0-0.bpo.4-amd64). */
  kernelVersion: Scalars['String']['output'];
  /** Deprecated: KubeProxy Version reported by the node. */
  kubeProxyVersion: Scalars['String']['output'];
  /** Kubelet Version reported by the node. */
  kubeletVersion: Scalars['String']['output'];
  /** MachineID reported by the node. For unique machine identification in the cluster this field is preferred. Learn more from man(5) machine-id: http://man7.org/linux/man-pages/man5/machine-id.5.html */
  machineID: Scalars['String']['output'];
  /** The Operating System reported by the node */
  operatingSystem: Scalars['String']['output'];
  /** OS Image reported by the node from /etc/os-release (e.g. Debian GNU/Linux 7 (wheezy)). */
  osImage: Scalars['String']['output'];
  /** SystemUUID reported by the node. For unique machine identification MachineID is preferred. This field is specific to Red Hat hosts https://access.redhat.com/documentation/en-us/red_hat_subscription_management/1/html/rhsm/uuid */
  systemUUID: Scalars['String']['output'];
};

/** ObjectFieldSelector selects an APIVersioned field of an object. */
export type V1_ObjectFieldSelector = {
  __typename?: 'v1_ObjectFieldSelector';
  /** Version of the schema the FieldPath is written in terms of, defaults to "v1". */
  apiVersion?: Maybe<Scalars['String']['output']>;
  /** Path of the field to select in the specified API version. */
  fieldPath: Scalars['String']['output'];
};

/** ObjectMeta is metadata that all persisted resources must have, which includes all objects users must create. */
export type V1_ObjectMeta = {
  __typename?: 'v1_ObjectMeta';
  /** Annotations is an unstructured key value map stored with a resource that may be set by external tools to store and retrieve arbitrary metadata. They are not queryable and should be preserved when modifying objects. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations */
  annotations?: Maybe<Scalars['JSON']['output']>;
  creationTimestamp?: Maybe<Scalars['String']['output']>;
  /** Number of seconds allowed for this object to gracefully terminate before it will be removed from the system. Only set when deletionTimestamp is also set. May only be shortened. Read-only. */
  deletionGracePeriodSeconds?: Maybe<Scalars['BigInt']['output']>;
  deletionTimestamp?: Maybe<Scalars['String']['output']>;
  /** Must be empty before the object is deleted from the registry. Each entry is an identifier for the responsible component that will remove the entry from the list. If the deletionTimestamp of the object is non-nil, entries in this list can only be removed. Finalizers may be processed and removed in any order.  Order is NOT enforced because it introduces significant risk of stuck finalizers. finalizers is a shared field, any actor with permission can reorder it. If the finalizer list is processed in order, then this can lead to a situation in which the component responsible for the first finalizer in the list is waiting for a signal (field value, external system, or other) produced by a component responsible for a finalizer later in the list, resulting in a deadlock. Without enforced ordering finalizers are free to order amongst themselves and are not vulnerable to ordering changes in the list. */
  finalizers?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /**
   * GenerateName is an optional prefix, used by the server, to generate a unique name ONLY IF the Name field has not been provided. If this field is used, the name returned to the client will be different than the name passed. This value will also be combined with a unique suffix. The provided value has the same validation rules as the Name field, and may be truncated by the length of the suffix required to make the value unique on the server.
   *
   * If this field is specified and the generated name exists, the server will return a 409.
   *
   * Applied only if Name is not specified. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#idempotency
   */
  generateName?: Maybe<Scalars['String']['output']>;
  /** A sequence number representing a specific generation of the desired state. Populated by the system. Read-only. */
  generation?: Maybe<Scalars['BigInt']['output']>;
  /** Map of string keys and values that can be used to organize and categorize (scope and select) objects. May match selectors of replication controllers and services. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels */
  labels?: Maybe<Scalars['JSON']['output']>;
  /** ManagedFields maps workflow-id and version to the set of fields that are managed by that workflow. This is mostly for internal housekeeping, and users typically shouldn't need to set or understand this field. A workflow can be the user's name, a controller's name, or the name of a specific apply path like "ci-cd". The set of fields is always in the version that the workflow used when modifying the object. */
  managedFields?: Maybe<Array<Maybe<V1_ManagedFieldsEntry>>>;
  /** Name must be unique within a namespace. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#names */
  name?: Maybe<Scalars['String']['output']>;
  /**
   * Namespace defines the space within which each name must be unique. An empty namespace is equivalent to the "default" namespace, but "default" is the canonical representation. Not all objects are required to be scoped to a namespace - the value of this field for those objects will be empty.
   *
   * Must be a DNS_LABEL. Cannot be updated. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces
   */
  namespace?: Maybe<Scalars['String']['output']>;
  /** List of objects depended by this object. If ALL objects in the list have been deleted, this object will be garbage collected. If this object is managed by a controller, then an entry in this list will point to this controller, with the controller field set to true. There cannot be more than one managing controller. */
  ownerReferences?: Maybe<Array<Maybe<V1_OwnerReference>>>;
  /**
   * An opaque value that represents the internal version of this object that can be used by clients to determine when objects have changed. May be used for optimistic concurrency, change detection, and the watch operation on a resource or set of resources. Clients must treat these values as opaque and passed unmodified back to the server. They may only be valid for a particular resource or set of resources.
   *
   * Populated by the system. Read-only. Value must be treated as opaque by clients and . More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#concurrency-control-and-consistency
   */
  resourceVersion?: Maybe<Scalars['String']['output']>;
  /** Deprecated: selfLink is a legacy read-only field that is no longer populated by the system. */
  selfLink?: Maybe<Scalars['String']['output']>;
  /**
   * UID is the unique in time and space value for this object. It is typically generated by the server on successful creation of a resource and is not allowed to change on PUT operations.
   *
   * Populated by the system. Read-only. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#uids
   */
  uid?: Maybe<Scalars['String']['output']>;
};

/** ObjectReference contains enough information to let you inspect or modify the referred object. */
export type V1_ObjectReference = {
  __typename?: 'v1_ObjectReference';
  /** API version of the referent. */
  apiVersion?: Maybe<Scalars['String']['output']>;
  /** If referring to a piece of an object instead of an entire object, this string should contain a valid JSON/Go field access statement, such as desiredState.manifest.containers[2]. For example, if the object reference is to a container within a pod, this would take on a value like: "spec.containers{name}" (where "name" refers to the name of the container that triggered the event) or if no container name is specified "spec.containers[2]" (container with index 2 in this pod). This syntax is chosen only to have some well-defined way of referencing a part of an object. */
  fieldPath?: Maybe<Scalars['String']['output']>;
  /** Kind of the referent. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind?: Maybe<Scalars['String']['output']>;
  /** Name of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names */
  name?: Maybe<Scalars['String']['output']>;
  /** Namespace of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/ */
  namespace?: Maybe<Scalars['String']['output']>;
  /** Specific resourceVersion to which this reference is made, if any. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#concurrency-control-and-consistency */
  resourceVersion?: Maybe<Scalars['String']['output']>;
  /** UID of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#uids */
  uid?: Maybe<Scalars['String']['output']>;
};

/** OwnerReference contains enough information to let you identify an owning object. An owning object must be in the same namespace as the dependent, or be cluster-scoped, so there is no namespace field. */
export type V1_OwnerReference = {
  __typename?: 'v1_OwnerReference';
  /** API version of the referent. */
  apiVersion: Scalars['String']['output'];
  /** If true, AND if the owner has the "foregroundDeletion" finalizer, then the owner cannot be deleted from the key-value store until this reference is removed. See https://kubernetes.io/docs/concepts/architecture/garbage-collection/#foreground-deletion for how the garbage collector interacts with this field and enforces the foreground deletion. Defaults to false. To set this field, a user needs "delete" permission of the owner, otherwise 422 (Unprocessable Entity) will be returned. */
  blockOwnerDeletion?: Maybe<Scalars['Boolean']['output']>;
  /** If true, this reference points to the managing controller. */
  controller?: Maybe<Scalars['Boolean']['output']>;
  /** Kind of the referent. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind: Scalars['String']['output'];
  /** Name of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#names */
  name: Scalars['String']['output'];
  /** UID of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#uids */
  uid: Scalars['String']['output'];
};

/** PersistentVolumeClaimSpec describes the common attributes of storage devices and allows a Source for provider-specific attributes */
export type V1_PersistentVolumeClaimSpec = {
  __typename?: 'v1_PersistentVolumeClaimSpec';
  /** accessModes contains the desired access modes the volume should have. More info: https://kubernetes.io/docs/concepts/storage/persistent-volumes#access-modes-1 */
  accessModes?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  dataSource?: Maybe<V1_TypedLocalObjectReference>;
  dataSourceRef?: Maybe<V1_TypedObjectReference>;
  resources?: Maybe<V1_VolumeResourceRequirements>;
  selector?: Maybe<V1_LabelSelector>;
  /** storageClassName is the name of the StorageClass required by the claim. More info: https://kubernetes.io/docs/concepts/storage/persistent-volumes#class-1 */
  storageClassName?: Maybe<Scalars['String']['output']>;
  /** volumeAttributesClassName may be used to set the VolumeAttributesClass used by this claim. If specified, the CSI driver will create or update the volume with the attributes defined in the corresponding VolumeAttributesClass. This has a different purpose than storageClassName, it can be changed after the claim is created. An empty string value means that no VolumeAttributesClass will be applied to the claim but it's not allowed to reset this field to empty string once it is set. If unspecified and the PersistentVolumeClaim is unbound, the default VolumeAttributesClass will be set by the persistentvolume controller if it exists. If the resource referred to by volumeAttributesClass does not exist, this PersistentVolumeClaim will be set to a Pending state, as reflected by the modifyVolumeStatus field, until such as a resource exists. More info: https://kubernetes.io/docs/concepts/storage/volume-attributes-classes/ (Beta) Using this field requires the VolumeAttributesClass feature gate to be enabled (off by default). */
  volumeAttributesClassName?: Maybe<Scalars['String']['output']>;
  /** volumeMode defines what type of volume is required by the claim. Value of Filesystem is implied when not included in claim spec. */
  volumeMode?: Maybe<Scalars['String']['output']>;
  /** volumeName is the binding reference to the PersistentVolume backing this claim. */
  volumeName?: Maybe<Scalars['String']['output']>;
};

/** PersistentVolumeClaimTemplate is used to produce PersistentVolumeClaim objects as part of an EphemeralVolumeSource. */
export type V1_PersistentVolumeClaimTemplate = {
  __typename?: 'v1_PersistentVolumeClaimTemplate';
  metadata?: Maybe<V1_ObjectMeta>;
  spec: V1_PersistentVolumeClaimSpec;
};

/** PersistentVolumeClaimVolumeSource references the user's PVC in the same namespace. This volume finds the bound PV and mounts that volume for the pod. A PersistentVolumeClaimVolumeSource is, essentially, a wrapper around another type of volume that is owned by someone else (the system). */
export type V1_PersistentVolumeClaimVolumeSource = {
  __typename?: 'v1_PersistentVolumeClaimVolumeSource';
  /** claimName is the name of a PersistentVolumeClaim in the same namespace as the pod using this volume. More info: https://kubernetes.io/docs/concepts/storage/persistent-volumes#persistentvolumeclaims */
  claimName: Scalars['String']['output'];
  /** readOnly Will force the ReadOnly setting in VolumeMounts. Default false. */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
};

/** PersistentVolumeSource is similar to VolumeSource but meant for the administrator who creates PVs. Exactly one of its members must be set. */
export type V1_PersistentVolumeSource = {
  __typename?: 'v1_PersistentVolumeSource';
  awsElasticBlockStore?: Maybe<V1_AwsElasticBlockStoreVolumeSource>;
  azureDisk?: Maybe<V1_AzureDiskVolumeSource>;
  azureFile?: Maybe<V1_AzureFilePersistentVolumeSource>;
  cephfs?: Maybe<V1_CephFsPersistentVolumeSource>;
  cinder?: Maybe<V1_CinderPersistentVolumeSource>;
  csi?: Maybe<V1_CsiPersistentVolumeSource>;
  fc?: Maybe<V1_FcVolumeSource>;
  flexVolume?: Maybe<V1_FlexPersistentVolumeSource>;
  flocker?: Maybe<V1_FlockerVolumeSource>;
  gcePersistentDisk?: Maybe<V1_GcePersistentDiskVolumeSource>;
  glusterfs?: Maybe<V1_GlusterfsPersistentVolumeSource>;
  hostPath?: Maybe<V1_HostPathVolumeSource>;
  iscsi?: Maybe<V1_IscsiPersistentVolumeSource>;
  local?: Maybe<V1_LocalVolumeSource>;
  nfs?: Maybe<V1_NfsVolumeSource>;
  photonPersistentDisk?: Maybe<V1_PhotonPersistentDiskVolumeSource>;
  portworxVolume?: Maybe<V1_PortworxVolumeSource>;
  quobyte?: Maybe<V1_QuobyteVolumeSource>;
  rbd?: Maybe<V1_RbdPersistentVolumeSource>;
  scaleIO?: Maybe<V1_ScaleIoPersistentVolumeSource>;
  storageos?: Maybe<V1_StorageOsPersistentVolumeSource>;
  vsphereVolume?: Maybe<V1_VsphereVirtualDiskVolumeSource>;
};

/** Represents a Photon Controller persistent disk resource. */
export type V1_PhotonPersistentDiskVolumeSource = {
  __typename?: 'v1_PhotonPersistentDiskVolumeSource';
  /** fsType is the filesystem type to mount. Must be a filesystem type supported by the host operating system. Ex. "ext4", "xfs", "ntfs". Implicitly inferred to be "ext4" if unspecified. */
  fsType?: Maybe<Scalars['String']['output']>;
  /** pdID is the ID that identifies Photon Controller persistent disk */
  pdID: Scalars['String']['output'];
};

/** PodSecurityContext holds pod-level security attributes and common container settings. Some fields are also present in container.securityContext.  Field values of container.securityContext take precedence over field values of PodSecurityContext. */
export type V1_PodSecurityContext = {
  __typename?: 'v1_PodSecurityContext';
  appArmorProfile?: Maybe<V1_AppArmorProfile>;
  /**
   * A special supplemental group that applies to all containers in a pod. Some volume types allow the Kubelet to change the ownership of that volume to be owned by the pod:
   *
   * 1. The owning GID will be the FSGroup 2. The setgid bit is set (new files created in the volume will be owned by FSGroup) 3. The permission bits are OR'd with rw-rw
   */
  fsGroup?: Maybe<Scalars['BigInt']['output']>;
  /** fsGroupChangePolicy defines behavior of changing ownership and permission of the volume before being exposed inside Pod. This field will only apply to volume types which support fsGroup based ownership(and permissions). It will have no effect on ephemeral volume types such as: secret, configmaps and emptydir. Valid values are "OnRootMismatch" and "Always". If not specified, "Always" is used. Note that this field cannot be set when spec.os.name is windows. */
  fsGroupChangePolicy?: Maybe<Scalars['String']['output']>;
  /** The GID to run the entrypoint of the container process. Uses runtime default if unset. May also be set in SecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence for that container. Note that this field cannot be set when spec.os.name is windows. */
  runAsGroup?: Maybe<Scalars['BigInt']['output']>;
  /** Indicates that the container must run as a non-root user. If true, the Kubelet will validate the image at runtime to ensure that it does not run as UID 0 (root) and fail to start the container if it does. If unset or false, no such validation will be performed. May also be set in SecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence. */
  runAsNonRoot?: Maybe<Scalars['Boolean']['output']>;
  /** The UID to run the entrypoint of the container process. Defaults to user specified in image metadata if unspecified. May also be set in SecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence for that container. Note that this field cannot be set when spec.os.name is windows. */
  runAsUser?: Maybe<Scalars['BigInt']['output']>;
  /**
   * seLinuxChangePolicy defines how the container's SELinux label is applied to all volumes used by the Pod. It has no effect on nodes that do not support SELinux or to volumes does not support SELinux. Valid values are "MountOption" and "Recursive".
   *
   * "Recursive" means relabeling of all files on all Pod volumes by the container runtime. This may be slow for large volumes, but allows mixing privileged and unprivileged Pods sharing the same volume on the same node.
   *
   * "MountOption" mounts all eligible Pod volumes with `-o context` mount option. This requires all Pods that share the same volume to use the same SELinux label. It is not possible to share the same volume among privileged and unprivileged Pods. Eligible volumes are in-tree FibreChannel and iSCSI volumes, and all CSI volumes whose CSI driver announces SELinux support by setting spec.seLinuxMount: true in their CSIDriver instance. Other volumes are always re-labelled recursively. "MountOption" value is allowed only when SELinuxMount feature gate is enabled.
   *
   * If not specified and SELinuxMount feature gate is enabled, "MountOption" is used. If not specified and SELinuxMount feature gate is disabled, "MountOption" is used for ReadWriteOncePod volumes and "Recursive" for all other volumes.
   *
   * This field affects only Pods that have SELinux label set, either in PodSecurityContext or in SecurityContext of all containers.
   *
   * All Pods that use the same volume should use the same seLinuxChangePolicy, otherwise some pods can get stuck in ContainerCreating state. Note that this field cannot be set when spec.os.name is windows.
   */
  seLinuxChangePolicy?: Maybe<Scalars['String']['output']>;
  seLinuxOptions?: Maybe<V1_SeLinuxOptions>;
  seccompProfile?: Maybe<V1_SeccompProfile>;
  /** A list of groups applied to the first process run in each container, in addition to the container's primary GID and fsGroup (if specified).  If the SupplementalGroupsPolicy feature is enabled, the supplementalGroupsPolicy field determines whether these are in addition to or instead of any group memberships defined in the container image. If unspecified, no additional groups are added, though group memberships defined in the container image may still be used, depending on the supplementalGroupsPolicy field. Note that this field cannot be set when spec.os.name is windows. */
  supplementalGroups?: Maybe<Array<Maybe<Scalars['BigInt']['output']>>>;
  /** Defines how supplemental groups of the first container processes are calculated. Valid values are "Merge" and "Strict". If not specified, "Merge" is used. (Alpha) Using the field requires the SupplementalGroupsPolicy feature gate to be enabled and the container runtime must implement support for this feature. Note that this field cannot be set when spec.os.name is windows. */
  supplementalGroupsPolicy?: Maybe<Scalars['String']['output']>;
  /** Sysctls hold a list of namespaced sysctls used for the pod. Pods with unsupported sysctls (by the container runtime) might fail to launch. Note that this field cannot be set when spec.os.name is windows. */
  sysctls?: Maybe<Array<Maybe<V1_Sysctl>>>;
  windowsOptions?: Maybe<V1_WindowsSecurityContextOptions>;
};

/** PolicyRule holds information that describes a policy rule, but does not contain information about who the rule applies to or which namespace the rule applies to. */
export type V1_PolicyRule = {
  __typename?: 'v1_PolicyRule';
  /** APIGroups is the name of the APIGroup that contains the resources.  If multiple API groups are specified, any action requested against one of the enumerated resources in any API group will be allowed. "" represents the core API group and "*" represents all API groups. */
  apiGroups?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** NonResourceURLs is a set of partial urls that a user should have access to.  *s are allowed, but only as the full, final step in the path Since non-resource URLs are not namespaced, this field is only applicable for ClusterRoles referenced from a ClusterRoleBinding. Rules can either apply to API resources (such as "pods" or "secrets") or non-resource URL paths (such as "/api"),  but not both. */
  nonResourceURLs?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** ResourceNames is an optional white list of names that the rule applies to.  An empty set means that everything is allowed. */
  resourceNames?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** Resources is a list of resources this rule applies to. '*' represents all resources. */
  resources?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** Verbs is a list of Verbs that apply to ALL the ResourceKinds contained in this rule. '*' represents all verbs. */
  verbs: Array<Maybe<Scalars['String']['output']>>;
};

/** PortworxVolumeSource represents a Portworx volume resource. */
export type V1_PortworxVolumeSource = {
  __typename?: 'v1_PortworxVolumeSource';
  /** fSType represents the filesystem type to mount Must be a filesystem type supported by the host operating system. Ex. "ext4", "xfs". Implicitly inferred to be "ext4" if unspecified. */
  fsType?: Maybe<Scalars['String']['output']>;
  /** readOnly defaults to false (read/write). ReadOnly here will force the ReadOnly setting in VolumeMounts. */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  /** volumeID uniquely identifies a Portworx volume */
  volumeID: Scalars['String']['output'];
};

/** Probe describes a health check to be performed against a container to determine whether it is alive or ready to receive traffic. */
export type V1_Probe = {
  __typename?: 'v1_Probe';
  exec?: Maybe<V1_ExecAction>;
  /** Minimum consecutive failures for the probe to be considered failed after having succeeded. Defaults to 3. Minimum value is 1. */
  failureThreshold?: Maybe<Scalars['Int']['output']>;
  grpc?: Maybe<V1_GrpcAction>;
  httpGet?: Maybe<V1_HttpGetAction>;
  /** Number of seconds after the container has started before liveness probes are initiated. More info: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle#container-probes */
  initialDelaySeconds?: Maybe<Scalars['Int']['output']>;
  /** How often (in seconds) to perform the probe. Default to 10 seconds. Minimum value is 1. */
  periodSeconds?: Maybe<Scalars['Int']['output']>;
  /** Minimum consecutive successes for the probe to be considered successful after having failed. Defaults to 1. Must be 1 for liveness and startup. Minimum value is 1. */
  successThreshold?: Maybe<Scalars['Int']['output']>;
  tcpSocket?: Maybe<V1_TcpSocketAction>;
  /** Optional duration in seconds the pod needs to terminate gracefully upon probe failure. The grace period is the duration in seconds after the processes running in the pod are sent a termination signal and the time when the processes are forcibly halted with a kill signal. Set this value longer than the expected cleanup time for your process. If this value is nil, the pod's terminationGracePeriodSeconds will be used. Otherwise, this value overrides the value provided by the pod spec. Value must be non-negative integer. The value zero indicates stop immediately via the kill signal (no opportunity to shut down). This is a beta field and requires enabling ProbeTerminationGracePeriod feature gate. Minimum value is 1. spec.terminationGracePeriodSeconds is used if unset. */
  terminationGracePeriodSeconds?: Maybe<Scalars['BigInt']['output']>;
  /** Number of seconds after which the probe times out. Defaults to 1 second. Minimum value is 1. More info: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle#container-probes */
  timeoutSeconds?: Maybe<Scalars['Int']['output']>;
};

/** Represents a projected volume source */
export type V1_ProjectedVolumeSource = {
  __typename?: 'v1_ProjectedVolumeSource';
  /** defaultMode are the mode bits used to set permissions on created files by default. Must be an octal value between 0000 and 0777 or a decimal value between 0 and 511. YAML accepts both octal and decimal values, JSON requires decimal values for mode bits. Directories within the path are not affected by this setting. This might be in conflict with other options that affect the file mode, like fsGroup, and the result can be other mode bits set. */
  defaultMode?: Maybe<Scalars['Int']['output']>;
  /** sources is the list of volume projections. Each entry in this list handles one source. */
  sources: Array<Maybe<V1_VolumeProjection>>;
};

/** Represents a Quobyte mount that lasts the lifetime of a pod. Quobyte volumes do not support ownership management or SELinux relabeling. */
export type V1_QuobyteVolumeSource = {
  __typename?: 'v1_QuobyteVolumeSource';
  /** group to map volume access to Default is no group */
  group?: Maybe<Scalars['String']['output']>;
  /** readOnly here will force the Quobyte volume to be mounted with read-only permissions. Defaults to false. */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  /** registry represents a single or multiple Quobyte Registry services specified as a string as host:port pair (multiple entries are separated with commas) which acts as the central registry for volumes */
  registry: Scalars['String']['output'];
  /** tenant owning the given Quobyte volume in the Backend Used with dynamically provisioned Quobyte volumes, value is set by the plugin */
  tenant?: Maybe<Scalars['String']['output']>;
  /** user to map volume access to Defaults to serivceaccount user */
  user?: Maybe<Scalars['String']['output']>;
  /** volume is a string that references an already created Quobyte volume by name. */
  volume: Scalars['String']['output'];
};

/** Represents a Rados Block Device mount that lasts the lifetime of a pod. RBD volumes support ownership management and SELinux relabeling. */
export type V1_RbdPersistentVolumeSource = {
  __typename?: 'v1_RBDPersistentVolumeSource';
  /** fsType is the filesystem type of the volume that you want to mount. Tip: Ensure that the filesystem type is supported by the host operating system. Examples: "ext4", "xfs", "ntfs". Implicitly inferred to be "ext4" if unspecified. More info: https://kubernetes.io/docs/concepts/storage/volumes#rbd */
  fsType?: Maybe<Scalars['String']['output']>;
  /** image is the rados image name. More info: https://examples.k8s.io/volumes/rbd/README.md#how-to-use-it */
  image: Scalars['String']['output'];
  /** keyring is the path to key ring for RBDUser. Default is /etc/ceph/keyring. More info: https://examples.k8s.io/volumes/rbd/README.md#how-to-use-it */
  keyring?: Maybe<Scalars['String']['output']>;
  /** monitors is a collection of Ceph monitors. More info: https://examples.k8s.io/volumes/rbd/README.md#how-to-use-it */
  monitors: Array<Maybe<Scalars['String']['output']>>;
  /** pool is the rados pool name. Default is rbd. More info: https://examples.k8s.io/volumes/rbd/README.md#how-to-use-it */
  pool?: Maybe<Scalars['String']['output']>;
  /** readOnly here will force the ReadOnly setting in VolumeMounts. Defaults to false. More info: https://examples.k8s.io/volumes/rbd/README.md#how-to-use-it */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  secretRef?: Maybe<V1_SecretReference>;
  /** user is the rados user name. Default is admin. More info: https://examples.k8s.io/volumes/rbd/README.md#how-to-use-it */
  user?: Maybe<Scalars['String']['output']>;
};

/** Represents a Rados Block Device mount that lasts the lifetime of a pod. RBD volumes support ownership management and SELinux relabeling. */
export type V1_RbdVolumeSource = {
  __typename?: 'v1_RBDVolumeSource';
  /** fsType is the filesystem type of the volume that you want to mount. Tip: Ensure that the filesystem type is supported by the host operating system. Examples: "ext4", "xfs", "ntfs". Implicitly inferred to be "ext4" if unspecified. More info: https://kubernetes.io/docs/concepts/storage/volumes#rbd */
  fsType?: Maybe<Scalars['String']['output']>;
  /** image is the rados image name. More info: https://examples.k8s.io/volumes/rbd/README.md#how-to-use-it */
  image: Scalars['String']['output'];
  /** keyring is the path to key ring for RBDUser. Default is /etc/ceph/keyring. More info: https://examples.k8s.io/volumes/rbd/README.md#how-to-use-it */
  keyring?: Maybe<Scalars['String']['output']>;
  /** monitors is a collection of Ceph monitors. More info: https://examples.k8s.io/volumes/rbd/README.md#how-to-use-it */
  monitors: Array<Maybe<Scalars['String']['output']>>;
  /** pool is the rados pool name. Default is rbd. More info: https://examples.k8s.io/volumes/rbd/README.md#how-to-use-it */
  pool?: Maybe<Scalars['String']['output']>;
  /** readOnly here will force the ReadOnly setting in VolumeMounts. Defaults to false. More info: https://examples.k8s.io/volumes/rbd/README.md#how-to-use-it */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  secretRef?: Maybe<V1_LocalObjectReference>;
  /** user is the rados user name. Default is admin. More info: https://examples.k8s.io/volumes/rbd/README.md#how-to-use-it */
  user?: Maybe<Scalars['String']['output']>;
};

/** ResourceClaim references one entry in PodSpec.ResourceClaims. */
export type V1_ResourceClaim = {
  __typename?: 'v1_ResourceClaim';
  /** Name must match the name of one entry in pod.spec.resourceClaims of the Pod where this field is used. It makes that resource available inside a container. */
  name: Scalars['String']['output'];
  /** Request is the name chosen for a request in the referenced claim. If empty, everything from the claim is made available, otherwise only the result of this request. */
  request?: Maybe<Scalars['String']['output']>;
};

/** ResourceFieldSelector represents container resources (cpu, memory) and their output format */
export type V1_ResourceFieldSelector = {
  __typename?: 'v1_ResourceFieldSelector';
  /** Container name: required for volumes, optional for env vars */
  containerName?: Maybe<Scalars['String']['output']>;
  divisor?: Maybe<Scalars['String']['output']>;
  /** Required: resource to select */
  resource: Scalars['String']['output'];
};

/** ResourceHealth represents the health of a resource. It has the latest device health information. This is a part of KEP https://kep.k8s.io/4680. */
export type V1_ResourceHealth = {
  __typename?: 'v1_ResourceHealth';
  /**
   * Health of the resource. can be one of:
   * - Healthy: operates as normal
   * - Unhealthy: reported unhealthy. We consider this a temporary health issue
   * since we do not have a mechanism today to distinguish
   * temporary and permanent issues.
   * - Unknown: The status cannot be determined.
   * For example, Device Plugin got unregistered and hasn't been re-registered since.
   *
   * In future we may want to introduce the PermanentlyUnhealthy Status.
   */
  health?: Maybe<Scalars['String']['output']>;
  /** ResourceID is the unique identifier of the resource. See the ResourceID type for more information. */
  resourceID: Scalars['String']['output'];
};

/** ResourceRequirements describes the compute resource requirements. */
export type V1_ResourceRequirements = {
  __typename?: 'v1_ResourceRequirements';
  /**
   * Claims lists the names of resources, defined in spec.resourceClaims, that are used by this container.
   *
   * This is an alpha field and requires enabling the DynamicResourceAllocation feature gate.
   *
   * This field is immutable. It can only be set for containers.
   */
  claims?: Maybe<Array<Maybe<V1_ResourceClaim>>>;
  limits: Scalars['ObjMap']['output'];
  requests: Scalars['ObjMap']['output'];
};

/** ResourceStatus represents the status of a single resource allocated to a Pod. */
export type V1_ResourceStatus = {
  __typename?: 'v1_ResourceStatus';
  /** Name of the resource. Must be unique within the pod and in case of non-DRA resource, match one of the resources from the pod spec. For DRA resources, the value must be "claim:<claim_name>/<request>". When this status is reported about a container, the "claim_name" and "request" must match one of the claims of this container. */
  name: Scalars['String']['output'];
  /** List of unique resources health. Each element in the list contains an unique resource ID and its health. At a minimum, for the lifetime of a Pod, resource ID must uniquely identify the resource allocated to the Pod on the Node. If other Pod on the same Node reports the status with the same resource ID, it must be the same resource they share. See ResourceID type definition for a specific format it has in various use cases. */
  resources?: Maybe<Array<Maybe<V1_ResourceHealth>>>;
};

/** RoleRef contains information that points to the role being used */
export type V1_RoleRef = {
  __typename?: 'v1_RoleRef';
  /** APIGroup is the group for the resource being referenced */
  apiGroup: Scalars['String']['output'];
  /** Kind is the type of resource being referenced */
  kind: Scalars['String']['output'];
  /** Name is the name of resource being referenced */
  name: Scalars['String']['output'];
};

/** SELinuxOptions are the labels to be applied to the container */
export type V1_SeLinuxOptions = {
  __typename?: 'v1_SELinuxOptions';
  /** Level is SELinux level label that applies to the container. */
  level?: Maybe<Scalars['String']['output']>;
  /** Role is a SELinux role label that applies to the container. */
  role?: Maybe<Scalars['String']['output']>;
  /** Type is a SELinux type label that applies to the container. */
  type?: Maybe<Scalars['String']['output']>;
  /** User is a SELinux user label that applies to the container. */
  user?: Maybe<Scalars['String']['output']>;
};

/** ScaleIOPersistentVolumeSource represents a persistent ScaleIO volume */
export type V1_ScaleIoPersistentVolumeSource = {
  __typename?: 'v1_ScaleIOPersistentVolumeSource';
  /** fsType is the filesystem type to mount. Must be a filesystem type supported by the host operating system. Ex. "ext4", "xfs", "ntfs". Default is "xfs" */
  fsType?: Maybe<Scalars['String']['output']>;
  /** gateway is the host address of the ScaleIO API Gateway. */
  gateway: Scalars['String']['output'];
  /** protectionDomain is the name of the ScaleIO Protection Domain for the configured storage. */
  protectionDomain?: Maybe<Scalars['String']['output']>;
  /** readOnly defaults to false (read/write). ReadOnly here will force the ReadOnly setting in VolumeMounts. */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  secretRef: V1_SecretReference;
  /** sslEnabled is the flag to enable/disable SSL communication with Gateway, default false */
  sslEnabled?: Maybe<Scalars['Boolean']['output']>;
  /** storageMode indicates whether the storage for a volume should be ThickProvisioned or ThinProvisioned. Default is ThinProvisioned. */
  storageMode?: Maybe<Scalars['String']['output']>;
  /** storagePool is the ScaleIO Storage Pool associated with the protection domain. */
  storagePool?: Maybe<Scalars['String']['output']>;
  /** system is the name of the storage system as configured in ScaleIO. */
  system: Scalars['String']['output'];
  /** volumeName is the name of a volume already created in the ScaleIO system that is associated with this volume source. */
  volumeName?: Maybe<Scalars['String']['output']>;
};

/** ScaleIOVolumeSource represents a persistent ScaleIO volume */
export type V1_ScaleIoVolumeSource = {
  __typename?: 'v1_ScaleIOVolumeSource';
  /** fsType is the filesystem type to mount. Must be a filesystem type supported by the host operating system. Ex. "ext4", "xfs", "ntfs". Default is "xfs". */
  fsType?: Maybe<Scalars['String']['output']>;
  /** gateway is the host address of the ScaleIO API Gateway. */
  gateway: Scalars['String']['output'];
  /** protectionDomain is the name of the ScaleIO Protection Domain for the configured storage. */
  protectionDomain?: Maybe<Scalars['String']['output']>;
  /** readOnly Defaults to false (read/write). ReadOnly here will force the ReadOnly setting in VolumeMounts. */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  secretRef: V1_LocalObjectReference;
  /** sslEnabled Flag enable/disable SSL communication with Gateway, default false */
  sslEnabled?: Maybe<Scalars['Boolean']['output']>;
  /** storageMode indicates whether the storage for a volume should be ThickProvisioned or ThinProvisioned. Default is ThinProvisioned. */
  storageMode?: Maybe<Scalars['String']['output']>;
  /** storagePool is the ScaleIO Storage Pool associated with the protection domain. */
  storagePool?: Maybe<Scalars['String']['output']>;
  /** system is the name of the storage system as configured in ScaleIO. */
  system: Scalars['String']['output'];
  /** volumeName is the name of a volume already created in the ScaleIO system that is associated with this volume source. */
  volumeName?: Maybe<Scalars['String']['output']>;
};

/** SeccompProfile defines a pod/container's seccomp profile settings. Only one profile source may be set. */
export type V1_SeccompProfile = {
  __typename?: 'v1_SeccompProfile';
  /** localhostProfile indicates a profile defined in a file on the node should be used. The profile must be preconfigured on the node to work. Must be a descending path, relative to the kubelet's configured seccomp profile location. Must be set if type is "Localhost". Must NOT be set for any other type. */
  localhostProfile?: Maybe<Scalars['String']['output']>;
  /**
   * type indicates which kind of seccomp profile will be applied. Valid options are:
   *
   * Localhost - a profile defined in a file on the node should be used. RuntimeDefault - the container runtime default profile should be used. Unconfined - no profile should be applied.
   */
  type: Scalars['String']['output'];
};

/** SecretKeySelector selects a key of a Secret. */
export type V1_SecretKeySelector = {
  __typename?: 'v1_SecretKeySelector';
  /** The key of the secret to select from.  Must be a valid secret key. */
  key: Scalars['String']['output'];
  /** Name of the referent. This field is effectively required, but due to backwards compatibility is allowed to be empty. Instances of this type with an empty value here are almost certainly wrong. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names */
  name?: Maybe<Scalars['String']['output']>;
  /** Specify whether the Secret or its key must be defined */
  optional?: Maybe<Scalars['Boolean']['output']>;
};

/**
 * Adapts a secret into a projected volume.
 *
 * The contents of the target Secret's Data field will be presented in a projected volume as files using the keys in the Data field as the file names. Note that this is identical to a secret volume source without the default mode.
 */
export type V1_SecretProjection = {
  __typename?: 'v1_SecretProjection';
  /** items if unspecified, each key-value pair in the Data field of the referenced Secret will be projected into the volume as a file whose name is the key and content is the value. If specified, the listed keys will be projected into the specified paths, and unlisted keys will not be present. If a key is specified which is not present in the Secret, the volume setup will error unless it is marked optional. Paths must be relative and may not contain the '..' path or start with '..'. */
  items?: Maybe<Array<Maybe<V1_KeyToPath>>>;
  /** Name of the referent. This field is effectively required, but due to backwards compatibility is allowed to be empty. Instances of this type with an empty value here are almost certainly wrong. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names */
  name?: Maybe<Scalars['String']['output']>;
  /** optional field specify whether the Secret or its key must be defined */
  optional?: Maybe<Scalars['Boolean']['output']>;
};

/** SecretReference represents a Secret Reference. It has enough information to retrieve secret in any namespace */
export type V1_SecretReference = {
  __typename?: 'v1_SecretReference';
  /** name is unique within a namespace to reference a secret resource. */
  name?: Maybe<Scalars['String']['output']>;
  /** namespace defines the space within which the secret name must be unique. */
  namespace?: Maybe<Scalars['String']['output']>;
};

/**
 * Adapts a Secret into a volume.
 *
 * The contents of the target Secret's Data field will be presented in a volume as files using the keys in the Data field as the file names. Secret volumes support ownership management and SELinux relabeling.
 */
export type V1_SecretVolumeSource = {
  __typename?: 'v1_SecretVolumeSource';
  /** defaultMode is Optional: mode bits used to set permissions on created files by default. Must be an octal value between 0000 and 0777 or a decimal value between 0 and 511. YAML accepts both octal and decimal values, JSON requires decimal values for mode bits. Defaults to 0644. Directories within the path are not affected by this setting. This might be in conflict with other options that affect the file mode, like fsGroup, and the result can be other mode bits set. */
  defaultMode?: Maybe<Scalars['Int']['output']>;
  /** items If unspecified, each key-value pair in the Data field of the referenced Secret will be projected into the volume as a file whose name is the key and content is the value. If specified, the listed keys will be projected into the specified paths, and unlisted keys will not be present. If a key is specified which is not present in the Secret, the volume setup will error unless it is marked optional. Paths must be relative and may not contain the '..' path or start with '..'. */
  items?: Maybe<Array<Maybe<V1_KeyToPath>>>;
  /** optional field specify whether the Secret or its keys must be defined */
  optional?: Maybe<Scalars['Boolean']['output']>;
  /** secretName is the name of the secret in the pod's namespace to use. More info: https://kubernetes.io/docs/concepts/storage/volumes#secret */
  secretName?: Maybe<Scalars['String']['output']>;
};

/** SecurityContext holds security configuration that will be applied to a container. Some fields are present in both SecurityContext and PodSecurityContext.  When both are set, the values in SecurityContext take precedence. */
export type V1_SecurityContext = {
  __typename?: 'v1_SecurityContext';
  /** AllowPrivilegeEscalation controls whether a process can gain more privileges than its parent process. This bool directly controls if the no_new_privs flag will be set on the container process. AllowPrivilegeEscalation is true always when the container is: 1) run as Privileged 2) has CAP_SYS_ADMIN Note that this field cannot be set when spec.os.name is windows. */
  allowPrivilegeEscalation?: Maybe<Scalars['Boolean']['output']>;
  appArmorProfile?: Maybe<V1_AppArmorProfile>;
  capabilities?: Maybe<V1_Capabilities>;
  /** Run container in privileged mode. Processes in privileged containers are essentially equivalent to root on the host. Defaults to false. Note that this field cannot be set when spec.os.name is windows. */
  privileged?: Maybe<Scalars['Boolean']['output']>;
  /** procMount denotes the type of proc mount to use for the containers. The default value is Default which uses the container runtime defaults for readonly paths and masked paths. This requires the ProcMountType feature flag to be enabled. Note that this field cannot be set when spec.os.name is windows. */
  procMount?: Maybe<Scalars['String']['output']>;
  /** Whether this container has a read-only root filesystem. Default is false. Note that this field cannot be set when spec.os.name is windows. */
  readOnlyRootFilesystem?: Maybe<Scalars['Boolean']['output']>;
  /** The GID to run the entrypoint of the container process. Uses runtime default if unset. May also be set in PodSecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence. Note that this field cannot be set when spec.os.name is windows. */
  runAsGroup?: Maybe<Scalars['BigInt']['output']>;
  /** Indicates that the container must run as a non-root user. If true, the Kubelet will validate the image at runtime to ensure that it does not run as UID 0 (root) and fail to start the container if it does. If unset or false, no such validation will be performed. May also be set in PodSecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence. */
  runAsNonRoot?: Maybe<Scalars['Boolean']['output']>;
  /** The UID to run the entrypoint of the container process. Defaults to user specified in image metadata if unspecified. May also be set in PodSecurityContext.  If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence. Note that this field cannot be set when spec.os.name is windows. */
  runAsUser?: Maybe<Scalars['BigInt']['output']>;
  seLinuxOptions?: Maybe<V1_SeLinuxOptions>;
  seccompProfile?: Maybe<V1_SeccompProfile>;
  windowsOptions?: Maybe<V1_WindowsSecurityContextOptions>;
};

/** ServiceAccountTokenProjection represents a projected service account token volume. This projection can be used to insert a service account token into the pods runtime filesystem for use against APIs (Kubernetes API Server or otherwise). */
export type V1_ServiceAccountTokenProjection = {
  __typename?: 'v1_ServiceAccountTokenProjection';
  /** audience is the intended audience of the token. A recipient of a token must identify itself with an identifier specified in the audience of the token, and otherwise should reject the token. The audience defaults to the identifier of the apiserver. */
  audience?: Maybe<Scalars['String']['output']>;
  /** expirationSeconds is the requested duration of validity of the service account token. As the token approaches expiration, the kubelet volume plugin will proactively rotate the service account token. The kubelet will start trying to rotate the token if the token is older than 80 percent of its time to live or if the token is older than 24 hours.Defaults to 1 hour and must be at least 10 minutes. */
  expirationSeconds?: Maybe<Scalars['BigInt']['output']>;
  /** path is the path relative to the mount point of the file to project the token into. */
  path: Scalars['String']['output'];
};

/** ServiceBackendPort is the service port being referenced. */
export type V1_ServiceBackendPort = {
  __typename?: 'v1_ServiceBackendPort';
  /** name is the name of the port on the Service. This is a mutually exclusive setting with "Number". */
  name?: Maybe<Scalars['String']['output']>;
  /** number is the numerical port number (e.g. 80) on the Service. This is a mutually exclusive setting with "Name". */
  number?: Maybe<Scalars['Int']['output']>;
};

/** Represents a StorageOS persistent volume resource. */
export type V1_StorageOsPersistentVolumeSource = {
  __typename?: 'v1_StorageOSPersistentVolumeSource';
  /** fsType is the filesystem type to mount. Must be a filesystem type supported by the host operating system. Ex. "ext4", "xfs", "ntfs". Implicitly inferred to be "ext4" if unspecified. */
  fsType?: Maybe<Scalars['String']['output']>;
  /** readOnly defaults to false (read/write). ReadOnly here will force the ReadOnly setting in VolumeMounts. */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  secretRef?: Maybe<V1_ObjectReference>;
  /** volumeName is the human-readable name of the StorageOS volume.  Volume names are only unique within a namespace. */
  volumeName?: Maybe<Scalars['String']['output']>;
  /** volumeNamespace specifies the scope of the volume within StorageOS.  If no namespace is specified then the Pod's namespace will be used.  This allows the Kubernetes name scoping to be mirrored within StorageOS for tighter integration. Set VolumeName to any name to override the default behaviour. Set to "default" if you are not using namespaces within StorageOS. Namespaces that do not pre-exist within StorageOS will be created. */
  volumeNamespace?: Maybe<Scalars['String']['output']>;
};

/** Represents a StorageOS persistent volume resource. */
export type V1_StorageOsVolumeSource = {
  __typename?: 'v1_StorageOSVolumeSource';
  /** fsType is the filesystem type to mount. Must be a filesystem type supported by the host operating system. Ex. "ext4", "xfs", "ntfs". Implicitly inferred to be "ext4" if unspecified. */
  fsType?: Maybe<Scalars['String']['output']>;
  /** readOnly defaults to false (read/write). ReadOnly here will force the ReadOnly setting in VolumeMounts. */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  secretRef?: Maybe<V1_LocalObjectReference>;
  /** volumeName is the human-readable name of the StorageOS volume.  Volume names are only unique within a namespace. */
  volumeName?: Maybe<Scalars['String']['output']>;
  /** volumeNamespace specifies the scope of the volume within StorageOS.  If no namespace is specified then the Pod's namespace will be used.  This allows the Kubernetes name scoping to be mirrored within StorageOS for tighter integration. Set VolumeName to any name to override the default behaviour. Set to "default" if you are not using namespaces within StorageOS. Namespaces that do not pre-exist within StorageOS will be created. */
  volumeNamespace?: Maybe<Scalars['String']['output']>;
};

/** Subject contains a reference to the object or user identities a role binding applies to.  This can either hold a direct API object reference, or a value for non-objects such as user and group names. */
export type V1_Subject = {
  __typename?: 'v1_Subject';
  /** APIGroup holds the API group of the referenced subject. Defaults to "" for ServiceAccount subjects. Defaults to "rbac.authorization.k8s.io" for User and Group subjects. */
  apiGroup?: Maybe<Scalars['String']['output']>;
  /** Kind of object being referenced. Values defined by this API group are "User", "Group", and "ServiceAccount". If the Authorizer does not recognized the kind value, the Authorizer should report an error. */
  kind: Scalars['String']['output'];
  /** Name of the object being referenced. */
  name: Scalars['String']['output'];
  /** Namespace of the referenced object.  If the object kind is non-namespace, such as "User" or "Group", and this value is not empty the Authorizer should report an error. */
  namespace?: Maybe<Scalars['String']['output']>;
};

/** Sysctl defines a kernel parameter to be set */
export type V1_Sysctl = {
  __typename?: 'v1_Sysctl';
  /** Name of a property to set */
  name: Scalars['String']['output'];
  /** Value of a property to set */
  value: Scalars['String']['output'];
};

/** TCPSocketAction describes an action based on opening a socket */
export type V1_TcpSocketAction = {
  __typename?: 'v1_TCPSocketAction';
  /** Optional: Host name to connect to, defaults to the pod IP. */
  host?: Maybe<Scalars['String']['output']>;
  port: Scalars['String']['output'];
};

/** The node this Taint is attached to has the "effect" on any pod that does not tolerate the Taint. */
export type V1_Taint = {
  __typename?: 'v1_Taint';
  /** Required. The effect of the taint on pods that do not tolerate the taint. Valid effects are NoSchedule, PreferNoSchedule and NoExecute. */
  effect: Scalars['String']['output'];
  /** Required. The taint key to be applied to a node. */
  key: Scalars['String']['output'];
  timeAdded?: Maybe<Scalars['String']['output']>;
  /** The taint value corresponding to the taint key. */
  value?: Maybe<Scalars['String']['output']>;
};

export type V1_Time = {
  __typename?: 'v1_Time';
  Time: Scalars['DateTime']['output'];
};

/** TypeMeta describes an individual object in an API response or request with strings representing the type of the object and its API schema version. Structures that are versioned or persisted should inline TypeMeta. */
export type V1_TypeMeta = {
  __typename?: 'v1_TypeMeta';
  /** APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources */
  apiVersion?: Maybe<Scalars['String']['output']>;
  /** Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind?: Maybe<Scalars['String']['output']>;
};

/** TypedLocalObjectReference contains enough information to let you locate the typed referenced object inside the same namespace. */
export type V1_TypedLocalObjectReference = {
  __typename?: 'v1_TypedLocalObjectReference';
  /** APIGroup is the group for the resource being referenced. If APIGroup is not specified, the specified Kind must be in the core API group. For any other third-party types, APIGroup is required. */
  apiGroup: Scalars['String']['output'];
  /** Kind is the type of resource being referenced */
  kind: Scalars['String']['output'];
  /** Name is the name of resource being referenced */
  name: Scalars['String']['output'];
};

/** TypedObjectReference contains enough information to let you locate the typed referenced object */
export type V1_TypedObjectReference = {
  __typename?: 'v1_TypedObjectReference';
  /** APIGroup is the group for the resource being referenced. If APIGroup is not specified, the specified Kind must be in the core API group. For any other third-party types, APIGroup is required. */
  apiGroup: Scalars['String']['output'];
  /** Kind is the type of resource being referenced */
  kind: Scalars['String']['output'];
  /** Name is the name of resource being referenced */
  name: Scalars['String']['output'];
  /** Namespace is the namespace of resource being referenced Note that when a namespace is specified, a gateway.networking.k8s.io/ReferenceGrant object is required in the referent namespace to allow that namespace's owner to accept the reference. See the ReferenceGrant documentation for details. (Alpha) This field requires the CrossNamespaceVolumeDataSource feature gate to be enabled. */
  namespace?: Maybe<Scalars['String']['output']>;
};

/** Volume represents a named volume in a pod that may be accessed by any container in the pod. */
export type V1_Volume = {
  __typename?: 'v1_Volume';
  awsElasticBlockStore?: Maybe<V1_AwsElasticBlockStoreVolumeSource>;
  azureDisk?: Maybe<V1_AzureDiskVolumeSource>;
  azureFile?: Maybe<V1_AzureFileVolumeSource>;
  cephfs?: Maybe<V1_CephFsVolumeSource>;
  cinder?: Maybe<V1_CinderVolumeSource>;
  configMap?: Maybe<V1_ConfigMapVolumeSource>;
  csi?: Maybe<V1_CsiVolumeSource>;
  downwardAPI?: Maybe<V1_DownwardApiVolumeSource>;
  emptyDir?: Maybe<V1_EmptyDirVolumeSource>;
  ephemeral?: Maybe<V1_EphemeralVolumeSource>;
  fc?: Maybe<V1_FcVolumeSource>;
  flexVolume?: Maybe<V1_FlexVolumeSource>;
  flocker?: Maybe<V1_FlockerVolumeSource>;
  gcePersistentDisk?: Maybe<V1_GcePersistentDiskVolumeSource>;
  gitRepo?: Maybe<V1_GitRepoVolumeSource>;
  glusterfs?: Maybe<V1_GlusterfsVolumeSource>;
  hostPath?: Maybe<V1_HostPathVolumeSource>;
  image?: Maybe<V1_ImageVolumeSource>;
  iscsi?: Maybe<V1_IscsiVolumeSource>;
  /** name of the volume. Must be a DNS_LABEL and unique within the pod. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names */
  name: Scalars['String']['output'];
  nfs?: Maybe<V1_NfsVolumeSource>;
  persistentVolumeClaim?: Maybe<V1_PersistentVolumeClaimVolumeSource>;
  photonPersistentDisk?: Maybe<V1_PhotonPersistentDiskVolumeSource>;
  portworxVolume?: Maybe<V1_PortworxVolumeSource>;
  projected?: Maybe<V1_ProjectedVolumeSource>;
  quobyte?: Maybe<V1_QuobyteVolumeSource>;
  rbd?: Maybe<V1_RbdVolumeSource>;
  scaleIO?: Maybe<V1_ScaleIoVolumeSource>;
  secret?: Maybe<V1_SecretVolumeSource>;
  storageos?: Maybe<V1_StorageOsVolumeSource>;
  vsphereVolume?: Maybe<V1_VsphereVirtualDiskVolumeSource>;
};

/** VolumeMountStatus shows status of volume mounts. */
export type V1_VolumeMountStatus = {
  __typename?: 'v1_VolumeMountStatus';
  /** MountPath corresponds to the original VolumeMount. */
  mountPath: Scalars['String']['output'];
  /** Name corresponds to the name of the original VolumeMount. */
  name: Scalars['String']['output'];
  /** ReadOnly corresponds to the original VolumeMount. */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  /** RecursiveReadOnly must be set to Disabled, Enabled, or unspecified (for non-readonly mounts). An IfPossible value in the original VolumeMount must be translated to Disabled or Enabled, depending on the mount result. */
  recursiveReadOnly?: Maybe<Scalars['String']['output']>;
};

/** Projection that may be projected along with other supported volume types. Exactly one of these fields must be set. */
export type V1_VolumeProjection = {
  __typename?: 'v1_VolumeProjection';
  clusterTrustBundle?: Maybe<V1_ClusterTrustBundleProjection>;
  configMap?: Maybe<V1_ConfigMapProjection>;
  downwardAPI?: Maybe<V1_DownwardApiProjection>;
  secret?: Maybe<V1_SecretProjection>;
  serviceAccountToken?: Maybe<V1_ServiceAccountTokenProjection>;
};

/** VolumeResourceRequirements describes the storage resource requirements for a volume. */
export type V1_VolumeResourceRequirements = {
  __typename?: 'v1_VolumeResourceRequirements';
  limits: Scalars['ObjMap']['output'];
  requests: Scalars['ObjMap']['output'];
};

/** Represents a vSphere volume resource. */
export type V1_VsphereVirtualDiskVolumeSource = {
  __typename?: 'v1_VsphereVirtualDiskVolumeSource';
  /** fsType is filesystem type to mount. Must be a filesystem type supported by the host operating system. Ex. "ext4", "xfs", "ntfs". Implicitly inferred to be "ext4" if unspecified. */
  fsType?: Maybe<Scalars['String']['output']>;
  /** storagePolicyID is the storage Policy Based Management (SPBM) profile ID associated with the StoragePolicyName. */
  storagePolicyID?: Maybe<Scalars['String']['output']>;
  /** storagePolicyName is the storage Policy Based Management (SPBM) profile name. */
  storagePolicyName?: Maybe<Scalars['String']['output']>;
  /** volumePath is the path that identifies vSphere volume vmdk */
  volumePath: Scalars['String']['output'];
};

/** WindowsSecurityContextOptions contain Windows-specific options and credentials. */
export type V1_WindowsSecurityContextOptions = {
  __typename?: 'v1_WindowsSecurityContextOptions';
  /** GMSACredentialSpec is where the GMSA admission webhook (https://github.com/kubernetes-sigs/windows-gmsa) inlines the contents of the GMSA credential spec named by the GMSACredentialSpecName field. */
  gmsaCredentialSpec?: Maybe<Scalars['String']['output']>;
  /** GMSACredentialSpecName is the name of the GMSA credential spec to use. */
  gmsaCredentialSpecName?: Maybe<Scalars['String']['output']>;
  /** HostProcess determines if a container should be run as a 'Host Process' container. All of a Pod's containers must have the same effective HostProcess value (it is not allowed to have a mix of HostProcess containers and non-HostProcess containers). In addition, if HostProcess is true then HostNetwork must also be set to true. */
  hostProcess?: Maybe<Scalars['Boolean']['output']>;
  /** The UserName in Windows to run the entrypoint of the container process. Defaults to the user specified in image metadata if unspecified. May also be set in PodSecurityContext. If set in both SecurityContext and PodSecurityContext, the value specified in SecurityContext takes precedence. */
  runAsUserName?: Maybe<Scalars['String']['output']>;
};

export type Validation_AppNameValidity = {
  __typename?: 'validation_AppNameValidity';
  valid: Scalars['Boolean']['output'];
};

export type Validation_AppNameValiditySpec_Input = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};

export type Validation_ImageReferenceValidity = {
  __typename?: 'validation_ImageReferenceValidity';
  reason: Scalars['String']['output'];
  valid: Scalars['Boolean']['output'];
};

export type Validation_ImageReferenceValiditySpec_Input = {
  reference: Scalars['String']['input'];
};

export type Validation_ProtocolValidity = {
  __typename?: 'validation_ProtocolValidity';
  valid: Scalars['Boolean']['output'];
};

export type Validation_ProtocolValiditySpec_Input = {
  isExternal: Scalars['Boolean']['input'];
  protocol: Scalars['String']['input'];
};

export type ClusterRolesQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type ClusterRolesQuery = { __typename?: 'Query', handleGetClusterRoleList?: { __typename?: 'clusterrole_ClusterRoleList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'clusterrole_ClusterRole', typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type ClusterRoleQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type ClusterRoleQuery = { __typename?: 'Query', handleGetClusterRoleDetail?: { __typename?: 'clusterrole_ClusterRoleDetail', errors: Array<any | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, rules: Array<{ __typename?: 'v1_PolicyRule', apiGroups?: Array<string | null> | null, nonResourceURLs?: Array<string | null> | null, resourceNames?: Array<string | null> | null, verbs: Array<string | null>, resources?: Array<string | null> | null } | null> } | null };

export type ClusterRoleBindingsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type ClusterRoleBindingsQuery = { __typename?: 'Query', handleGetClusterRoleBindingList?: { __typename?: 'clusterrolebinding_ClusterRoleBindingList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'clusterrolebinding_ClusterRoleBinding', typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type ClusterRoleBindingQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type ClusterRoleBindingQuery = { __typename?: 'Query', handleGetClusterRoleBindingDetail?: { __typename?: 'clusterrolebinding_ClusterRoleBindingDetail', errors: Array<any | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, subjects?: Array<{ __typename?: 'v1_Subject', apiGroup?: string | null, kind: string, name: string, namespace?: string | null } | null> | null, roleRef: { __typename?: 'v1_RoleRef', name: string, kind: string, apiGroup: string } } | null };

export type RolesQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type RolesQuery = { __typename?: 'Query', handleGetRoleList?: { __typename?: 'role_RoleList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'role_Role', typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type RoleQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
}>;


export type RoleQuery = { __typename?: 'Query', handleGetRoleDetail?: { __typename?: 'role_RoleDetail', errors: Array<any | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, rules: Array<{ __typename?: 'v1_PolicyRule', apiGroups?: Array<string | null> | null, nonResourceURLs?: Array<string | null> | null, resourceNames?: Array<string | null> | null, verbs: Array<string | null>, resources?: Array<string | null> | null } | null> } | null };

export type RoleBindingsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type RoleBindingsQuery = { __typename?: 'Query', handleGetRoleBindingList?: { __typename?: 'rolebinding_RoleBindingList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'rolebinding_RoleBinding', typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type RoleBindingQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
}>;


export type RoleBindingQuery = { __typename?: 'Query', handleGetRoleBindingDetail?: { __typename?: 'rolebinding_RoleBindingDetail', errors: Array<any | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, subjects?: Array<{ __typename?: 'v1_Subject', apiGroup?: string | null, kind: string, name: string, namespace?: string | null } | null> | null, roleRef: { __typename?: 'v1_RoleRef', name: string, kind: string, apiGroup: string } } | null };

export type ServiceAccountsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type ServiceAccountsQuery = { __typename?: 'Query', handleGetServiceAccountList?: { __typename?: 'serviceaccount_ServiceAccountList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'serviceaccount_ServiceAccount', typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type ServiceAccountQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type ServiceAccountQuery = { __typename?: 'Query', handleGetServiceAccountDetail?: { __typename?: 'serviceaccount_ServiceAccountDetail', typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null };

export type EventsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type EventsQuery = { __typename?: 'Query', handleGetEventList?: { __typename?: 'common_EventList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, events: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type EventListFragment = { __typename?: 'common_EventList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, events: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> };

export type EventFragment = { __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } };

export type HorizontalPodAutoscalersQueryVariables = Exact<{
  kind: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type HorizontalPodAutoscalersQuery = { __typename?: 'Query', handleGetHorizontalPodAutoscalerList?: { __typename?: 'horizontalpodautoscaler_HorizontalPodAutoscalerList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, horizontalpodautoscalers: Array<{ __typename?: 'horizontalpodautoscaler_HorizontalPodAutoscaler', currentCPUUtilizationPercentage: number, maxReplicas: number, minReplicas: number, targetCPUUtilizationPercentage: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, scaleTargetRef: { __typename?: 'horizontalpodautoscaler_ScaleTargetRef', name: string, kind: string } } | null> } | null };

export type HorizontalPodAutoscalersForResourceQueryVariables = Exact<{
  kind: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type HorizontalPodAutoscalersForResourceQuery = { __typename?: 'Query', handleGetHorizontalPodAutoscalerListForResource?: { __typename?: 'horizontalpodautoscaler_HorizontalPodAutoscalerList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, horizontalpodautoscalers: Array<{ __typename?: 'horizontalpodautoscaler_HorizontalPodAutoscaler', currentCPUUtilizationPercentage: number, maxReplicas: number, minReplicas: number, targetCPUUtilizationPercentage: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, scaleTargetRef: { __typename?: 'horizontalpodautoscaler_ScaleTargetRef', name: string, kind: string } } | null> } | null };

export type NamespacesQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type NamespacesQuery = { __typename?: 'Query', handleGetNamespaces?: { __typename?: 'namespace_NamespaceList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, namespaces: Array<{ __typename?: 'namespace_Namespace', phase: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type NamespaceQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type NamespaceQuery = { __typename?: 'Query', handleGetNamespaceDetail?: { __typename?: 'namespace_NamespaceDetail', phase: string, errors: Array<any | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, resourceQuotaList: { __typename?: 'resourcequota_ResourceQuotaDetailList', items: Array<{ __typename?: 'resourcequota_ResourceQuotaDetail', scopes?: Array<string | null> | null, statusList: any, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> }, resourceLimits: Array<{ __typename?: 'limitrange_LimitRangeItem', default?: string | null, defaultRequest?: string | null, max?: string | null, maxLimitRequestRatio?: string | null, min?: string | null, resourceName?: string | null, resourceType?: string | null } | null> } | null };

export type NamespaceEventsQueryVariables = Exact<{
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type NamespaceEventsQuery = { __typename?: 'Query', handleGetNamespaceEvents?: { __typename?: 'common_EventList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, events: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type NodesQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type NodesQuery = { __typename?: 'Query', handleGetNodeList?: { __typename?: 'node_NodeList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, nodes: Array<{ __typename?: 'node_Node', ready: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, allocatedResources: { __typename?: 'node_NodeAllocatedResources', cpuRequests: any, cpuRequestsFraction: number, cpuLimits: any, cpuLimitsFraction: number, cpuCapacity: any, memoryRequests: any, memoryRequestsFraction: number, memoryLimits: any, memoryLimitsFraction: number, memoryCapacity: any, allocatedPods: number, podFraction: number, podCapacity: any } } | null> } | null };

export type NodeQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type NodeQuery = { __typename?: 'Query', handleGetNodeDetail?: { __typename?: 'node_NodeDetail', providerID: string, containerImages: Array<string | null>, podCIDR: string, phase: string, unschedulable: boolean, ready: string, errors: Array<any | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, conditions: Array<{ __typename?: 'common_Condition', message: string, type: string, status: string, lastProbeTime: string, lastTransitionTime: string, reason: string } | null>, allocatedResources: { __typename?: 'node_NodeAllocatedResources', cpuRequests: any, cpuRequestsFraction: number, cpuLimits: any, cpuLimitsFraction: number, cpuCapacity: any, memoryRequests: any, memoryRequestsFraction: number, memoryLimits: any, memoryLimitsFraction: number, memoryCapacity: any, allocatedPods: number, podFraction: number, podCapacity: any }, nodeInfo: { __typename?: 'v1_NodeSystemInfo', architecture: string, bootID: string, containerRuntimeVersion: string, kernelVersion: string, kubeletVersion: string, kubeProxyVersion: string, machineID: string, operatingSystem: string, osImage: string, systemUUID: string }, addresses?: Array<{ __typename?: 'v1_NodeAddress', type: string, address: string } | null> | null, taints?: Array<{ __typename?: 'v1_Taint', key: string, value?: string | null, effect: string } | null> | null } | null };

export type NodePodsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type NodePodsQuery = { __typename?: 'Query', handleGetNodePods?: { __typename?: 'pod_PodList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, pods: Array<{ __typename?: 'pod_Pod', status: string, containerImages: Array<string | null>, nodeName: string, restartCount: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, containerStatuses: Array<{ __typename?: 'pod_ContainerStatus', name: string, ready: boolean, state: ContainerState } | null>, warnings: Array<{ __typename?: 'common_Event', message: string } | null>, allocatedResources: { __typename?: 'pod_PodAllocatedResources', cpuLimits: any, cpuRequests: any, memoryLimits: any, memoryRequests: any } } | null> } | null };

export type NodeEventsQueryVariables = Exact<{
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type NodeEventsQuery = { __typename?: 'Query', handleGetNodeEvents?: { __typename?: 'common_EventList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, events: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type DrainNodeMutationVariables = Exact<{
  name: Scalars['String']['input'];
  input: Node_NodeDrainSpec_Input;
}>;


export type DrainNodeMutation = { __typename?: 'Mutation', handleNodeDrain?: any | null };

export type PodDisruptionBudgetListFragment = { __typename?: 'poddisruptionbudget_PodDisruptionBudgetList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'poddisruptionbudget_PodDisruptionBudget', currentHealthy: number, desiredHealthy: number, disruptionsAllowed: number, expectedPods: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> };

export type PodDisruptionBudgetFragment = { __typename?: 'poddisruptionbudget_PodDisruptionBudget', currentHealthy: number, desiredHealthy: number, disruptionsAllowed: number, expectedPods: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } };

export type PodDisruptionBudgetDetailFragment = { __typename?: 'poddisruptionbudget_PodDisruptionBudgetDetail', currentHealthy: number, desiredHealthy: number, disruptionsAllowed: number, expectedPods: number, disruptedPods: any, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } };

export type PodDisruptionBudgetsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type PodDisruptionBudgetsQuery = { __typename?: 'Query', handleGetPodDisruptionBudgetList?: { __typename?: 'poddisruptionbudget_PodDisruptionBudgetList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'poddisruptionbudget_PodDisruptionBudget', currentHealthy: number, desiredHealthy: number, disruptionsAllowed: number, expectedPods: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type PodDisruptionBudgetQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
}>;


export type PodDisruptionBudgetQuery = { __typename?: 'Query', handleGetPodDisruptionBudgetDetail?: { __typename?: 'poddisruptionbudget_PodDisruptionBudgetDetail', currentHealthy: number, desiredHealthy: number, disruptionsAllowed: number, expectedPods: number, disruptedPods: any, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null };

export type ListMetaFragment = { __typename?: 'types_ListMeta', totalItems: number };

export type TypeMetaFragment = { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null };

export type ObjectMetaFragment = { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null };

export type ConditionFragment = { __typename?: 'common_Condition', message: string, type: string, status: string, lastProbeTime: string, lastTransitionTime: string, reason: string };

export type ProbeFragment = { __typename?: 'v1_Probe', failureThreshold?: number | null, initialDelaySeconds?: number | null, periodSeconds?: number | null, successThreshold?: number | null, terminationGracePeriodSeconds?: any | null, timeoutSeconds?: number | null, tcpSocket?: { __typename?: 'v1_TCPSocketAction', host?: string | null, port: string } | null, grpc?: { __typename?: 'v1_GRPCAction', service: string, port: number } | null, httpGet?: { __typename?: 'v1_HTTPGetAction', host?: string | null, port: string, scheme?: string | null, path?: string | null, httpHeaders?: Array<{ __typename?: 'v1_HTTPHeader', name: string, value: string } | null> | null } | null, exec?: { __typename?: 'v1_ExecAction', command?: Array<string | null> | null } | null };

export type EndpointFragment = { __typename?: 'common_Endpoint', host: string, ports: Array<{ __typename?: 'common_ServicePort', port: number, nodePort: number, protocol: string } | null> };

export type NetworkPolicyPortFragment = { __typename?: 'v1_NetworkPolicyPort', port?: string | null, endPort?: number | null, protocol?: string | null };

export type IpBlockFragment = { __typename?: 'v1_IPBlock', except?: Array<string | null> | null, cidr: string };

export type PolicyRuleFragment = { __typename?: 'v1_PolicyRule', apiGroups?: Array<string | null> | null, nonResourceURLs?: Array<string | null> | null, resourceNames?: Array<string | null> | null, verbs: Array<string | null>, resources?: Array<string | null> | null };

export type SubjectFragment = { __typename?: 'v1_Subject', apiGroup?: string | null, kind: string, name: string, namespace?: string | null };

export type PodInfoFragment = { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> };

export type ResourceOwnerFragment = { __typename?: 'controller_ResourceOwner', containerImages: Array<string | null>, initContainerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, pods: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } };

export type SelectorFragment = { __typename?: 'v1_LabelSelector', matchLabels?: any | null, matchExpressions?: Array<{ __typename?: 'v1_LabelSelectorRequirement', key: string, operator: string, values?: Array<string | null> | null } | null> | null };

export type NodeAllocatedResourcesFragment = { __typename?: 'node_NodeAllocatedResources', cpuRequests: any, cpuRequestsFraction: number, cpuLimits: any, cpuLimitsFraction: number, cpuCapacity: any, memoryRequests: any, memoryRequestsFraction: number, memoryLimits: any, memoryLimitsFraction: number, memoryCapacity: any, allocatedPods: number, podFraction: number, podCapacity: any };

export type HorizontalPodAutoscalerListFragment = { __typename?: 'horizontalpodautoscaler_HorizontalPodAutoscalerList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, horizontalpodautoscalers: Array<{ __typename?: 'horizontalpodautoscaler_HorizontalPodAutoscaler', currentCPUUtilizationPercentage: number, maxReplicas: number, minReplicas: number, targetCPUUtilizationPercentage: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, scaleTargetRef: { __typename?: 'horizontalpodautoscaler_ScaleTargetRef', name: string, kind: string } } | null> };

export type HorizontalPodAutoscalerFragment = { __typename?: 'horizontalpodautoscaler_HorizontalPodAutoscaler', currentCPUUtilizationPercentage: number, maxReplicas: number, minReplicas: number, targetCPUUtilizationPercentage: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, scaleTargetRef: { __typename?: 'horizontalpodautoscaler_ScaleTargetRef', name: string, kind: string } };

export type NamespacedResourceQueryVariables = Exact<{
  kind: Scalars['String']['input'];
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
}>;


export type NamespacedResourceQuery = { __typename?: 'Query', handleGetResource?: { __typename?: 'unstructured_Unstructured', Object: any } | null };

export type ResourceQueryVariables = Exact<{
  kind: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type ResourceQuery = { __typename?: 'Query', handleGetResource?: { __typename?: 'unstructured_Unstructured', Object: any } | null };

export type NamespacedResourceUpdateMutationVariables = Exact<{
  kind: Scalars['String']['input'];
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  input: Scalars['JSON']['input'];
}>;


export type NamespacedResourceUpdateMutation = { __typename?: 'Mutation', handlePutResource?: any | null };

export type ResourceUpdateMutationVariables = Exact<{
  kind: Scalars['String']['input'];
  name: Scalars['String']['input'];
  input: Scalars['JSON']['input'];
}>;


export type ResourceUpdateMutation = { __typename?: 'Mutation', handlePutResource?: any | null };

export type ResourceScaleMutationVariables = Exact<{
  kind: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  scaleBy: Scalars['String']['input'];
}>;


export type ResourceScaleMutation = { __typename?: 'Mutation', handleScaleResource?: { __typename?: 'scaling_ReplicaCounts', actualReplicas: number, desiredReplicas: number } | null };

export type ResourceDeleteMutationVariables = Exact<{
  kind: Scalars['String']['input'];
  name: Scalars['String']['input'];
  deleteNow?: InputMaybe<Scalars['String']['input']>;
  propagation?: InputMaybe<Scalars['String']['input']>;
}>;


export type ResourceDeleteMutation = { __typename?: 'Mutation', handleDeleteResource?: any | null };

export type NamespacedResourceDeleteMutationVariables = Exact<{
  kind: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  deleteNow?: InputMaybe<Scalars['String']['input']>;
  propagation?: InputMaybe<Scalars['String']['input']>;
}>;


export type NamespacedResourceDeleteMutation = { __typename?: 'Mutation', handleDeleteResource?: any | null };

export type ConfigMapsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type ConfigMapsQuery = { __typename?: 'Query', handleGetConfigMapList?: { __typename?: 'configmap_ConfigMapList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'configmap_ConfigMap', typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type ConfigMapQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
}>;


export type ConfigMapQuery = { __typename?: 'Query', handleGetConfigMapDetail?: { __typename?: 'configmap_ConfigMapDetail', data?: any | null, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null };

export type SecretsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type SecretsQuery = { __typename?: 'Query', handleGetSecretList?: { __typename?: 'secret_SecretList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, secrets: Array<{ __typename?: 'secret_Secret', type: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type SecretQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
}>;


export type SecretQuery = { __typename?: 'Query', handleGetSecretDetail?: { __typename?: 'secret_SecretDetail', type: string, data: any, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null };

export type CustomResourceDefinitionsQueryVariables = Exact<{
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type CustomResourceDefinitionsQuery = { __typename?: 'Query', handleGetCustomResourceDefinitionList?: { __typename?: 'types_CustomResourceDefinitionList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'types_CustomResourceDefinition', established: string, group: string, scope: string, version?: string | null, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, names: { __typename?: 'types_CustomResourceDefinitionNames', categories?: Array<string | null> | null, kind: string, listKind?: string | null, plural: string, shortNames?: Array<string | null> | null, singular?: string | null } } | null> } | null };

export type CustomResourceDefinitionQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type CustomResourceDefinitionQuery = { __typename?: 'Query', handleGetCustomResourceDefinitionDetail?: { __typename?: 'types_CustomResourceDefinitionDetail', group: string, version?: string | null, established: string, subresources: Array<string | null>, scope: string, errors: Array<any | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, conditions: Array<{ __typename?: 'common_Condition', message: string, type: string, status: string, lastProbeTime: string, lastTransitionTime: string, reason: string } | null>, names: { __typename?: 'types_CustomResourceDefinitionNames', kind: string, categories?: Array<string | null> | null, shortNames?: Array<string | null> | null, listKind?: string | null, singular?: string | null, plural: string } } | null };

export type CustomResourcesQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type CustomResourcesQuery = { __typename?: 'Query', handleGetCustomResourceObjectList?: { __typename?: 'types_CustomResourceObjectList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'types_CustomResourceObject', typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type CustomResourceQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  crd: Scalars['String']['input'];
}>;


export type CustomResourceQuery = { __typename?: 'Query', handleGetCustomResourceObjectDetail?: { __typename?: 'types_CustomResourceObjectDetail', typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null };

export type CustomResourceEventsQueryVariables = Exact<{
  crd: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type CustomResourceEventsQuery = { __typename?: 'Query', handleGetCustomResourceObjectEvents?: { __typename?: 'common_EventList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, events: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type IngressesQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type IngressesQuery = { __typename?: 'Query', handleGetIngressList?: { __typename?: 'ingress_IngressList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'ingress_Ingress', hosts: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, endpoints: Array<{ __typename?: 'common_Endpoint', host: string, ports: Array<{ __typename?: 'common_ServicePort', port: number, nodePort: number, protocol: string } | null> } | null> } | null> } | null };

export type IngressQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
}>;


export type IngressQuery = { __typename?: 'Query', handleGetIngressDetail?: { __typename?: 'ingress_IngressDetail', hosts: Array<string | null>, errors: Array<any | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, endpoints: Array<{ __typename?: 'common_Endpoint', host: string, ports: Array<{ __typename?: 'common_ServicePort', port: number, nodePort: number, protocol: string } | null> } | null>, spec: { __typename?: 'v1_IngressSpec', ingressClassName?: string | null, tls?: Array<{ __typename?: 'v1_IngressTLS', hosts?: Array<string | null> | null, secretName?: string | null } | null> | null, defaultBackend?: { __typename?: 'v1_IngressBackend', service?: { __typename?: 'v1_IngressServiceBackend', name: string, port?: { __typename?: 'v1_ServiceBackendPort', name?: string | null, number?: number | null } | null } | null, resource?: { __typename?: 'v1_TypedLocalObjectReference', name: string, apiGroup: string, kind: string } | null } | null, rules?: Array<{ __typename?: 'v1_IngressRule', host?: string | null, http?: { __typename?: 'v1_HTTPIngressRuleValue', paths: Array<{ __typename?: 'v1_HTTPIngressPath', path?: string | null, pathType: string, backend: { __typename?: 'v1_IngressBackend', service?: { __typename?: 'v1_IngressServiceBackend', name: string, port?: { __typename?: 'v1_ServiceBackendPort', name?: string | null, number?: number | null } | null } | null, resource?: { __typename?: 'v1_TypedLocalObjectReference', name: string, kind: string, apiGroup: string } | null } } | null> } | null } | null> | null }, status: { __typename?: 'v1_IngressStatus', loadBalancer?: { __typename?: 'v1_IngressLoadBalancerStatus', ingress?: Array<{ __typename?: 'v1_IngressLoadBalancerIngress', ports?: Array<{ __typename?: 'v1_IngressPortStatus', port: number, protocol: string, error?: string | null } | null> | null } | null> | null } | null } } | null };

export type IngressEventsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type IngressEventsQuery = { __typename?: 'Query', handleGetIngressEvent?: { __typename?: 'common_EventList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, events: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type IngressListFragment = { __typename?: 'ingress_IngressList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'ingress_Ingress', hosts: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, endpoints: Array<{ __typename?: 'common_Endpoint', host: string, ports: Array<{ __typename?: 'common_ServicePort', port: number, nodePort: number, protocol: string } | null> } | null> } | null> };

export type IngressClassesQueryVariables = Exact<{
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type IngressClassesQuery = { __typename?: 'Query', handleGetIngressClassList?: { __typename?: 'ingressclass_IngressClassList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'ingressclass_IngressClass', controller: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type IngressClassQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type IngressClassQuery = { __typename?: 'Query', handleGetIngressClass?: { __typename?: 'ingressclass_IngressClass', controller: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null };

export type NetworkPoliciesQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type NetworkPoliciesQuery = { __typename?: 'Query', handleGetNetworkPolicyList?: { __typename?: 'networkpolicy_NetworkPolicyList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'networkpolicy_NetworkPolicy', typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type NetworkPolicyQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
}>;


export type NetworkPolicyQuery = { __typename?: 'Query', handleGetNetworkPolicyDetail?: { __typename?: 'networkpolicy_NetworkPolicyDetail', policyTypes?: Array<string | null> | null, errors: Array<any | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podSelector: { __typename?: 'v1_LabelSelector', matchLabels?: any | null, matchExpressions?: Array<{ __typename?: 'v1_LabelSelectorRequirement', key: string, operator: string, values?: Array<string | null> | null } | null> | null }, egress?: Array<{ __typename?: 'v1_NetworkPolicyEgressRule', to?: Array<{ __typename?: 'v1_NetworkPolicyPeer', podSelector?: { __typename?: 'v1_LabelSelector', matchLabels?: any | null, matchExpressions?: Array<{ __typename?: 'v1_LabelSelectorRequirement', key: string, operator: string, values?: Array<string | null> | null } | null> | null } | null, namespaceSelector?: { __typename?: 'v1_LabelSelector', matchLabels?: any | null, matchExpressions?: Array<{ __typename?: 'v1_LabelSelectorRequirement', key: string, operator: string, values?: Array<string | null> | null } | null> | null } | null, ipBlock?: { __typename?: 'v1_IPBlock', except?: Array<string | null> | null, cidr: string } | null } | null> | null, ports?: Array<{ __typename?: 'v1_NetworkPolicyPort', port?: string | null, endPort?: number | null, protocol?: string | null } | null> | null } | null> | null, ingress?: Array<{ __typename?: 'v1_NetworkPolicyIngressRule', from?: Array<{ __typename?: 'v1_NetworkPolicyPeer', podSelector?: { __typename?: 'v1_LabelSelector', matchLabels?: any | null, matchExpressions?: Array<{ __typename?: 'v1_LabelSelectorRequirement', key: string, operator: string, values?: Array<string | null> | null } | null> | null } | null, namespaceSelector?: { __typename?: 'v1_LabelSelector', matchLabels?: any | null, matchExpressions?: Array<{ __typename?: 'v1_LabelSelectorRequirement', key: string, operator: string, values?: Array<string | null> | null } | null> | null } | null, ipBlock?: { __typename?: 'v1_IPBlock', except?: Array<string | null> | null, cidr: string } | null } | null> | null, ports?: Array<{ __typename?: 'v1_NetworkPolicyPort', port?: string | null, endPort?: number | null, protocol?: string | null } | null> | null } | null> | null } | null };

export type ServicesQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type ServicesQuery = { __typename?: 'Query', handleGetServiceList?: { __typename?: 'service_ServiceList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, services: Array<{ __typename?: 'service_Service', type: string, clusterIP: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, internalEndpoint: { __typename?: 'common_Endpoint', host: string, ports: Array<{ __typename?: 'common_ServicePort', port: number, nodePort: number, protocol: string } | null> }, externalEndpoints: Array<{ __typename?: 'common_Endpoint', host: string, ports: Array<{ __typename?: 'common_ServicePort', port: number, nodePort: number, protocol: string } | null> } | null> } | null> } | null };

export type ServiceQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
}>;


export type ServiceQuery = { __typename?: 'Query', handleGetServiceDetail?: { __typename?: 'service_ServiceDetail', type: string, sessionAffinity: string, selector: any, clusterIP: string, errors: Array<any | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, internalEndpoint: { __typename?: 'common_Endpoint', host: string, ports: Array<{ __typename?: 'common_ServicePort', port: number, nodePort: number, protocol: string } | null> }, externalEndpoints: Array<{ __typename?: 'common_Endpoint', host: string, ports: Array<{ __typename?: 'common_ServicePort', port: number, nodePort: number, protocol: string } | null> } | null>, endpointList: { __typename?: 'endpoint_EndpointList', endpoints: Array<{ __typename?: 'endpoint_Endpoint', host: string, ready: boolean, nodeName: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, ports: Array<{ __typename?: 'v1_EndpointPort', name?: string | null, port: number, protocol?: string | null, appProtocol?: string | null } | null> } | null> } } | null };

export type ServiceEventsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type ServiceEventsQuery = { __typename?: 'Query', handleGetServiceEvent?: { __typename?: 'common_EventList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, events: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type ServicePodsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type ServicePodsQuery = { __typename?: 'Query', handleGetServicePods?: { __typename?: 'pod_PodList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, pods: Array<{ __typename?: 'pod_Pod', status: string, containerImages: Array<string | null>, nodeName: string, restartCount: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, containerStatuses: Array<{ __typename?: 'pod_ContainerStatus', name: string, ready: boolean, state: ContainerState } | null>, warnings: Array<{ __typename?: 'common_Event', message: string } | null>, allocatedResources: { __typename?: 'pod_PodAllocatedResources', cpuLimits: any, cpuRequests: any, memoryLimits: any, memoryRequests: any } } | null> } | null };

export type ServiceIngressesQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type ServiceIngressesQuery = { __typename?: 'Query', handleGetServiceIngressList?: { __typename?: 'ingress_IngressList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'ingress_Ingress', hosts: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, endpoints: Array<{ __typename?: 'common_Endpoint', host: string, ports: Array<{ __typename?: 'common_ServicePort', port: number, nodePort: number, protocol: string } | null> } | null> } | null> } | null };

export type ServiceListFragment = { __typename?: 'service_ServiceList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, services: Array<{ __typename?: 'service_Service', type: string, clusterIP: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, internalEndpoint: { __typename?: 'common_Endpoint', host: string, ports: Array<{ __typename?: 'common_ServicePort', port: number, nodePort: number, protocol: string } | null> }, externalEndpoints: Array<{ __typename?: 'common_Endpoint', host: string, ports: Array<{ __typename?: 'common_ServicePort', port: number, nodePort: number, protocol: string } | null> } | null> } | null> };

export type PersistentVolumesQueryVariables = Exact<{
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type PersistentVolumesQuery = { __typename?: 'Query', handleGetPersistentVolumeList?: { __typename?: 'persistentvolume_PersistentVolumeList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'persistentvolume_PersistentVolume', status: string, claim: string, storageClass: string, reason: string, reclaimPolicy: string, accessModes: Array<string | null>, capacity: any, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type PersistentVolumeQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type PersistentVolumeQuery = { __typename?: 'Query', handleGetPersistentVolumeDetail?: { __typename?: 'persistentvolume_PersistentVolumeDetail', status: string, capacity: any, claim: string, storageClass: string, reason: string, message: string, mountOptions: Array<string | null>, reclaimPolicy: string, accessModes: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, persistentVolumeSource: { __typename?: 'v1_PersistentVolumeSource', portworxVolume?: { __typename?: 'v1_PortworxVolumeSource', fsType?: string | null, readOnly?: boolean | null, volumeID: string } | null, awsElasticBlockStore?: { __typename?: 'v1_AWSElasticBlockStoreVolumeSource', volumeID: string, readOnly?: boolean | null, fsType?: string | null, partition?: number | null } | null, azureDisk?: { __typename?: 'v1_AzureDiskVolumeSource', fsType?: string | null, readOnly?: boolean | null, kind?: string | null, cachingMode?: string | null, diskName: string, diskURI: string } | null, azureFile?: { __typename?: 'v1_AzureFilePersistentVolumeSource', readOnly?: boolean | null, secretName: string, secretNamespace: string, shareName: string } | null, cephfs?: { __typename?: 'v1_CephFSPersistentVolumeSource', readOnly?: boolean | null, path?: string | null, monitors: Array<string | null>, secretFile?: string | null, user?: string | null, secretRef?: { __typename?: 'v1_SecretReference', name?: string | null, namespace?: string | null } | null } | null, cinder?: { __typename?: 'v1_CinderPersistentVolumeSource', readOnly?: boolean | null, fsType?: string | null, volumeID: string, secretRef?: { __typename?: 'v1_SecretReference', namespace?: string | null, name?: string | null } | null } | null, csi?: { __typename?: 'v1_CSIPersistentVolumeSource', fsType?: string | null, readOnly?: boolean | null, driver: string, volumeAttributes?: any | null, volumeHandle: string, controllerExpandSecretRef?: { __typename?: 'v1_SecretReference', namespace?: string | null, name?: string | null } | null, controllerPublishSecretRef?: { __typename?: 'v1_SecretReference', namespace?: string | null, name?: string | null } | null, nodeExpandSecretRef?: { __typename?: 'v1_SecretReference', namespace?: string | null, name?: string | null } | null, nodePublishSecretRef?: { __typename?: 'v1_SecretReference', namespace?: string | null, name?: string | null } | null, nodeStageSecretRef?: { __typename?: 'v1_SecretReference', namespace?: string | null, name?: string | null } | null } | null, fc?: { __typename?: 'v1_FCVolumeSource', readOnly?: boolean | null, fsType?: string | null, lun?: number | null, targetWWNs?: Array<string | null> | null, wwids?: Array<string | null> | null } | null, flexVolume?: { __typename?: 'v1_FlexPersistentVolumeSource', fsType?: string | null, readOnly?: boolean | null, driver: string, options?: any | null, secretRef?: { __typename?: 'v1_SecretReference', name?: string | null, namespace?: string | null } | null } | null, flocker?: { __typename?: 'v1_FlockerVolumeSource', datasetName?: string | null, datasetUUID?: string | null } | null, gcePersistentDisk?: { __typename?: 'v1_GCEPersistentDiskVolumeSource', readOnly?: boolean | null, fsType?: string | null, partition?: number | null, pdName: string } | null, glusterfs?: { __typename?: 'v1_GlusterfsPersistentVolumeSource', readOnly?: boolean | null, path: string, endpoints: string, endpointsNamespace?: string | null } | null, hostPath?: { __typename?: 'v1_HostPathVolumeSource', path: string, type?: string | null } | null, iscsi?: { __typename?: 'v1_ISCSIPersistentVolumeSource', readOnly?: boolean | null, fsType?: string | null, lun: number, chapAuthDiscovery?: boolean | null, chapAuthSession?: boolean | null, initiatorName?: string | null, iqn: string, iscsiInterface?: string | null, portals?: Array<string | null> | null, targetPortal: string, secretRef?: { __typename?: 'v1_SecretReference', namespace?: string | null, name?: string | null } | null } | null, local?: { __typename?: 'v1_LocalVolumeSource', fsType?: string | null, path: string } | null, nfs?: { __typename?: 'v1_NFSVolumeSource', path: string, readOnly?: boolean | null, server: string } | null, photonPersistentDisk?: { __typename?: 'v1_PhotonPersistentDiskVolumeSource', fsType?: string | null, pdID: string } | null, quobyte?: { __typename?: 'v1_QuobyteVolumeSource', readOnly?: boolean | null, user?: string | null, volume: string, registry: string, group?: string | null, tenant?: string | null } | null, rbd?: { __typename?: 'v1_RBDPersistentVolumeSource', user?: string | null, readOnly?: boolean | null, fsType?: string | null, monitors: Array<string | null>, image: string, keyring?: string | null, pool?: string | null, secretRef?: { __typename?: 'v1_SecretReference', name?: string | null, namespace?: string | null } | null } | null, scaleIO?: { __typename?: 'v1_ScaleIOPersistentVolumeSource', fsType?: string | null, readOnly?: boolean | null, gateway: string, protectionDomain?: string | null, sslEnabled?: boolean | null, storageMode?: string | null, storagePool?: string | null, system: string, volumeName?: string | null, secretRef: { __typename?: 'v1_SecretReference', namespace?: string | null, name?: string | null } } | null, storageos?: { __typename?: 'v1_StorageOSPersistentVolumeSource', volumeName?: string | null, volumeNamespace?: string | null, fsType?: string | null, readOnly?: boolean | null, secretRef?: { __typename?: 'v1_ObjectReference', name?: string | null, namespace?: string | null, kind?: string | null, uid?: string | null, apiVersion?: string | null, fieldPath?: string | null, resourceVersion?: string | null } | null } | null, vsphereVolume?: { __typename?: 'v1_VsphereVirtualDiskVolumeSource', fsType?: string | null, storagePolicyID?: string | null, storagePolicyName?: string | null, volumePath: string } | null } } | null };

export type PersistentVolumeClaimsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type PersistentVolumeClaimsQuery = { __typename?: 'Query', handleGetPersistentVolumeClaimList?: { __typename?: 'persistentvolumeclaim_PersistentVolumeClaimList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'persistentvolumeclaim_PersistentVolumeClaim', status: string, volume: string, storageClass: string, accessModes: Array<string | null>, capacity: any, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type PersistentVolumeClaimQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
}>;


export type PersistentVolumeClaimQuery = { __typename?: 'Query', handleGetPersistentVolumeClaimDetail?: { __typename?: 'persistentvolumeclaim_PersistentVolumeClaimDetail', status: string, volume: string, storageClass: string, accessModes: Array<string | null>, capacity: any, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null };

export type PersistentVolumeClaimFragment = { __typename?: 'persistentvolumeclaim_PersistentVolumeClaim', status: string, volume: string, storageClass: string, accessModes: Array<string | null>, capacity: any, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } };

export type PersistentVolumeClaimDetailFragment = { __typename?: 'persistentvolumeclaim_PersistentVolumeClaimDetail', status: string, volume: string, storageClass: string, accessModes: Array<string | null>, capacity: any, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } };

export type PersistentVolumeClaimListFragment = { __typename?: 'persistentvolumeclaim_PersistentVolumeClaimList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'persistentvolumeclaim_PersistentVolumeClaim', status: string, volume: string, storageClass: string, accessModes: Array<string | null>, capacity: any, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> };

export type StorageClassesQueryVariables = Exact<{
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type StorageClassesQuery = { __typename?: 'Query', handleGetStorageClassList?: { __typename?: 'storageclass_StorageClassList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'storageclass_StorageClass', parameters: any, provisioner: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type StorageClassQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type StorageClassQuery = { __typename?: 'Query', handleGetStorageClass?: { __typename?: 'storageclass_StorageClass', parameters: any, provisioner: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null };

export type StorageClassPersistentVolumesQueryVariables = Exact<{
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type StorageClassPersistentVolumesQuery = { __typename?: 'Query', handleGetStorageClassPersistentVolumes?: { __typename?: 'persistentvolume_PersistentVolumeList', listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'persistentvolume_PersistentVolume', status: string, claim: string, reason: string, reclaimPolicy: string, accessModes: Array<string | null>, capacity: any, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type CronJobsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type CronJobsQuery = { __typename?: 'Query', handleGetCronJobList?: { __typename?: 'cronjob_CronJobList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'cronjob_CronJob', containerImages: Array<string | null>, schedule: string, suspend: boolean, active: number, lastSchedule: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type CronJobQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type CronJobQuery = { __typename?: 'Query', handleGetCronJobDetail?: { __typename?: 'cronjob_CronJobDetail', containerImages: Array<string | null>, schedule: string, suspend: boolean, active: number, lastSchedule: string, concurrencyPolicy: string, startingDeadlineSeconds: any, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null };

export type CronJobEventsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type CronJobEventsQuery = { __typename?: 'Query', handleGetCronJobEvents?: { __typename?: 'common_EventList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, events: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type CronJobJobsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  active?: InputMaybe<Scalars['String']['input']>;
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type CronJobJobsQuery = { __typename?: 'Query', handleGetCronJobJobs?: { __typename?: 'job_JobList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, jobs: Array<{ __typename?: 'job_Job', initContainerImages: Array<string | null>, containerImages: Array<string | null>, parallelism: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> }, jobStatus: { __typename?: 'job_JobStatus', message: string, status: string, conditions: Array<{ __typename?: 'common_Condition', message: string, type: string, status: string, lastProbeTime: string, lastTransitionTime: string, reason: string } | null> } } | null> } | null };

export type CronJobTriggerMutationVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
}>;


export type CronJobTriggerMutation = { __typename?: 'Mutation', handleTriggerCronJob?: any | null };

export type CronJobListFragment = { __typename?: 'cronjob_CronJobList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'cronjob_CronJob', containerImages: Array<string | null>, schedule: string, suspend: boolean, active: number, lastSchedule: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> };

export type CronJobFragment = { __typename?: 'cronjob_CronJob', containerImages: Array<string | null>, schedule: string, suspend: boolean, active: number, lastSchedule: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } };

export type CronJobDetailFragment = { __typename?: 'cronjob_CronJobDetail', containerImages: Array<string | null>, schedule: string, suspend: boolean, active: number, lastSchedule: string, concurrencyPolicy: string, startingDeadlineSeconds: any, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } };

export type DaemonSetsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type DaemonSetsQuery = { __typename?: 'Query', handleGetDaemonSetList?: { __typename?: 'daemonset_DaemonSetList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, daemonSets: Array<{ __typename?: 'daemonset_DaemonSet', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } } | null> } | null };

export type DaemonSetQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type DaemonSetQuery = { __typename?: 'Query', handleGetDaemonSetDetail?: { __typename?: 'daemonset_DaemonSetDetail', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> }, labelSelector?: { __typename?: 'v1_LabelSelector', matchLabels?: any | null, matchExpressions?: Array<{ __typename?: 'v1_LabelSelectorRequirement', key: string, operator: string, values?: Array<string | null> | null } | null> | null } | null } | null };

export type DaemonSetEventsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type DaemonSetEventsQuery = { __typename?: 'Query', handleGetDaemonSetEvents?: { __typename?: 'common_EventList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, events: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type DaemonSetPodsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type DaemonSetPodsQuery = { __typename?: 'Query', handleGetDaemonSetPods?: { __typename?: 'pod_PodList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, pods: Array<{ __typename?: 'pod_Pod', status: string, containerImages: Array<string | null>, nodeName: string, restartCount: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, containerStatuses: Array<{ __typename?: 'pod_ContainerStatus', name: string, ready: boolean, state: ContainerState } | null>, warnings: Array<{ __typename?: 'common_Event', message: string } | null>, allocatedResources: { __typename?: 'pod_PodAllocatedResources', cpuLimits: any, cpuRequests: any, memoryLimits: any, memoryRequests: any } } | null> } | null };

export type DaemonSetServicesQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type DaemonSetServicesQuery = { __typename?: 'Query', handleGetDaemonSetServices?: { __typename?: 'service_ServiceList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, services: Array<{ __typename?: 'service_Service', type: string, clusterIP: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, internalEndpoint: { __typename?: 'common_Endpoint', host: string, ports: Array<{ __typename?: 'common_ServicePort', port: number, nodePort: number, protocol: string } | null> }, externalEndpoints: Array<{ __typename?: 'common_Endpoint', host: string, ports: Array<{ __typename?: 'common_ServicePort', port: number, nodePort: number, protocol: string } | null> } | null> } | null> } | null };

export type DaemonSetListFragment = { __typename?: 'daemonset_DaemonSetList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, daemonSets: Array<{ __typename?: 'daemonset_DaemonSet', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } } | null> };

export type DaemonSetFragment = { __typename?: 'daemonset_DaemonSet', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } };

export type DaemonSetDetailFragment = { __typename?: 'daemonset_DaemonSetDetail', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> }, labelSelector?: { __typename?: 'v1_LabelSelector', matchLabels?: any | null, matchExpressions?: Array<{ __typename?: 'v1_LabelSelectorRequirement', key: string, operator: string, values?: Array<string | null> | null } | null> | null } | null };

export type DeploymentsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type DeploymentsQuery = { __typename?: 'Query', handleGetDeployments?: { __typename?: 'deployment_DeploymentList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, deployments: Array<{ __typename?: 'deployment_Deployment', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, pods: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } } | null> } | null };

export type DeploymentQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type DeploymentQuery = { __typename?: 'Query', handleGetDeploymentDetail?: { __typename?: 'deployment_DeploymentDetail', selector: any, initContainerImages: Array<string | null>, containerImages: Array<string | null>, minReadySeconds: number, revisionHistoryLimit: number, strategy: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, pods: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> }, conditions: Array<{ __typename?: 'common_Condition', message: string, type: string, status: string, lastProbeTime: string, lastTransitionTime: string, reason: string } | null>, rollingUpdateStrategy?: { __typename?: 'deployment_RollingUpdateStrategy', maxSurge: string, maxUnavailable: string } | null, statusInfo: { __typename?: 'deployment_StatusInfo', available: number, replicas: number, unavailable: number, updated: number } } | null };

export type DeploymentEventsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type DeploymentEventsQuery = { __typename?: 'Query', handleGetDeploymentEvents?: { __typename?: 'common_EventList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, events: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type DeploymentNewReplicaSetQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type DeploymentNewReplicaSetQuery = { __typename?: 'Query', handleGetDeploymentNewReplicaSet?: { __typename?: 'replicaset_ReplicaSet', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } } | null };

export type DeploymentOldReplicaSetsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type DeploymentOldReplicaSetsQuery = { __typename?: 'Query', handleGetDeploymentOldReplicaSets?: { __typename?: 'replicaset_ReplicaSetList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, replicaSets: Array<{ __typename?: 'replicaset_ReplicaSet', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } } | null> } | null };

export type DeploymentListFragment = { __typename?: 'deployment_DeploymentList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, deployments: Array<{ __typename?: 'deployment_Deployment', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, pods: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } } | null> };

export type DeploymentFragment = { __typename?: 'deployment_Deployment', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, pods: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } };

export type DeploymentDetailFragment = { __typename?: 'deployment_DeploymentDetail', selector: any, initContainerImages: Array<string | null>, containerImages: Array<string | null>, minReadySeconds: number, revisionHistoryLimit: number, strategy: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, pods: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> }, conditions: Array<{ __typename?: 'common_Condition', message: string, type: string, status: string, lastProbeTime: string, lastTransitionTime: string, reason: string } | null>, rollingUpdateStrategy?: { __typename?: 'deployment_RollingUpdateStrategy', maxSurge: string, maxUnavailable: string } | null, statusInfo: { __typename?: 'deployment_StatusInfo', available: number, replicas: number, unavailable: number, updated: number } };

export type RollingUpdateStrategyFragment = { __typename?: 'deployment_RollingUpdateStrategy', maxSurge: string, maxUnavailable: string };

export type StatusInfoFragment = { __typename?: 'deployment_StatusInfo', available: number, replicas: number, unavailable: number, updated: number };

export type JobsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type JobsQuery = { __typename?: 'Query', handleGetJobList?: { __typename?: 'job_JobList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, jobs: Array<{ __typename?: 'job_Job', initContainerImages: Array<string | null>, containerImages: Array<string | null>, parallelism: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> }, jobStatus: { __typename?: 'job_JobStatus', message: string, status: string, conditions: Array<{ __typename?: 'common_Condition', message: string, type: string, status: string, lastProbeTime: string, lastTransitionTime: string, reason: string } | null> } } | null> } | null };

export type JobQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type JobQuery = { __typename?: 'Query', handleGetJobDetail?: { __typename?: 'job_JobDetail', initContainerImages: Array<string | null>, containerImages: Array<string | null>, parallelism: number, completions: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> }, jobStatus: { __typename?: 'job_JobStatus', message: string, status: string, conditions: Array<{ __typename?: 'common_Condition', message: string, type: string, status: string, lastProbeTime: string, lastTransitionTime: string, reason: string } | null> } } | null };

export type JobEventsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type JobEventsQuery = { __typename?: 'Query', handleGetJobEvents?: { __typename?: 'common_EventList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, events: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type JobPodsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type JobPodsQuery = { __typename?: 'Query', handleGetJobPods?: { __typename?: 'pod_PodList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, pods: Array<{ __typename?: 'pod_Pod', status: string, containerImages: Array<string | null>, nodeName: string, restartCount: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, containerStatuses: Array<{ __typename?: 'pod_ContainerStatus', name: string, ready: boolean, state: ContainerState } | null>, warnings: Array<{ __typename?: 'common_Event', message: string } | null>, allocatedResources: { __typename?: 'pod_PodAllocatedResources', cpuLimits: any, cpuRequests: any, memoryLimits: any, memoryRequests: any } } | null> } | null };

export type JobListFragment = { __typename?: 'job_JobList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, jobs: Array<{ __typename?: 'job_Job', initContainerImages: Array<string | null>, containerImages: Array<string | null>, parallelism: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> }, jobStatus: { __typename?: 'job_JobStatus', message: string, status: string, conditions: Array<{ __typename?: 'common_Condition', message: string, type: string, status: string, lastProbeTime: string, lastTransitionTime: string, reason: string } | null> } } | null> };

export type JobFragment = { __typename?: 'job_Job', initContainerImages: Array<string | null>, containerImages: Array<string | null>, parallelism: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> }, jobStatus: { __typename?: 'job_JobStatus', message: string, status: string, conditions: Array<{ __typename?: 'common_Condition', message: string, type: string, status: string, lastProbeTime: string, lastTransitionTime: string, reason: string } | null> } };

export type JobDetailFragment = { __typename?: 'job_JobDetail', initContainerImages: Array<string | null>, containerImages: Array<string | null>, parallelism: number, completions: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> }, jobStatus: { __typename?: 'job_JobStatus', message: string, status: string, conditions: Array<{ __typename?: 'common_Condition', message: string, type: string, status: string, lastProbeTime: string, lastTransitionTime: string, reason: string } | null> } };

export type JobStatusFragment = { __typename?: 'job_JobStatus', message: string, status: string, conditions: Array<{ __typename?: 'common_Condition', message: string, type: string, status: string, lastProbeTime: string, lastTransitionTime: string, reason: string } | null> };

export type PodsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type PodsQuery = { __typename?: 'Query', handleGetPods?: { __typename?: 'pod_PodList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, pods: Array<{ __typename?: 'pod_Pod', status: string, containerImages: Array<string | null>, nodeName: string, restartCount: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, containerStatuses: Array<{ __typename?: 'pod_ContainerStatus', name: string, ready: boolean, state: ContainerState } | null>, warnings: Array<{ __typename?: 'common_Event', message: string } | null>, allocatedResources: { __typename?: 'pod_PodAllocatedResources', cpuLimits: any, cpuRequests: any, memoryLimits: any, memoryRequests: any } } | null> } | null };

export type PodQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
}>;


export type PodQuery = { __typename?: 'Query', handleGetPodDetail?: { __typename?: 'pod_PodDetail', nodeName: string, restartCount: number, serviceAccountName: string, podIP: string, podPhase: string, qosClass: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, conditions: Array<{ __typename?: 'common_Condition', message: string, type: string, status: string, lastProbeTime: string, lastTransitionTime: string, reason: string } | null>, containers: Array<{ __typename?: 'pod_Container', name: string, args: Array<string | null>, commands: Array<string | null>, image: string, state: ContainerState, securityContext: { __typename?: 'v1_SecurityContext', runAsUser?: any | null, runAsNonRoot?: boolean | null, runAsGroup?: any | null, allowPrivilegeEscalation?: boolean | null, privileged?: boolean | null, procMount?: string | null, readOnlyRootFilesystem?: boolean | null, windowsOptions?: { __typename?: 'v1_WindowsSecurityContextOptions', runAsUserName?: string | null, hostProcess?: boolean | null, gmsaCredentialSpecName?: string | null, gmsaCredentialSpec?: string | null } | null, seLinuxOptions?: { __typename?: 'v1_SELinuxOptions', user?: string | null, role?: string | null, level?: string | null, type?: string | null } | null, seccompProfile?: { __typename?: 'v1_SeccompProfile', type: string, localhostProfile?: string | null } | null, capabilities?: { __typename?: 'v1_Capabilities', add?: Array<string | null> | null, drop?: Array<string | null> | null } | null }, livenessProbe: { __typename?: 'v1_Probe', failureThreshold?: number | null, initialDelaySeconds?: number | null, periodSeconds?: number | null, successThreshold?: number | null, terminationGracePeriodSeconds?: any | null, timeoutSeconds?: number | null, tcpSocket?: { __typename?: 'v1_TCPSocketAction', host?: string | null, port: string } | null, grpc?: { __typename?: 'v1_GRPCAction', service: string, port: number } | null, httpGet?: { __typename?: 'v1_HTTPGetAction', host?: string | null, port: string, scheme?: string | null, path?: string | null, httpHeaders?: Array<{ __typename?: 'v1_HTTPHeader', name: string, value: string } | null> | null } | null, exec?: { __typename?: 'v1_ExecAction', command?: Array<string | null> | null } | null }, readinessProbe: { __typename?: 'v1_Probe', failureThreshold?: number | null, initialDelaySeconds?: number | null, periodSeconds?: number | null, successThreshold?: number | null, terminationGracePeriodSeconds?: any | null, timeoutSeconds?: number | null, tcpSocket?: { __typename?: 'v1_TCPSocketAction', host?: string | null, port: string } | null, grpc?: { __typename?: 'v1_GRPCAction', service: string, port: number } | null, httpGet?: { __typename?: 'v1_HTTPGetAction', host?: string | null, port: string, scheme?: string | null, path?: string | null, httpHeaders?: Array<{ __typename?: 'v1_HTTPHeader', name: string, value: string } | null> | null } | null, exec?: { __typename?: 'v1_ExecAction', command?: Array<string | null> | null } | null }, status: { __typename?: 'v1_ContainerStatus', name: string, started?: boolean | null, ready: boolean, containerID?: string | null, image: string, imageID: string, restartCount: number, resources?: { __typename?: 'v1_ResourceRequirements', claims?: Array<{ __typename?: 'v1_ResourceClaim', name: string } | null> | null } | null, lastState?: { __typename?: 'v1_ContainerState', running?: { __typename?: 'v1_ContainerStateRunning', startedAt?: string | null } | null, terminated?: { __typename?: 'v1_ContainerStateTerminated', startedAt?: string | null, reason?: string | null, message?: string | null, containerID?: string | null, exitCode: number, finishedAt?: string | null, signal?: number | null } | null, waiting?: { __typename?: 'v1_ContainerStateWaiting', message?: string | null, reason?: string | null } | null } | null, state?: { __typename?: 'v1_ContainerState', running?: { __typename?: 'v1_ContainerStateRunning', startedAt?: string | null } | null, terminated?: { __typename?: 'v1_ContainerStateTerminated', startedAt?: string | null, reason?: string | null, message?: string | null, containerID?: string | null, exitCode: number, finishedAt?: string | null, signal?: number | null } | null, waiting?: { __typename?: 'v1_ContainerStateWaiting', message?: string | null, reason?: string | null } | null } | null }, resources?: { __typename?: 'v1_ResourceRequirements', requests: any, limits: any, claims?: Array<{ __typename?: 'v1_ResourceClaim', name: string } | null> | null } | null } | null>, initContainers: Array<{ __typename?: 'pod_Container', name: string, args: Array<string | null>, commands: Array<string | null>, image: string, state: ContainerState, securityContext: { __typename?: 'v1_SecurityContext', runAsUser?: any | null, runAsNonRoot?: boolean | null, runAsGroup?: any | null, allowPrivilegeEscalation?: boolean | null, privileged?: boolean | null, procMount?: string | null, readOnlyRootFilesystem?: boolean | null, windowsOptions?: { __typename?: 'v1_WindowsSecurityContextOptions', runAsUserName?: string | null, hostProcess?: boolean | null, gmsaCredentialSpecName?: string | null, gmsaCredentialSpec?: string | null } | null, seLinuxOptions?: { __typename?: 'v1_SELinuxOptions', user?: string | null, role?: string | null, level?: string | null, type?: string | null } | null, seccompProfile?: { __typename?: 'v1_SeccompProfile', type: string, localhostProfile?: string | null } | null, capabilities?: { __typename?: 'v1_Capabilities', add?: Array<string | null> | null, drop?: Array<string | null> | null } | null }, livenessProbe: { __typename?: 'v1_Probe', failureThreshold?: number | null, initialDelaySeconds?: number | null, periodSeconds?: number | null, successThreshold?: number | null, terminationGracePeriodSeconds?: any | null, timeoutSeconds?: number | null, tcpSocket?: { __typename?: 'v1_TCPSocketAction', host?: string | null, port: string } | null, grpc?: { __typename?: 'v1_GRPCAction', service: string, port: number } | null, httpGet?: { __typename?: 'v1_HTTPGetAction', host?: string | null, port: string, scheme?: string | null, path?: string | null, httpHeaders?: Array<{ __typename?: 'v1_HTTPHeader', name: string, value: string } | null> | null } | null, exec?: { __typename?: 'v1_ExecAction', command?: Array<string | null> | null } | null }, readinessProbe: { __typename?: 'v1_Probe', failureThreshold?: number | null, initialDelaySeconds?: number | null, periodSeconds?: number | null, successThreshold?: number | null, terminationGracePeriodSeconds?: any | null, timeoutSeconds?: number | null, tcpSocket?: { __typename?: 'v1_TCPSocketAction', host?: string | null, port: string } | null, grpc?: { __typename?: 'v1_GRPCAction', service: string, port: number } | null, httpGet?: { __typename?: 'v1_HTTPGetAction', host?: string | null, port: string, scheme?: string | null, path?: string | null, httpHeaders?: Array<{ __typename?: 'v1_HTTPHeader', name: string, value: string } | null> | null } | null, exec?: { __typename?: 'v1_ExecAction', command?: Array<string | null> | null } | null }, status: { __typename?: 'v1_ContainerStatus', name: string, started?: boolean | null, ready: boolean, containerID?: string | null, image: string, imageID: string, restartCount: number, resources?: { __typename?: 'v1_ResourceRequirements', claims?: Array<{ __typename?: 'v1_ResourceClaim', name: string } | null> | null } | null, lastState?: { __typename?: 'v1_ContainerState', running?: { __typename?: 'v1_ContainerStateRunning', startedAt?: string | null } | null, terminated?: { __typename?: 'v1_ContainerStateTerminated', startedAt?: string | null, reason?: string | null, message?: string | null, containerID?: string | null, exitCode: number, finishedAt?: string | null, signal?: number | null } | null, waiting?: { __typename?: 'v1_ContainerStateWaiting', message?: string | null, reason?: string | null } | null } | null, state?: { __typename?: 'v1_ContainerState', running?: { __typename?: 'v1_ContainerStateRunning', startedAt?: string | null } | null, terminated?: { __typename?: 'v1_ContainerStateTerminated', startedAt?: string | null, reason?: string | null, message?: string | null, containerID?: string | null, exitCode: number, finishedAt?: string | null, signal?: number | null } | null, waiting?: { __typename?: 'v1_ContainerStateWaiting', message?: string | null, reason?: string | null } | null } | null }, resources?: { __typename?: 'v1_ResourceRequirements', requests: any, limits: any, claims?: Array<{ __typename?: 'v1_ResourceClaim', name: string } | null> | null } | null } | null>, imagePullSecrets?: Array<{ __typename?: 'v1_LocalObjectReference', name?: string | null } | null> | null, persistentVolumeClaimList: { __typename?: 'persistentvolumeclaim_PersistentVolumeClaimList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'persistentvolumeclaim_PersistentVolumeClaim', status: string, volume: string, storageClass: string, accessModes: Array<string | null>, capacity: any, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> }, controller?: { __typename?: 'controller_ResourceOwner', containerImages: Array<string | null>, initContainerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, pods: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } } | null, securityContext: { __typename?: 'v1_PodSecurityContext', fsGroup?: any | null, fsGroupChangePolicy?: string | null, runAsUser?: any | null, runAsGroup?: any | null, runAsNonRoot?: boolean | null, supplementalGroups?: Array<any | null> | null, seccompProfile?: { __typename?: 'v1_SeccompProfile', type: string, localhostProfile?: string | null } | null, seLinuxOptions?: { __typename?: 'v1_SELinuxOptions', type?: string | null, level?: string | null, role?: string | null, user?: string | null } | null, sysctls?: Array<{ __typename?: 'v1_Sysctl', name: string, value: string } | null> | null, windowsOptions?: { __typename?: 'v1_WindowsSecurityContextOptions', gmsaCredentialSpec?: string | null, gmsaCredentialSpecName?: string | null, hostProcess?: boolean | null, runAsUserName?: string | null } | null } } | null };

export type PodEventsQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type PodEventsQuery = { __typename?: 'Query', handleGetPodEvents?: { __typename?: 'common_EventList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, events: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type PodLogsQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  container: Scalars['String']['input'];
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type PodLogsQuery = { __typename?: 'Query', handleLogs?: { __typename?: 'logs_LogDetails', info: { __typename?: 'logs_LogInfo', podName: string, containerName: string, initContainerName: string, fromDate: string, toDate: string }, logs: Array<{ __typename?: 'logs_LogLine', timestamp: string, content: string } | null> } | null };

export type ContainerFragment = { __typename?: 'pod_Container', name: string, args: Array<string | null>, commands: Array<string | null>, image: string, state: ContainerState, securityContext: { __typename?: 'v1_SecurityContext', runAsUser?: any | null, runAsNonRoot?: boolean | null, runAsGroup?: any | null, allowPrivilegeEscalation?: boolean | null, privileged?: boolean | null, procMount?: string | null, readOnlyRootFilesystem?: boolean | null, windowsOptions?: { __typename?: 'v1_WindowsSecurityContextOptions', runAsUserName?: string | null, hostProcess?: boolean | null, gmsaCredentialSpecName?: string | null, gmsaCredentialSpec?: string | null } | null, seLinuxOptions?: { __typename?: 'v1_SELinuxOptions', user?: string | null, role?: string | null, level?: string | null, type?: string | null } | null, seccompProfile?: { __typename?: 'v1_SeccompProfile', type: string, localhostProfile?: string | null } | null, capabilities?: { __typename?: 'v1_Capabilities', add?: Array<string | null> | null, drop?: Array<string | null> | null } | null }, livenessProbe: { __typename?: 'v1_Probe', failureThreshold?: number | null, initialDelaySeconds?: number | null, periodSeconds?: number | null, successThreshold?: number | null, terminationGracePeriodSeconds?: any | null, timeoutSeconds?: number | null, tcpSocket?: { __typename?: 'v1_TCPSocketAction', host?: string | null, port: string } | null, grpc?: { __typename?: 'v1_GRPCAction', service: string, port: number } | null, httpGet?: { __typename?: 'v1_HTTPGetAction', host?: string | null, port: string, scheme?: string | null, path?: string | null, httpHeaders?: Array<{ __typename?: 'v1_HTTPHeader', name: string, value: string } | null> | null } | null, exec?: { __typename?: 'v1_ExecAction', command?: Array<string | null> | null } | null }, readinessProbe: { __typename?: 'v1_Probe', failureThreshold?: number | null, initialDelaySeconds?: number | null, periodSeconds?: number | null, successThreshold?: number | null, terminationGracePeriodSeconds?: any | null, timeoutSeconds?: number | null, tcpSocket?: { __typename?: 'v1_TCPSocketAction', host?: string | null, port: string } | null, grpc?: { __typename?: 'v1_GRPCAction', service: string, port: number } | null, httpGet?: { __typename?: 'v1_HTTPGetAction', host?: string | null, port: string, scheme?: string | null, path?: string | null, httpHeaders?: Array<{ __typename?: 'v1_HTTPHeader', name: string, value: string } | null> | null } | null, exec?: { __typename?: 'v1_ExecAction', command?: Array<string | null> | null } | null }, status: { __typename?: 'v1_ContainerStatus', name: string, started?: boolean | null, ready: boolean, containerID?: string | null, image: string, imageID: string, restartCount: number, resources?: { __typename?: 'v1_ResourceRequirements', claims?: Array<{ __typename?: 'v1_ResourceClaim', name: string } | null> | null } | null, lastState?: { __typename?: 'v1_ContainerState', running?: { __typename?: 'v1_ContainerStateRunning', startedAt?: string | null } | null, terminated?: { __typename?: 'v1_ContainerStateTerminated', startedAt?: string | null, reason?: string | null, message?: string | null, containerID?: string | null, exitCode: number, finishedAt?: string | null, signal?: number | null } | null, waiting?: { __typename?: 'v1_ContainerStateWaiting', message?: string | null, reason?: string | null } | null } | null, state?: { __typename?: 'v1_ContainerState', running?: { __typename?: 'v1_ContainerStateRunning', startedAt?: string | null } | null, terminated?: { __typename?: 'v1_ContainerStateTerminated', startedAt?: string | null, reason?: string | null, message?: string | null, containerID?: string | null, exitCode: number, finishedAt?: string | null, signal?: number | null } | null, waiting?: { __typename?: 'v1_ContainerStateWaiting', message?: string | null, reason?: string | null } | null } | null }, resources?: { __typename?: 'v1_ResourceRequirements', requests: any, limits: any, claims?: Array<{ __typename?: 'v1_ResourceClaim', name: string } | null> | null } | null };

export type StateFragment = { __typename?: 'v1_ContainerState', running?: { __typename?: 'v1_ContainerStateRunning', startedAt?: string | null } | null, terminated?: { __typename?: 'v1_ContainerStateTerminated', startedAt?: string | null, reason?: string | null, message?: string | null, containerID?: string | null, exitCode: number, finishedAt?: string | null, signal?: number | null } | null, waiting?: { __typename?: 'v1_ContainerStateWaiting', message?: string | null, reason?: string | null } | null };

export type PodSecurityContextFragment = { __typename?: 'v1_PodSecurityContext', fsGroup?: any | null, fsGroupChangePolicy?: string | null, runAsUser?: any | null, runAsGroup?: any | null, runAsNonRoot?: boolean | null, supplementalGroups?: Array<any | null> | null, seccompProfile?: { __typename?: 'v1_SeccompProfile', type: string, localhostProfile?: string | null } | null, seLinuxOptions?: { __typename?: 'v1_SELinuxOptions', type?: string | null, level?: string | null, role?: string | null, user?: string | null } | null, sysctls?: Array<{ __typename?: 'v1_Sysctl', name: string, value: string } | null> | null, windowsOptions?: { __typename?: 'v1_WindowsSecurityContextOptions', gmsaCredentialSpec?: string | null, gmsaCredentialSpecName?: string | null, hostProcess?: boolean | null, runAsUserName?: string | null } | null };

export type SecurityContextFragment = { __typename?: 'v1_SecurityContext', runAsUser?: any | null, runAsNonRoot?: boolean | null, runAsGroup?: any | null, allowPrivilegeEscalation?: boolean | null, privileged?: boolean | null, procMount?: string | null, readOnlyRootFilesystem?: boolean | null, windowsOptions?: { __typename?: 'v1_WindowsSecurityContextOptions', runAsUserName?: string | null, hostProcess?: boolean | null, gmsaCredentialSpecName?: string | null, gmsaCredentialSpec?: string | null } | null, seLinuxOptions?: { __typename?: 'v1_SELinuxOptions', user?: string | null, role?: string | null, level?: string | null, type?: string | null } | null, seccompProfile?: { __typename?: 'v1_SeccompProfile', type: string, localhostProfile?: string | null } | null, capabilities?: { __typename?: 'v1_Capabilities', add?: Array<string | null> | null, drop?: Array<string | null> | null } | null };

export type PodListFragment = { __typename?: 'pod_PodList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, pods: Array<{ __typename?: 'pod_Pod', status: string, containerImages: Array<string | null>, nodeName: string, restartCount: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, containerStatuses: Array<{ __typename?: 'pod_ContainerStatus', name: string, ready: boolean, state: ContainerState } | null>, warnings: Array<{ __typename?: 'common_Event', message: string } | null>, allocatedResources: { __typename?: 'pod_PodAllocatedResources', cpuLimits: any, cpuRequests: any, memoryLimits: any, memoryRequests: any } } | null> };

export type LogDetailsFragment = { __typename?: 'logs_LogDetails', info: { __typename?: 'logs_LogInfo', podName: string, containerName: string, initContainerName: string, fromDate: string, toDate: string }, logs: Array<{ __typename?: 'logs_LogLine', timestamp: string, content: string } | null> };

export type ReplicaSetsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type ReplicaSetsQuery = { __typename?: 'Query', handleGetReplicaSets?: { __typename?: 'replicaset_ReplicaSetList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, replicaSets: Array<{ __typename?: 'replicaset_ReplicaSet', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } } | null> } | null };

export type ReplicaSetQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type ReplicaSetQuery = { __typename?: 'Query', handleGetReplicaSetDetail?: { __typename?: 'replicaset_ReplicaSetDetail', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> }, selector: { __typename?: 'v1_LabelSelector', matchLabels?: any | null, matchExpressions?: Array<{ __typename?: 'v1_LabelSelectorRequirement', key: string, operator: string, values?: Array<string | null> | null } | null> | null }, horizontalPodAutoscalerList: { __typename?: 'horizontalpodautoscaler_HorizontalPodAutoscalerList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, horizontalpodautoscalers: Array<{ __typename?: 'horizontalpodautoscaler_HorizontalPodAutoscaler', currentCPUUtilizationPercentage: number, maxReplicas: number, minReplicas: number, targetCPUUtilizationPercentage: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, scaleTargetRef: { __typename?: 'horizontalpodautoscaler_ScaleTargetRef', name: string, kind: string } } | null> } } | null };

export type ReplicaSetEventsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type ReplicaSetEventsQuery = { __typename?: 'Query', handleGetReplicaSetEvents?: { __typename?: 'common_EventList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, events: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type ReplicaSetPodsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type ReplicaSetPodsQuery = { __typename?: 'Query', handleGetReplicaSetPods?: { __typename?: 'pod_PodList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, pods: Array<{ __typename?: 'pod_Pod', status: string, containerImages: Array<string | null>, nodeName: string, restartCount: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, containerStatuses: Array<{ __typename?: 'pod_ContainerStatus', name: string, ready: boolean, state: ContainerState } | null>, warnings: Array<{ __typename?: 'common_Event', message: string } | null>, allocatedResources: { __typename?: 'pod_PodAllocatedResources', cpuLimits: any, cpuRequests: any, memoryLimits: any, memoryRequests: any } } | null> } | null };

export type ReplicaSetServicesQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type ReplicaSetServicesQuery = { __typename?: 'Query', handleGetReplicaSetServices?: { __typename?: 'service_ServiceList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, services: Array<{ __typename?: 'service_Service', type: string, clusterIP: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, internalEndpoint: { __typename?: 'common_Endpoint', host: string, ports: Array<{ __typename?: 'common_ServicePort', port: number, nodePort: number, protocol: string } | null> }, externalEndpoints: Array<{ __typename?: 'common_Endpoint', host: string, ports: Array<{ __typename?: 'common_ServicePort', port: number, nodePort: number, protocol: string } | null> } | null> } | null> } | null };

export type ReplicaSetListFragment = { __typename?: 'replicaset_ReplicaSetList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, replicaSets: Array<{ __typename?: 'replicaset_ReplicaSet', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } } | null> };

export type ReplicaSetFragment = { __typename?: 'replicaset_ReplicaSet', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } };

export type ReplicaSetDetailFragment = { __typename?: 'replicaset_ReplicaSetDetail', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> }, selector: { __typename?: 'v1_LabelSelector', matchLabels?: any | null, matchExpressions?: Array<{ __typename?: 'v1_LabelSelectorRequirement', key: string, operator: string, values?: Array<string | null> | null } | null> | null }, horizontalPodAutoscalerList: { __typename?: 'horizontalpodautoscaler_HorizontalPodAutoscalerList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, horizontalpodautoscalers: Array<{ __typename?: 'horizontalpodautoscaler_HorizontalPodAutoscaler', currentCPUUtilizationPercentage: number, maxReplicas: number, minReplicas: number, targetCPUUtilizationPercentage: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, scaleTargetRef: { __typename?: 'horizontalpodautoscaler_ScaleTargetRef', name: string, kind: string } } | null> } };

export type ReplicationControllersQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type ReplicationControllersQuery = { __typename?: 'Query', handleGetReplicationControllerList?: { __typename?: 'replicationcontroller_ReplicationControllerList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, replicationControllers: Array<{ __typename?: 'replicationcontroller_ReplicationController', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } } | null> } | null };

export type ReplicationControllerQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type ReplicationControllerQuery = { __typename?: 'Query', handleGetReplicationControllerDetail?: { __typename?: 'replicationcontroller_ReplicationControllerDetail', initContainerImages: Array<string | null>, containerImages: Array<string | null>, labelSelector: any, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } } | null };

export type ReplicationControllerEventsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type ReplicationControllerEventsQuery = { __typename?: 'Query', handleGetReplicationControllerEvents?: { __typename?: 'common_EventList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, events: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type ReplicationControllerPodsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type ReplicationControllerPodsQuery = { __typename?: 'Query', handleGetReplicationControllerPods?: { __typename?: 'pod_PodList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, pods: Array<{ __typename?: 'pod_Pod', status: string, containerImages: Array<string | null>, nodeName: string, restartCount: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, containerStatuses: Array<{ __typename?: 'pod_ContainerStatus', name: string, ready: boolean, state: ContainerState } | null>, warnings: Array<{ __typename?: 'common_Event', message: string } | null>, allocatedResources: { __typename?: 'pod_PodAllocatedResources', cpuLimits: any, cpuRequests: any, memoryLimits: any, memoryRequests: any } } | null> } | null };

export type ReplicationControllerServicesQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type ReplicationControllerServicesQuery = { __typename?: 'Query', handleGetReplicationControllerServices?: { __typename?: 'service_ServiceList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, services: Array<{ __typename?: 'service_Service', type: string, clusterIP: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, internalEndpoint: { __typename?: 'common_Endpoint', host: string, ports: Array<{ __typename?: 'common_ServicePort', port: number, nodePort: number, protocol: string } | null> }, externalEndpoints: Array<{ __typename?: 'common_Endpoint', host: string, ports: Array<{ __typename?: 'common_ServicePort', port: number, nodePort: number, protocol: string } | null> } | null> } | null> } | null };

export type ReplicationControllerListFragment = { __typename?: 'replicationcontroller_ReplicationControllerList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, replicationControllers: Array<{ __typename?: 'replicationcontroller_ReplicationController', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } } | null> };

export type ReplicationControllerFragment = { __typename?: 'replicationcontroller_ReplicationController', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } };

export type ReplicationControllerDetailFragment = { __typename?: 'replicationcontroller_ReplicationControllerDetail', initContainerImages: Array<string | null>, containerImages: Array<string | null>, labelSelector: any, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } };

export type StatefulSetsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type StatefulSetsQuery = { __typename?: 'Query', handleGetStatefulSetList?: { __typename?: 'statefulset_StatefulSetList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, statefulSets: Array<{ __typename?: 'statefulset_StatefulSet', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } } | null> } | null };

export type StatefulSetQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type StatefulSetQuery = { __typename?: 'Query', handleGetStatefulSetDetail?: { __typename?: 'statefulset_StatefulSetDetail', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } } | null };

export type StatefulSetEventsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type StatefulSetEventsQuery = { __typename?: 'Query', handleGetStatefulSetEvents?: { __typename?: 'common_EventList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, events: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } | null };

export type StatefulSetPodsQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
  filterBy?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  itemsPerPage?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['String']['input']>;
}>;


export type StatefulSetPodsQuery = { __typename?: 'Query', handleGetStatefulSetPods?: { __typename?: 'pod_PodList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, pods: Array<{ __typename?: 'pod_Pod', status: string, containerImages: Array<string | null>, nodeName: string, restartCount: number, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, containerStatuses: Array<{ __typename?: 'pod_ContainerStatus', name: string, ready: boolean, state: ContainerState } | null>, warnings: Array<{ __typename?: 'common_Event', message: string } | null>, allocatedResources: { __typename?: 'pod_PodAllocatedResources', cpuLimits: any, cpuRequests: any, memoryLimits: any, memoryRequests: any } } | null> } | null };

export type StatefulSetListFragment = { __typename?: 'statefulset_StatefulSetList', errors: Array<any | null>, listMeta: { __typename?: 'types_ListMeta', totalItems: number }, statefulSets: Array<{ __typename?: 'statefulset_StatefulSet', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } } | null> };

export type StatefulSetFragment = { __typename?: 'statefulset_StatefulSet', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } };

export type StatefulSetDetailFragment = { __typename?: 'statefulset_StatefulSetDetail', initContainerImages: Array<string | null>, containerImages: Array<string | null>, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null }, podInfo: { __typename?: 'common_PodInfo', current: number, desired?: number | null, failed: number, pending: number, running: number, succeeded: number, warnings: Array<{ __typename?: 'common_Event', objectName?: string | null, objectNamespace?: string | null, reason: string, type: string, message: string, sourceComponent: string, sourceHost: string, count: number, firstSeen: string, lastSeen: string, typeMeta: { __typename?: 'types_TypeMeta', kind?: string | null, restartable?: boolean | null, scalable?: boolean | null }, objectMeta: { __typename?: 'types_ObjectMeta', uid?: string | null, name?: string | null, namespace?: string | null, labels?: any | null, annotations?: any | null, creationTimestamp?: string | null } } | null> } };

export const ListMetaFragmentDoc = gql`
    fragment ListMeta on types_ListMeta {
  totalItems
}
    `;
export const TypeMetaFragmentDoc = gql`
    fragment TypeMeta on types_TypeMeta {
  kind
  restartable
  scalable
}
    `;
export const ObjectMetaFragmentDoc = gql`
    fragment ObjectMeta on types_ObjectMeta {
  uid
  name
  namespace
  labels
  annotations
  creationTimestamp
}
    `;
export const EventFragmentDoc = gql`
    fragment Event on common_Event {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  objectName
  objectNamespace
  reason
  type
  message
  sourceComponent
  sourceHost
  count
  firstSeen
  lastSeen
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;
export const EventListFragmentDoc = gql`
    fragment EventList on common_EventList {
  errors
  listMeta @type(name: "types_ListMeta") {
    ...ListMeta
  }
  events @type(name: "common_Event") {
    ...Event
  }
}
    ${ListMetaFragmentDoc}
${EventFragmentDoc}`;
export const PodDisruptionBudgetFragmentDoc = gql`
    fragment PodDisruptionBudget on poddisruptionbudget_PodDisruptionBudget {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  currentHealthy
  desiredHealthy
  disruptionsAllowed
  expectedPods
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;
export const PodDisruptionBudgetListFragmentDoc = gql`
    fragment PodDisruptionBudgetList on poddisruptionbudget_PodDisruptionBudgetList {
  errors
  listMeta @type(name: "types_ListMeta") {
    ...ListMeta
  }
  items @type(name: "poddisruptionbudget_PodDisruptionBudget") {
    ...PodDisruptionBudget
  }
}
    ${ListMetaFragmentDoc}
${PodDisruptionBudgetFragmentDoc}`;
export const PodDisruptionBudgetDetailFragmentDoc = gql`
    fragment PodDisruptionBudgetDetail on poddisruptionbudget_PodDisruptionBudgetDetail {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  currentHealthy
  desiredHealthy
  disruptionsAllowed
  expectedPods
  disruptedPods
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;
export const NetworkPolicyPortFragmentDoc = gql`
    fragment NetworkPolicyPort on v1_NetworkPolicyPort {
  port
  endPort
  protocol
}
    `;
export const IpBlockFragmentDoc = gql`
    fragment IPBlock on v1_IPBlock {
  except
  cidr
}
    `;
export const PolicyRuleFragmentDoc = gql`
    fragment PolicyRule on v1_PolicyRule {
  apiGroups
  nonResourceURLs
  resourceNames
  verbs
  resources
}
    `;
export const SubjectFragmentDoc = gql`
    fragment Subject on v1_Subject {
  apiGroup
  kind
  name
  namespace
}
    `;
export const PodInfoFragmentDoc = gql`
    fragment PodInfo on common_PodInfo {
  current
  desired
  failed
  pending
  running
  succeeded
  warnings {
    ...Event
  }
}
    ${EventFragmentDoc}`;
export const ResourceOwnerFragmentDoc = gql`
    fragment ResourceOwner on controller_ResourceOwner {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  containerImages
  initContainerImages
  pods @type(name: "common_PodInfo") {
    ...PodInfo
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${PodInfoFragmentDoc}`;
export const NodeAllocatedResourcesFragmentDoc = gql`
    fragment NodeAllocatedResources on node_NodeAllocatedResources {
  cpuRequests
  cpuRequestsFraction
  cpuLimits
  cpuLimitsFraction
  cpuCapacity
  memoryRequests
  memoryRequestsFraction
  memoryLimits
  memoryLimitsFraction
  memoryCapacity
  allocatedPods
  podFraction
  podCapacity
}
    `;
export const EndpointFragmentDoc = gql`
    fragment Endpoint on common_Endpoint {
  host
  ports {
    port
    nodePort
    protocol
  }
}
    `;
export const IngressListFragmentDoc = gql`
    fragment IngressList on ingress_IngressList {
  errors
  listMeta @type(name: "types_ListMeta") {
    ...ListMeta
  }
  items {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    endpoints @type(name: "common_Endpoint") {
      ...Endpoint
    }
    hosts
  }
}
    ${ListMetaFragmentDoc}
${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${EndpointFragmentDoc}`;
export const ServiceListFragmentDoc = gql`
    fragment ServiceList on service_ServiceList {
  errors
  listMeta @type(name: "types_ListMeta") {
    ...ListMeta
  }
  services {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    internalEndpoint @type(name: "common_Endpoint") {
      ...Endpoint
    }
    externalEndpoints @type(name: "common_Endpoint") {
      ...Endpoint
    }
    type
    clusterIP
  }
}
    ${ListMetaFragmentDoc}
${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${EndpointFragmentDoc}`;
export const PersistentVolumeClaimDetailFragmentDoc = gql`
    fragment PersistentVolumeClaimDetail on persistentvolumeclaim_PersistentVolumeClaimDetail {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  status
  volume
  storageClass
  accessModes
  capacity
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;
export const PersistentVolumeClaimFragmentDoc = gql`
    fragment PersistentVolumeClaim on persistentvolumeclaim_PersistentVolumeClaim {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  status
  volume
  storageClass
  accessModes
  capacity
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;
export const PersistentVolumeClaimListFragmentDoc = gql`
    fragment PersistentVolumeClaimList on persistentvolumeclaim_PersistentVolumeClaimList {
  errors
  listMeta @type(name: "types_ListMeta") {
    ...ListMeta
  }
  items @type(name: "persistentvolumeclaim_PersistentVolumeClaim") {
    ...PersistentVolumeClaim
  }
}
    ${ListMetaFragmentDoc}
${PersistentVolumeClaimFragmentDoc}`;
export const CronJobFragmentDoc = gql`
    fragment CronJob on cronjob_CronJob {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  containerImages
  schedule
  suspend
  active
  lastSchedule
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;
export const CronJobListFragmentDoc = gql`
    fragment CronJobList on cronjob_CronJobList {
  errors
  listMeta @type(name: "types_ListMeta") {
    ...ListMeta
  }
  items @type(name: "cronjob_CronJob") {
    ...CronJob
  }
}
    ${ListMetaFragmentDoc}
${CronJobFragmentDoc}`;
export const CronJobDetailFragmentDoc = gql`
    fragment CronJobDetail on cronjob_CronJobDetail {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  containerImages
  schedule
  suspend
  active
  lastSchedule
  concurrencyPolicy
  startingDeadlineSeconds
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;
export const DaemonSetFragmentDoc = gql`
    fragment DaemonSet on daemonset_DaemonSet {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  podInfo @type(name: "common_PodInfo") {
    ...PodInfo
  }
  initContainerImages
  containerImages
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${PodInfoFragmentDoc}`;
export const DaemonSetListFragmentDoc = gql`
    fragment DaemonSetList on daemonset_DaemonSetList {
  errors
  listMeta @type(name: "types_ListMeta") {
    ...ListMeta
  }
  daemonSets @type(name: "daemonset_DaemonSet") {
    ...DaemonSet
  }
}
    ${ListMetaFragmentDoc}
${DaemonSetFragmentDoc}`;
export const SelectorFragmentDoc = gql`
    fragment Selector on v1_LabelSelector {
  matchLabels
  matchExpressions {
    key
    operator
    values
  }
}
    `;
export const DaemonSetDetailFragmentDoc = gql`
    fragment DaemonSetDetail on daemonset_DaemonSetDetail {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  podInfo @type(name: "common_PodInfo") {
    ...PodInfo
  }
  labelSelector @type(name: "v1_LabelSelector") {
    ...Selector
  }
  initContainerImages
  containerImages
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${PodInfoFragmentDoc}
${SelectorFragmentDoc}`;
export const DeploymentFragmentDoc = gql`
    fragment Deployment on deployment_Deployment {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  pods @type(name: "common_PodInfo") {
    ...PodInfo
  }
  initContainerImages
  containerImages
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${PodInfoFragmentDoc}`;
export const DeploymentListFragmentDoc = gql`
    fragment DeploymentList on deployment_DeploymentList {
  errors
  listMeta @type(name: "types_ListMeta") {
    ...ListMeta
  }
  deployments @type(name: "deployment_Deployment") {
    ...Deployment
  }
}
    ${ListMetaFragmentDoc}
${DeploymentFragmentDoc}`;
export const ConditionFragmentDoc = gql`
    fragment Condition on common_Condition {
  message
  type
  status
  lastProbeTime
  lastTransitionTime
  reason
}
    `;
export const RollingUpdateStrategyFragmentDoc = gql`
    fragment RollingUpdateStrategy on deployment_RollingUpdateStrategy {
  maxSurge
  maxUnavailable
}
    `;
export const StatusInfoFragmentDoc = gql`
    fragment StatusInfo on deployment_StatusInfo {
  available
  replicas
  unavailable
  updated
}
    `;
export const DeploymentDetailFragmentDoc = gql`
    fragment DeploymentDetail on deployment_DeploymentDetail {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  pods @type(name: "common_PodInfo") {
    ...PodInfo
  }
  conditions @type(name: "common_Condition") {
    ...Condition
  }
  rollingUpdateStrategy @type(name: "deployment_RollingUpdateStrategy") {
    ...RollingUpdateStrategy
  }
  statusInfo @type(name: "deployment_StatusInfo") {
    ...StatusInfo
  }
  selector
  initContainerImages
  containerImages
  minReadySeconds
  revisionHistoryLimit
  strategy
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${PodInfoFragmentDoc}
${ConditionFragmentDoc}
${RollingUpdateStrategyFragmentDoc}
${StatusInfoFragmentDoc}`;
export const JobStatusFragmentDoc = gql`
    fragment JobStatus on job_JobStatus {
  conditions @type(name: "common_Condition") {
    ...Condition
  }
  message
  status
}
    ${ConditionFragmentDoc}`;
export const JobFragmentDoc = gql`
    fragment Job on job_Job {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  podInfo @type(name: "common_PodInfo") {
    ...PodInfo
  }
  jobStatus @type(name: "job_JobStatus") {
    ...JobStatus
  }
  initContainerImages
  containerImages
  parallelism
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${PodInfoFragmentDoc}
${JobStatusFragmentDoc}`;
export const JobListFragmentDoc = gql`
    fragment JobList on job_JobList {
  errors
  listMeta @type(name: "types_ListMeta") {
    ...ListMeta
  }
  jobs @type(name: "job_Job") {
    ...Job
  }
}
    ${ListMetaFragmentDoc}
${JobFragmentDoc}`;
export const JobDetailFragmentDoc = gql`
    fragment JobDetail on job_JobDetail {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  podInfo @type(name: "common_PodInfo") {
    ...PodInfo
  }
  jobStatus @type(name: "job_JobStatus") {
    ...JobStatus
  }
  initContainerImages
  containerImages
  parallelism
  completions
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${PodInfoFragmentDoc}
${JobStatusFragmentDoc}`;
export const SecurityContextFragmentDoc = gql`
    fragment SecurityContext on v1_SecurityContext {
  windowsOptions {
    runAsUserName
    hostProcess
    gmsaCredentialSpecName
    gmsaCredentialSpec
  }
  seLinuxOptions {
    user
    role
    level
    type
  }
  seccompProfile {
    type
    localhostProfile
  }
  runAsUser
  runAsNonRoot
  runAsGroup
  allowPrivilegeEscalation
  capabilities {
    add
    drop
  }
  privileged
  procMount
  readOnlyRootFilesystem
}
    `;
export const ProbeFragmentDoc = gql`
    fragment Probe on v1_Probe {
  failureThreshold
  initialDelaySeconds
  periodSeconds
  successThreshold
  terminationGracePeriodSeconds
  timeoutSeconds
  tcpSocket {
    host
    port
  }
  grpc {
    service
    port
  }
  httpGet {
    host
    port
    scheme
    path
    httpHeaders {
      name
      value
    }
  }
  exec {
    command
  }
}
    `;
export const StateFragmentDoc = gql`
    fragment State on v1_ContainerState {
  running {
    startedAt
  }
  terminated {
    startedAt
    reason
    message
    containerID
    exitCode
    finishedAt
    signal
  }
  waiting {
    message
    reason
  }
}
    `;
export const ContainerFragmentDoc = gql`
    fragment Container on pod_Container {
  name
  args
  commands
  image
  state
  securityContext @type(name: "v1_SecurityContext") {
    ...SecurityContext
  }
  livenessProbe @type(name: "v1_Probe") {
    ...Probe
  }
  readinessProbe @type(name: "v1_Probe") {
    ...Probe
  }
  status @type(name: "v1_ContainerStatus") {
    name
    started
    ready
    containerID
    image
    imageID
    restartCount
    resources {
      claims {
        name
      }
    }
    lastState @type(name: "v1_ContainerState") {
      ...State
    }
    state @type(name: "v1_ContainerState") {
      ...State
    }
  }
  resources {
    requests
    limits
    claims {
      name
    }
  }
}
    ${SecurityContextFragmentDoc}
${ProbeFragmentDoc}
${StateFragmentDoc}`;
export const PodSecurityContextFragmentDoc = gql`
    fragment PodSecurityContext on v1_PodSecurityContext {
  fsGroup
  fsGroupChangePolicy
  runAsUser
  runAsGroup
  runAsNonRoot
  seccompProfile {
    type
    localhostProfile
  }
  seLinuxOptions {
    type
    level
    role
    user
  }
  supplementalGroups
  sysctls {
    name
    value
  }
  windowsOptions {
    gmsaCredentialSpec
    gmsaCredentialSpecName
    hostProcess
    runAsUserName
  }
}
    `;
export const PodListFragmentDoc = gql`
    fragment PodList on pod_PodList {
  errors
  listMeta @type(name: "types_ListMeta") {
    ...ListMeta
  }
  pods {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    containerStatuses {
      name
      ready
      state
    }
    status
    containerImages
    nodeName
    restartCount
    warnings {
      message
    }
    allocatedResources {
      cpuLimits
      cpuRequests
      memoryLimits
      memoryRequests
    }
  }
}
    ${ListMetaFragmentDoc}
${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;
export const LogDetailsFragmentDoc = gql`
    fragment LogDetails on logs_LogDetails {
  info {
    podName
    containerName
    initContainerName
    fromDate
    toDate
  }
  logs {
    timestamp
    content
  }
}
    `;
export const ReplicaSetFragmentDoc = gql`
    fragment ReplicaSet on replicaset_ReplicaSet {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  podInfo @type(name: "common_PodInfo") {
    ...PodInfo
  }
  initContainerImages
  containerImages
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${PodInfoFragmentDoc}`;
export const ReplicaSetListFragmentDoc = gql`
    fragment ReplicaSetList on replicaset_ReplicaSetList {
  errors
  listMeta @type(name: "types_ListMeta") {
    ...ListMeta
  }
  replicaSets @type(name: "replicaset_ReplicaSet") {
    ...ReplicaSet
  }
}
    ${ListMetaFragmentDoc}
${ReplicaSetFragmentDoc}`;
export const HorizontalPodAutoscalerFragmentDoc = gql`
    fragment HorizontalPodAutoscaler on horizontalpodautoscaler_HorizontalPodAutoscaler {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  currentCPUUtilizationPercentage
  maxReplicas
  minReplicas
  targetCPUUtilizationPercentage
  scaleTargetRef {
    name
    kind
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;
export const HorizontalPodAutoscalerListFragmentDoc = gql`
    fragment HorizontalPodAutoscalerList on horizontalpodautoscaler_HorizontalPodAutoscalerList {
  errors
  listMeta @type(name: "types_ListMeta") {
    ...ListMeta
  }
  horizontalpodautoscalers @type(name: "horizontalpodautoscaler_HorizontalPodAutoscaler") {
    ...HorizontalPodAutoscaler
  }
}
    ${ListMetaFragmentDoc}
${HorizontalPodAutoscalerFragmentDoc}`;
export const ReplicaSetDetailFragmentDoc = gql`
    fragment ReplicaSetDetail on replicaset_ReplicaSetDetail {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  podInfo @type(name: "common_PodInfo") {
    ...PodInfo
  }
  selector @type(name: "v1_LabelSelector") {
    ...Selector
  }
  horizontalPodAutoscalerList @type(name: "horizontalpodautoscaler_HorizontalPodAutoscalerList") {
    ...HorizontalPodAutoscalerList
  }
  initContainerImages
  containerImages
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${PodInfoFragmentDoc}
${SelectorFragmentDoc}
${HorizontalPodAutoscalerListFragmentDoc}`;
export const ReplicationControllerFragmentDoc = gql`
    fragment ReplicationController on replicationcontroller_ReplicationController {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  podInfo @type(name: "common_PodInfo") {
    ...PodInfo
  }
  initContainerImages
  containerImages
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${PodInfoFragmentDoc}`;
export const ReplicationControllerListFragmentDoc = gql`
    fragment ReplicationControllerList on replicationcontroller_ReplicationControllerList {
  errors
  listMeta @type(name: "types_ListMeta") {
    ...ListMeta
  }
  replicationControllers @type(name: "replicationcontroller_ReplicationController") {
    ...ReplicationController
  }
}
    ${ListMetaFragmentDoc}
${ReplicationControllerFragmentDoc}`;
export const ReplicationControllerDetailFragmentDoc = gql`
    fragment ReplicationControllerDetail on replicationcontroller_ReplicationControllerDetail {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  podInfo @type(name: "common_PodInfo") {
    ...PodInfo
  }
  initContainerImages
  containerImages
  labelSelector
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${PodInfoFragmentDoc}`;
export const StatefulSetFragmentDoc = gql`
    fragment StatefulSet on statefulset_StatefulSet {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  podInfo @type(name: "common_PodInfo") {
    ...PodInfo
  }
  initContainerImages
  containerImages
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${PodInfoFragmentDoc}`;
export const StatefulSetListFragmentDoc = gql`
    fragment StatefulSetList on statefulset_StatefulSetList {
  errors
  listMeta @type(name: "types_ListMeta") {
    ...ListMeta
  }
  statefulSets @type(name: "statefulset_StatefulSet") {
    ...StatefulSet
  }
}
    ${ListMetaFragmentDoc}
${StatefulSetFragmentDoc}`;
export const StatefulSetDetailFragmentDoc = gql`
    fragment StatefulSetDetail on statefulset_StatefulSetDetail {
  typeMeta @type(name: "types_TypeMeta") {
    ...TypeMeta
  }
  objectMeta @type(name: "types_ObjectMeta") {
    ...ObjectMeta
  }
  podInfo @type(name: "common_PodInfo") {
    ...PodInfo
  }
  initContainerImages
  containerImages
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${PodInfoFragmentDoc}`;
export const ClusterRolesDocument = gql`
    query ClusterRoles($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetClusterRoleList(
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(path: "clusterrole?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    errors
    listMeta @type(name: "types_ListMeta") {
      ...ListMeta
    }
    items {
      typeMeta @type(name: "types_TypeMeta") {
        ...TypeMeta
      }
      objectMeta @type(name: "types_ObjectMeta") {
        ...ObjectMeta
      }
    }
  }
}
    ${ListMetaFragmentDoc}
${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useClusterRolesQuery__
 *
 * To run a query within a React component, call `useClusterRolesQuery` and pass it any options that fit your needs.
 * When your component renders, `useClusterRolesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClusterRolesQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useClusterRolesQuery(baseOptions: Apollo.QueryHookOptions<ClusterRolesQuery, ClusterRolesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClusterRolesQuery, ClusterRolesQueryVariables>(ClusterRolesDocument, options);
      }
export function useClusterRolesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClusterRolesQuery, ClusterRolesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClusterRolesQuery, ClusterRolesQueryVariables>(ClusterRolesDocument, options);
        }
export function useClusterRolesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ClusterRolesQuery, ClusterRolesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ClusterRolesQuery, ClusterRolesQueryVariables>(ClusterRolesDocument, options);
        }
export type ClusterRolesQueryHookResult = ReturnType<typeof useClusterRolesQuery>;
export type ClusterRolesLazyQueryHookResult = ReturnType<typeof useClusterRolesLazyQuery>;
export type ClusterRolesSuspenseQueryHookResult = ReturnType<typeof useClusterRolesSuspenseQuery>;
export type ClusterRolesQueryResult = Apollo.QueryResult<ClusterRolesQuery, ClusterRolesQueryVariables>;
export const ClusterRoleDocument = gql`
    query ClusterRole($name: String!) {
  handleGetClusterRoleDetail(name: $name) @rest(path: "clusterrole/{args.name}") {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    rules @type(name: "v1_PolicyRule") {
      ...PolicyRule
    }
    errors
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${PolicyRuleFragmentDoc}`;

/**
 * __useClusterRoleQuery__
 *
 * To run a query within a React component, call `useClusterRoleQuery` and pass it any options that fit your needs.
 * When your component renders, `useClusterRoleQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClusterRoleQuery({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useClusterRoleQuery(baseOptions: Apollo.QueryHookOptions<ClusterRoleQuery, ClusterRoleQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClusterRoleQuery, ClusterRoleQueryVariables>(ClusterRoleDocument, options);
      }
export function useClusterRoleLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClusterRoleQuery, ClusterRoleQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClusterRoleQuery, ClusterRoleQueryVariables>(ClusterRoleDocument, options);
        }
export function useClusterRoleSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ClusterRoleQuery, ClusterRoleQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ClusterRoleQuery, ClusterRoleQueryVariables>(ClusterRoleDocument, options);
        }
export type ClusterRoleQueryHookResult = ReturnType<typeof useClusterRoleQuery>;
export type ClusterRoleLazyQueryHookResult = ReturnType<typeof useClusterRoleLazyQuery>;
export type ClusterRoleSuspenseQueryHookResult = ReturnType<typeof useClusterRoleSuspenseQuery>;
export type ClusterRoleQueryResult = Apollo.QueryResult<ClusterRoleQuery, ClusterRoleQueryVariables>;
export const ClusterRoleBindingsDocument = gql`
    query ClusterRoleBindings($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetClusterRoleBindingList(
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(path: "clusterrolebinding?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    errors
    listMeta @type(name: "types_ListMeta") {
      ...ListMeta
    }
    items {
      typeMeta @type(name: "types_TypeMeta") {
        ...TypeMeta
      }
      objectMeta @type(name: "types_ObjectMeta") {
        ...ObjectMeta
      }
    }
  }
}
    ${ListMetaFragmentDoc}
${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useClusterRoleBindingsQuery__
 *
 * To run a query within a React component, call `useClusterRoleBindingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useClusterRoleBindingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClusterRoleBindingsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useClusterRoleBindingsQuery(baseOptions: Apollo.QueryHookOptions<ClusterRoleBindingsQuery, ClusterRoleBindingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClusterRoleBindingsQuery, ClusterRoleBindingsQueryVariables>(ClusterRoleBindingsDocument, options);
      }
export function useClusterRoleBindingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClusterRoleBindingsQuery, ClusterRoleBindingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClusterRoleBindingsQuery, ClusterRoleBindingsQueryVariables>(ClusterRoleBindingsDocument, options);
        }
export function useClusterRoleBindingsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ClusterRoleBindingsQuery, ClusterRoleBindingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ClusterRoleBindingsQuery, ClusterRoleBindingsQueryVariables>(ClusterRoleBindingsDocument, options);
        }
export type ClusterRoleBindingsQueryHookResult = ReturnType<typeof useClusterRoleBindingsQuery>;
export type ClusterRoleBindingsLazyQueryHookResult = ReturnType<typeof useClusterRoleBindingsLazyQuery>;
export type ClusterRoleBindingsSuspenseQueryHookResult = ReturnType<typeof useClusterRoleBindingsSuspenseQuery>;
export type ClusterRoleBindingsQueryResult = Apollo.QueryResult<ClusterRoleBindingsQuery, ClusterRoleBindingsQueryVariables>;
export const ClusterRoleBindingDocument = gql`
    query ClusterRoleBinding($name: String!) {
  handleGetClusterRoleBindingDetail(name: $name) @rest(path: "clusterrolebinding/{args.name}") {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    subjects @type(name: "v1_Subject") {
      ...Subject
    }
    roleRef {
      name
      kind
      apiGroup
    }
    errors
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${SubjectFragmentDoc}`;

/**
 * __useClusterRoleBindingQuery__
 *
 * To run a query within a React component, call `useClusterRoleBindingQuery` and pass it any options that fit your needs.
 * When your component renders, `useClusterRoleBindingQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClusterRoleBindingQuery({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useClusterRoleBindingQuery(baseOptions: Apollo.QueryHookOptions<ClusterRoleBindingQuery, ClusterRoleBindingQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClusterRoleBindingQuery, ClusterRoleBindingQueryVariables>(ClusterRoleBindingDocument, options);
      }
export function useClusterRoleBindingLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClusterRoleBindingQuery, ClusterRoleBindingQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClusterRoleBindingQuery, ClusterRoleBindingQueryVariables>(ClusterRoleBindingDocument, options);
        }
export function useClusterRoleBindingSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ClusterRoleBindingQuery, ClusterRoleBindingQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ClusterRoleBindingQuery, ClusterRoleBindingQueryVariables>(ClusterRoleBindingDocument, options);
        }
export type ClusterRoleBindingQueryHookResult = ReturnType<typeof useClusterRoleBindingQuery>;
export type ClusterRoleBindingLazyQueryHookResult = ReturnType<typeof useClusterRoleBindingLazyQuery>;
export type ClusterRoleBindingSuspenseQueryHookResult = ReturnType<typeof useClusterRoleBindingSuspenseQuery>;
export type ClusterRoleBindingQueryResult = Apollo.QueryResult<ClusterRoleBindingQuery, ClusterRoleBindingQueryVariables>;
export const RolesDocument = gql`
    query Roles($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetRoleList(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "role_RoleList", path: "role/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    errors
    listMeta @type(name: "types_ListMeta") {
      ...ListMeta
    }
    items {
      typeMeta @type(name: "types_TypeMeta") {
        ...TypeMeta
      }
      objectMeta @type(name: "types_ObjectMeta") {
        ...ObjectMeta
      }
    }
  }
}
    ${ListMetaFragmentDoc}
${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useRolesQuery__
 *
 * To run a query within a React component, call `useRolesQuery` and pass it any options that fit your needs.
 * When your component renders, `useRolesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRolesQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useRolesQuery(baseOptions: Apollo.QueryHookOptions<RolesQuery, RolesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RolesQuery, RolesQueryVariables>(RolesDocument, options);
      }
export function useRolesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RolesQuery, RolesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RolesQuery, RolesQueryVariables>(RolesDocument, options);
        }
export function useRolesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<RolesQuery, RolesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<RolesQuery, RolesQueryVariables>(RolesDocument, options);
        }
export type RolesQueryHookResult = ReturnType<typeof useRolesQuery>;
export type RolesLazyQueryHookResult = ReturnType<typeof useRolesLazyQuery>;
export type RolesSuspenseQueryHookResult = ReturnType<typeof useRolesSuspenseQuery>;
export type RolesQueryResult = Apollo.QueryResult<RolesQuery, RolesQueryVariables>;
export const RoleDocument = gql`
    query Role($name: String!, $namespace: String!) {
  handleGetRoleDetail(namespace: $namespace, name: $name) @rest(path: "role/{args.namespace}/{args.name}") {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    rules @type(name: "v1_PolicyRule") {
      ...PolicyRule
    }
    errors
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${PolicyRuleFragmentDoc}`;

/**
 * __useRoleQuery__
 *
 * To run a query within a React component, call `useRoleQuery` and pass it any options that fit your needs.
 * When your component renders, `useRoleQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRoleQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *   },
 * });
 */
export function useRoleQuery(baseOptions: Apollo.QueryHookOptions<RoleQuery, RoleQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RoleQuery, RoleQueryVariables>(RoleDocument, options);
      }
export function useRoleLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RoleQuery, RoleQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RoleQuery, RoleQueryVariables>(RoleDocument, options);
        }
export function useRoleSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<RoleQuery, RoleQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<RoleQuery, RoleQueryVariables>(RoleDocument, options);
        }
export type RoleQueryHookResult = ReturnType<typeof useRoleQuery>;
export type RoleLazyQueryHookResult = ReturnType<typeof useRoleLazyQuery>;
export type RoleSuspenseQueryHookResult = ReturnType<typeof useRoleSuspenseQuery>;
export type RoleQueryResult = Apollo.QueryResult<RoleQuery, RoleQueryVariables>;
export const RoleBindingsDocument = gql`
    query RoleBindings($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetRoleBindingList(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(path: "rolebinding/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    errors
    listMeta @type(name: "types_ListMeta") {
      ...ListMeta
    }
    items {
      typeMeta @type(name: "types_TypeMeta") {
        ...TypeMeta
      }
      objectMeta @type(name: "types_ObjectMeta") {
        ...ObjectMeta
      }
    }
  }
}
    ${ListMetaFragmentDoc}
${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useRoleBindingsQuery__
 *
 * To run a query within a React component, call `useRoleBindingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useRoleBindingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRoleBindingsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useRoleBindingsQuery(baseOptions: Apollo.QueryHookOptions<RoleBindingsQuery, RoleBindingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RoleBindingsQuery, RoleBindingsQueryVariables>(RoleBindingsDocument, options);
      }
export function useRoleBindingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RoleBindingsQuery, RoleBindingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RoleBindingsQuery, RoleBindingsQueryVariables>(RoleBindingsDocument, options);
        }
export function useRoleBindingsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<RoleBindingsQuery, RoleBindingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<RoleBindingsQuery, RoleBindingsQueryVariables>(RoleBindingsDocument, options);
        }
export type RoleBindingsQueryHookResult = ReturnType<typeof useRoleBindingsQuery>;
export type RoleBindingsLazyQueryHookResult = ReturnType<typeof useRoleBindingsLazyQuery>;
export type RoleBindingsSuspenseQueryHookResult = ReturnType<typeof useRoleBindingsSuspenseQuery>;
export type RoleBindingsQueryResult = Apollo.QueryResult<RoleBindingsQuery, RoleBindingsQueryVariables>;
export const RoleBindingDocument = gql`
    query RoleBinding($name: String!, $namespace: String!) {
  handleGetRoleBindingDetail(namespace: $namespace, name: $name) @rest(path: "rolebinding/{args.namespace}/{args.name}") {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    subjects @type(name: "v1_Subject") {
      ...Subject
    }
    roleRef {
      name
      kind
      apiGroup
    }
    errors
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${SubjectFragmentDoc}`;

/**
 * __useRoleBindingQuery__
 *
 * To run a query within a React component, call `useRoleBindingQuery` and pass it any options that fit your needs.
 * When your component renders, `useRoleBindingQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRoleBindingQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *   },
 * });
 */
export function useRoleBindingQuery(baseOptions: Apollo.QueryHookOptions<RoleBindingQuery, RoleBindingQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RoleBindingQuery, RoleBindingQueryVariables>(RoleBindingDocument, options);
      }
export function useRoleBindingLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RoleBindingQuery, RoleBindingQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RoleBindingQuery, RoleBindingQueryVariables>(RoleBindingDocument, options);
        }
export function useRoleBindingSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<RoleBindingQuery, RoleBindingQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<RoleBindingQuery, RoleBindingQueryVariables>(RoleBindingDocument, options);
        }
export type RoleBindingQueryHookResult = ReturnType<typeof useRoleBindingQuery>;
export type RoleBindingLazyQueryHookResult = ReturnType<typeof useRoleBindingLazyQuery>;
export type RoleBindingSuspenseQueryHookResult = ReturnType<typeof useRoleBindingSuspenseQuery>;
export type RoleBindingQueryResult = Apollo.QueryResult<RoleBindingQuery, RoleBindingQueryVariables>;
export const ServiceAccountsDocument = gql`
    query ServiceAccounts($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetServiceAccountList(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "serviceaccount_ServiceAccountList", path: "serviceaccount/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    errors
    listMeta @type(name: "types_ListMeta") {
      ...ListMeta
    }
    items {
      typeMeta @type(name: "types_TypeMeta") {
        ...TypeMeta
      }
      objectMeta @type(name: "types_ObjectMeta") {
        ...ObjectMeta
      }
    }
  }
}
    ${ListMetaFragmentDoc}
${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useServiceAccountsQuery__
 *
 * To run a query within a React component, call `useServiceAccountsQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceAccountsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceAccountsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useServiceAccountsQuery(baseOptions: Apollo.QueryHookOptions<ServiceAccountsQuery, ServiceAccountsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceAccountsQuery, ServiceAccountsQueryVariables>(ServiceAccountsDocument, options);
      }
export function useServiceAccountsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceAccountsQuery, ServiceAccountsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceAccountsQuery, ServiceAccountsQueryVariables>(ServiceAccountsDocument, options);
        }
export function useServiceAccountsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ServiceAccountsQuery, ServiceAccountsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ServiceAccountsQuery, ServiceAccountsQueryVariables>(ServiceAccountsDocument, options);
        }
export type ServiceAccountsQueryHookResult = ReturnType<typeof useServiceAccountsQuery>;
export type ServiceAccountsLazyQueryHookResult = ReturnType<typeof useServiceAccountsLazyQuery>;
export type ServiceAccountsSuspenseQueryHookResult = ReturnType<typeof useServiceAccountsSuspenseQuery>;
export type ServiceAccountsQueryResult = Apollo.QueryResult<ServiceAccountsQuery, ServiceAccountsQueryVariables>;
export const ServiceAccountDocument = gql`
    query ServiceAccount($namespace: String!, $name: String!) {
  handleGetServiceAccountDetail(namespace: $namespace, serviceaccount: $name) @rest(type: "serviceaccount_ServiceAccountDetail", path: "serviceaccount/{args.namespace}/{args.serviceaccount}") {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useServiceAccountQuery__
 *
 * To run a query within a React component, call `useServiceAccountQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceAccountQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceAccountQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useServiceAccountQuery(baseOptions: Apollo.QueryHookOptions<ServiceAccountQuery, ServiceAccountQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceAccountQuery, ServiceAccountQueryVariables>(ServiceAccountDocument, options);
      }
export function useServiceAccountLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceAccountQuery, ServiceAccountQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceAccountQuery, ServiceAccountQueryVariables>(ServiceAccountDocument, options);
        }
export function useServiceAccountSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ServiceAccountQuery, ServiceAccountQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ServiceAccountQuery, ServiceAccountQueryVariables>(ServiceAccountDocument, options);
        }
export type ServiceAccountQueryHookResult = ReturnType<typeof useServiceAccountQuery>;
export type ServiceAccountLazyQueryHookResult = ReturnType<typeof useServiceAccountLazyQuery>;
export type ServiceAccountSuspenseQueryHookResult = ReturnType<typeof useServiceAccountSuspenseQuery>;
export type ServiceAccountQueryResult = Apollo.QueryResult<ServiceAccountQuery, ServiceAccountQueryVariables>;
export const EventsDocument = gql`
    query Events($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetEventList(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "common_EventList", path: "event/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...EventList
  }
}
    ${EventListFragmentDoc}`;

/**
 * __useEventsQuery__
 *
 * To run a query within a React component, call `useEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEventsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useEventsQuery(baseOptions: Apollo.QueryHookOptions<EventsQuery, EventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<EventsQuery, EventsQueryVariables>(EventsDocument, options);
      }
export function useEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<EventsQuery, EventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<EventsQuery, EventsQueryVariables>(EventsDocument, options);
        }
export function useEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<EventsQuery, EventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<EventsQuery, EventsQueryVariables>(EventsDocument, options);
        }
export type EventsQueryHookResult = ReturnType<typeof useEventsQuery>;
export type EventsLazyQueryHookResult = ReturnType<typeof useEventsLazyQuery>;
export type EventsSuspenseQueryHookResult = ReturnType<typeof useEventsSuspenseQuery>;
export type EventsQueryResult = Apollo.QueryResult<EventsQuery, EventsQueryVariables>;
export const HorizontalPodAutoscalersDocument = gql`
    query HorizontalPodAutoscalers($kind: String!, $namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetHorizontalPodAutoscalerList(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "horizontalpodautoscaler_HorizontalPodAutoscalerList", path: "horizontalpodautoscaler/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...HorizontalPodAutoscalerList
  }
}
    ${HorizontalPodAutoscalerListFragmentDoc}`;

/**
 * __useHorizontalPodAutoscalersQuery__
 *
 * To run a query within a React component, call `useHorizontalPodAutoscalersQuery` and pass it any options that fit your needs.
 * When your component renders, `useHorizontalPodAutoscalersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHorizontalPodAutoscalersQuery({
 *   variables: {
 *      kind: // value for 'kind'
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useHorizontalPodAutoscalersQuery(baseOptions: Apollo.QueryHookOptions<HorizontalPodAutoscalersQuery, HorizontalPodAutoscalersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<HorizontalPodAutoscalersQuery, HorizontalPodAutoscalersQueryVariables>(HorizontalPodAutoscalersDocument, options);
      }
export function useHorizontalPodAutoscalersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<HorizontalPodAutoscalersQuery, HorizontalPodAutoscalersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<HorizontalPodAutoscalersQuery, HorizontalPodAutoscalersQueryVariables>(HorizontalPodAutoscalersDocument, options);
        }
export function useHorizontalPodAutoscalersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<HorizontalPodAutoscalersQuery, HorizontalPodAutoscalersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<HorizontalPodAutoscalersQuery, HorizontalPodAutoscalersQueryVariables>(HorizontalPodAutoscalersDocument, options);
        }
export type HorizontalPodAutoscalersQueryHookResult = ReturnType<typeof useHorizontalPodAutoscalersQuery>;
export type HorizontalPodAutoscalersLazyQueryHookResult = ReturnType<typeof useHorizontalPodAutoscalersLazyQuery>;
export type HorizontalPodAutoscalersSuspenseQueryHookResult = ReturnType<typeof useHorizontalPodAutoscalersSuspenseQuery>;
export type HorizontalPodAutoscalersQueryResult = Apollo.QueryResult<HorizontalPodAutoscalersQuery, HorizontalPodAutoscalersQueryVariables>;
export const HorizontalPodAutoscalersForResourceDocument = gql`
    query HorizontalPodAutoscalersForResource($kind: String!, $namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetHorizontalPodAutoscalerListForResource(
    kind: $kind
    namespace: $namespace
    name: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "horizontalpodautoscaler_HorizontalPodAutoscalerList", path: "{args.kind}/{args.namespace}/{args.name}/horizontalpodautoscaler?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...HorizontalPodAutoscalerList
  }
}
    ${HorizontalPodAutoscalerListFragmentDoc}`;

/**
 * __useHorizontalPodAutoscalersForResourceQuery__
 *
 * To run a query within a React component, call `useHorizontalPodAutoscalersForResourceQuery` and pass it any options that fit your needs.
 * When your component renders, `useHorizontalPodAutoscalersForResourceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHorizontalPodAutoscalersForResourceQuery({
 *   variables: {
 *      kind: // value for 'kind'
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useHorizontalPodAutoscalersForResourceQuery(baseOptions: Apollo.QueryHookOptions<HorizontalPodAutoscalersForResourceQuery, HorizontalPodAutoscalersForResourceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<HorizontalPodAutoscalersForResourceQuery, HorizontalPodAutoscalersForResourceQueryVariables>(HorizontalPodAutoscalersForResourceDocument, options);
      }
export function useHorizontalPodAutoscalersForResourceLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<HorizontalPodAutoscalersForResourceQuery, HorizontalPodAutoscalersForResourceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<HorizontalPodAutoscalersForResourceQuery, HorizontalPodAutoscalersForResourceQueryVariables>(HorizontalPodAutoscalersForResourceDocument, options);
        }
export function useHorizontalPodAutoscalersForResourceSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<HorizontalPodAutoscalersForResourceQuery, HorizontalPodAutoscalersForResourceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<HorizontalPodAutoscalersForResourceQuery, HorizontalPodAutoscalersForResourceQueryVariables>(HorizontalPodAutoscalersForResourceDocument, options);
        }
export type HorizontalPodAutoscalersForResourceQueryHookResult = ReturnType<typeof useHorizontalPodAutoscalersForResourceQuery>;
export type HorizontalPodAutoscalersForResourceLazyQueryHookResult = ReturnType<typeof useHorizontalPodAutoscalersForResourceLazyQuery>;
export type HorizontalPodAutoscalersForResourceSuspenseQueryHookResult = ReturnType<typeof useHorizontalPodAutoscalersForResourceSuspenseQuery>;
export type HorizontalPodAutoscalersForResourceQueryResult = Apollo.QueryResult<HorizontalPodAutoscalersForResourceQuery, HorizontalPodAutoscalersForResourceQueryVariables>;
export const NamespacesDocument = gql`
    query Namespaces($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetNamespaces(
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(path: "namespace?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    errors
    listMeta @type(name: "types_ListMeta") {
      ...ListMeta
    }
    namespaces {
      typeMeta @type(name: "types_TypeMeta") {
        ...TypeMeta
      }
      objectMeta @type(name: "types_ObjectMeta") {
        ...ObjectMeta
      }
      phase
    }
  }
}
    ${ListMetaFragmentDoc}
${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useNamespacesQuery__
 *
 * To run a query within a React component, call `useNamespacesQuery` and pass it any options that fit your needs.
 * When your component renders, `useNamespacesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNamespacesQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useNamespacesQuery(baseOptions: Apollo.QueryHookOptions<NamespacesQuery, NamespacesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NamespacesQuery, NamespacesQueryVariables>(NamespacesDocument, options);
      }
export function useNamespacesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NamespacesQuery, NamespacesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NamespacesQuery, NamespacesQueryVariables>(NamespacesDocument, options);
        }
export function useNamespacesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<NamespacesQuery, NamespacesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<NamespacesQuery, NamespacesQueryVariables>(NamespacesDocument, options);
        }
export type NamespacesQueryHookResult = ReturnType<typeof useNamespacesQuery>;
export type NamespacesLazyQueryHookResult = ReturnType<typeof useNamespacesLazyQuery>;
export type NamespacesSuspenseQueryHookResult = ReturnType<typeof useNamespacesSuspenseQuery>;
export type NamespacesQueryResult = Apollo.QueryResult<NamespacesQuery, NamespacesQueryVariables>;
export const NamespaceDocument = gql`
    query Namespace($name: String!) {
  handleGetNamespaceDetail(name: $name) @rest(path: "namespace/{args.name}") {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    resourceQuotaList {
      items {
        typeMeta @type(name: "types_TypeMeta") {
          ...TypeMeta
        }
        objectMeta @type(name: "types_ObjectMeta") {
          ...ObjectMeta
        }
        scopes
        statusList
      }
    }
    resourceLimits {
      default
      defaultRequest
      max
      maxLimitRequestRatio
      min
      resourceName
      resourceType
    }
    phase
    errors
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useNamespaceQuery__
 *
 * To run a query within a React component, call `useNamespaceQuery` and pass it any options that fit your needs.
 * When your component renders, `useNamespaceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNamespaceQuery({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useNamespaceQuery(baseOptions: Apollo.QueryHookOptions<NamespaceQuery, NamespaceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NamespaceQuery, NamespaceQueryVariables>(NamespaceDocument, options);
      }
export function useNamespaceLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NamespaceQuery, NamespaceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NamespaceQuery, NamespaceQueryVariables>(NamespaceDocument, options);
        }
export function useNamespaceSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<NamespaceQuery, NamespaceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<NamespaceQuery, NamespaceQueryVariables>(NamespaceDocument, options);
        }
export type NamespaceQueryHookResult = ReturnType<typeof useNamespaceQuery>;
export type NamespaceLazyQueryHookResult = ReturnType<typeof useNamespaceLazyQuery>;
export type NamespaceSuspenseQueryHookResult = ReturnType<typeof useNamespaceSuspenseQuery>;
export type NamespaceQueryResult = Apollo.QueryResult<NamespaceQuery, NamespaceQueryVariables>;
export const NamespaceEventsDocument = gql`
    query NamespaceEvents($name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetNamespaceEvents(
    name: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "common_EventList", path: "namespace/{args.name}/event?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...EventList
  }
}
    ${EventListFragmentDoc}`;

/**
 * __useNamespaceEventsQuery__
 *
 * To run a query within a React component, call `useNamespaceEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useNamespaceEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNamespaceEventsQuery({
 *   variables: {
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useNamespaceEventsQuery(baseOptions: Apollo.QueryHookOptions<NamespaceEventsQuery, NamespaceEventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NamespaceEventsQuery, NamespaceEventsQueryVariables>(NamespaceEventsDocument, options);
      }
export function useNamespaceEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NamespaceEventsQuery, NamespaceEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NamespaceEventsQuery, NamespaceEventsQueryVariables>(NamespaceEventsDocument, options);
        }
export function useNamespaceEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<NamespaceEventsQuery, NamespaceEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<NamespaceEventsQuery, NamespaceEventsQueryVariables>(NamespaceEventsDocument, options);
        }
export type NamespaceEventsQueryHookResult = ReturnType<typeof useNamespaceEventsQuery>;
export type NamespaceEventsLazyQueryHookResult = ReturnType<typeof useNamespaceEventsLazyQuery>;
export type NamespaceEventsSuspenseQueryHookResult = ReturnType<typeof useNamespaceEventsSuspenseQuery>;
export type NamespaceEventsQueryResult = Apollo.QueryResult<NamespaceEventsQuery, NamespaceEventsQueryVariables>;
export const NodesDocument = gql`
    query Nodes($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetNodeList(
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(path: "node?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    errors
    listMeta @type(name: "types_ListMeta") {
      ...ListMeta
    }
    nodes {
      typeMeta @type(name: "types_TypeMeta") {
        ...TypeMeta
      }
      objectMeta @type(name: "types_ObjectMeta") {
        ...ObjectMeta
      }
      allocatedResources @type(name: "node_NodeAllocatedResources") {
        ...NodeAllocatedResources
      }
      ready
    }
  }
}
    ${ListMetaFragmentDoc}
${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${NodeAllocatedResourcesFragmentDoc}`;

/**
 * __useNodesQuery__
 *
 * To run a query within a React component, call `useNodesQuery` and pass it any options that fit your needs.
 * When your component renders, `useNodesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNodesQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useNodesQuery(baseOptions: Apollo.QueryHookOptions<NodesQuery, NodesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NodesQuery, NodesQueryVariables>(NodesDocument, options);
      }
export function useNodesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NodesQuery, NodesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NodesQuery, NodesQueryVariables>(NodesDocument, options);
        }
export function useNodesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<NodesQuery, NodesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<NodesQuery, NodesQueryVariables>(NodesDocument, options);
        }
export type NodesQueryHookResult = ReturnType<typeof useNodesQuery>;
export type NodesLazyQueryHookResult = ReturnType<typeof useNodesLazyQuery>;
export type NodesSuspenseQueryHookResult = ReturnType<typeof useNodesSuspenseQuery>;
export type NodesQueryResult = Apollo.QueryResult<NodesQuery, NodesQueryVariables>;
export const NodeDocument = gql`
    query Node($name: String!) {
  handleGetNodeDetail(name: $name) @rest(path: "node/{args.name}") {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    conditions @type(name: "common_Condition") {
      ...Condition
    }
    allocatedResources @type(name: "node_NodeAllocatedResources") {
      ...NodeAllocatedResources
    }
    nodeInfo {
      architecture
      bootID
      containerRuntimeVersion
      kernelVersion
      kubeletVersion
      kubeProxyVersion
      machineID
      operatingSystem
      osImage
      systemUUID
    }
    addresses {
      type
      address
    }
    taints {
      key
      value
      effect
    }
    providerID
    containerImages
    podCIDR
    phase
    unschedulable
    ready
    errors
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${ConditionFragmentDoc}
${NodeAllocatedResourcesFragmentDoc}`;

/**
 * __useNodeQuery__
 *
 * To run a query within a React component, call `useNodeQuery` and pass it any options that fit your needs.
 * When your component renders, `useNodeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNodeQuery({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useNodeQuery(baseOptions: Apollo.QueryHookOptions<NodeQuery, NodeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NodeQuery, NodeQueryVariables>(NodeDocument, options);
      }
export function useNodeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NodeQuery, NodeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NodeQuery, NodeQueryVariables>(NodeDocument, options);
        }
export function useNodeSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<NodeQuery, NodeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<NodeQuery, NodeQueryVariables>(NodeDocument, options);
        }
export type NodeQueryHookResult = ReturnType<typeof useNodeQuery>;
export type NodeLazyQueryHookResult = ReturnType<typeof useNodeLazyQuery>;
export type NodeSuspenseQueryHookResult = ReturnType<typeof useNodeSuspenseQuery>;
export type NodeQueryResult = Apollo.QueryResult<NodeQuery, NodeQueryVariables>;
export const NodePodsDocument = gql`
    query NodePods($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetNodePods(
    name: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "pod_PodList", path: "node/{args.name}/pod?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...PodList
  }
}
    ${PodListFragmentDoc}`;

/**
 * __useNodePodsQuery__
 *
 * To run a query within a React component, call `useNodePodsQuery` and pass it any options that fit your needs.
 * When your component renders, `useNodePodsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNodePodsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useNodePodsQuery(baseOptions: Apollo.QueryHookOptions<NodePodsQuery, NodePodsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NodePodsQuery, NodePodsQueryVariables>(NodePodsDocument, options);
      }
export function useNodePodsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NodePodsQuery, NodePodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NodePodsQuery, NodePodsQueryVariables>(NodePodsDocument, options);
        }
export function useNodePodsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<NodePodsQuery, NodePodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<NodePodsQuery, NodePodsQueryVariables>(NodePodsDocument, options);
        }
export type NodePodsQueryHookResult = ReturnType<typeof useNodePodsQuery>;
export type NodePodsLazyQueryHookResult = ReturnType<typeof useNodePodsLazyQuery>;
export type NodePodsSuspenseQueryHookResult = ReturnType<typeof useNodePodsSuspenseQuery>;
export type NodePodsQueryResult = Apollo.QueryResult<NodePodsQuery, NodePodsQueryVariables>;
export const NodeEventsDocument = gql`
    query NodeEvents($name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetNodeEvents(
    name: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "common_EventList", path: "node/{args.name}/event?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...EventList
  }
}
    ${EventListFragmentDoc}`;

/**
 * __useNodeEventsQuery__
 *
 * To run a query within a React component, call `useNodeEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useNodeEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNodeEventsQuery({
 *   variables: {
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useNodeEventsQuery(baseOptions: Apollo.QueryHookOptions<NodeEventsQuery, NodeEventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NodeEventsQuery, NodeEventsQueryVariables>(NodeEventsDocument, options);
      }
export function useNodeEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NodeEventsQuery, NodeEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NodeEventsQuery, NodeEventsQueryVariables>(NodeEventsDocument, options);
        }
export function useNodeEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<NodeEventsQuery, NodeEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<NodeEventsQuery, NodeEventsQueryVariables>(NodeEventsDocument, options);
        }
export type NodeEventsQueryHookResult = ReturnType<typeof useNodeEventsQuery>;
export type NodeEventsLazyQueryHookResult = ReturnType<typeof useNodeEventsLazyQuery>;
export type NodeEventsSuspenseQueryHookResult = ReturnType<typeof useNodeEventsSuspenseQuery>;
export type NodeEventsQueryResult = Apollo.QueryResult<NodeEventsQuery, NodeEventsQueryVariables>;
export const DrainNodeDocument = gql`
    mutation DrainNode($name: String!, $input: node_NodeDrainSpec_Input!) {
  handleNodeDrain(name: $name, input: $input) @rest(type: "Void", path: "node/{args.name}/drain", method: "PUT")
}
    `;
export type DrainNodeMutationFn = Apollo.MutationFunction<DrainNodeMutation, DrainNodeMutationVariables>;

/**
 * __useDrainNodeMutation__
 *
 * To run a mutation, you first call `useDrainNodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDrainNodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [drainNodeMutation, { data, loading, error }] = useDrainNodeMutation({
 *   variables: {
 *      name: // value for 'name'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useDrainNodeMutation(baseOptions?: Apollo.MutationHookOptions<DrainNodeMutation, DrainNodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DrainNodeMutation, DrainNodeMutationVariables>(DrainNodeDocument, options);
      }
export type DrainNodeMutationHookResult = ReturnType<typeof useDrainNodeMutation>;
export type DrainNodeMutationResult = Apollo.MutationResult<DrainNodeMutation>;
export type DrainNodeMutationOptions = Apollo.BaseMutationOptions<DrainNodeMutation, DrainNodeMutationVariables>;
export const PodDisruptionBudgetsDocument = gql`
    query PodDisruptionBudgets($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetPodDisruptionBudgetList(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "poddisruptionbudget_PodDisruptionBudgetList", path: "poddisruptionbudget/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...PodDisruptionBudgetList
  }
}
    ${PodDisruptionBudgetListFragmentDoc}`;

/**
 * __usePodDisruptionBudgetsQuery__
 *
 * To run a query within a React component, call `usePodDisruptionBudgetsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePodDisruptionBudgetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePodDisruptionBudgetsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function usePodDisruptionBudgetsQuery(baseOptions: Apollo.QueryHookOptions<PodDisruptionBudgetsQuery, PodDisruptionBudgetsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PodDisruptionBudgetsQuery, PodDisruptionBudgetsQueryVariables>(PodDisruptionBudgetsDocument, options);
      }
export function usePodDisruptionBudgetsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PodDisruptionBudgetsQuery, PodDisruptionBudgetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PodDisruptionBudgetsQuery, PodDisruptionBudgetsQueryVariables>(PodDisruptionBudgetsDocument, options);
        }
export function usePodDisruptionBudgetsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PodDisruptionBudgetsQuery, PodDisruptionBudgetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PodDisruptionBudgetsQuery, PodDisruptionBudgetsQueryVariables>(PodDisruptionBudgetsDocument, options);
        }
export type PodDisruptionBudgetsQueryHookResult = ReturnType<typeof usePodDisruptionBudgetsQuery>;
export type PodDisruptionBudgetsLazyQueryHookResult = ReturnType<typeof usePodDisruptionBudgetsLazyQuery>;
export type PodDisruptionBudgetsSuspenseQueryHookResult = ReturnType<typeof usePodDisruptionBudgetsSuspenseQuery>;
export type PodDisruptionBudgetsQueryResult = Apollo.QueryResult<PodDisruptionBudgetsQuery, PodDisruptionBudgetsQueryVariables>;
export const PodDisruptionBudgetDocument = gql`
    query PodDisruptionBudget($name: String!, $namespace: String!) {
  handleGetPodDisruptionBudgetDetail(namespace: $namespace, name: $name) @rest(type: "poddisruptionbudget_PodDisruptionBudgetDetail", path: "poddisruptionbudget/{args.namespace}/{args.name}") {
    ...PodDisruptionBudgetDetail
  }
}
    ${PodDisruptionBudgetDetailFragmentDoc}`;

/**
 * __usePodDisruptionBudgetQuery__
 *
 * To run a query within a React component, call `usePodDisruptionBudgetQuery` and pass it any options that fit your needs.
 * When your component renders, `usePodDisruptionBudgetQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePodDisruptionBudgetQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *   },
 * });
 */
export function usePodDisruptionBudgetQuery(baseOptions: Apollo.QueryHookOptions<PodDisruptionBudgetQuery, PodDisruptionBudgetQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PodDisruptionBudgetQuery, PodDisruptionBudgetQueryVariables>(PodDisruptionBudgetDocument, options);
      }
export function usePodDisruptionBudgetLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PodDisruptionBudgetQuery, PodDisruptionBudgetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PodDisruptionBudgetQuery, PodDisruptionBudgetQueryVariables>(PodDisruptionBudgetDocument, options);
        }
export function usePodDisruptionBudgetSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PodDisruptionBudgetQuery, PodDisruptionBudgetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PodDisruptionBudgetQuery, PodDisruptionBudgetQueryVariables>(PodDisruptionBudgetDocument, options);
        }
export type PodDisruptionBudgetQueryHookResult = ReturnType<typeof usePodDisruptionBudgetQuery>;
export type PodDisruptionBudgetLazyQueryHookResult = ReturnType<typeof usePodDisruptionBudgetLazyQuery>;
export type PodDisruptionBudgetSuspenseQueryHookResult = ReturnType<typeof usePodDisruptionBudgetSuspenseQuery>;
export type PodDisruptionBudgetQueryResult = Apollo.QueryResult<PodDisruptionBudgetQuery, PodDisruptionBudgetQueryVariables>;
export const NamespacedResourceDocument = gql`
    query NamespacedResource($kind: String!, $name: String!, $namespace: String!) {
  handleGetResource(kind: $kind, name: $name, namespace: $namespace) @rest(method: "GET", path: "_raw/{args.kind}/namespace/{args.namespace}/name/{args.name}") {
    Object
  }
}
    `;

/**
 * __useNamespacedResourceQuery__
 *
 * To run a query within a React component, call `useNamespacedResourceQuery` and pass it any options that fit your needs.
 * When your component renders, `useNamespacedResourceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNamespacedResourceQuery({
 *   variables: {
 *      kind: // value for 'kind'
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *   },
 * });
 */
export function useNamespacedResourceQuery(baseOptions: Apollo.QueryHookOptions<NamespacedResourceQuery, NamespacedResourceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NamespacedResourceQuery, NamespacedResourceQueryVariables>(NamespacedResourceDocument, options);
      }
export function useNamespacedResourceLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NamespacedResourceQuery, NamespacedResourceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NamespacedResourceQuery, NamespacedResourceQueryVariables>(NamespacedResourceDocument, options);
        }
export function useNamespacedResourceSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<NamespacedResourceQuery, NamespacedResourceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<NamespacedResourceQuery, NamespacedResourceQueryVariables>(NamespacedResourceDocument, options);
        }
export type NamespacedResourceQueryHookResult = ReturnType<typeof useNamespacedResourceQuery>;
export type NamespacedResourceLazyQueryHookResult = ReturnType<typeof useNamespacedResourceLazyQuery>;
export type NamespacedResourceSuspenseQueryHookResult = ReturnType<typeof useNamespacedResourceSuspenseQuery>;
export type NamespacedResourceQueryResult = Apollo.QueryResult<NamespacedResourceQuery, NamespacedResourceQueryVariables>;
export const ResourceDocument = gql`
    query Resource($kind: String!, $name: String!) {
  handleGetResource(kind: $kind, name: $name, namespace: "") @rest(method: "GET", path: "_raw/{args.kind}/name/{args.name}") {
    Object
  }
}
    `;

/**
 * __useResourceQuery__
 *
 * To run a query within a React component, call `useResourceQuery` and pass it any options that fit your needs.
 * When your component renders, `useResourceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useResourceQuery({
 *   variables: {
 *      kind: // value for 'kind'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useResourceQuery(baseOptions: Apollo.QueryHookOptions<ResourceQuery, ResourceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ResourceQuery, ResourceQueryVariables>(ResourceDocument, options);
      }
export function useResourceLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ResourceQuery, ResourceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ResourceQuery, ResourceQueryVariables>(ResourceDocument, options);
        }
export function useResourceSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ResourceQuery, ResourceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ResourceQuery, ResourceQueryVariables>(ResourceDocument, options);
        }
export type ResourceQueryHookResult = ReturnType<typeof useResourceQuery>;
export type ResourceLazyQueryHookResult = ReturnType<typeof useResourceLazyQuery>;
export type ResourceSuspenseQueryHookResult = ReturnType<typeof useResourceSuspenseQuery>;
export type ResourceQueryResult = Apollo.QueryResult<ResourceQuery, ResourceQueryVariables>;
export const NamespacedResourceUpdateDocument = gql`
    mutation NamespacedResourceUpdate($kind: String!, $name: String!, $namespace: String!, $input: JSON!) {
  handlePutResource(
    kind: $kind
    name: $name
    namespace: $namespace
    input: $input
  ) @rest(type: "Void", path: "_raw/{args.kind}/namespace/{args.namespace}/name/{args.name}", method: "PUT")
}
    `;
export type NamespacedResourceUpdateMutationFn = Apollo.MutationFunction<NamespacedResourceUpdateMutation, NamespacedResourceUpdateMutationVariables>;

/**
 * __useNamespacedResourceUpdateMutation__
 *
 * To run a mutation, you first call `useNamespacedResourceUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useNamespacedResourceUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [namespacedResourceUpdateMutation, { data, loading, error }] = useNamespacedResourceUpdateMutation({
 *   variables: {
 *      kind: // value for 'kind'
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useNamespacedResourceUpdateMutation(baseOptions?: Apollo.MutationHookOptions<NamespacedResourceUpdateMutation, NamespacedResourceUpdateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<NamespacedResourceUpdateMutation, NamespacedResourceUpdateMutationVariables>(NamespacedResourceUpdateDocument, options);
      }
export type NamespacedResourceUpdateMutationHookResult = ReturnType<typeof useNamespacedResourceUpdateMutation>;
export type NamespacedResourceUpdateMutationResult = Apollo.MutationResult<NamespacedResourceUpdateMutation>;
export type NamespacedResourceUpdateMutationOptions = Apollo.BaseMutationOptions<NamespacedResourceUpdateMutation, NamespacedResourceUpdateMutationVariables>;
export const ResourceUpdateDocument = gql`
    mutation ResourceUpdate($kind: String!, $name: String!, $input: JSON!) {
  handlePutResource(kind: $kind, name: $name, namespace: "", input: $input) @rest(type: "Void", path: "_raw/{args.kind}/name/{args.name}", method: "PUT")
}
    `;
export type ResourceUpdateMutationFn = Apollo.MutationFunction<ResourceUpdateMutation, ResourceUpdateMutationVariables>;

/**
 * __useResourceUpdateMutation__
 *
 * To run a mutation, you first call `useResourceUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResourceUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resourceUpdateMutation, { data, loading, error }] = useResourceUpdateMutation({
 *   variables: {
 *      kind: // value for 'kind'
 *      name: // value for 'name'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useResourceUpdateMutation(baseOptions?: Apollo.MutationHookOptions<ResourceUpdateMutation, ResourceUpdateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResourceUpdateMutation, ResourceUpdateMutationVariables>(ResourceUpdateDocument, options);
      }
export type ResourceUpdateMutationHookResult = ReturnType<typeof useResourceUpdateMutation>;
export type ResourceUpdateMutationResult = Apollo.MutationResult<ResourceUpdateMutation>;
export type ResourceUpdateMutationOptions = Apollo.BaseMutationOptions<ResourceUpdateMutation, ResourceUpdateMutationVariables>;
export const ResourceScaleDocument = gql`
    mutation ResourceScale($kind: String!, $namespace: String!, $name: String!, $scaleBy: String!) {
  handleScaleResource(
    kind: $kind
    namespace: $namespace
    name: $name
    scaleBy: $scaleBy
  ) @rest(type: "Void", path: "scale/{args.kind}/{args.namespace}/{args.name}?scaleBy={args.scaleBy}", method: "PUT", bodyKey: "scaleBy") {
    actualReplicas
    desiredReplicas
  }
}
    `;
export type ResourceScaleMutationFn = Apollo.MutationFunction<ResourceScaleMutation, ResourceScaleMutationVariables>;

/**
 * __useResourceScaleMutation__
 *
 * To run a mutation, you first call `useResourceScaleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResourceScaleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resourceScaleMutation, { data, loading, error }] = useResourceScaleMutation({
 *   variables: {
 *      kind: // value for 'kind'
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      scaleBy: // value for 'scaleBy'
 *   },
 * });
 */
export function useResourceScaleMutation(baseOptions?: Apollo.MutationHookOptions<ResourceScaleMutation, ResourceScaleMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResourceScaleMutation, ResourceScaleMutationVariables>(ResourceScaleDocument, options);
      }
export type ResourceScaleMutationHookResult = ReturnType<typeof useResourceScaleMutation>;
export type ResourceScaleMutationResult = Apollo.MutationResult<ResourceScaleMutation>;
export type ResourceScaleMutationOptions = Apollo.BaseMutationOptions<ResourceScaleMutation, ResourceScaleMutationVariables>;
export const ResourceDeleteDocument = gql`
    mutation ResourceDelete($kind: String!, $name: String!, $deleteNow: String, $propagation: String) {
  handleDeleteResource(
    kind: $kind
    name: $name
    namespace: ""
    deleteNow: $deleteNow
    propagation: $propagation
  ) @rest(type: "Void", path: "_raw/{args.kind}/name/{args.name}?deleteNow={args.deleteNow}&propagation={args.propagation}", method: "DELETE")
}
    `;
export type ResourceDeleteMutationFn = Apollo.MutationFunction<ResourceDeleteMutation, ResourceDeleteMutationVariables>;

/**
 * __useResourceDeleteMutation__
 *
 * To run a mutation, you first call `useResourceDeleteMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResourceDeleteMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resourceDeleteMutation, { data, loading, error }] = useResourceDeleteMutation({
 *   variables: {
 *      kind: // value for 'kind'
 *      name: // value for 'name'
 *      deleteNow: // value for 'deleteNow'
 *      propagation: // value for 'propagation'
 *   },
 * });
 */
export function useResourceDeleteMutation(baseOptions?: Apollo.MutationHookOptions<ResourceDeleteMutation, ResourceDeleteMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResourceDeleteMutation, ResourceDeleteMutationVariables>(ResourceDeleteDocument, options);
      }
export type ResourceDeleteMutationHookResult = ReturnType<typeof useResourceDeleteMutation>;
export type ResourceDeleteMutationResult = Apollo.MutationResult<ResourceDeleteMutation>;
export type ResourceDeleteMutationOptions = Apollo.BaseMutationOptions<ResourceDeleteMutation, ResourceDeleteMutationVariables>;
export const NamespacedResourceDeleteDocument = gql`
    mutation NamespacedResourceDelete($kind: String!, $namespace: String!, $name: String!, $deleteNow: String, $propagation: String) {
  handleDeleteResource(
    kind: $kind
    namespace: $namespace
    name: $name
    deleteNow: $deleteNow
    propagation: $propagation
  ) @rest(type: "Void", path: "_raw/{args.kind}/namespace/{args.namespace}/name/{args.name}?deleteNow={args.deleteNow}&propagation={args.propagation}", method: "DELETE")
}
    `;
export type NamespacedResourceDeleteMutationFn = Apollo.MutationFunction<NamespacedResourceDeleteMutation, NamespacedResourceDeleteMutationVariables>;

/**
 * __useNamespacedResourceDeleteMutation__
 *
 * To run a mutation, you first call `useNamespacedResourceDeleteMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useNamespacedResourceDeleteMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [namespacedResourceDeleteMutation, { data, loading, error }] = useNamespacedResourceDeleteMutation({
 *   variables: {
 *      kind: // value for 'kind'
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      deleteNow: // value for 'deleteNow'
 *      propagation: // value for 'propagation'
 *   },
 * });
 */
export function useNamespacedResourceDeleteMutation(baseOptions?: Apollo.MutationHookOptions<NamespacedResourceDeleteMutation, NamespacedResourceDeleteMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<NamespacedResourceDeleteMutation, NamespacedResourceDeleteMutationVariables>(NamespacedResourceDeleteDocument, options);
      }
export type NamespacedResourceDeleteMutationHookResult = ReturnType<typeof useNamespacedResourceDeleteMutation>;
export type NamespacedResourceDeleteMutationResult = Apollo.MutationResult<NamespacedResourceDeleteMutation>;
export type NamespacedResourceDeleteMutationOptions = Apollo.BaseMutationOptions<NamespacedResourceDeleteMutation, NamespacedResourceDeleteMutationVariables>;
export const ConfigMapsDocument = gql`
    query ConfigMaps($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetConfigMapList(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(path: "configmap/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    errors
    listMeta @type(name: "types_ListMeta") {
      ...ListMeta
    }
    items {
      typeMeta @type(name: "types_TypeMeta") {
        ...TypeMeta
      }
      objectMeta @type(name: "types_ObjectMeta") {
        ...ObjectMeta
      }
    }
  }
}
    ${ListMetaFragmentDoc}
${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useConfigMapsQuery__
 *
 * To run a query within a React component, call `useConfigMapsQuery` and pass it any options that fit your needs.
 * When your component renders, `useConfigMapsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useConfigMapsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useConfigMapsQuery(baseOptions: Apollo.QueryHookOptions<ConfigMapsQuery, ConfigMapsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ConfigMapsQuery, ConfigMapsQueryVariables>(ConfigMapsDocument, options);
      }
export function useConfigMapsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ConfigMapsQuery, ConfigMapsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ConfigMapsQuery, ConfigMapsQueryVariables>(ConfigMapsDocument, options);
        }
export function useConfigMapsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ConfigMapsQuery, ConfigMapsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ConfigMapsQuery, ConfigMapsQueryVariables>(ConfigMapsDocument, options);
        }
export type ConfigMapsQueryHookResult = ReturnType<typeof useConfigMapsQuery>;
export type ConfigMapsLazyQueryHookResult = ReturnType<typeof useConfigMapsLazyQuery>;
export type ConfigMapsSuspenseQueryHookResult = ReturnType<typeof useConfigMapsSuspenseQuery>;
export type ConfigMapsQueryResult = Apollo.QueryResult<ConfigMapsQuery, ConfigMapsQueryVariables>;
export const ConfigMapDocument = gql`
    query ConfigMap($name: String!, $namespace: String!) {
  handleGetConfigMapDetail(namespace: $namespace, configmap: $name) @rest(path: "configmap/{args.namespace}/{args.configmap}") {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    data
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useConfigMapQuery__
 *
 * To run a query within a React component, call `useConfigMapQuery` and pass it any options that fit your needs.
 * When your component renders, `useConfigMapQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useConfigMapQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *   },
 * });
 */
export function useConfigMapQuery(baseOptions: Apollo.QueryHookOptions<ConfigMapQuery, ConfigMapQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ConfigMapQuery, ConfigMapQueryVariables>(ConfigMapDocument, options);
      }
export function useConfigMapLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ConfigMapQuery, ConfigMapQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ConfigMapQuery, ConfigMapQueryVariables>(ConfigMapDocument, options);
        }
export function useConfigMapSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ConfigMapQuery, ConfigMapQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ConfigMapQuery, ConfigMapQueryVariables>(ConfigMapDocument, options);
        }
export type ConfigMapQueryHookResult = ReturnType<typeof useConfigMapQuery>;
export type ConfigMapLazyQueryHookResult = ReturnType<typeof useConfigMapLazyQuery>;
export type ConfigMapSuspenseQueryHookResult = ReturnType<typeof useConfigMapSuspenseQuery>;
export type ConfigMapQueryResult = Apollo.QueryResult<ConfigMapQuery, ConfigMapQueryVariables>;
export const SecretsDocument = gql`
    query Secrets($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetSecretList(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(path: "secret/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    errors
    listMeta @type(name: "types_ListMeta") {
      ...ListMeta
    }
    secrets {
      typeMeta @type(name: "types_TypeMeta") {
        ...TypeMeta
      }
      objectMeta @type(name: "types_ObjectMeta") {
        ...ObjectMeta
      }
      type
    }
  }
}
    ${ListMetaFragmentDoc}
${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useSecretsQuery__
 *
 * To run a query within a React component, call `useSecretsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSecretsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSecretsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useSecretsQuery(baseOptions: Apollo.QueryHookOptions<SecretsQuery, SecretsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SecretsQuery, SecretsQueryVariables>(SecretsDocument, options);
      }
export function useSecretsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SecretsQuery, SecretsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SecretsQuery, SecretsQueryVariables>(SecretsDocument, options);
        }
export function useSecretsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SecretsQuery, SecretsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SecretsQuery, SecretsQueryVariables>(SecretsDocument, options);
        }
export type SecretsQueryHookResult = ReturnType<typeof useSecretsQuery>;
export type SecretsLazyQueryHookResult = ReturnType<typeof useSecretsLazyQuery>;
export type SecretsSuspenseQueryHookResult = ReturnType<typeof useSecretsSuspenseQuery>;
export type SecretsQueryResult = Apollo.QueryResult<SecretsQuery, SecretsQueryVariables>;
export const SecretDocument = gql`
    query Secret($name: String!, $namespace: String!) {
  handleGetSecretDetail(namespace: $namespace, name: $name) @rest(path: "secret/{args.namespace}/{args.name}") {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    type
    data
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useSecretQuery__
 *
 * To run a query within a React component, call `useSecretQuery` and pass it any options that fit your needs.
 * When your component renders, `useSecretQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSecretQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *   },
 * });
 */
export function useSecretQuery(baseOptions: Apollo.QueryHookOptions<SecretQuery, SecretQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SecretQuery, SecretQueryVariables>(SecretDocument, options);
      }
export function useSecretLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SecretQuery, SecretQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SecretQuery, SecretQueryVariables>(SecretDocument, options);
        }
export function useSecretSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SecretQuery, SecretQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SecretQuery, SecretQueryVariables>(SecretDocument, options);
        }
export type SecretQueryHookResult = ReturnType<typeof useSecretQuery>;
export type SecretLazyQueryHookResult = ReturnType<typeof useSecretLazyQuery>;
export type SecretSuspenseQueryHookResult = ReturnType<typeof useSecretSuspenseQuery>;
export type SecretQueryResult = Apollo.QueryResult<SecretQuery, SecretQueryVariables>;
export const CustomResourceDefinitionsDocument = gql`
    query CustomResourceDefinitions($filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetCustomResourceDefinitionList(
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(path: "crd?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    errors
    listMeta {
      totalItems
    }
    items {
      typeMeta @type(name: "types_TypeMeta") {
        ...TypeMeta
      }
      objectMeta @type(name: "types_ObjectMeta") {
        ...ObjectMeta
      }
      established
      group
      names {
        categories
        kind
        listKind
        plural
        shortNames
        singular
      }
      scope
      version
    }
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useCustomResourceDefinitionsQuery__
 *
 * To run a query within a React component, call `useCustomResourceDefinitionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useCustomResourceDefinitionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCustomResourceDefinitionsQuery({
 *   variables: {
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useCustomResourceDefinitionsQuery(baseOptions?: Apollo.QueryHookOptions<CustomResourceDefinitionsQuery, CustomResourceDefinitionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CustomResourceDefinitionsQuery, CustomResourceDefinitionsQueryVariables>(CustomResourceDefinitionsDocument, options);
      }
export function useCustomResourceDefinitionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CustomResourceDefinitionsQuery, CustomResourceDefinitionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CustomResourceDefinitionsQuery, CustomResourceDefinitionsQueryVariables>(CustomResourceDefinitionsDocument, options);
        }
export function useCustomResourceDefinitionsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CustomResourceDefinitionsQuery, CustomResourceDefinitionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CustomResourceDefinitionsQuery, CustomResourceDefinitionsQueryVariables>(CustomResourceDefinitionsDocument, options);
        }
export type CustomResourceDefinitionsQueryHookResult = ReturnType<typeof useCustomResourceDefinitionsQuery>;
export type CustomResourceDefinitionsLazyQueryHookResult = ReturnType<typeof useCustomResourceDefinitionsLazyQuery>;
export type CustomResourceDefinitionsSuspenseQueryHookResult = ReturnType<typeof useCustomResourceDefinitionsSuspenseQuery>;
export type CustomResourceDefinitionsQueryResult = Apollo.QueryResult<CustomResourceDefinitionsQuery, CustomResourceDefinitionsQueryVariables>;
export const CustomResourceDefinitionDocument = gql`
    query CustomResourceDefinition($name: String!) {
  handleGetCustomResourceDefinitionDetail(crd: $name) @rest(path: "crd/{args.crd}") {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    conditions @type(name: "common_Condition") {
      ...Condition
    }
    names {
      kind
      categories
      shortNames
      listKind
      singular
      plural
    }
    group
    version
    established
    subresources
    scope
    errors
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${ConditionFragmentDoc}`;

/**
 * __useCustomResourceDefinitionQuery__
 *
 * To run a query within a React component, call `useCustomResourceDefinitionQuery` and pass it any options that fit your needs.
 * When your component renders, `useCustomResourceDefinitionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCustomResourceDefinitionQuery({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useCustomResourceDefinitionQuery(baseOptions: Apollo.QueryHookOptions<CustomResourceDefinitionQuery, CustomResourceDefinitionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CustomResourceDefinitionQuery, CustomResourceDefinitionQueryVariables>(CustomResourceDefinitionDocument, options);
      }
export function useCustomResourceDefinitionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CustomResourceDefinitionQuery, CustomResourceDefinitionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CustomResourceDefinitionQuery, CustomResourceDefinitionQueryVariables>(CustomResourceDefinitionDocument, options);
        }
export function useCustomResourceDefinitionSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CustomResourceDefinitionQuery, CustomResourceDefinitionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CustomResourceDefinitionQuery, CustomResourceDefinitionQueryVariables>(CustomResourceDefinitionDocument, options);
        }
export type CustomResourceDefinitionQueryHookResult = ReturnType<typeof useCustomResourceDefinitionQuery>;
export type CustomResourceDefinitionLazyQueryHookResult = ReturnType<typeof useCustomResourceDefinitionLazyQuery>;
export type CustomResourceDefinitionSuspenseQueryHookResult = ReturnType<typeof useCustomResourceDefinitionSuspenseQuery>;
export type CustomResourceDefinitionQueryResult = Apollo.QueryResult<CustomResourceDefinitionQuery, CustomResourceDefinitionQueryVariables>;
export const CustomResourcesDocument = gql`
    query CustomResources($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetCustomResourceObjectList(
    namespace: $namespace
    crd: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(path: "crd/{args.namespace}/{args.crd}/object?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    errors
    listMeta {
      totalItems
    }
    items {
      typeMeta @type(name: "types_TypeMeta") {
        ...TypeMeta
      }
      objectMeta @type(name: "types_ObjectMeta") {
        ...ObjectMeta
      }
    }
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useCustomResourcesQuery__
 *
 * To run a query within a React component, call `useCustomResourcesQuery` and pass it any options that fit your needs.
 * When your component renders, `useCustomResourcesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCustomResourcesQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useCustomResourcesQuery(baseOptions: Apollo.QueryHookOptions<CustomResourcesQuery, CustomResourcesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CustomResourcesQuery, CustomResourcesQueryVariables>(CustomResourcesDocument, options);
      }
export function useCustomResourcesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CustomResourcesQuery, CustomResourcesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CustomResourcesQuery, CustomResourcesQueryVariables>(CustomResourcesDocument, options);
        }
export function useCustomResourcesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CustomResourcesQuery, CustomResourcesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CustomResourcesQuery, CustomResourcesQueryVariables>(CustomResourcesDocument, options);
        }
export type CustomResourcesQueryHookResult = ReturnType<typeof useCustomResourcesQuery>;
export type CustomResourcesLazyQueryHookResult = ReturnType<typeof useCustomResourcesLazyQuery>;
export type CustomResourcesSuspenseQueryHookResult = ReturnType<typeof useCustomResourcesSuspenseQuery>;
export type CustomResourcesQueryResult = Apollo.QueryResult<CustomResourcesQuery, CustomResourcesQueryVariables>;
export const CustomResourceDocument = gql`
    query CustomResource($namespace: String!, $name: String!, $crd: String!) {
  handleGetCustomResourceObjectDetail(
    namespace: $namespace
    crd: $crd
    object: $name
  ) @rest(path: "crd/{args.namespace}/{args.crd}/{args.object}") {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useCustomResourceQuery__
 *
 * To run a query within a React component, call `useCustomResourceQuery` and pass it any options that fit your needs.
 * When your component renders, `useCustomResourceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCustomResourceQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      crd: // value for 'crd'
 *   },
 * });
 */
export function useCustomResourceQuery(baseOptions: Apollo.QueryHookOptions<CustomResourceQuery, CustomResourceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CustomResourceQuery, CustomResourceQueryVariables>(CustomResourceDocument, options);
      }
export function useCustomResourceLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CustomResourceQuery, CustomResourceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CustomResourceQuery, CustomResourceQueryVariables>(CustomResourceDocument, options);
        }
export function useCustomResourceSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CustomResourceQuery, CustomResourceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CustomResourceQuery, CustomResourceQueryVariables>(CustomResourceDocument, options);
        }
export type CustomResourceQueryHookResult = ReturnType<typeof useCustomResourceQuery>;
export type CustomResourceLazyQueryHookResult = ReturnType<typeof useCustomResourceLazyQuery>;
export type CustomResourceSuspenseQueryHookResult = ReturnType<typeof useCustomResourceSuspenseQuery>;
export type CustomResourceQueryResult = Apollo.QueryResult<CustomResourceQuery, CustomResourceQueryVariables>;
export const CustomResourceEventsDocument = gql`
    query CustomResourceEvents($crd: String!, $namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetCustomResourceObjectEvents(
    namespace: $namespace
    object: $name
    crd: $crd
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "common_EventList", path: "crd/{args.namespace}/{args.crd}/{args.object}/event?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...EventList
  }
}
    ${EventListFragmentDoc}`;

/**
 * __useCustomResourceEventsQuery__
 *
 * To run a query within a React component, call `useCustomResourceEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useCustomResourceEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCustomResourceEventsQuery({
 *   variables: {
 *      crd: // value for 'crd'
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useCustomResourceEventsQuery(baseOptions: Apollo.QueryHookOptions<CustomResourceEventsQuery, CustomResourceEventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CustomResourceEventsQuery, CustomResourceEventsQueryVariables>(CustomResourceEventsDocument, options);
      }
export function useCustomResourceEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CustomResourceEventsQuery, CustomResourceEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CustomResourceEventsQuery, CustomResourceEventsQueryVariables>(CustomResourceEventsDocument, options);
        }
export function useCustomResourceEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CustomResourceEventsQuery, CustomResourceEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CustomResourceEventsQuery, CustomResourceEventsQueryVariables>(CustomResourceEventsDocument, options);
        }
export type CustomResourceEventsQueryHookResult = ReturnType<typeof useCustomResourceEventsQuery>;
export type CustomResourceEventsLazyQueryHookResult = ReturnType<typeof useCustomResourceEventsLazyQuery>;
export type CustomResourceEventsSuspenseQueryHookResult = ReturnType<typeof useCustomResourceEventsSuspenseQuery>;
export type CustomResourceEventsQueryResult = Apollo.QueryResult<CustomResourceEventsQuery, CustomResourceEventsQueryVariables>;
export const IngressesDocument = gql`
    query Ingresses($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetIngressList(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "ingress_IngressList", path: "ingress/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...IngressList
  }
}
    ${IngressListFragmentDoc}`;

/**
 * __useIngressesQuery__
 *
 * To run a query within a React component, call `useIngressesQuery` and pass it any options that fit your needs.
 * When your component renders, `useIngressesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useIngressesQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useIngressesQuery(baseOptions: Apollo.QueryHookOptions<IngressesQuery, IngressesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<IngressesQuery, IngressesQueryVariables>(IngressesDocument, options);
      }
export function useIngressesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<IngressesQuery, IngressesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<IngressesQuery, IngressesQueryVariables>(IngressesDocument, options);
        }
export function useIngressesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<IngressesQuery, IngressesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<IngressesQuery, IngressesQueryVariables>(IngressesDocument, options);
        }
export type IngressesQueryHookResult = ReturnType<typeof useIngressesQuery>;
export type IngressesLazyQueryHookResult = ReturnType<typeof useIngressesLazyQuery>;
export type IngressesSuspenseQueryHookResult = ReturnType<typeof useIngressesSuspenseQuery>;
export type IngressesQueryResult = Apollo.QueryResult<IngressesQuery, IngressesQueryVariables>;
export const IngressDocument = gql`
    query Ingress($name: String!, $namespace: String!) {
  handleGetIngressDetail(namespace: $namespace, name: $name) @rest(path: "ingress/{args.namespace}/{args.name}") {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    endpoints @type(name: "common_Endpoint") {
      ...Endpoint
    }
    spec {
      ingressClassName
      tls {
        hosts
        secretName
      }
      defaultBackend {
        service {
          name
          port {
            name
            number
          }
        }
        resource {
          name
          apiGroup
          kind
        }
      }
      rules {
        host
        http {
          paths {
            path
            pathType
            backend {
              service {
                name
                port {
                  name
                  number
                }
              }
              resource {
                name
                kind
                apiGroup
              }
              service {
                name
                port {
                  name
                  number
                }
              }
            }
          }
        }
      }
    }
    status {
      loadBalancer {
        ingress {
          ports {
            port
            protocol
            error
          }
        }
      }
    }
    hosts
    errors
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${EndpointFragmentDoc}`;

/**
 * __useIngressQuery__
 *
 * To run a query within a React component, call `useIngressQuery` and pass it any options that fit your needs.
 * When your component renders, `useIngressQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useIngressQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *   },
 * });
 */
export function useIngressQuery(baseOptions: Apollo.QueryHookOptions<IngressQuery, IngressQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<IngressQuery, IngressQueryVariables>(IngressDocument, options);
      }
export function useIngressLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<IngressQuery, IngressQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<IngressQuery, IngressQueryVariables>(IngressDocument, options);
        }
export function useIngressSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<IngressQuery, IngressQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<IngressQuery, IngressQueryVariables>(IngressDocument, options);
        }
export type IngressQueryHookResult = ReturnType<typeof useIngressQuery>;
export type IngressLazyQueryHookResult = ReturnType<typeof useIngressLazyQuery>;
export type IngressSuspenseQueryHookResult = ReturnType<typeof useIngressSuspenseQuery>;
export type IngressQueryResult = Apollo.QueryResult<IngressQuery, IngressQueryVariables>;
export const IngressEventsDocument = gql`
    query IngressEvents($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetIngressEvent(
    namespace: $namespace
    ingress: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "common_EventList", path: "ingress/{args.namespace}/{args.ingress}/event?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...EventList
  }
}
    ${EventListFragmentDoc}`;

/**
 * __useIngressEventsQuery__
 *
 * To run a query within a React component, call `useIngressEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useIngressEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useIngressEventsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useIngressEventsQuery(baseOptions: Apollo.QueryHookOptions<IngressEventsQuery, IngressEventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<IngressEventsQuery, IngressEventsQueryVariables>(IngressEventsDocument, options);
      }
export function useIngressEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<IngressEventsQuery, IngressEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<IngressEventsQuery, IngressEventsQueryVariables>(IngressEventsDocument, options);
        }
export function useIngressEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<IngressEventsQuery, IngressEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<IngressEventsQuery, IngressEventsQueryVariables>(IngressEventsDocument, options);
        }
export type IngressEventsQueryHookResult = ReturnType<typeof useIngressEventsQuery>;
export type IngressEventsLazyQueryHookResult = ReturnType<typeof useIngressEventsLazyQuery>;
export type IngressEventsSuspenseQueryHookResult = ReturnType<typeof useIngressEventsSuspenseQuery>;
export type IngressEventsQueryResult = Apollo.QueryResult<IngressEventsQuery, IngressEventsQueryVariables>;
export const IngressClassesDocument = gql`
    query IngressClasses($filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetIngressClassList(
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(path: "ingressclass?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    errors
    listMeta @type(name: "types_ListMeta") {
      ...ListMeta
    }
    items {
      typeMeta @type(name: "types_TypeMeta") {
        ...TypeMeta
      }
      objectMeta @type(name: "types_ObjectMeta") {
        ...ObjectMeta
      }
      controller
    }
  }
}
    ${ListMetaFragmentDoc}
${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useIngressClassesQuery__
 *
 * To run a query within a React component, call `useIngressClassesQuery` and pass it any options that fit your needs.
 * When your component renders, `useIngressClassesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useIngressClassesQuery({
 *   variables: {
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useIngressClassesQuery(baseOptions?: Apollo.QueryHookOptions<IngressClassesQuery, IngressClassesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<IngressClassesQuery, IngressClassesQueryVariables>(IngressClassesDocument, options);
      }
export function useIngressClassesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<IngressClassesQuery, IngressClassesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<IngressClassesQuery, IngressClassesQueryVariables>(IngressClassesDocument, options);
        }
export function useIngressClassesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<IngressClassesQuery, IngressClassesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<IngressClassesQuery, IngressClassesQueryVariables>(IngressClassesDocument, options);
        }
export type IngressClassesQueryHookResult = ReturnType<typeof useIngressClassesQuery>;
export type IngressClassesLazyQueryHookResult = ReturnType<typeof useIngressClassesLazyQuery>;
export type IngressClassesSuspenseQueryHookResult = ReturnType<typeof useIngressClassesSuspenseQuery>;
export type IngressClassesQueryResult = Apollo.QueryResult<IngressClassesQuery, IngressClassesQueryVariables>;
export const IngressClassDocument = gql`
    query IngressClass($name: String!) {
  handleGetIngressClass(ingressclass: $name) @rest(path: "ingressclass/{args.ingressclass}") {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    controller
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useIngressClassQuery__
 *
 * To run a query within a React component, call `useIngressClassQuery` and pass it any options that fit your needs.
 * When your component renders, `useIngressClassQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useIngressClassQuery({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useIngressClassQuery(baseOptions: Apollo.QueryHookOptions<IngressClassQuery, IngressClassQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<IngressClassQuery, IngressClassQueryVariables>(IngressClassDocument, options);
      }
export function useIngressClassLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<IngressClassQuery, IngressClassQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<IngressClassQuery, IngressClassQueryVariables>(IngressClassDocument, options);
        }
export function useIngressClassSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<IngressClassQuery, IngressClassQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<IngressClassQuery, IngressClassQueryVariables>(IngressClassDocument, options);
        }
export type IngressClassQueryHookResult = ReturnType<typeof useIngressClassQuery>;
export type IngressClassLazyQueryHookResult = ReturnType<typeof useIngressClassLazyQuery>;
export type IngressClassSuspenseQueryHookResult = ReturnType<typeof useIngressClassSuspenseQuery>;
export type IngressClassQueryResult = Apollo.QueryResult<IngressClassQuery, IngressClassQueryVariables>;
export const NetworkPoliciesDocument = gql`
    query NetworkPolicies($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetNetworkPolicyList(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(path: "networkpolicy/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    errors
    listMeta @type(name: "types_ListMeta") {
      ...ListMeta
    }
    items {
      typeMeta @type(name: "types_TypeMeta") {
        ...TypeMeta
      }
      objectMeta @type(name: "types_ObjectMeta") {
        ...ObjectMeta
      }
    }
  }
}
    ${ListMetaFragmentDoc}
${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useNetworkPoliciesQuery__
 *
 * To run a query within a React component, call `useNetworkPoliciesQuery` and pass it any options that fit your needs.
 * When your component renders, `useNetworkPoliciesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNetworkPoliciesQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useNetworkPoliciesQuery(baseOptions: Apollo.QueryHookOptions<NetworkPoliciesQuery, NetworkPoliciesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NetworkPoliciesQuery, NetworkPoliciesQueryVariables>(NetworkPoliciesDocument, options);
      }
export function useNetworkPoliciesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NetworkPoliciesQuery, NetworkPoliciesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NetworkPoliciesQuery, NetworkPoliciesQueryVariables>(NetworkPoliciesDocument, options);
        }
export function useNetworkPoliciesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<NetworkPoliciesQuery, NetworkPoliciesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<NetworkPoliciesQuery, NetworkPoliciesQueryVariables>(NetworkPoliciesDocument, options);
        }
export type NetworkPoliciesQueryHookResult = ReturnType<typeof useNetworkPoliciesQuery>;
export type NetworkPoliciesLazyQueryHookResult = ReturnType<typeof useNetworkPoliciesLazyQuery>;
export type NetworkPoliciesSuspenseQueryHookResult = ReturnType<typeof useNetworkPoliciesSuspenseQuery>;
export type NetworkPoliciesQueryResult = Apollo.QueryResult<NetworkPoliciesQuery, NetworkPoliciesQueryVariables>;
export const NetworkPolicyDocument = gql`
    query NetworkPolicy($name: String!, $namespace: String!) {
  handleGetNetworkPolicyDetail(namespace: $namespace, networkpolicy: $name) @rest(path: "networkpolicy/{args.namespace}/{args.networkpolicy}") {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    podSelector @type(name: "v1_LabelSelector") {
      ...Selector
    }
    egress {
      to {
        podSelector @type(name: "v1_LabelSelector") {
          ...Selector
        }
        namespaceSelector @type(name: "v1_LabelSelector") {
          ...Selector
        }
        ipBlock @type(name: "v1_IPBlock") {
          ...IPBlock
        }
      }
      ports @type(name: "v1_NetworkPolicyPort") {
        ...NetworkPolicyPort
      }
    }
    ingress {
      from {
        podSelector @type(name: "v1_LabelSelector") {
          ...Selector
        }
        namespaceSelector @type(name: "v1_LabelSelector") {
          ...Selector
        }
        ipBlock @type(name: "v1_IPBlock") {
          ...IPBlock
        }
      }
      ports @type(name: "v1_NetworkPolicyPort") {
        ...NetworkPolicyPort
      }
    }
    policyTypes
    errors
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${SelectorFragmentDoc}
${IpBlockFragmentDoc}
${NetworkPolicyPortFragmentDoc}`;

/**
 * __useNetworkPolicyQuery__
 *
 * To run a query within a React component, call `useNetworkPolicyQuery` and pass it any options that fit your needs.
 * When your component renders, `useNetworkPolicyQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNetworkPolicyQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *   },
 * });
 */
export function useNetworkPolicyQuery(baseOptions: Apollo.QueryHookOptions<NetworkPolicyQuery, NetworkPolicyQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NetworkPolicyQuery, NetworkPolicyQueryVariables>(NetworkPolicyDocument, options);
      }
export function useNetworkPolicyLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NetworkPolicyQuery, NetworkPolicyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NetworkPolicyQuery, NetworkPolicyQueryVariables>(NetworkPolicyDocument, options);
        }
export function useNetworkPolicySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<NetworkPolicyQuery, NetworkPolicyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<NetworkPolicyQuery, NetworkPolicyQueryVariables>(NetworkPolicyDocument, options);
        }
export type NetworkPolicyQueryHookResult = ReturnType<typeof useNetworkPolicyQuery>;
export type NetworkPolicyLazyQueryHookResult = ReturnType<typeof useNetworkPolicyLazyQuery>;
export type NetworkPolicySuspenseQueryHookResult = ReturnType<typeof useNetworkPolicySuspenseQuery>;
export type NetworkPolicyQueryResult = Apollo.QueryResult<NetworkPolicyQuery, NetworkPolicyQueryVariables>;
export const ServicesDocument = gql`
    query Services($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetServiceList(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "service_ServiceList", path: "service/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...ServiceList
  }
}
    ${ServiceListFragmentDoc}`;

/**
 * __useServicesQuery__
 *
 * To run a query within a React component, call `useServicesQuery` and pass it any options that fit your needs.
 * When your component renders, `useServicesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServicesQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useServicesQuery(baseOptions: Apollo.QueryHookOptions<ServicesQuery, ServicesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServicesQuery, ServicesQueryVariables>(ServicesDocument, options);
      }
export function useServicesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServicesQuery, ServicesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServicesQuery, ServicesQueryVariables>(ServicesDocument, options);
        }
export function useServicesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ServicesQuery, ServicesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ServicesQuery, ServicesQueryVariables>(ServicesDocument, options);
        }
export type ServicesQueryHookResult = ReturnType<typeof useServicesQuery>;
export type ServicesLazyQueryHookResult = ReturnType<typeof useServicesLazyQuery>;
export type ServicesSuspenseQueryHookResult = ReturnType<typeof useServicesSuspenseQuery>;
export type ServicesQueryResult = Apollo.QueryResult<ServicesQuery, ServicesQueryVariables>;
export const ServiceDocument = gql`
    query Service($name: String!, $namespace: String!) {
  handleGetServiceDetail(namespace: $namespace, service: $name) @rest(path: "service/{args.namespace}/{args.service}") {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    internalEndpoint @type(name: "common_Endpoint") {
      ...Endpoint
    }
    externalEndpoints @type(name: "common_Endpoint") {
      ...Endpoint
    }
    endpointList {
      endpoints {
        typeMeta @type(name: "types_TypeMeta") {
          ...TypeMeta
        }
        objectMeta @type(name: "types_ObjectMeta") {
          ...ObjectMeta
        }
        ports {
          name
          port
          protocol
          appProtocol
        }
        host
        ready
        nodeName
      }
    }
    type
    sessionAffinity
    selector
    clusterIP
    errors
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${EndpointFragmentDoc}`;

/**
 * __useServiceQuery__
 *
 * To run a query within a React component, call `useServiceQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *   },
 * });
 */
export function useServiceQuery(baseOptions: Apollo.QueryHookOptions<ServiceQuery, ServiceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceQuery, ServiceQueryVariables>(ServiceDocument, options);
      }
export function useServiceLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceQuery, ServiceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceQuery, ServiceQueryVariables>(ServiceDocument, options);
        }
export function useServiceSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ServiceQuery, ServiceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ServiceQuery, ServiceQueryVariables>(ServiceDocument, options);
        }
export type ServiceQueryHookResult = ReturnType<typeof useServiceQuery>;
export type ServiceLazyQueryHookResult = ReturnType<typeof useServiceLazyQuery>;
export type ServiceSuspenseQueryHookResult = ReturnType<typeof useServiceSuspenseQuery>;
export type ServiceQueryResult = Apollo.QueryResult<ServiceQuery, ServiceQueryVariables>;
export const ServiceEventsDocument = gql`
    query ServiceEvents($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetServiceEvent(
    namespace: $namespace
    service: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "common_EventList", path: "service/{args.namespace}/{args.service}/event?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...EventList
  }
}
    ${EventListFragmentDoc}`;

/**
 * __useServiceEventsQuery__
 *
 * To run a query within a React component, call `useServiceEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceEventsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useServiceEventsQuery(baseOptions: Apollo.QueryHookOptions<ServiceEventsQuery, ServiceEventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceEventsQuery, ServiceEventsQueryVariables>(ServiceEventsDocument, options);
      }
export function useServiceEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceEventsQuery, ServiceEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceEventsQuery, ServiceEventsQueryVariables>(ServiceEventsDocument, options);
        }
export function useServiceEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ServiceEventsQuery, ServiceEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ServiceEventsQuery, ServiceEventsQueryVariables>(ServiceEventsDocument, options);
        }
export type ServiceEventsQueryHookResult = ReturnType<typeof useServiceEventsQuery>;
export type ServiceEventsLazyQueryHookResult = ReturnType<typeof useServiceEventsLazyQuery>;
export type ServiceEventsSuspenseQueryHookResult = ReturnType<typeof useServiceEventsSuspenseQuery>;
export type ServiceEventsQueryResult = Apollo.QueryResult<ServiceEventsQuery, ServiceEventsQueryVariables>;
export const ServicePodsDocument = gql`
    query ServicePods($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetServicePods(
    namespace: $namespace
    service: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "pod_PodList", path: "service/{args.namespace}/{args.service}/pod?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...PodList
  }
}
    ${PodListFragmentDoc}`;

/**
 * __useServicePodsQuery__
 *
 * To run a query within a React component, call `useServicePodsQuery` and pass it any options that fit your needs.
 * When your component renders, `useServicePodsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServicePodsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useServicePodsQuery(baseOptions: Apollo.QueryHookOptions<ServicePodsQuery, ServicePodsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServicePodsQuery, ServicePodsQueryVariables>(ServicePodsDocument, options);
      }
export function useServicePodsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServicePodsQuery, ServicePodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServicePodsQuery, ServicePodsQueryVariables>(ServicePodsDocument, options);
        }
export function useServicePodsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ServicePodsQuery, ServicePodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ServicePodsQuery, ServicePodsQueryVariables>(ServicePodsDocument, options);
        }
export type ServicePodsQueryHookResult = ReturnType<typeof useServicePodsQuery>;
export type ServicePodsLazyQueryHookResult = ReturnType<typeof useServicePodsLazyQuery>;
export type ServicePodsSuspenseQueryHookResult = ReturnType<typeof useServicePodsSuspenseQuery>;
export type ServicePodsQueryResult = Apollo.QueryResult<ServicePodsQuery, ServicePodsQueryVariables>;
export const ServiceIngressesDocument = gql`
    query ServiceIngresses($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetServiceIngressList(
    namespace: $namespace
    service: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "ingress_IngressList", path: "service/{args.namespace}/{args.service}/ingress?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...IngressList
  }
}
    ${IngressListFragmentDoc}`;

/**
 * __useServiceIngressesQuery__
 *
 * To run a query within a React component, call `useServiceIngressesQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceIngressesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceIngressesQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useServiceIngressesQuery(baseOptions: Apollo.QueryHookOptions<ServiceIngressesQuery, ServiceIngressesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceIngressesQuery, ServiceIngressesQueryVariables>(ServiceIngressesDocument, options);
      }
export function useServiceIngressesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceIngressesQuery, ServiceIngressesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceIngressesQuery, ServiceIngressesQueryVariables>(ServiceIngressesDocument, options);
        }
export function useServiceIngressesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ServiceIngressesQuery, ServiceIngressesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ServiceIngressesQuery, ServiceIngressesQueryVariables>(ServiceIngressesDocument, options);
        }
export type ServiceIngressesQueryHookResult = ReturnType<typeof useServiceIngressesQuery>;
export type ServiceIngressesLazyQueryHookResult = ReturnType<typeof useServiceIngressesLazyQuery>;
export type ServiceIngressesSuspenseQueryHookResult = ReturnType<typeof useServiceIngressesSuspenseQuery>;
export type ServiceIngressesQueryResult = Apollo.QueryResult<ServiceIngressesQuery, ServiceIngressesQueryVariables>;
export const PersistentVolumesDocument = gql`
    query PersistentVolumes($filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetPersistentVolumeList(
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(path: "persistentvolume?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    errors
    listMeta @type(name: "types_ListMeta") {
      ...ListMeta
    }
    items {
      typeMeta @type(name: "types_TypeMeta") {
        ...TypeMeta
      }
      objectMeta @type(name: "types_ObjectMeta") {
        ...ObjectMeta
      }
      status
      claim
      storageClass
      reason
      reclaimPolicy
      accessModes
      capacity
    }
  }
}
    ${ListMetaFragmentDoc}
${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __usePersistentVolumesQuery__
 *
 * To run a query within a React component, call `usePersistentVolumesQuery` and pass it any options that fit your needs.
 * When your component renders, `usePersistentVolumesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePersistentVolumesQuery({
 *   variables: {
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function usePersistentVolumesQuery(baseOptions?: Apollo.QueryHookOptions<PersistentVolumesQuery, PersistentVolumesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PersistentVolumesQuery, PersistentVolumesQueryVariables>(PersistentVolumesDocument, options);
      }
export function usePersistentVolumesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PersistentVolumesQuery, PersistentVolumesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PersistentVolumesQuery, PersistentVolumesQueryVariables>(PersistentVolumesDocument, options);
        }
export function usePersistentVolumesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PersistentVolumesQuery, PersistentVolumesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PersistentVolumesQuery, PersistentVolumesQueryVariables>(PersistentVolumesDocument, options);
        }
export type PersistentVolumesQueryHookResult = ReturnType<typeof usePersistentVolumesQuery>;
export type PersistentVolumesLazyQueryHookResult = ReturnType<typeof usePersistentVolumesLazyQuery>;
export type PersistentVolumesSuspenseQueryHookResult = ReturnType<typeof usePersistentVolumesSuspenseQuery>;
export type PersistentVolumesQueryResult = Apollo.QueryResult<PersistentVolumesQuery, PersistentVolumesQueryVariables>;
export const PersistentVolumeDocument = gql`
    query PersistentVolume($name: String!) {
  handleGetPersistentVolumeDetail(persistentvolume: $name) @rest(path: "persistentvolume/{args.persistentvolume}") {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    status
    capacity
    claim
    storageClass
    reason
    message
    mountOptions
    reclaimPolicy
    accessModes
    persistentVolumeSource {
      portworxVolume {
        fsType
        readOnly
        volumeID
      }
      awsElasticBlockStore {
        volumeID
        readOnly
        fsType
        partition
      }
      azureDisk {
        fsType
        readOnly
        kind
        cachingMode
        diskName
        diskURI
      }
      azureFile {
        readOnly
        secretName
        secretNamespace
        shareName
      }
      cephfs {
        readOnly
        path
        monitors
        secretFile
        secretRef {
          name
          namespace
        }
        user
      }
      cinder {
        secretRef {
          namespace
          name
        }
        readOnly
        fsType
        volumeID
      }
      csi {
        fsType
        readOnly
        controllerExpandSecretRef {
          namespace
          name
        }
        controllerPublishSecretRef {
          namespace
          name
        }
        driver
        nodeExpandSecretRef {
          namespace
          name
        }
        nodePublishSecretRef {
          namespace
          name
        }
        nodeStageSecretRef {
          namespace
          name
        }
        volumeAttributes
        volumeHandle
      }
      fc {
        readOnly
        fsType
        lun
        targetWWNs
        wwids
      }
      flexVolume {
        fsType
        readOnly
        driver
        secretRef {
          name
          namespace
        }
        options
      }
      flocker {
        datasetName
        datasetUUID
      }
      gcePersistentDisk {
        readOnly
        fsType
        partition
        pdName
      }
      glusterfs {
        readOnly
        path
        endpoints
        endpointsNamespace
      }
      hostPath {
        path
        type
      }
      iscsi {
        readOnly
        fsType
        secretRef {
          namespace
          name
        }
        lun
        chapAuthDiscovery
        chapAuthSession
        initiatorName
        iqn
        iscsiInterface
        portals
        targetPortal
      }
      local {
        fsType
        path
      }
      nfs {
        path
        readOnly
        server
      }
      photonPersistentDisk {
        fsType
        pdID
      }
      quobyte {
        readOnly
        user
        volume
        registry
        group
        tenant
      }
      rbd {
        user
        readOnly
        fsType
        secretRef {
          name
          namespace
        }
        monitors
        image
        keyring
        pool
      }
      scaleIO {
        secretRef {
          namespace
          name
        }
        fsType
        readOnly
        gateway
        protectionDomain
        sslEnabled
        storageMode
        storagePool
        system
        volumeName
      }
      storageos {
        volumeName
        volumeNamespace
        fsType
        secretRef {
          name
          namespace
          kind
          uid
          apiVersion
          fieldPath
          resourceVersion
        }
        readOnly
      }
      vsphereVolume {
        fsType
        storagePolicyID
        storagePolicyName
        volumePath
      }
    }
    capacity
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __usePersistentVolumeQuery__
 *
 * To run a query within a React component, call `usePersistentVolumeQuery` and pass it any options that fit your needs.
 * When your component renders, `usePersistentVolumeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePersistentVolumeQuery({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function usePersistentVolumeQuery(baseOptions: Apollo.QueryHookOptions<PersistentVolumeQuery, PersistentVolumeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PersistentVolumeQuery, PersistentVolumeQueryVariables>(PersistentVolumeDocument, options);
      }
export function usePersistentVolumeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PersistentVolumeQuery, PersistentVolumeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PersistentVolumeQuery, PersistentVolumeQueryVariables>(PersistentVolumeDocument, options);
        }
export function usePersistentVolumeSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PersistentVolumeQuery, PersistentVolumeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PersistentVolumeQuery, PersistentVolumeQueryVariables>(PersistentVolumeDocument, options);
        }
export type PersistentVolumeQueryHookResult = ReturnType<typeof usePersistentVolumeQuery>;
export type PersistentVolumeLazyQueryHookResult = ReturnType<typeof usePersistentVolumeLazyQuery>;
export type PersistentVolumeSuspenseQueryHookResult = ReturnType<typeof usePersistentVolumeSuspenseQuery>;
export type PersistentVolumeQueryResult = Apollo.QueryResult<PersistentVolumeQuery, PersistentVolumeQueryVariables>;
export const PersistentVolumeClaimsDocument = gql`
    query PersistentVolumeClaims($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetPersistentVolumeClaimList(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "persistentvolumeclaim_PersistentVolumeClaimList", path: "persistentvolumeclaim/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...PersistentVolumeClaimList
  }
}
    ${PersistentVolumeClaimListFragmentDoc}`;

/**
 * __usePersistentVolumeClaimsQuery__
 *
 * To run a query within a React component, call `usePersistentVolumeClaimsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePersistentVolumeClaimsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePersistentVolumeClaimsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function usePersistentVolumeClaimsQuery(baseOptions: Apollo.QueryHookOptions<PersistentVolumeClaimsQuery, PersistentVolumeClaimsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PersistentVolumeClaimsQuery, PersistentVolumeClaimsQueryVariables>(PersistentVolumeClaimsDocument, options);
      }
export function usePersistentVolumeClaimsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PersistentVolumeClaimsQuery, PersistentVolumeClaimsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PersistentVolumeClaimsQuery, PersistentVolumeClaimsQueryVariables>(PersistentVolumeClaimsDocument, options);
        }
export function usePersistentVolumeClaimsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PersistentVolumeClaimsQuery, PersistentVolumeClaimsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PersistentVolumeClaimsQuery, PersistentVolumeClaimsQueryVariables>(PersistentVolumeClaimsDocument, options);
        }
export type PersistentVolumeClaimsQueryHookResult = ReturnType<typeof usePersistentVolumeClaimsQuery>;
export type PersistentVolumeClaimsLazyQueryHookResult = ReturnType<typeof usePersistentVolumeClaimsLazyQuery>;
export type PersistentVolumeClaimsSuspenseQueryHookResult = ReturnType<typeof usePersistentVolumeClaimsSuspenseQuery>;
export type PersistentVolumeClaimsQueryResult = Apollo.QueryResult<PersistentVolumeClaimsQuery, PersistentVolumeClaimsQueryVariables>;
export const PersistentVolumeClaimDocument = gql`
    query PersistentVolumeClaim($name: String!, $namespace: String!) {
  handleGetPersistentVolumeClaimDetail(namespace: $namespace, name: $name) @rest(type: "persistentvolumeclaim_PersistentVolumeClaimDetail", path: "persistentvolumeclaim/{args.namespace}/{args.name}") {
    ...PersistentVolumeClaimDetail
  }
}
    ${PersistentVolumeClaimDetailFragmentDoc}`;

/**
 * __usePersistentVolumeClaimQuery__
 *
 * To run a query within a React component, call `usePersistentVolumeClaimQuery` and pass it any options that fit your needs.
 * When your component renders, `usePersistentVolumeClaimQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePersistentVolumeClaimQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *   },
 * });
 */
export function usePersistentVolumeClaimQuery(baseOptions: Apollo.QueryHookOptions<PersistentVolumeClaimQuery, PersistentVolumeClaimQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PersistentVolumeClaimQuery, PersistentVolumeClaimQueryVariables>(PersistentVolumeClaimDocument, options);
      }
export function usePersistentVolumeClaimLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PersistentVolumeClaimQuery, PersistentVolumeClaimQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PersistentVolumeClaimQuery, PersistentVolumeClaimQueryVariables>(PersistentVolumeClaimDocument, options);
        }
export function usePersistentVolumeClaimSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PersistentVolumeClaimQuery, PersistentVolumeClaimQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PersistentVolumeClaimQuery, PersistentVolumeClaimQueryVariables>(PersistentVolumeClaimDocument, options);
        }
export type PersistentVolumeClaimQueryHookResult = ReturnType<typeof usePersistentVolumeClaimQuery>;
export type PersistentVolumeClaimLazyQueryHookResult = ReturnType<typeof usePersistentVolumeClaimLazyQuery>;
export type PersistentVolumeClaimSuspenseQueryHookResult = ReturnType<typeof usePersistentVolumeClaimSuspenseQuery>;
export type PersistentVolumeClaimQueryResult = Apollo.QueryResult<PersistentVolumeClaimQuery, PersistentVolumeClaimQueryVariables>;
export const StorageClassesDocument = gql`
    query StorageClasses($filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetStorageClassList(
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(path: "storageclass?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    errors
    listMeta @type(name: "types_ListMeta") {
      ...ListMeta
    }
    items {
      typeMeta @type(name: "types_TypeMeta") {
        ...TypeMeta
      }
      objectMeta @type(name: "types_ObjectMeta") {
        ...ObjectMeta
      }
      parameters
      provisioner
    }
  }
}
    ${ListMetaFragmentDoc}
${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useStorageClassesQuery__
 *
 * To run a query within a React component, call `useStorageClassesQuery` and pass it any options that fit your needs.
 * When your component renders, `useStorageClassesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStorageClassesQuery({
 *   variables: {
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useStorageClassesQuery(baseOptions?: Apollo.QueryHookOptions<StorageClassesQuery, StorageClassesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<StorageClassesQuery, StorageClassesQueryVariables>(StorageClassesDocument, options);
      }
export function useStorageClassesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<StorageClassesQuery, StorageClassesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<StorageClassesQuery, StorageClassesQueryVariables>(StorageClassesDocument, options);
        }
export function useStorageClassesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<StorageClassesQuery, StorageClassesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<StorageClassesQuery, StorageClassesQueryVariables>(StorageClassesDocument, options);
        }
export type StorageClassesQueryHookResult = ReturnType<typeof useStorageClassesQuery>;
export type StorageClassesLazyQueryHookResult = ReturnType<typeof useStorageClassesLazyQuery>;
export type StorageClassesSuspenseQueryHookResult = ReturnType<typeof useStorageClassesSuspenseQuery>;
export type StorageClassesQueryResult = Apollo.QueryResult<StorageClassesQuery, StorageClassesQueryVariables>;
export const StorageClassDocument = gql`
    query StorageClass($name: String!) {
  handleGetStorageClass(storageclass: $name) @rest(path: "storageclass/{args.storageclass}") {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    parameters
    provisioner
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useStorageClassQuery__
 *
 * To run a query within a React component, call `useStorageClassQuery` and pass it any options that fit your needs.
 * When your component renders, `useStorageClassQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStorageClassQuery({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useStorageClassQuery(baseOptions: Apollo.QueryHookOptions<StorageClassQuery, StorageClassQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<StorageClassQuery, StorageClassQueryVariables>(StorageClassDocument, options);
      }
export function useStorageClassLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<StorageClassQuery, StorageClassQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<StorageClassQuery, StorageClassQueryVariables>(StorageClassDocument, options);
        }
export function useStorageClassSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<StorageClassQuery, StorageClassQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<StorageClassQuery, StorageClassQueryVariables>(StorageClassDocument, options);
        }
export type StorageClassQueryHookResult = ReturnType<typeof useStorageClassQuery>;
export type StorageClassLazyQueryHookResult = ReturnType<typeof useStorageClassLazyQuery>;
export type StorageClassSuspenseQueryHookResult = ReturnType<typeof useStorageClassSuspenseQuery>;
export type StorageClassQueryResult = Apollo.QueryResult<StorageClassQuery, StorageClassQueryVariables>;
export const StorageClassPersistentVolumesDocument = gql`
    query StorageClassPersistentVolumes($name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetStorageClassPersistentVolumes(
    storageclass: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(path: "storageclass/{args.storageclass}/persistentvolume?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    listMeta @type(name: "types_ListMeta") {
      ...ListMeta
    }
    items {
      typeMeta @type(name: "types_TypeMeta") {
        ...TypeMeta
      }
      objectMeta @type(name: "types_ObjectMeta") {
        ...ObjectMeta
      }
      status
      claim
      reason
      reclaimPolicy
      accessModes
      capacity
    }
  }
}
    ${ListMetaFragmentDoc}
${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}`;

/**
 * __useStorageClassPersistentVolumesQuery__
 *
 * To run a query within a React component, call `useStorageClassPersistentVolumesQuery` and pass it any options that fit your needs.
 * When your component renders, `useStorageClassPersistentVolumesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStorageClassPersistentVolumesQuery({
 *   variables: {
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useStorageClassPersistentVolumesQuery(baseOptions: Apollo.QueryHookOptions<StorageClassPersistentVolumesQuery, StorageClassPersistentVolumesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<StorageClassPersistentVolumesQuery, StorageClassPersistentVolumesQueryVariables>(StorageClassPersistentVolumesDocument, options);
      }
export function useStorageClassPersistentVolumesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<StorageClassPersistentVolumesQuery, StorageClassPersistentVolumesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<StorageClassPersistentVolumesQuery, StorageClassPersistentVolumesQueryVariables>(StorageClassPersistentVolumesDocument, options);
        }
export function useStorageClassPersistentVolumesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<StorageClassPersistentVolumesQuery, StorageClassPersistentVolumesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<StorageClassPersistentVolumesQuery, StorageClassPersistentVolumesQueryVariables>(StorageClassPersistentVolumesDocument, options);
        }
export type StorageClassPersistentVolumesQueryHookResult = ReturnType<typeof useStorageClassPersistentVolumesQuery>;
export type StorageClassPersistentVolumesLazyQueryHookResult = ReturnType<typeof useStorageClassPersistentVolumesLazyQuery>;
export type StorageClassPersistentVolumesSuspenseQueryHookResult = ReturnType<typeof useStorageClassPersistentVolumesSuspenseQuery>;
export type StorageClassPersistentVolumesQueryResult = Apollo.QueryResult<StorageClassPersistentVolumesQuery, StorageClassPersistentVolumesQueryVariables>;
export const CronJobsDocument = gql`
    query CronJobs($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetCronJobList(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "cronjob_CronJobList", path: "cronjob/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...CronJobList
  }
}
    ${CronJobListFragmentDoc}`;

/**
 * __useCronJobsQuery__
 *
 * To run a query within a React component, call `useCronJobsQuery` and pass it any options that fit your needs.
 * When your component renders, `useCronJobsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCronJobsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useCronJobsQuery(baseOptions: Apollo.QueryHookOptions<CronJobsQuery, CronJobsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CronJobsQuery, CronJobsQueryVariables>(CronJobsDocument, options);
      }
export function useCronJobsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CronJobsQuery, CronJobsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CronJobsQuery, CronJobsQueryVariables>(CronJobsDocument, options);
        }
export function useCronJobsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CronJobsQuery, CronJobsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CronJobsQuery, CronJobsQueryVariables>(CronJobsDocument, options);
        }
export type CronJobsQueryHookResult = ReturnType<typeof useCronJobsQuery>;
export type CronJobsLazyQueryHookResult = ReturnType<typeof useCronJobsLazyQuery>;
export type CronJobsSuspenseQueryHookResult = ReturnType<typeof useCronJobsSuspenseQuery>;
export type CronJobsQueryResult = Apollo.QueryResult<CronJobsQuery, CronJobsQueryVariables>;
export const CronJobDocument = gql`
    query CronJob($namespace: String!, $name: String!) {
  handleGetCronJobDetail(namespace: $namespace, name: $name) @rest(type: "cronjob_CronJobDetail", path: "cronjob/{args.namespace}/{args.name}") {
    ...CronJobDetail
  }
}
    ${CronJobDetailFragmentDoc}`;

/**
 * __useCronJobQuery__
 *
 * To run a query within a React component, call `useCronJobQuery` and pass it any options that fit your needs.
 * When your component renders, `useCronJobQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCronJobQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useCronJobQuery(baseOptions: Apollo.QueryHookOptions<CronJobQuery, CronJobQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CronJobQuery, CronJobQueryVariables>(CronJobDocument, options);
      }
export function useCronJobLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CronJobQuery, CronJobQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CronJobQuery, CronJobQueryVariables>(CronJobDocument, options);
        }
export function useCronJobSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CronJobQuery, CronJobQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CronJobQuery, CronJobQueryVariables>(CronJobDocument, options);
        }
export type CronJobQueryHookResult = ReturnType<typeof useCronJobQuery>;
export type CronJobLazyQueryHookResult = ReturnType<typeof useCronJobLazyQuery>;
export type CronJobSuspenseQueryHookResult = ReturnType<typeof useCronJobSuspenseQuery>;
export type CronJobQueryResult = Apollo.QueryResult<CronJobQuery, CronJobQueryVariables>;
export const CronJobEventsDocument = gql`
    query CronJobEvents($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetCronJobEvents(
    namespace: $namespace
    name: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "common_EventList", path: "cronjob/{args.namespace}/{args.name}/event") {
    ...EventList
  }
}
    ${EventListFragmentDoc}`;

/**
 * __useCronJobEventsQuery__
 *
 * To run a query within a React component, call `useCronJobEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useCronJobEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCronJobEventsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useCronJobEventsQuery(baseOptions: Apollo.QueryHookOptions<CronJobEventsQuery, CronJobEventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CronJobEventsQuery, CronJobEventsQueryVariables>(CronJobEventsDocument, options);
      }
export function useCronJobEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CronJobEventsQuery, CronJobEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CronJobEventsQuery, CronJobEventsQueryVariables>(CronJobEventsDocument, options);
        }
export function useCronJobEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CronJobEventsQuery, CronJobEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CronJobEventsQuery, CronJobEventsQueryVariables>(CronJobEventsDocument, options);
        }
export type CronJobEventsQueryHookResult = ReturnType<typeof useCronJobEventsQuery>;
export type CronJobEventsLazyQueryHookResult = ReturnType<typeof useCronJobEventsLazyQuery>;
export type CronJobEventsSuspenseQueryHookResult = ReturnType<typeof useCronJobEventsSuspenseQuery>;
export type CronJobEventsQueryResult = Apollo.QueryResult<CronJobEventsQuery, CronJobEventsQueryVariables>;
export const CronJobJobsDocument = gql`
    query CronJobJobs($namespace: String!, $name: String!, $active: String, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetCronJobJobs(
    namespace: $namespace
    name: $name
    active: $active
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "job_JobList", path: "cronjob/{args.namespace}/{args.name}/job?active={args.active}&filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...JobList
  }
}
    ${JobListFragmentDoc}`;

/**
 * __useCronJobJobsQuery__
 *
 * To run a query within a React component, call `useCronJobJobsQuery` and pass it any options that fit your needs.
 * When your component renders, `useCronJobJobsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCronJobJobsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      active: // value for 'active'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useCronJobJobsQuery(baseOptions: Apollo.QueryHookOptions<CronJobJobsQuery, CronJobJobsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CronJobJobsQuery, CronJobJobsQueryVariables>(CronJobJobsDocument, options);
      }
export function useCronJobJobsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CronJobJobsQuery, CronJobJobsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CronJobJobsQuery, CronJobJobsQueryVariables>(CronJobJobsDocument, options);
        }
export function useCronJobJobsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CronJobJobsQuery, CronJobJobsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CronJobJobsQuery, CronJobJobsQueryVariables>(CronJobJobsDocument, options);
        }
export type CronJobJobsQueryHookResult = ReturnType<typeof useCronJobJobsQuery>;
export type CronJobJobsLazyQueryHookResult = ReturnType<typeof useCronJobJobsLazyQuery>;
export type CronJobJobsSuspenseQueryHookResult = ReturnType<typeof useCronJobJobsSuspenseQuery>;
export type CronJobJobsQueryResult = Apollo.QueryResult<CronJobJobsQuery, CronJobJobsQueryVariables>;
export const CronJobTriggerDocument = gql`
    mutation CronJobTrigger($name: String!, $namespace: String!) {
  handleTriggerCronJob(name: $name, namespace: $namespace) @rest(type: "Void", path: "/cronjob/{args.namespace}/{args.name}/trigger", method: "PUT", bodyKey: "name")
}
    `;
export type CronJobTriggerMutationFn = Apollo.MutationFunction<CronJobTriggerMutation, CronJobTriggerMutationVariables>;

/**
 * __useCronJobTriggerMutation__
 *
 * To run a mutation, you first call `useCronJobTriggerMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCronJobTriggerMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [cronJobTriggerMutation, { data, loading, error }] = useCronJobTriggerMutation({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *   },
 * });
 */
export function useCronJobTriggerMutation(baseOptions?: Apollo.MutationHookOptions<CronJobTriggerMutation, CronJobTriggerMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CronJobTriggerMutation, CronJobTriggerMutationVariables>(CronJobTriggerDocument, options);
      }
export type CronJobTriggerMutationHookResult = ReturnType<typeof useCronJobTriggerMutation>;
export type CronJobTriggerMutationResult = Apollo.MutationResult<CronJobTriggerMutation>;
export type CronJobTriggerMutationOptions = Apollo.BaseMutationOptions<CronJobTriggerMutation, CronJobTriggerMutationVariables>;
export const DaemonSetsDocument = gql`
    query DaemonSets($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetDaemonSetList(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "daemonset_DaemonSetList", path: "daemonset/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...DaemonSetList
  }
}
    ${DaemonSetListFragmentDoc}`;

/**
 * __useDaemonSetsQuery__
 *
 * To run a query within a React component, call `useDaemonSetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDaemonSetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDaemonSetsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useDaemonSetsQuery(baseOptions: Apollo.QueryHookOptions<DaemonSetsQuery, DaemonSetsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DaemonSetsQuery, DaemonSetsQueryVariables>(DaemonSetsDocument, options);
      }
export function useDaemonSetsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DaemonSetsQuery, DaemonSetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DaemonSetsQuery, DaemonSetsQueryVariables>(DaemonSetsDocument, options);
        }
export function useDaemonSetsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<DaemonSetsQuery, DaemonSetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<DaemonSetsQuery, DaemonSetsQueryVariables>(DaemonSetsDocument, options);
        }
export type DaemonSetsQueryHookResult = ReturnType<typeof useDaemonSetsQuery>;
export type DaemonSetsLazyQueryHookResult = ReturnType<typeof useDaemonSetsLazyQuery>;
export type DaemonSetsSuspenseQueryHookResult = ReturnType<typeof useDaemonSetsSuspenseQuery>;
export type DaemonSetsQueryResult = Apollo.QueryResult<DaemonSetsQuery, DaemonSetsQueryVariables>;
export const DaemonSetDocument = gql`
    query DaemonSet($namespace: String!, $name: String!) {
  handleGetDaemonSetDetail(namespace: $namespace, daemonSet: $name) @rest(type: "daemonset_DaemonSetDetail", path: "daemonset/{args.namespace}/{args.daemonSet}") {
    ...DaemonSetDetail
  }
}
    ${DaemonSetDetailFragmentDoc}`;

/**
 * __useDaemonSetQuery__
 *
 * To run a query within a React component, call `useDaemonSetQuery` and pass it any options that fit your needs.
 * When your component renders, `useDaemonSetQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDaemonSetQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useDaemonSetQuery(baseOptions: Apollo.QueryHookOptions<DaemonSetQuery, DaemonSetQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DaemonSetQuery, DaemonSetQueryVariables>(DaemonSetDocument, options);
      }
export function useDaemonSetLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DaemonSetQuery, DaemonSetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DaemonSetQuery, DaemonSetQueryVariables>(DaemonSetDocument, options);
        }
export function useDaemonSetSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<DaemonSetQuery, DaemonSetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<DaemonSetQuery, DaemonSetQueryVariables>(DaemonSetDocument, options);
        }
export type DaemonSetQueryHookResult = ReturnType<typeof useDaemonSetQuery>;
export type DaemonSetLazyQueryHookResult = ReturnType<typeof useDaemonSetLazyQuery>;
export type DaemonSetSuspenseQueryHookResult = ReturnType<typeof useDaemonSetSuspenseQuery>;
export type DaemonSetQueryResult = Apollo.QueryResult<DaemonSetQuery, DaemonSetQueryVariables>;
export const DaemonSetEventsDocument = gql`
    query DaemonSetEvents($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetDaemonSetEvents(
    namespace: $namespace
    daemonSet: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "common_EventList", path: "daemonset/{args.namespace}/{args.daemonSet}/event?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...EventList
  }
}
    ${EventListFragmentDoc}`;

/**
 * __useDaemonSetEventsQuery__
 *
 * To run a query within a React component, call `useDaemonSetEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDaemonSetEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDaemonSetEventsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useDaemonSetEventsQuery(baseOptions: Apollo.QueryHookOptions<DaemonSetEventsQuery, DaemonSetEventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DaemonSetEventsQuery, DaemonSetEventsQueryVariables>(DaemonSetEventsDocument, options);
      }
export function useDaemonSetEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DaemonSetEventsQuery, DaemonSetEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DaemonSetEventsQuery, DaemonSetEventsQueryVariables>(DaemonSetEventsDocument, options);
        }
export function useDaemonSetEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<DaemonSetEventsQuery, DaemonSetEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<DaemonSetEventsQuery, DaemonSetEventsQueryVariables>(DaemonSetEventsDocument, options);
        }
export type DaemonSetEventsQueryHookResult = ReturnType<typeof useDaemonSetEventsQuery>;
export type DaemonSetEventsLazyQueryHookResult = ReturnType<typeof useDaemonSetEventsLazyQuery>;
export type DaemonSetEventsSuspenseQueryHookResult = ReturnType<typeof useDaemonSetEventsSuspenseQuery>;
export type DaemonSetEventsQueryResult = Apollo.QueryResult<DaemonSetEventsQuery, DaemonSetEventsQueryVariables>;
export const DaemonSetPodsDocument = gql`
    query DaemonSetPods($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetDaemonSetPods(
    namespace: $namespace
    daemonSet: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "pod_PodList", path: "daemonset/{args.namespace}/{args.daemonSet}/pod?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...PodList
  }
}
    ${PodListFragmentDoc}`;

/**
 * __useDaemonSetPodsQuery__
 *
 * To run a query within a React component, call `useDaemonSetPodsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDaemonSetPodsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDaemonSetPodsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useDaemonSetPodsQuery(baseOptions: Apollo.QueryHookOptions<DaemonSetPodsQuery, DaemonSetPodsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DaemonSetPodsQuery, DaemonSetPodsQueryVariables>(DaemonSetPodsDocument, options);
      }
export function useDaemonSetPodsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DaemonSetPodsQuery, DaemonSetPodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DaemonSetPodsQuery, DaemonSetPodsQueryVariables>(DaemonSetPodsDocument, options);
        }
export function useDaemonSetPodsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<DaemonSetPodsQuery, DaemonSetPodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<DaemonSetPodsQuery, DaemonSetPodsQueryVariables>(DaemonSetPodsDocument, options);
        }
export type DaemonSetPodsQueryHookResult = ReturnType<typeof useDaemonSetPodsQuery>;
export type DaemonSetPodsLazyQueryHookResult = ReturnType<typeof useDaemonSetPodsLazyQuery>;
export type DaemonSetPodsSuspenseQueryHookResult = ReturnType<typeof useDaemonSetPodsSuspenseQuery>;
export type DaemonSetPodsQueryResult = Apollo.QueryResult<DaemonSetPodsQuery, DaemonSetPodsQueryVariables>;
export const DaemonSetServicesDocument = gql`
    query DaemonSetServices($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetDaemonSetServices(
    namespace: $namespace
    daemonSet: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "service_ServiceList", path: "daemonset/{args.namespace}/{args.daemonSet}/service?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...ServiceList
  }
}
    ${ServiceListFragmentDoc}`;

/**
 * __useDaemonSetServicesQuery__
 *
 * To run a query within a React component, call `useDaemonSetServicesQuery` and pass it any options that fit your needs.
 * When your component renders, `useDaemonSetServicesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDaemonSetServicesQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useDaemonSetServicesQuery(baseOptions: Apollo.QueryHookOptions<DaemonSetServicesQuery, DaemonSetServicesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DaemonSetServicesQuery, DaemonSetServicesQueryVariables>(DaemonSetServicesDocument, options);
      }
export function useDaemonSetServicesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DaemonSetServicesQuery, DaemonSetServicesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DaemonSetServicesQuery, DaemonSetServicesQueryVariables>(DaemonSetServicesDocument, options);
        }
export function useDaemonSetServicesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<DaemonSetServicesQuery, DaemonSetServicesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<DaemonSetServicesQuery, DaemonSetServicesQueryVariables>(DaemonSetServicesDocument, options);
        }
export type DaemonSetServicesQueryHookResult = ReturnType<typeof useDaemonSetServicesQuery>;
export type DaemonSetServicesLazyQueryHookResult = ReturnType<typeof useDaemonSetServicesLazyQuery>;
export type DaemonSetServicesSuspenseQueryHookResult = ReturnType<typeof useDaemonSetServicesSuspenseQuery>;
export type DaemonSetServicesQueryResult = Apollo.QueryResult<DaemonSetServicesQuery, DaemonSetServicesQueryVariables>;
export const DeploymentsDocument = gql`
    query Deployments($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetDeployments(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "deployment_DeploymentList", path: "deployment/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...DeploymentList
  }
}
    ${DeploymentListFragmentDoc}`;

/**
 * __useDeploymentsQuery__
 *
 * To run a query within a React component, call `useDeploymentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDeploymentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDeploymentsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useDeploymentsQuery(baseOptions: Apollo.QueryHookOptions<DeploymentsQuery, DeploymentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DeploymentsQuery, DeploymentsQueryVariables>(DeploymentsDocument, options);
      }
export function useDeploymentsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DeploymentsQuery, DeploymentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DeploymentsQuery, DeploymentsQueryVariables>(DeploymentsDocument, options);
        }
export function useDeploymentsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<DeploymentsQuery, DeploymentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<DeploymentsQuery, DeploymentsQueryVariables>(DeploymentsDocument, options);
        }
export type DeploymentsQueryHookResult = ReturnType<typeof useDeploymentsQuery>;
export type DeploymentsLazyQueryHookResult = ReturnType<typeof useDeploymentsLazyQuery>;
export type DeploymentsSuspenseQueryHookResult = ReturnType<typeof useDeploymentsSuspenseQuery>;
export type DeploymentsQueryResult = Apollo.QueryResult<DeploymentsQuery, DeploymentsQueryVariables>;
export const DeploymentDocument = gql`
    query Deployment($namespace: String!, $name: String!) {
  handleGetDeploymentDetail(namespace: $namespace, deployment: $name) @rest(type: "deployment_DeploymentDetail", path: "deployment/{args.namespace}/{args.deployment}") {
    ...DeploymentDetail
  }
}
    ${DeploymentDetailFragmentDoc}`;

/**
 * __useDeploymentQuery__
 *
 * To run a query within a React component, call `useDeploymentQuery` and pass it any options that fit your needs.
 * When your component renders, `useDeploymentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDeploymentQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useDeploymentQuery(baseOptions: Apollo.QueryHookOptions<DeploymentQuery, DeploymentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DeploymentQuery, DeploymentQueryVariables>(DeploymentDocument, options);
      }
export function useDeploymentLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DeploymentQuery, DeploymentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DeploymentQuery, DeploymentQueryVariables>(DeploymentDocument, options);
        }
export function useDeploymentSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<DeploymentQuery, DeploymentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<DeploymentQuery, DeploymentQueryVariables>(DeploymentDocument, options);
        }
export type DeploymentQueryHookResult = ReturnType<typeof useDeploymentQuery>;
export type DeploymentLazyQueryHookResult = ReturnType<typeof useDeploymentLazyQuery>;
export type DeploymentSuspenseQueryHookResult = ReturnType<typeof useDeploymentSuspenseQuery>;
export type DeploymentQueryResult = Apollo.QueryResult<DeploymentQuery, DeploymentQueryVariables>;
export const DeploymentEventsDocument = gql`
    query DeploymentEvents($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetDeploymentEvents(
    namespace: $namespace
    deployment: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "common_EventList", path: "deployment/{args.namespace}/{args.deployment}/event?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...EventList
  }
}
    ${EventListFragmentDoc}`;

/**
 * __useDeploymentEventsQuery__
 *
 * To run a query within a React component, call `useDeploymentEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDeploymentEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDeploymentEventsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useDeploymentEventsQuery(baseOptions: Apollo.QueryHookOptions<DeploymentEventsQuery, DeploymentEventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DeploymentEventsQuery, DeploymentEventsQueryVariables>(DeploymentEventsDocument, options);
      }
export function useDeploymentEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DeploymentEventsQuery, DeploymentEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DeploymentEventsQuery, DeploymentEventsQueryVariables>(DeploymentEventsDocument, options);
        }
export function useDeploymentEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<DeploymentEventsQuery, DeploymentEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<DeploymentEventsQuery, DeploymentEventsQueryVariables>(DeploymentEventsDocument, options);
        }
export type DeploymentEventsQueryHookResult = ReturnType<typeof useDeploymentEventsQuery>;
export type DeploymentEventsLazyQueryHookResult = ReturnType<typeof useDeploymentEventsLazyQuery>;
export type DeploymentEventsSuspenseQueryHookResult = ReturnType<typeof useDeploymentEventsSuspenseQuery>;
export type DeploymentEventsQueryResult = Apollo.QueryResult<DeploymentEventsQuery, DeploymentEventsQueryVariables>;
export const DeploymentNewReplicaSetDocument = gql`
    query DeploymentNewReplicaSet($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetDeploymentNewReplicaSet(
    namespace: $namespace
    deployment: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "replicaset_ReplicaSet", path: "deployment/{args.namespace}/{args.deployment}/newreplicaset?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...ReplicaSet
  }
}
    ${ReplicaSetFragmentDoc}`;

/**
 * __useDeploymentNewReplicaSetQuery__
 *
 * To run a query within a React component, call `useDeploymentNewReplicaSetQuery` and pass it any options that fit your needs.
 * When your component renders, `useDeploymentNewReplicaSetQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDeploymentNewReplicaSetQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useDeploymentNewReplicaSetQuery(baseOptions: Apollo.QueryHookOptions<DeploymentNewReplicaSetQuery, DeploymentNewReplicaSetQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DeploymentNewReplicaSetQuery, DeploymentNewReplicaSetQueryVariables>(DeploymentNewReplicaSetDocument, options);
      }
export function useDeploymentNewReplicaSetLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DeploymentNewReplicaSetQuery, DeploymentNewReplicaSetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DeploymentNewReplicaSetQuery, DeploymentNewReplicaSetQueryVariables>(DeploymentNewReplicaSetDocument, options);
        }
export function useDeploymentNewReplicaSetSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<DeploymentNewReplicaSetQuery, DeploymentNewReplicaSetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<DeploymentNewReplicaSetQuery, DeploymentNewReplicaSetQueryVariables>(DeploymentNewReplicaSetDocument, options);
        }
export type DeploymentNewReplicaSetQueryHookResult = ReturnType<typeof useDeploymentNewReplicaSetQuery>;
export type DeploymentNewReplicaSetLazyQueryHookResult = ReturnType<typeof useDeploymentNewReplicaSetLazyQuery>;
export type DeploymentNewReplicaSetSuspenseQueryHookResult = ReturnType<typeof useDeploymentNewReplicaSetSuspenseQuery>;
export type DeploymentNewReplicaSetQueryResult = Apollo.QueryResult<DeploymentNewReplicaSetQuery, DeploymentNewReplicaSetQueryVariables>;
export const DeploymentOldReplicaSetsDocument = gql`
    query DeploymentOldReplicaSets($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetDeploymentOldReplicaSets(
    namespace: $namespace
    deployment: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "replicaset_ReplicaSetList", path: "deployment/{args.namespace}/{args.deployment}/oldreplicaset?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...ReplicaSetList
  }
}
    ${ReplicaSetListFragmentDoc}`;

/**
 * __useDeploymentOldReplicaSetsQuery__
 *
 * To run a query within a React component, call `useDeploymentOldReplicaSetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDeploymentOldReplicaSetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDeploymentOldReplicaSetsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useDeploymentOldReplicaSetsQuery(baseOptions: Apollo.QueryHookOptions<DeploymentOldReplicaSetsQuery, DeploymentOldReplicaSetsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DeploymentOldReplicaSetsQuery, DeploymentOldReplicaSetsQueryVariables>(DeploymentOldReplicaSetsDocument, options);
      }
export function useDeploymentOldReplicaSetsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DeploymentOldReplicaSetsQuery, DeploymentOldReplicaSetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DeploymentOldReplicaSetsQuery, DeploymentOldReplicaSetsQueryVariables>(DeploymentOldReplicaSetsDocument, options);
        }
export function useDeploymentOldReplicaSetsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<DeploymentOldReplicaSetsQuery, DeploymentOldReplicaSetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<DeploymentOldReplicaSetsQuery, DeploymentOldReplicaSetsQueryVariables>(DeploymentOldReplicaSetsDocument, options);
        }
export type DeploymentOldReplicaSetsQueryHookResult = ReturnType<typeof useDeploymentOldReplicaSetsQuery>;
export type DeploymentOldReplicaSetsLazyQueryHookResult = ReturnType<typeof useDeploymentOldReplicaSetsLazyQuery>;
export type DeploymentOldReplicaSetsSuspenseQueryHookResult = ReturnType<typeof useDeploymentOldReplicaSetsSuspenseQuery>;
export type DeploymentOldReplicaSetsQueryResult = Apollo.QueryResult<DeploymentOldReplicaSetsQuery, DeploymentOldReplicaSetsQueryVariables>;
export const JobsDocument = gql`
    query Jobs($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetJobList(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "job_JobList", path: "job/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...JobList
  }
}
    ${JobListFragmentDoc}`;

/**
 * __useJobsQuery__
 *
 * To run a query within a React component, call `useJobsQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useJobsQuery(baseOptions: Apollo.QueryHookOptions<JobsQuery, JobsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<JobsQuery, JobsQueryVariables>(JobsDocument, options);
      }
export function useJobsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<JobsQuery, JobsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<JobsQuery, JobsQueryVariables>(JobsDocument, options);
        }
export function useJobsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<JobsQuery, JobsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<JobsQuery, JobsQueryVariables>(JobsDocument, options);
        }
export type JobsQueryHookResult = ReturnType<typeof useJobsQuery>;
export type JobsLazyQueryHookResult = ReturnType<typeof useJobsLazyQuery>;
export type JobsSuspenseQueryHookResult = ReturnType<typeof useJobsSuspenseQuery>;
export type JobsQueryResult = Apollo.QueryResult<JobsQuery, JobsQueryVariables>;
export const JobDocument = gql`
    query Job($namespace: String!, $name: String!) {
  handleGetJobDetail(namespace: $namespace, name: $name) @rest(type: "job_JobDetail", path: "job/{args.namespace}/{args.name}") {
    ...JobDetail
  }
}
    ${JobDetailFragmentDoc}`;

/**
 * __useJobQuery__
 *
 * To run a query within a React component, call `useJobQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useJobQuery(baseOptions: Apollo.QueryHookOptions<JobQuery, JobQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<JobQuery, JobQueryVariables>(JobDocument, options);
      }
export function useJobLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<JobQuery, JobQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<JobQuery, JobQueryVariables>(JobDocument, options);
        }
export function useJobSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<JobQuery, JobQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<JobQuery, JobQueryVariables>(JobDocument, options);
        }
export type JobQueryHookResult = ReturnType<typeof useJobQuery>;
export type JobLazyQueryHookResult = ReturnType<typeof useJobLazyQuery>;
export type JobSuspenseQueryHookResult = ReturnType<typeof useJobSuspenseQuery>;
export type JobQueryResult = Apollo.QueryResult<JobQuery, JobQueryVariables>;
export const JobEventsDocument = gql`
    query JobEvents($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetJobEvents(
    namespace: $namespace
    name: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "common_EventList", path: "job/{args.namespace}/{args.name}/event?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...EventList
  }
}
    ${EventListFragmentDoc}`;

/**
 * __useJobEventsQuery__
 *
 * To run a query within a React component, call `useJobEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobEventsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useJobEventsQuery(baseOptions: Apollo.QueryHookOptions<JobEventsQuery, JobEventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<JobEventsQuery, JobEventsQueryVariables>(JobEventsDocument, options);
      }
export function useJobEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<JobEventsQuery, JobEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<JobEventsQuery, JobEventsQueryVariables>(JobEventsDocument, options);
        }
export function useJobEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<JobEventsQuery, JobEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<JobEventsQuery, JobEventsQueryVariables>(JobEventsDocument, options);
        }
export type JobEventsQueryHookResult = ReturnType<typeof useJobEventsQuery>;
export type JobEventsLazyQueryHookResult = ReturnType<typeof useJobEventsLazyQuery>;
export type JobEventsSuspenseQueryHookResult = ReturnType<typeof useJobEventsSuspenseQuery>;
export type JobEventsQueryResult = Apollo.QueryResult<JobEventsQuery, JobEventsQueryVariables>;
export const JobPodsDocument = gql`
    query JobPods($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetJobPods(
    namespace: $namespace
    name: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "pod_PodList", path: "job/{args.namespace}/{args.name}/pod?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...PodList
  }
}
    ${PodListFragmentDoc}`;

/**
 * __useJobPodsQuery__
 *
 * To run a query within a React component, call `useJobPodsQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobPodsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobPodsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useJobPodsQuery(baseOptions: Apollo.QueryHookOptions<JobPodsQuery, JobPodsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<JobPodsQuery, JobPodsQueryVariables>(JobPodsDocument, options);
      }
export function useJobPodsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<JobPodsQuery, JobPodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<JobPodsQuery, JobPodsQueryVariables>(JobPodsDocument, options);
        }
export function useJobPodsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<JobPodsQuery, JobPodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<JobPodsQuery, JobPodsQueryVariables>(JobPodsDocument, options);
        }
export type JobPodsQueryHookResult = ReturnType<typeof useJobPodsQuery>;
export type JobPodsLazyQueryHookResult = ReturnType<typeof useJobPodsLazyQuery>;
export type JobPodsSuspenseQueryHookResult = ReturnType<typeof useJobPodsSuspenseQuery>;
export type JobPodsQueryResult = Apollo.QueryResult<JobPodsQuery, JobPodsQueryVariables>;
export const PodsDocument = gql`
    query Pods($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetPods(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "pod_PodList", path: "pod/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...PodList
  }
}
    ${PodListFragmentDoc}`;

/**
 * __usePodsQuery__
 *
 * To run a query within a React component, call `usePodsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePodsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePodsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function usePodsQuery(baseOptions: Apollo.QueryHookOptions<PodsQuery, PodsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PodsQuery, PodsQueryVariables>(PodsDocument, options);
      }
export function usePodsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PodsQuery, PodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PodsQuery, PodsQueryVariables>(PodsDocument, options);
        }
export function usePodsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PodsQuery, PodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PodsQuery, PodsQueryVariables>(PodsDocument, options);
        }
export type PodsQueryHookResult = ReturnType<typeof usePodsQuery>;
export type PodsLazyQueryHookResult = ReturnType<typeof usePodsLazyQuery>;
export type PodsSuspenseQueryHookResult = ReturnType<typeof usePodsSuspenseQuery>;
export type PodsQueryResult = Apollo.QueryResult<PodsQuery, PodsQueryVariables>;
export const PodDocument = gql`
    query Pod($name: String!, $namespace: String!) {
  handleGetPodDetail(namespace: $namespace, pod: $name) @rest(path: "pod/{args.namespace}/{args.pod}") {
    typeMeta @type(name: "types_TypeMeta") {
      ...TypeMeta
    }
    objectMeta @type(name: "types_ObjectMeta") {
      ...ObjectMeta
    }
    nodeName
    restartCount
    serviceAccountName
    podIP
    podPhase
    qosClass
    conditions @type(name: "common_Condition") {
      ...Condition
    }
    containers @type(name: "pod_Container") {
      ...Container
    }
    initContainers @type(name: "pod_Container") {
      ...Container
    }
    imagePullSecrets {
      name
    }
    persistentVolumeClaimList @type(name: "persistentvolumeclaim_PersistentVolumeClaimList") {
      ...PersistentVolumeClaimList
    }
    controller @type(name: "controller_ResourceOwner") {
      ...ResourceOwner
    }
    securityContext @type(name: "v1_PodSecurityContext") {
      ...PodSecurityContext
    }
  }
}
    ${TypeMetaFragmentDoc}
${ObjectMetaFragmentDoc}
${ConditionFragmentDoc}
${ContainerFragmentDoc}
${PersistentVolumeClaimListFragmentDoc}
${ResourceOwnerFragmentDoc}
${PodSecurityContextFragmentDoc}`;

/**
 * __usePodQuery__
 *
 * To run a query within a React component, call `usePodQuery` and pass it any options that fit your needs.
 * When your component renders, `usePodQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePodQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *   },
 * });
 */
export function usePodQuery(baseOptions: Apollo.QueryHookOptions<PodQuery, PodQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PodQuery, PodQueryVariables>(PodDocument, options);
      }
export function usePodLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PodQuery, PodQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PodQuery, PodQueryVariables>(PodDocument, options);
        }
export function usePodSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PodQuery, PodQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PodQuery, PodQueryVariables>(PodDocument, options);
        }
export type PodQueryHookResult = ReturnType<typeof usePodQuery>;
export type PodLazyQueryHookResult = ReturnType<typeof usePodLazyQuery>;
export type PodSuspenseQueryHookResult = ReturnType<typeof usePodSuspenseQuery>;
export type PodQueryResult = Apollo.QueryResult<PodQuery, PodQueryVariables>;
export const PodEventsDocument = gql`
    query PodEvents($name: String!, $namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetPodEvents(
    pod: $name
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "common_EventList", path: "pod/{args.namespace}/{args.pod}/event?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...EventList
  }
}
    ${EventListFragmentDoc}`;

/**
 * __usePodEventsQuery__
 *
 * To run a query within a React component, call `usePodEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePodEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePodEventsQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function usePodEventsQuery(baseOptions: Apollo.QueryHookOptions<PodEventsQuery, PodEventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PodEventsQuery, PodEventsQueryVariables>(PodEventsDocument, options);
      }
export function usePodEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PodEventsQuery, PodEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PodEventsQuery, PodEventsQueryVariables>(PodEventsDocument, options);
        }
export function usePodEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PodEventsQuery, PodEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PodEventsQuery, PodEventsQueryVariables>(PodEventsDocument, options);
        }
export type PodEventsQueryHookResult = ReturnType<typeof usePodEventsQuery>;
export type PodEventsLazyQueryHookResult = ReturnType<typeof usePodEventsLazyQuery>;
export type PodEventsSuspenseQueryHookResult = ReturnType<typeof usePodEventsSuspenseQuery>;
export type PodEventsQueryResult = Apollo.QueryResult<PodEventsQuery, PodEventsQueryVariables>;
export const PodLogsDocument = gql`
    query PodLogs($name: String!, $namespace: String!, $container: String!, $itemsPerPage: String, $page: String) {
  handleLogs(
    pod: $name
    namespace: $namespace
    container: $container
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(path: "log/{args.namespace}/{args.pod}/{args.container}?itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...LogDetails
  }
}
    ${LogDetailsFragmentDoc}`;

/**
 * __usePodLogsQuery__
 *
 * To run a query within a React component, call `usePodLogsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePodLogsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePodLogsQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      container: // value for 'container'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function usePodLogsQuery(baseOptions: Apollo.QueryHookOptions<PodLogsQuery, PodLogsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PodLogsQuery, PodLogsQueryVariables>(PodLogsDocument, options);
      }
export function usePodLogsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PodLogsQuery, PodLogsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PodLogsQuery, PodLogsQueryVariables>(PodLogsDocument, options);
        }
export function usePodLogsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PodLogsQuery, PodLogsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PodLogsQuery, PodLogsQueryVariables>(PodLogsDocument, options);
        }
export type PodLogsQueryHookResult = ReturnType<typeof usePodLogsQuery>;
export type PodLogsLazyQueryHookResult = ReturnType<typeof usePodLogsLazyQuery>;
export type PodLogsSuspenseQueryHookResult = ReturnType<typeof usePodLogsSuspenseQuery>;
export type PodLogsQueryResult = Apollo.QueryResult<PodLogsQuery, PodLogsQueryVariables>;
export const ReplicaSetsDocument = gql`
    query ReplicaSets($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetReplicaSets(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "replicaset_ReplicaSetList", path: "replicaset/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...ReplicaSetList
  }
}
    ${ReplicaSetListFragmentDoc}`;

/**
 * __useReplicaSetsQuery__
 *
 * To run a query within a React component, call `useReplicaSetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useReplicaSetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReplicaSetsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useReplicaSetsQuery(baseOptions: Apollo.QueryHookOptions<ReplicaSetsQuery, ReplicaSetsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReplicaSetsQuery, ReplicaSetsQueryVariables>(ReplicaSetsDocument, options);
      }
export function useReplicaSetsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReplicaSetsQuery, ReplicaSetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReplicaSetsQuery, ReplicaSetsQueryVariables>(ReplicaSetsDocument, options);
        }
export function useReplicaSetsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ReplicaSetsQuery, ReplicaSetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ReplicaSetsQuery, ReplicaSetsQueryVariables>(ReplicaSetsDocument, options);
        }
export type ReplicaSetsQueryHookResult = ReturnType<typeof useReplicaSetsQuery>;
export type ReplicaSetsLazyQueryHookResult = ReturnType<typeof useReplicaSetsLazyQuery>;
export type ReplicaSetsSuspenseQueryHookResult = ReturnType<typeof useReplicaSetsSuspenseQuery>;
export type ReplicaSetsQueryResult = Apollo.QueryResult<ReplicaSetsQuery, ReplicaSetsQueryVariables>;
export const ReplicaSetDocument = gql`
    query ReplicaSet($namespace: String!, $name: String!) {
  handleGetReplicaSetDetail(namespace: $namespace, replicaSet: $name) @rest(type: "replicaset_ReplicaSetDetail", path: "replicaset/{args.namespace}/{args.replicaSet}") {
    ...ReplicaSetDetail
  }
}
    ${ReplicaSetDetailFragmentDoc}`;

/**
 * __useReplicaSetQuery__
 *
 * To run a query within a React component, call `useReplicaSetQuery` and pass it any options that fit your needs.
 * When your component renders, `useReplicaSetQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReplicaSetQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useReplicaSetQuery(baseOptions: Apollo.QueryHookOptions<ReplicaSetQuery, ReplicaSetQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReplicaSetQuery, ReplicaSetQueryVariables>(ReplicaSetDocument, options);
      }
export function useReplicaSetLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReplicaSetQuery, ReplicaSetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReplicaSetQuery, ReplicaSetQueryVariables>(ReplicaSetDocument, options);
        }
export function useReplicaSetSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ReplicaSetQuery, ReplicaSetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ReplicaSetQuery, ReplicaSetQueryVariables>(ReplicaSetDocument, options);
        }
export type ReplicaSetQueryHookResult = ReturnType<typeof useReplicaSetQuery>;
export type ReplicaSetLazyQueryHookResult = ReturnType<typeof useReplicaSetLazyQuery>;
export type ReplicaSetSuspenseQueryHookResult = ReturnType<typeof useReplicaSetSuspenseQuery>;
export type ReplicaSetQueryResult = Apollo.QueryResult<ReplicaSetQuery, ReplicaSetQueryVariables>;
export const ReplicaSetEventsDocument = gql`
    query ReplicaSetEvents($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetReplicaSetEvents(
    namespace: $namespace
    replicaSet: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "common_EventList", path: "replicaset/{args.namespace}/{args.replicaSet}/event?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...EventList
  }
}
    ${EventListFragmentDoc}`;

/**
 * __useReplicaSetEventsQuery__
 *
 * To run a query within a React component, call `useReplicaSetEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useReplicaSetEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReplicaSetEventsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useReplicaSetEventsQuery(baseOptions: Apollo.QueryHookOptions<ReplicaSetEventsQuery, ReplicaSetEventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReplicaSetEventsQuery, ReplicaSetEventsQueryVariables>(ReplicaSetEventsDocument, options);
      }
export function useReplicaSetEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReplicaSetEventsQuery, ReplicaSetEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReplicaSetEventsQuery, ReplicaSetEventsQueryVariables>(ReplicaSetEventsDocument, options);
        }
export function useReplicaSetEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ReplicaSetEventsQuery, ReplicaSetEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ReplicaSetEventsQuery, ReplicaSetEventsQueryVariables>(ReplicaSetEventsDocument, options);
        }
export type ReplicaSetEventsQueryHookResult = ReturnType<typeof useReplicaSetEventsQuery>;
export type ReplicaSetEventsLazyQueryHookResult = ReturnType<typeof useReplicaSetEventsLazyQuery>;
export type ReplicaSetEventsSuspenseQueryHookResult = ReturnType<typeof useReplicaSetEventsSuspenseQuery>;
export type ReplicaSetEventsQueryResult = Apollo.QueryResult<ReplicaSetEventsQuery, ReplicaSetEventsQueryVariables>;
export const ReplicaSetPodsDocument = gql`
    query ReplicaSetPods($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetReplicaSetPods(
    namespace: $namespace
    replicaSet: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "pod_PodList", path: "replicaset/{args.namespace}/{args.replicaSet}/pod?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...PodList
  }
}
    ${PodListFragmentDoc}`;

/**
 * __useReplicaSetPodsQuery__
 *
 * To run a query within a React component, call `useReplicaSetPodsQuery` and pass it any options that fit your needs.
 * When your component renders, `useReplicaSetPodsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReplicaSetPodsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useReplicaSetPodsQuery(baseOptions: Apollo.QueryHookOptions<ReplicaSetPodsQuery, ReplicaSetPodsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReplicaSetPodsQuery, ReplicaSetPodsQueryVariables>(ReplicaSetPodsDocument, options);
      }
export function useReplicaSetPodsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReplicaSetPodsQuery, ReplicaSetPodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReplicaSetPodsQuery, ReplicaSetPodsQueryVariables>(ReplicaSetPodsDocument, options);
        }
export function useReplicaSetPodsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ReplicaSetPodsQuery, ReplicaSetPodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ReplicaSetPodsQuery, ReplicaSetPodsQueryVariables>(ReplicaSetPodsDocument, options);
        }
export type ReplicaSetPodsQueryHookResult = ReturnType<typeof useReplicaSetPodsQuery>;
export type ReplicaSetPodsLazyQueryHookResult = ReturnType<typeof useReplicaSetPodsLazyQuery>;
export type ReplicaSetPodsSuspenseQueryHookResult = ReturnType<typeof useReplicaSetPodsSuspenseQuery>;
export type ReplicaSetPodsQueryResult = Apollo.QueryResult<ReplicaSetPodsQuery, ReplicaSetPodsQueryVariables>;
export const ReplicaSetServicesDocument = gql`
    query ReplicaSetServices($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetReplicaSetServices(
    namespace: $namespace
    replicaSet: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "service_ServiceList", path: "replicaset/{args.namespace}/{args.replicaSet}/service?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...ServiceList
  }
}
    ${ServiceListFragmentDoc}`;

/**
 * __useReplicaSetServicesQuery__
 *
 * To run a query within a React component, call `useReplicaSetServicesQuery` and pass it any options that fit your needs.
 * When your component renders, `useReplicaSetServicesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReplicaSetServicesQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useReplicaSetServicesQuery(baseOptions: Apollo.QueryHookOptions<ReplicaSetServicesQuery, ReplicaSetServicesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReplicaSetServicesQuery, ReplicaSetServicesQueryVariables>(ReplicaSetServicesDocument, options);
      }
export function useReplicaSetServicesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReplicaSetServicesQuery, ReplicaSetServicesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReplicaSetServicesQuery, ReplicaSetServicesQueryVariables>(ReplicaSetServicesDocument, options);
        }
export function useReplicaSetServicesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ReplicaSetServicesQuery, ReplicaSetServicesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ReplicaSetServicesQuery, ReplicaSetServicesQueryVariables>(ReplicaSetServicesDocument, options);
        }
export type ReplicaSetServicesQueryHookResult = ReturnType<typeof useReplicaSetServicesQuery>;
export type ReplicaSetServicesLazyQueryHookResult = ReturnType<typeof useReplicaSetServicesLazyQuery>;
export type ReplicaSetServicesSuspenseQueryHookResult = ReturnType<typeof useReplicaSetServicesSuspenseQuery>;
export type ReplicaSetServicesQueryResult = Apollo.QueryResult<ReplicaSetServicesQuery, ReplicaSetServicesQueryVariables>;
export const ReplicationControllersDocument = gql`
    query ReplicationControllers($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetReplicationControllerList(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "replicationcontroller_ReplicationControllerList", path: "replicationcontroller/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...ReplicationControllerList
  }
}
    ${ReplicationControllerListFragmentDoc}`;

/**
 * __useReplicationControllersQuery__
 *
 * To run a query within a React component, call `useReplicationControllersQuery` and pass it any options that fit your needs.
 * When your component renders, `useReplicationControllersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReplicationControllersQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useReplicationControllersQuery(baseOptions: Apollo.QueryHookOptions<ReplicationControllersQuery, ReplicationControllersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReplicationControllersQuery, ReplicationControllersQueryVariables>(ReplicationControllersDocument, options);
      }
export function useReplicationControllersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReplicationControllersQuery, ReplicationControllersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReplicationControllersQuery, ReplicationControllersQueryVariables>(ReplicationControllersDocument, options);
        }
export function useReplicationControllersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ReplicationControllersQuery, ReplicationControllersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ReplicationControllersQuery, ReplicationControllersQueryVariables>(ReplicationControllersDocument, options);
        }
export type ReplicationControllersQueryHookResult = ReturnType<typeof useReplicationControllersQuery>;
export type ReplicationControllersLazyQueryHookResult = ReturnType<typeof useReplicationControllersLazyQuery>;
export type ReplicationControllersSuspenseQueryHookResult = ReturnType<typeof useReplicationControllersSuspenseQuery>;
export type ReplicationControllersQueryResult = Apollo.QueryResult<ReplicationControllersQuery, ReplicationControllersQueryVariables>;
export const ReplicationControllerDocument = gql`
    query ReplicationController($namespace: String!, $name: String!) {
  handleGetReplicationControllerDetail(
    namespace: $namespace
    replicationController: $name
  ) @rest(type: "replicationcontroller_ReplicationControllerDetail", path: "replicationcontroller/{args.namespace}/{args.replicationController}") {
    ...ReplicationControllerDetail
  }
}
    ${ReplicationControllerDetailFragmentDoc}`;

/**
 * __useReplicationControllerQuery__
 *
 * To run a query within a React component, call `useReplicationControllerQuery` and pass it any options that fit your needs.
 * When your component renders, `useReplicationControllerQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReplicationControllerQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useReplicationControllerQuery(baseOptions: Apollo.QueryHookOptions<ReplicationControllerQuery, ReplicationControllerQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReplicationControllerQuery, ReplicationControllerQueryVariables>(ReplicationControllerDocument, options);
      }
export function useReplicationControllerLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReplicationControllerQuery, ReplicationControllerQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReplicationControllerQuery, ReplicationControllerQueryVariables>(ReplicationControllerDocument, options);
        }
export function useReplicationControllerSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ReplicationControllerQuery, ReplicationControllerQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ReplicationControllerQuery, ReplicationControllerQueryVariables>(ReplicationControllerDocument, options);
        }
export type ReplicationControllerQueryHookResult = ReturnType<typeof useReplicationControllerQuery>;
export type ReplicationControllerLazyQueryHookResult = ReturnType<typeof useReplicationControllerLazyQuery>;
export type ReplicationControllerSuspenseQueryHookResult = ReturnType<typeof useReplicationControllerSuspenseQuery>;
export type ReplicationControllerQueryResult = Apollo.QueryResult<ReplicationControllerQuery, ReplicationControllerQueryVariables>;
export const ReplicationControllerEventsDocument = gql`
    query ReplicationControllerEvents($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetReplicationControllerEvents(
    namespace: $namespace
    replicationController: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "common_EventList", path: "replicationcontroller/{args.namespace}/{args.replicationController}/event?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...EventList
  }
}
    ${EventListFragmentDoc}`;

/**
 * __useReplicationControllerEventsQuery__
 *
 * To run a query within a React component, call `useReplicationControllerEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useReplicationControllerEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReplicationControllerEventsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useReplicationControllerEventsQuery(baseOptions: Apollo.QueryHookOptions<ReplicationControllerEventsQuery, ReplicationControllerEventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReplicationControllerEventsQuery, ReplicationControllerEventsQueryVariables>(ReplicationControllerEventsDocument, options);
      }
export function useReplicationControllerEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReplicationControllerEventsQuery, ReplicationControllerEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReplicationControllerEventsQuery, ReplicationControllerEventsQueryVariables>(ReplicationControllerEventsDocument, options);
        }
export function useReplicationControllerEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ReplicationControllerEventsQuery, ReplicationControllerEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ReplicationControllerEventsQuery, ReplicationControllerEventsQueryVariables>(ReplicationControllerEventsDocument, options);
        }
export type ReplicationControllerEventsQueryHookResult = ReturnType<typeof useReplicationControllerEventsQuery>;
export type ReplicationControllerEventsLazyQueryHookResult = ReturnType<typeof useReplicationControllerEventsLazyQuery>;
export type ReplicationControllerEventsSuspenseQueryHookResult = ReturnType<typeof useReplicationControllerEventsSuspenseQuery>;
export type ReplicationControllerEventsQueryResult = Apollo.QueryResult<ReplicationControllerEventsQuery, ReplicationControllerEventsQueryVariables>;
export const ReplicationControllerPodsDocument = gql`
    query ReplicationControllerPods($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetReplicationControllerPods(
    namespace: $namespace
    replicationController: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "pod_PodList", path: "replicationcontroller/{args.namespace}/{args.replicationController}/pod?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...PodList
  }
}
    ${PodListFragmentDoc}`;

/**
 * __useReplicationControllerPodsQuery__
 *
 * To run a query within a React component, call `useReplicationControllerPodsQuery` and pass it any options that fit your needs.
 * When your component renders, `useReplicationControllerPodsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReplicationControllerPodsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useReplicationControllerPodsQuery(baseOptions: Apollo.QueryHookOptions<ReplicationControllerPodsQuery, ReplicationControllerPodsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReplicationControllerPodsQuery, ReplicationControllerPodsQueryVariables>(ReplicationControllerPodsDocument, options);
      }
export function useReplicationControllerPodsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReplicationControllerPodsQuery, ReplicationControllerPodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReplicationControllerPodsQuery, ReplicationControllerPodsQueryVariables>(ReplicationControllerPodsDocument, options);
        }
export function useReplicationControllerPodsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ReplicationControllerPodsQuery, ReplicationControllerPodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ReplicationControllerPodsQuery, ReplicationControllerPodsQueryVariables>(ReplicationControllerPodsDocument, options);
        }
export type ReplicationControllerPodsQueryHookResult = ReturnType<typeof useReplicationControllerPodsQuery>;
export type ReplicationControllerPodsLazyQueryHookResult = ReturnType<typeof useReplicationControllerPodsLazyQuery>;
export type ReplicationControllerPodsSuspenseQueryHookResult = ReturnType<typeof useReplicationControllerPodsSuspenseQuery>;
export type ReplicationControllerPodsQueryResult = Apollo.QueryResult<ReplicationControllerPodsQuery, ReplicationControllerPodsQueryVariables>;
export const ReplicationControllerServicesDocument = gql`
    query ReplicationControllerServices($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetReplicationControllerServices(
    namespace: $namespace
    replicationController: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "service_ServiceList", path: "replicationcontroller/{args.namespace}/{args.replicationController}/service?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...ServiceList
  }
}
    ${ServiceListFragmentDoc}`;

/**
 * __useReplicationControllerServicesQuery__
 *
 * To run a query within a React component, call `useReplicationControllerServicesQuery` and pass it any options that fit your needs.
 * When your component renders, `useReplicationControllerServicesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReplicationControllerServicesQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useReplicationControllerServicesQuery(baseOptions: Apollo.QueryHookOptions<ReplicationControllerServicesQuery, ReplicationControllerServicesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReplicationControllerServicesQuery, ReplicationControllerServicesQueryVariables>(ReplicationControllerServicesDocument, options);
      }
export function useReplicationControllerServicesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReplicationControllerServicesQuery, ReplicationControllerServicesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReplicationControllerServicesQuery, ReplicationControllerServicesQueryVariables>(ReplicationControllerServicesDocument, options);
        }
export function useReplicationControllerServicesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ReplicationControllerServicesQuery, ReplicationControllerServicesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ReplicationControllerServicesQuery, ReplicationControllerServicesQueryVariables>(ReplicationControllerServicesDocument, options);
        }
export type ReplicationControllerServicesQueryHookResult = ReturnType<typeof useReplicationControllerServicesQuery>;
export type ReplicationControllerServicesLazyQueryHookResult = ReturnType<typeof useReplicationControllerServicesLazyQuery>;
export type ReplicationControllerServicesSuspenseQueryHookResult = ReturnType<typeof useReplicationControllerServicesSuspenseQuery>;
export type ReplicationControllerServicesQueryResult = Apollo.QueryResult<ReplicationControllerServicesQuery, ReplicationControllerServicesQueryVariables>;
export const StatefulSetsDocument = gql`
    query StatefulSets($namespace: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetStatefulSetList(
    namespace: $namespace
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "statefulset_StatefulSetList", path: "statefulset/{args.namespace}?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...StatefulSetList
  }
}
    ${StatefulSetListFragmentDoc}`;

/**
 * __useStatefulSetsQuery__
 *
 * To run a query within a React component, call `useStatefulSetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useStatefulSetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStatefulSetsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useStatefulSetsQuery(baseOptions: Apollo.QueryHookOptions<StatefulSetsQuery, StatefulSetsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<StatefulSetsQuery, StatefulSetsQueryVariables>(StatefulSetsDocument, options);
      }
export function useStatefulSetsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<StatefulSetsQuery, StatefulSetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<StatefulSetsQuery, StatefulSetsQueryVariables>(StatefulSetsDocument, options);
        }
export function useStatefulSetsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<StatefulSetsQuery, StatefulSetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<StatefulSetsQuery, StatefulSetsQueryVariables>(StatefulSetsDocument, options);
        }
export type StatefulSetsQueryHookResult = ReturnType<typeof useStatefulSetsQuery>;
export type StatefulSetsLazyQueryHookResult = ReturnType<typeof useStatefulSetsLazyQuery>;
export type StatefulSetsSuspenseQueryHookResult = ReturnType<typeof useStatefulSetsSuspenseQuery>;
export type StatefulSetsQueryResult = Apollo.QueryResult<StatefulSetsQuery, StatefulSetsQueryVariables>;
export const StatefulSetDocument = gql`
    query StatefulSet($namespace: String!, $name: String!) {
  handleGetStatefulSetDetail(namespace: $namespace, statefulset: $name) @rest(type: "statefulset_StatefulSetDetail", path: "statefulset/{args.namespace}/{args.statefulset}") {
    ...StatefulSetDetail
  }
}
    ${StatefulSetDetailFragmentDoc}`;

/**
 * __useStatefulSetQuery__
 *
 * To run a query within a React component, call `useStatefulSetQuery` and pass it any options that fit your needs.
 * When your component renders, `useStatefulSetQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStatefulSetQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useStatefulSetQuery(baseOptions: Apollo.QueryHookOptions<StatefulSetQuery, StatefulSetQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<StatefulSetQuery, StatefulSetQueryVariables>(StatefulSetDocument, options);
      }
export function useStatefulSetLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<StatefulSetQuery, StatefulSetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<StatefulSetQuery, StatefulSetQueryVariables>(StatefulSetDocument, options);
        }
export function useStatefulSetSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<StatefulSetQuery, StatefulSetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<StatefulSetQuery, StatefulSetQueryVariables>(StatefulSetDocument, options);
        }
export type StatefulSetQueryHookResult = ReturnType<typeof useStatefulSetQuery>;
export type StatefulSetLazyQueryHookResult = ReturnType<typeof useStatefulSetLazyQuery>;
export type StatefulSetSuspenseQueryHookResult = ReturnType<typeof useStatefulSetSuspenseQuery>;
export type StatefulSetQueryResult = Apollo.QueryResult<StatefulSetQuery, StatefulSetQueryVariables>;
export const StatefulSetEventsDocument = gql`
    query StatefulSetEvents($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetStatefulSetEvents(
    namespace: $namespace
    statefulset: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "common_EventList", path: "statefulset/{args.namespace}/{args.statefulset}/event?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...EventList
  }
}
    ${EventListFragmentDoc}`;

/**
 * __useStatefulSetEventsQuery__
 *
 * To run a query within a React component, call `useStatefulSetEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useStatefulSetEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStatefulSetEventsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useStatefulSetEventsQuery(baseOptions: Apollo.QueryHookOptions<StatefulSetEventsQuery, StatefulSetEventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<StatefulSetEventsQuery, StatefulSetEventsQueryVariables>(StatefulSetEventsDocument, options);
      }
export function useStatefulSetEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<StatefulSetEventsQuery, StatefulSetEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<StatefulSetEventsQuery, StatefulSetEventsQueryVariables>(StatefulSetEventsDocument, options);
        }
export function useStatefulSetEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<StatefulSetEventsQuery, StatefulSetEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<StatefulSetEventsQuery, StatefulSetEventsQueryVariables>(StatefulSetEventsDocument, options);
        }
export type StatefulSetEventsQueryHookResult = ReturnType<typeof useStatefulSetEventsQuery>;
export type StatefulSetEventsLazyQueryHookResult = ReturnType<typeof useStatefulSetEventsLazyQuery>;
export type StatefulSetEventsSuspenseQueryHookResult = ReturnType<typeof useStatefulSetEventsSuspenseQuery>;
export type StatefulSetEventsQueryResult = Apollo.QueryResult<StatefulSetEventsQuery, StatefulSetEventsQueryVariables>;
export const StatefulSetPodsDocument = gql`
    query StatefulSetPods($namespace: String!, $name: String!, $filterBy: String, $sortBy: String, $itemsPerPage: String, $page: String) {
  handleGetStatefulSetPods(
    namespace: $namespace
    statefulset: $name
    filterBy: $filterBy
    sortBy: $sortBy
    itemsPerPage: $itemsPerPage
    page: $page
  ) @rest(type: "pod_PodList", path: "statefulset/{args.namespace}/{args.statefulset}/pod?filterBy={args.filterBy}&sortBy={args.sortBy}&itemsPerPage={args.itemsPerPage}&page={args.page}") {
    ...PodList
  }
}
    ${PodListFragmentDoc}`;

/**
 * __useStatefulSetPodsQuery__
 *
 * To run a query within a React component, call `useStatefulSetPodsQuery` and pass it any options that fit your needs.
 * When your component renders, `useStatefulSetPodsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStatefulSetPodsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *      filterBy: // value for 'filterBy'
 *      sortBy: // value for 'sortBy'
 *      itemsPerPage: // value for 'itemsPerPage'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useStatefulSetPodsQuery(baseOptions: Apollo.QueryHookOptions<StatefulSetPodsQuery, StatefulSetPodsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<StatefulSetPodsQuery, StatefulSetPodsQueryVariables>(StatefulSetPodsDocument, options);
      }
export function useStatefulSetPodsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<StatefulSetPodsQuery, StatefulSetPodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<StatefulSetPodsQuery, StatefulSetPodsQueryVariables>(StatefulSetPodsDocument, options);
        }
export function useStatefulSetPodsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<StatefulSetPodsQuery, StatefulSetPodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<StatefulSetPodsQuery, StatefulSetPodsQueryVariables>(StatefulSetPodsDocument, options);
        }
export type StatefulSetPodsQueryHookResult = ReturnType<typeof useStatefulSetPodsQuery>;
export type StatefulSetPodsLazyQueryHookResult = ReturnType<typeof useStatefulSetPodsLazyQuery>;
export type StatefulSetPodsSuspenseQueryHookResult = ReturnType<typeof useStatefulSetPodsSuspenseQuery>;
export type StatefulSetPodsQueryResult = Apollo.QueryResult<StatefulSetPodsQuery, StatefulSetPodsQueryVariables>;