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
};

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

export type Mutation = {
  __typename?: 'Mutation';
  handleCreateImagePullSecret?: Maybe<Secret_Secret>;
  handleCreateNamespace: Namespace_NamespaceSpec;
  handleDeleteResource?: Maybe<Scalars['JSON']['output']>;
  /** creates an application based on provided deployment.AppDeploymentSpec */
  handleDeploy: Deployment_AppDeploymentSpec;
  /** create an application from file */
  handleDeployFromFile?: Maybe<Deployment_AppDeploymentFromFileResponse>;
  handleDeploymentPause?: Maybe<Deployment_DeploymentDetail>;
  handleDeploymentRestart: Deployment_RolloutSpec;
  handleDeploymentResume?: Maybe<Deployment_DeploymentDetail>;
  handleDeploymentRollback: Deployment_RolloutSpec;
  /** checks if provided image is valid */
  handleImageReferenceValidity?: Maybe<Validation_ImageReferenceValidity>;
  /** checks if provided name is valid */
  handleNameValidity?: Maybe<Validation_AppNameValidity>;
  /** checks if provided service protocol is valid */
  handleProtocolValidity?: Maybe<Validation_ProtocolValidity>;
  handlePutResource?: Maybe<Scalars['JSON']['output']>;
  handleScaleResource?: Maybe<Scaling_ReplicaCounts>;
  handleTriggerCronJob?: Maybe<Scalars['JSON']['output']>;
  /** scales ReplicationController to a number of replicas */
  handleUpdateReplicasCount?: Maybe<Scalars['JSON']['output']>;
};


export type MutationHandleCreateImagePullSecretArgs = {
  input: Secret_ImagePullSecretSpec_Input;
};


export type MutationHandleCreateNamespaceArgs = {
  input: Namespace_NamespaceSpec_Input;
};


export type MutationHandleDeployArgs = {
  input: Deployment_AppDeploymentSpec_Input;
};


export type MutationHandleDeployFromFileArgs = {
  input: Deployment_AppDeploymentFromFileSpec_Input;
};


export type MutationHandleDeploymentRollbackArgs = {
  input: Deployment_RolloutSpec_Input;
};


export type MutationHandleImageReferenceValidityArgs = {
  input: Validation_ImageReferenceValiditySpec_Input;
};


export type MutationHandleNameValidityArgs = {
  input: Validation_AppNameValiditySpec_Input;
};


export type MutationHandleProtocolValidityArgs = {
  input: Validation_ProtocolValiditySpec_Input;
};


export type MutationHandleUpdateReplicasCountArgs = {
  input: Replicationcontroller_ReplicationControllerSpec_Input;
  namespace: Scalars['String']['input'];
  replicationController: Scalars['String']['input'];
};

export type Query = {
  __typename?: 'Query';
  handleExecShell?: Maybe<Handler_TerminalResponse>;
  /** returns a list of available protocols for the service */
  handleGetAvailableProtocols?: Maybe<Deployment_Protocols>;
  handleGetClusterRoleBindingDetail?: Maybe<Clusterrolebinding_ClusterRoleBindingDetail>;
  handleGetClusterRoleBindingList?: Maybe<Clusterrolebinding_ClusterRoleBindingList>;
  handleGetClusterRoleDetail?: Maybe<Clusterrole_ClusterRoleDetail>;
  handleGetClusterRoleList?: Maybe<Clusterrole_ClusterRoleList>;
  handleGetConfigMapDetail?: Maybe<Configmap_ConfigMapDetail>;
  handleGetConfigMapList?: Maybe<Configmap_ConfigMapList>;
  handleGetCronJobDetail?: Maybe<Cronjob_CronJobDetail>;
  handleGetCronJobEvents?: Maybe<Common_EventList>;
  handleGetCronJobJobs?: Maybe<Job_JobList>;
  handleGetCronJobList?: Maybe<Cronjob_CronJobList>;
  /** generates a one-time CSRF token that can be used by POST request */
  handleGetCsrfToken?: Maybe<Csrf_Response>;
  handleGetCustomResourceDefinitionDetail?: Maybe<Types_CustomResourceDefinitionDetail>;
  handleGetCustomResourceDefinitionList?: Maybe<Types_CustomResourceDefinitionList>;
  handleGetCustomResourceObjectDetail?: Maybe<Types_CustomResourceObjectDetail>;
  handleGetCustomResourceObjectEvents?: Maybe<Common_EventList>;
  handleGetCustomResourceObjectList?: Maybe<Types_CustomResourceObjectList>;
  handleGetDaemonSetDetail?: Maybe<Daemonset_DaemonSetDetail>;
  handleGetDaemonSetEvents?: Maybe<Common_EventList>;
  handleGetDaemonSetList?: Maybe<Daemonset_DaemonSetList>;
  handleGetDaemonSetPods?: Maybe<Pod_PodList>;
  handleGetDaemonSetServices?: Maybe<Service_ServiceList>;
  handleGetDeploymentDetail?: Maybe<Deployment_DeploymentDetail>;
  handleGetDeploymentEvents?: Maybe<Common_EventList>;
  handleGetDeploymentNewReplicaSet?: Maybe<Replicaset_ReplicaSet>;
  handleGetDeploymentOldReplicaSets?: Maybe<Replicaset_ReplicaSetList>;
  handleGetDeployments?: Maybe<Deployment_DeploymentList>;
  handleGetEventList?: Maybe<Common_EventList>;
  handleGetHorizontalPodAutoscalerDetail?: Maybe<Horizontalpodautoscaler_HorizontalPodAutoscalerDetail>;
  handleGetHorizontalPodAutoscalerList?: Maybe<Horizontalpodautoscaler_HorizontalPodAutoscalerList>;
  handleGetHorizontalPodAutoscalerListForResource?: Maybe<Horizontalpodautoscaler_HorizontalPodAutoscalerList>;
  handleGetIngressClass?: Maybe<Ingressclass_IngressClass>;
  handleGetIngressClassList?: Maybe<Ingressclass_IngressClassList>;
  handleGetIngressDetail?: Maybe<Ingress_IngressDetail>;
  handleGetIngressEvent?: Maybe<Common_EventList>;
  /** get ingresses for namespace */
  handleGetIngressList?: Maybe<Ingress_IngressList>;
  handleGetJobDetail?: Maybe<Job_JobDetail>;
  handleGetJobEvents?: Maybe<Common_EventList>;
  handleGetJobList?: Maybe<Job_JobList>;
  handleGetJobPods?: Maybe<Pod_PodList>;
  handleGetNamespaceDetail?: Maybe<Namespace_NamespaceDetail>;
  handleGetNamespaceEvents?: Maybe<Common_EventList>;
  handleGetNamespaces?: Maybe<Namespace_NamespaceList>;
  handleGetNetworkPolicyDetail?: Maybe<Networkpolicy_NetworkPolicyDetail>;
  handleGetNetworkPolicyList?: Maybe<Networkpolicy_NetworkPolicyList>;
  handleGetNodeDetail?: Maybe<Node_NodeDetail>;
  handleGetNodeEvents?: Maybe<Common_EventList>;
  handleGetNodeList?: Maybe<Node_NodeList>;
  handleGetNodePods?: Maybe<Pod_PodList>;
  handleGetPersistentVolumeClaimDetail?: Maybe<Persistentvolumeclaim_PersistentVolumeClaimDetail>;
  handleGetPersistentVolumeClaimList?: Maybe<Persistentvolumeclaim_PersistentVolumeClaimList>;
  handleGetPersistentVolumeDetail?: Maybe<Persistentvolume_PersistentVolumeDetail>;
  handleGetPersistentVolumeList?: Maybe<Persistentvolume_PersistentVolumeList>;
  handleGetPodContainers?: Maybe<Pod_PodDetail>;
  handleGetPodDetail?: Maybe<Pod_PodDetail>;
  handleGetPodEvents?: Maybe<Common_EventList>;
  handleGetPodPersistentVolumeClaims?: Maybe<Persistentvolumeclaim_PersistentVolumeClaimList>;
  handleGetPods?: Maybe<Pod_PodList>;
  handleGetReplicaCount?: Maybe<Scaling_ReplicaCounts>;
  handleGetReplicaSetDetail?: Maybe<Replicaset_ReplicaSetDetail>;
  handleGetReplicaSetEvents?: Maybe<Common_EventList>;
  handleGetReplicaSetPods?: Maybe<Pod_PodList>;
  handleGetReplicaSetServices?: Maybe<Pod_PodList>;
  /** returns a list of Services for ReplicationController */
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
  handleGetResource?: Maybe<Scalars['JSON']['output']>;
  handleGetRoleBindingDetail?: Maybe<Rolebinding_RoleBindingDetail>;
  handleGetRoleBindingList?: Maybe<Rolebinding_RoleBindingList>;
  handleGetRoleDetail?: Maybe<Role_RoleDetail>;
  handleGetRoleList?: Maybe<Role_RoleList>;
  handleGetSecretDetail?: Maybe<Secret_SecretDetail>;
  handleGetSecretList?: Maybe<Secret_SecretList>;
  handleGetServiceAccountDetail?: Maybe<Serviceaccount_ServiceAccountDetail>;
  handleGetServiceAccountImagePullSecrets?: Maybe<Secret_SecretList>;
  handleGetServiceAccountList?: Maybe<Serviceaccount_ServiceAccountList>;
  handleGetServiceAccountSecrets?: Maybe<Secret_SecretList>;
  handleGetServiceDetail?: Maybe<Service_ServiceDetail>;
  handleGetServiceEvent?: Maybe<Common_EventList>;
  handleGetServiceIngressList?: Maybe<Ingress_IngressList>;
  handleGetServiceList?: Maybe<Service_ServiceList>;
  handleGetServicePods?: Maybe<Pod_PodList>;
  handleGetState?: Maybe<Scalars['JSON']['output']>;
  handleGetStatefulSetDetail?: Maybe<Statefulset_StatefulSetDetail>;
  handleGetStatefulSetEvents?: Maybe<Common_EventList>;
  handleGetStatefulSetList?: Maybe<Statefulset_StatefulSetList>;
  handleGetStatefulSetPods?: Maybe<Pod_PodList>;
  handleGetStorageClass?: Maybe<Storageclass_StorageClass>;
  handleGetStorageClassList?: Maybe<Storageclass_StorageClassList>;
  handleGetStorageClassPersistentVolumes?: Maybe<Persistentvolume_PersistentVolumeList>;
  handleLogFile?: Maybe<Logs_LogDetails>;
  handleLogSource?: Maybe<Controller_LogSources>;
  handleLogs?: Maybe<Logs_LogDetails>;
};


export type QueryHandleGetCsrfTokenArgs = {
  action: Scalars['String']['input'];
};


export type QueryHandleGetIngressListArgs = {
  namespace: Scalars['String']['input'];
};


export type QueryHandleGetReplicaSetsArgs = {
  namespace: Scalars['String']['input'];
};


export type QueryHandleGetReplicationControllerDetailArgs = {
  namespace: Scalars['String']['input'];
  replicationController: Scalars['String']['input'];
};


export type QueryHandleGetReplicationControllerEventsArgs = {
  namespace: Scalars['String']['input'];
  replicationController: Scalars['String']['input'];
};


export type QueryHandleGetReplicationControllerListArgs = {
  namespace: Scalars['String']['input'];
};


export type QueryHandleGetReplicationControllerPodsArgs = {
  namespace: Scalars['String']['input'];
  replicationController: Scalars['String']['input'];
};


export type QueryHandleGetReplicationControllerServicesArgs = {
  namespace: Scalars['String']['input'];
  replicationController: Scalars['String']['input'];
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
  cumulativeMetrics: Array<Maybe<Api_Metric>>;
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
  cpuRequirement: Scalars['String']['input'];
  description: Scalars['String']['input'];
  imagePullSecret: Scalars['String']['input'];
  isExternal: Scalars['Boolean']['input'];
  labels: Array<InputMaybe<Deployment_Label_Input>>;
  memoryRequirement: Scalars['String']['input'];
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
  capacity: Query_HandleGetPersistentVolumeList_Items_Items_Capacity;
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
  capacity: Query_HandleGetPersistentVolumeDetail_Capacity;
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
  capacity: Query_HandleGetPersistentVolumeClaimList_Items_Items_Capacity;
  objectMeta: Types_ObjectMeta;
  status: Scalars['String']['output'];
  storageClass: Scalars['String']['output'];
  typeMeta: Types_TypeMeta;
  volume: Scalars['String']['output'];
};

export type Persistentvolumeclaim_PersistentVolumeClaimDetail = {
  __typename?: 'persistentvolumeclaim_PersistentVolumeClaimDetail';
  accessModes: Array<Maybe<Scalars['String']['output']>>;
  capacity: Query_HandleGetPersistentVolumeClaimDetail_Capacity;
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
  status: V1_ContainerStatus;
  volumeMounts: Array<Maybe<Pod_VolumeMount>>;
};

export type Pod_EnvVar = {
  __typename?: 'pod_EnvVar';
  name: Scalars['String']['output'];
  value: Scalars['String']['output'];
  valueFrom: V1_EnvVarSource;
};

export type Pod_Pod = {
  __typename?: 'pod_Pod';
  containerImages: Array<Maybe<Scalars['String']['output']>>;
  metrics: Pod_PodMetrics;
  nodeName: Scalars['String']['output'];
  objectMeta: Types_ObjectMeta;
  restartCount: Scalars['Int']['output'];
  status: Scalars['String']['output'];
  typeMeta: Types_TypeMeta;
  warnings: Array<Maybe<Common_Event>>;
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
  additionalProperties?: Maybe<Array<Maybe<Resource_Quantity5_Entry>>>;
};

/** Requests describes the minimum amount of compute resources required. If Requests is omitted for a container, it defaults to Limits if that is explicitly specified, otherwise to an implementation-defined value. Requests cannot exceed Limits. More info: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/ */
export type Query_HandleGetPodDetail_Containers_Items_Resources_Requests = {
  __typename?: 'query_handleGetPodDetail_containers_items_resources_requests';
  additionalProperties?: Maybe<Array<Maybe<Resource_Quantity6_Entry>>>;
};

/** AllocatedResources represents the compute resources allocated for this container by the node. Kubelet sets this value to Container.Resources.Requests upon successful pod admission and after successfully admitting desired pod resize. */
export type Query_HandleGetPodDetail_Containers_Items_Status_AllocatedResources = {
  __typename?: 'query_handleGetPodDetail_containers_items_status_allocatedResources';
  additionalProperties?: Maybe<Array<Maybe<Resource_Quantity7_Entry>>>;
};

/** Limits describes the maximum amount of compute resources allowed. More info: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/ */
export type Query_HandleGetPodDetail_Containers_Items_VolumeMounts_Items_Volume_Ephemeral_VolumeClaimTemplate_Spec_Resources_Limits = {
  __typename?: 'query_handleGetPodDetail_containers_items_volumeMounts_items_volume_ephemeral_volumeClaimTemplate_spec_resources_limits';
  additionalProperties?: Maybe<Array<Maybe<Resource_Quantity8_Entry>>>;
};

/** Requests describes the minimum amount of compute resources required. If Requests is omitted for a container, it defaults to Limits if that is explicitly specified, otherwise to an implementation-defined value. Requests cannot exceed Limits. More info: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/ */
export type Query_HandleGetPodDetail_Containers_Items_VolumeMounts_Items_Volume_Ephemeral_VolumeClaimTemplate_Spec_Resources_Requests = {
  __typename?: 'query_handleGetPodDetail_containers_items_volumeMounts_items_volume_ephemeral_volumeClaimTemplate_spec_resources_requests';
  additionalProperties?: Maybe<Array<Maybe<Resource_Quantity9_Entry>>>;
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

export type Resource_Quantity5_Entry = {
  __typename?: 'resource_Quantity5_entry';
  key: Scalars['ID']['output'];
  value?: Maybe<Resource_Quantity5>;
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

export type Resource_Quantity_Entry = {
  __typename?: 'resource_Quantity_entry';
  key: Scalars['ID']['output'];
  value?: Maybe<Resource_Quantity>;
};

export type Resource_InfDecAmount = {
  __typename?: 'resource_infDecAmount';
  Dec: Inf_Dec;
};

export type Resource_Int64Amount = {
  __typename?: 'resource_int64Amount';
  scale: Scalars['Int']['output'];
  value: Scalars['BigInt']['output'];
};

export type Resourcequota_ResourceQuotaDetail = {
  __typename?: 'resourcequota_ResourceQuotaDetail';
  objectMeta: Types_ObjectMeta;
  scopes?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  statusList?: Maybe<Query_HandleGetNamespaceDetail_ResourceQuotaList_Items_Items_StatusList>;
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
  uid?: Maybe<Scalars['String']['output']>;
};

export type Types_TypeMeta = {
  __typename?: 'types_TypeMeta';
  kind?: Maybe<Scalars['String']['output']>;
  restartable?: Maybe<Scalars['Boolean']['output']>;
  scalable?: Maybe<Scalars['Boolean']['output']>;
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

/** Represents storage that is managed by an external CSI volume driver (Beta feature) */
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
  /** Name of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names */
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
  /** Name of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names */
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
  /** Name of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names */
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
  /** Time at which the container was last (re-)started */
  startedAt?: Maybe<Scalars['String']['output']>;
};

/** ContainerStateTerminated is a terminated state of a container. */
export type V1_ContainerStateTerminated = {
  __typename?: 'v1_ContainerStateTerminated';
  /** Container's ID in the format '<type>://<container_id>' */
  containerID?: Maybe<Scalars['String']['output']>;
  /** Exit status from the last termination of the container */
  exitCode: Scalars['Int']['output'];
  /** Time at which the container last terminated */
  finishedAt?: Maybe<Scalars['String']['output']>;
  /** Message regarding the last termination of the container */
  message?: Maybe<Scalars['String']['output']>;
  /** (brief) reason from the last termination of the container */
  reason?: Maybe<Scalars['String']['output']>;
  /** Signal from the last termination of the container */
  signal?: Maybe<Scalars['Int']['output']>;
  /** Time at which previous execution of the container started */
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
  allocatedResources?: Maybe<Query_HandleGetPodDetail_Containers_Items_Status_AllocatedResources>;
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
  /** sizeLimit is the total amount of local storage required for this EmptyDir volume. The size limit is also applicable for memory medium. The maximum usage on memory medium EmptyDir would be the minimum value between the SizeLimit specified here and the sum of memory limits of all containers in a pod. The default is nil which means that the limit is undefined. More info: https://kubernetes.io/docs/concepts/storage/volumes#emptydir */
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
   *   * 'kubernetes.io/h2c' - HTTP/2 prior knowledge over cleartext as described in https://www.rfc-editor.org/rfc/rfc9113.html#name-starting-http-2-with-prior-
   *   * 'kubernetes.io/ws'  - WebSocket over cleartext as described in https://www.rfc-editor.org/rfc/rfc6455
   *   * 'kubernetes.io/wss' - WebSocket over TLS as described in https://www.rfc-editor.org/rfc/rfc6455
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
  /** Name or number of the port to access on the container. Number must be in the range 1 to 65535. Name must be an IANA_SVC_NAME. */
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
   *   done on a path element by element basis. A path element refers is the
   *   list of labels in the path split by the '/' separator. A request is a
   *   match for path p if every p is an element-wise prefix of p of the
   *   request path. Note that if the last element of the path is a substring
   *   of the last element in request path, it is not a match (e.g. /foo/bar
   *   matches /foo/bar/baz, but does not match /foo/barbaz).
   * * ImplementationSpecific: Interpretation of the Path matching is up to
   *   the IngressClass. Implementations can treat this as a separate PathType
   *   or treat it identically to Prefix or Exact path types.
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
   *   CamelCase names
   * - cloud provider specific error values must have names that comply with the
   *   format foo.example.com/CamelCase.
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
   *    the IP in the Spec of the parent Ingress.
   * 2. The `:` delimiter is not respected because ports are not allowed.
   * 	  Currently the port of an Ingress is implicitly :80 for http and
   * 	  :443 for https.
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

/** LocalObjectReference contains enough information to let you locate the referenced object inside the same namespace. */
export type V1_LocalObjectReference = {
  __typename?: 'v1_LocalObjectReference';
  /** Name of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names */
  name?: Maybe<Scalars['String']['output']>;
};

/** Local represents directly-attached storage with node affinity (Beta feature) */
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
  /** FieldsV1 holds the first JSON version format as described in the "FieldsV1" type. */
  fieldsV1?: Maybe<Scalars['String']['output']>;
  /** Manager is an identifier of the workflow managing these fields. */
  manager?: Maybe<Scalars['String']['output']>;
  /** Operation is the type of operation which lead to this ManagedFieldsEntry being created. The only valid values for this field are 'Apply' and 'Update'. */
  operation?: Maybe<Scalars['String']['output']>;
  /** Subresource is the name of the subresource used to update that object, or empty string if the object was updated through the main resource. The value of this field is used to distinguish between managers, even if they share the same name. For example, a status update will be distinct from a regular update using the same manager name. Note that the APIVersion field is not related to the Subresource field and it always corresponds to the version of the main resource. */
  subresource?: Maybe<Scalars['String']['output']>;
  /** Time is the timestamp of when the ManagedFields entry was added. The timestamp will also be updated if a field is added, the manager changes any of the owned fields value or removes a field. The timestamp does not update when a field is removed from the entry because another manager took it over. */
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
  /** port represents the port on the given protocol. This can either be a numerical or named port on a pod. If this field is not provided, this matches all port names and numbers. If present, only traffic on the specified protocol AND port will be matched. */
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
  /** KubeProxy Version reported by the node. */
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
  /**
   * CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.
   *
   * Populated by the system. Read-only. Null for lists. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata
   */
  creationTimestamp?: Maybe<Scalars['String']['output']>;
  /** Number of seconds allowed for this object to gracefully terminate before it will be removed from the system. Only set when deletionTimestamp is also set. May only be shortened. Read-only. */
  deletionGracePeriodSeconds?: Maybe<Scalars['BigInt']['output']>;
  /**
   * DeletionTimestamp is RFC 3339 date and time at which this resource will be deleted. This field is set by the server when a graceful deletion is requested by the user, and is not directly settable by a client. The resource is expected to be deleted (no longer visible from resource lists, and not reachable by name) after the time in this field, once the finalizers list is empty. As long as the finalizers list contains items, deletion is blocked. Once the deletionTimestamp is set, this value may not be unset or be set further into the future, although it may be shortened or the resource may be deleted prior to this time. For example, a user may request that a pod is deleted in 30 seconds. The Kubelet will react by sending a graceful termination signal to the containers in the pod. After that 30 seconds, the Kubelet will send a hard termination signal (SIGKILL) to the container and after cleanup, remove the pod from the API. In the presence of network partitions, this object may still exist after this timestamp, until an administrator or automated process can determine the resource is fully terminated. If not set, graceful deletion of the object has not been requested.
   *
   * Populated by the system when a graceful deletion is requested. Read-only. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata
   */
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
  /** volumeAttributesClassName may be used to set the VolumeAttributesClass used by this claim. If specified, the CSI driver will create or update the volume with the attributes defined in the corresponding VolumeAttributesClass. This has a different purpose than storageClassName, it can be changed after the claim is created. An empty string value means that no VolumeAttributesClass will be applied to the claim but it's not allowed to reset this field to empty string once it is set. If unspecified and the PersistentVolumeClaim is unbound, the default VolumeAttributesClass will be set by the persistentvolume controller if it exists. If the resource referred to by volumeAttributesClass does not exist, this PersistentVolumeClaim will be set to a Pending state, as reflected by the modifyVolumeStatus field, until such as a resource exists. More info: https://kubernetes.io/docs/concepts/storage/persistent-volumes#volumeattributesclass (Alpha) Using this field requires the VolumeAttributesClass feature gate to be enabled. */
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
  seLinuxOptions?: Maybe<V1_SeLinuxOptions>;
  seccompProfile?: Maybe<V1_SeccompProfile>;
  /** A list of groups applied to the first process run in each container, in addition to the container's primary GID, the fsGroup (if specified), and group memberships defined in the container image for the uid of the container process. If unspecified, no additional groups are added to any container. Note that group memberships defined in the container image for the uid of the container process are still effective, even if they are not included in this list. Note that this field cannot be set when spec.os.name is windows. */
  supplementalGroups?: Maybe<Array<Maybe<Scalars['BigInt']['output']>>>;
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
  /** sources is the list of volume projections */
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
};

/** ResourceFieldSelector represents container resources (cpu, memory) and their output format */
export type V1_ResourceFieldSelector = {
  __typename?: 'v1_ResourceFieldSelector';
  /** Container name: required for volumes, optional for env vars */
  containerName?: Maybe<Scalars['String']['output']>;
  /** Specifies the output format of the exposed resources, defaults to "1" */
  divisor?: Maybe<Scalars['String']['output']>;
  /** Required: resource to select */
  resource: Scalars['String']['output'];
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
  limits?: Maybe<Query_HandleGetPodDetail_Containers_Items_Resources_Limits>;
  requests?: Maybe<Query_HandleGetPodDetail_Containers_Items_Resources_Requests>;
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
  /** Name of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names */
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
  /** Name of the referent. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names */
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
  capabilities?: Maybe<V1_Capabilities>;
  /** Run container in privileged mode. Processes in privileged containers are essentially equivalent to root on the host. Defaults to false. Note that this field cannot be set when spec.os.name is windows. */
  privileged?: Maybe<Scalars['Boolean']['output']>;
  /** procMount denotes the type of proc mount to use for the containers. The default is DefaultProcMount which uses the container runtime defaults for readonly paths and masked paths. This requires the ProcMountType feature flag to be enabled. Note that this field cannot be set when spec.os.name is windows. */
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
  /** Number or name of the port to access on the container. Number must be in the range 1 to 65535. Name must be an IANA_SVC_NAME. */
  port: Scalars['String']['output'];
};

/** The node this Taint is attached to has the "effect" on any pod that does not tolerate the Taint. */
export type V1_Taint = {
  __typename?: 'v1_Taint';
  /** Required. The effect of the taint on pods that do not tolerate the taint. Valid effects are NoSchedule, PreferNoSchedule and NoExecute. */
  effect: Scalars['String']['output'];
  /** Required. The taint key to be applied to a node. */
  key: Scalars['String']['output'];
  /** TimeAdded represents the time at which the taint was added. It is only written for NoExecute taints. */
  timeAdded?: Maybe<Scalars['String']['output']>;
  /** The taint value corresponding to the taint key. */
  value?: Maybe<Scalars['String']['output']>;
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

/** Projection that may be projected along with other supported volume types */
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
  limits?: Maybe<Query_HandleGetPodDetail_Containers_Items_VolumeMounts_Items_Volume_Ephemeral_VolumeClaimTemplate_Spec_Resources_Limits>;
  requests?: Maybe<Query_HandleGetPodDetail_Containers_Items_VolumeMounts_Items_Volume_Ephemeral_VolumeClaimTemplate_Spec_Resources_Requests>;
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

export type IngressesQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
}>;


export type IngressesQuery = { __typename?: 'Query', handleGetIngressList?: { __typename?: 'ingress_IngressList', listMeta: { __typename?: 'types_ListMeta', totalItems: number }, items: Array<{ __typename?: 'ingress_Ingress', hosts: Array<string | null>, objectMeta: { __typename?: 'types_ObjectMeta', name?: string | null, namespace?: string | null, labels?: any | null, creationTimestamp?: string | null }, endpoints: Array<{ __typename?: 'common_Endpoint', host: string, ports: Array<{ __typename?: 'common_ServicePort', port: number, protocol: string, nodePort: number } | null> } | null> } | null> } | null };

export type IngressQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
}>;


export type IngressQuery = { __typename?: 'Query', handleGetIngressDetail?: { __typename?: 'ingress_IngressDetail', objectMeta: { __typename?: 'types_ObjectMeta', name?: string | null, namespace?: string | null } } | null, handleGetIngressEvent?: { __typename?: 'common_EventList', events: Array<{ __typename?: 'common_Event', message: string, objectMeta: { __typename?: 'types_ObjectMeta', name?: string | null } } | null> } | null };

export type NamespacesQueryVariables = Exact<{ [key: string]: never; }>;


export type NamespacesQuery = { __typename?: 'Query', handleGetNamespaces?: { __typename?: 'namespace_NamespaceList', listMeta: { __typename?: 'types_ListMeta', totalItems: number }, namespaces: Array<{ __typename?: 'namespace_Namespace', objectMeta: { __typename?: 'types_ObjectMeta', name?: string | null } } | null> } | null };


export const IngressesDocument = gql`
    query Ingresses($namespace: String!) {
  handleGetIngressList(namespace: $namespace) @rest(path: "ingress/{args.namespace}") {
    listMeta {
      totalItems
    }
    items {
      objectMeta {
        name
        namespace
        labels
        creationTimestamp
      }
      endpoints {
        host
        ports {
          port
          protocol
          nodePort
        }
      }
      hosts
    }
  }
}
    `;

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
  handleGetIngressDetail @rest(path: "ingress/{args.namespace}/{args.name}") {
    objectMeta {
      name
      namespace
    }
  }
  handleGetIngressEvent @rest(path: "ingress/{args.namespace}/{args.name}/event") {
    events {
      objectMeta {
        name
      }
      message
    }
  }
}
    `;

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
export const NamespacesDocument = gql`
    query Namespaces {
  handleGetNamespaces @rest(path: "namespace") {
    listMeta {
      totalItems
    }
    namespaces {
      objectMeta {
        name
      }
    }
  }
}
    `;

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
 *   },
 * });
 */
export function useNamespacesQuery(baseOptions?: Apollo.QueryHookOptions<NamespacesQuery, NamespacesQueryVariables>) {
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