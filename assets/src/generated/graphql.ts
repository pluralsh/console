/* eslint-disable */
import { gql } from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /**
   * The `DateTime` scalar type represents a date and time in the UTC
   * timezone. The DateTime appears in a JSON response as an ISO8601 formatted
   * string, including UTC timezone ("Z"). The parsed date and time string will
   * be converted to UTC if there is an offset.
   */
  DateTime: Date;
  Long: any;
  Map: Map<string, unknown>;
};

export type Application = {
  __typename?: 'Application';
  configuration?: Maybe<Configuration>;
  cost?: Maybe<CostAnalysis>;
  license?: Maybe<License>;
  name: Scalars['String'];
  spec: ApplicationSpec;
  status: ApplicationStatus;
};

export type ApplicationDelta = {
  __typename?: 'ApplicationDelta';
  delta?: Maybe<Delta>;
  payload?: Maybe<Application>;
};

export type ApplicationDescriptor = {
  __typename?: 'ApplicationDescriptor';
  description?: Maybe<Scalars['String']>;
  icons?: Maybe<Array<Maybe<Scalars['String']>>>;
  links?: Maybe<Array<Maybe<ApplicationLink>>>;
  type: Scalars['String'];
  version: Scalars['String'];
};

export type ApplicationInfoItem = {
  __typename?: 'ApplicationInfoItem';
  name?: Maybe<Scalars['String']>;
  type?: Maybe<Scalars['String']>;
  value?: Maybe<Scalars['String']>;
};

export type ApplicationLink = {
  __typename?: 'ApplicationLink';
  description?: Maybe<Scalars['String']>;
  url?: Maybe<Scalars['String']>;
};

export type ApplicationSpec = {
  __typename?: 'ApplicationSpec';
  components?: Maybe<Array<Maybe<Component>>>;
  descriptor: ApplicationDescriptor;
  info?: Maybe<Array<Maybe<ApplicationInfoItem>>>;
};

export type ApplicationStatus = {
  __typename?: 'ApplicationStatus';
  components?: Maybe<Array<Maybe<StatusComponent>>>;
  componentsReady: Scalars['String'];
  conditions?: Maybe<Array<Maybe<StatusCondition>>>;
};

export type Audit = {
  __typename?: 'Audit';
  action: AuditAction;
  actor?: Maybe<User>;
  city?: Maybe<Scalars['String']>;
  country?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  ip?: Maybe<Scalars['String']>;
  latitude?: Maybe<Scalars['String']>;
  longitude?: Maybe<Scalars['String']>;
  repository?: Maybe<Scalars['String']>;
  type: AuditType;
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export enum AuditAction {
  Approve = 'APPROVE',
  Cancel = 'CANCEL',
  Create = 'CREATE',
  Delete = 'DELETE',
  Update = 'UPDATE'
}

export type AuditConnection = {
  __typename?: 'AuditConnection';
  edges?: Maybe<Array<Maybe<AuditEdge>>>;
  pageInfo: PageInfo;
};

export type AuditEdge = {
  __typename?: 'AuditEdge';
  cursor?: Maybe<Scalars['String']>;
  node?: Maybe<Audit>;
};

export type AuditMetric = {
  __typename?: 'AuditMetric';
  count?: Maybe<Scalars['Int']>;
  country?: Maybe<Scalars['String']>;
};

export enum AuditType {
  Build = 'BUILD',
  Configuration = 'CONFIGURATION',
  Group = 'GROUP',
  GroupMember = 'GROUP_MEMBER',
  Pod = 'POD',
  Policy = 'POLICY',
  Role = 'ROLE',
  User = 'USER'
}

export enum AutoscalingTarget {
  Deployment = 'DEPLOYMENT',
  Statefulset = 'STATEFULSET'
}

export type AvailableFeatures = {
  __typename?: 'AvailableFeatures';
  vpn?: Maybe<Scalars['Boolean']>;
};

export type BindingAttributes = {
  groupId?: InputMaybe<Scalars['ID']>;
  id?: InputMaybe<Scalars['ID']>;
  userId?: InputMaybe<Scalars['ID']>;
};

export type Build = {
  __typename?: 'Build';
  approver?: Maybe<User>;
  changelogs?: Maybe<Array<Maybe<Changelog>>>;
  commands?: Maybe<CommandConnection>;
  completedAt?: Maybe<Scalars['DateTime']>;
  creator?: Maybe<User>;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  message?: Maybe<Scalars['String']>;
  repository: Scalars['String'];
  sha?: Maybe<Scalars['String']>;
  status: Status;
  type: BuildType;
  updatedAt?: Maybe<Scalars['DateTime']>;
};


export type BuildCommandsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

export type BuildAttributes = {
  message?: InputMaybe<Scalars['String']>;
  repository: Scalars['String'];
  type?: InputMaybe<BuildType>;
};

export type BuildConnection = {
  __typename?: 'BuildConnection';
  edges?: Maybe<Array<Maybe<BuildEdge>>>;
  pageInfo: PageInfo;
};

export type BuildDelta = {
  __typename?: 'BuildDelta';
  delta?: Maybe<Delta>;
  payload?: Maybe<Build>;
};

export type BuildEdge = {
  __typename?: 'BuildEdge';
  cursor?: Maybe<Scalars['String']>;
  node?: Maybe<Build>;
};

export type BuildInfo = {
  __typename?: 'BuildInfo';
  all?: Maybe<Scalars['Int']>;
  failed?: Maybe<Scalars['Int']>;
  queued?: Maybe<Scalars['Int']>;
  running?: Maybe<Scalars['Int']>;
  successful?: Maybe<Scalars['Int']>;
};

export enum BuildType {
  Approval = 'APPROVAL',
  Bounce = 'BOUNCE',
  Dedicated = 'DEDICATED',
  Deploy = 'DEPLOY',
  Destroy = 'DESTROY',
  Install = 'INSTALL'
}

export type Certificate = {
  __typename?: 'Certificate';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  raw: Scalars['String'];
  spec: CertificateSpec;
  status: CertificateStatus;
};

export type CertificateSpec = {
  __typename?: 'CertificateSpec';
  dnsNames?: Maybe<Array<Maybe<Scalars['String']>>>;
  issuerRef?: Maybe<IssuerRef>;
  secretName: Scalars['String'];
};

export type CertificateStatus = {
  __typename?: 'CertificateStatus';
  conditions?: Maybe<Array<Maybe<StatusCondition>>>;
  notAfter?: Maybe<Scalars['String']>;
  notBefore?: Maybe<Scalars['String']>;
  renewalTime?: Maybe<Scalars['String']>;
};

export type Changelog = {
  __typename?: 'Changelog';
  content?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  repo: Scalars['String'];
  tool: Scalars['String'];
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export type ClusterInfo = {
  __typename?: 'ClusterInfo';
  gitCommit?: Maybe<Scalars['String']>;
  gitVersion?: Maybe<Scalars['String']>;
  platform?: Maybe<Scalars['String']>;
  version?: Maybe<Scalars['String']>;
};

export type Command = {
  __typename?: 'Command';
  build?: Maybe<Build>;
  command: Scalars['String'];
  completedAt?: Maybe<Scalars['DateTime']>;
  exitCode?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  stdout?: Maybe<Scalars['String']>;
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export type CommandConnection = {
  __typename?: 'CommandConnection';
  edges?: Maybe<Array<Maybe<CommandEdge>>>;
  pageInfo: PageInfo;
};

export type CommandDelta = {
  __typename?: 'CommandDelta';
  delta?: Maybe<Delta>;
  payload?: Maybe<Command>;
};

export type CommandEdge = {
  __typename?: 'CommandEdge';
  cursor?: Maybe<Scalars['String']>;
  node?: Maybe<Command>;
};

export type Component = {
  __typename?: 'Component';
  group: Scalars['String'];
  kind: Scalars['String'];
};

export type Configuration = {
  __typename?: 'Configuration';
  helm?: Maybe<Scalars['String']>;
  terraform?: Maybe<Scalars['String']>;
};

export type ConfigurationAction = {
  __typename?: 'ConfigurationAction';
  updates?: Maybe<Array<Maybe<PathUpdate>>>;
};

export type ConfigurationCondition = {
  __typename?: 'ConfigurationCondition';
  field?: Maybe<Scalars['String']>;
  operation?: Maybe<Scalars['String']>;
  value?: Maybe<Scalars['String']>;
};

export type ConfigurationItem = {
  __typename?: 'ConfigurationItem';
  condition?: Maybe<ConfigurationCondition>;
  default?: Maybe<Scalars['String']>;
  documentation?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  optional?: Maybe<Scalars['Boolean']>;
  placeholder?: Maybe<Scalars['String']>;
  type?: Maybe<Scalars['String']>;
  validation?: Maybe<ConfigurationValidation>;
};

export type ConfigurationOverlay = {
  __typename?: 'ConfigurationOverlay';
  metadata: Metadata;
  spec: ConfigurationOverlaySpec;
};

export type ConfigurationOverlaySpec = {
  __typename?: 'ConfigurationOverlaySpec';
  documentation?: Maybe<Scalars['String']>;
  folder?: Maybe<Scalars['String']>;
  inputType?: Maybe<Scalars['String']>;
  inputValues?: Maybe<Array<Maybe<Scalars['String']>>>;
  name?: Maybe<Scalars['String']>;
  subfolder?: Maybe<Scalars['String']>;
  updates?: Maybe<Array<Maybe<OverlayUpdate>>>;
};

export type ConfigurationValidation = {
  __typename?: 'ConfigurationValidation';
  message?: Maybe<Scalars['String']>;
  regex?: Maybe<Scalars['String']>;
  type?: Maybe<Scalars['String']>;
};

export type ConsoleConfiguration = {
  __typename?: 'ConsoleConfiguration';
  features?: Maybe<AvailableFeatures>;
  gitCommit?: Maybe<Scalars['String']>;
  gitStatus?: Maybe<GitStatus>;
  isDemoProject?: Maybe<Scalars['Boolean']>;
  isSandbox?: Maybe<Scalars['Boolean']>;
  manifest?: Maybe<PluralManifest>;
  pluralLogin?: Maybe<Scalars['Boolean']>;
  vpnEnabled?: Maybe<Scalars['Boolean']>;
};

export type Container = {
  __typename?: 'Container';
  image?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  ports?: Maybe<Array<Maybe<Port>>>;
  resources?: Maybe<Resources>;
};

export type ContainerRecommendation = {
  __typename?: 'ContainerRecommendation';
  containerName?: Maybe<Scalars['String']>;
  lowerBound?: Maybe<ContainerResources>;
  name?: Maybe<Scalars['String']>;
  target?: Maybe<ContainerResources>;
  uncappedTarget?: Maybe<ContainerResources>;
  upperBound?: Maybe<ContainerResources>;
};

export type ContainerResources = {
  __typename?: 'ContainerResources';
  cpu?: Maybe<Scalars['String']>;
  memory?: Maybe<Scalars['String']>;
};

export type ContainerState = {
  __typename?: 'ContainerState';
  running?: Maybe<RunningState>;
  terminated?: Maybe<TerminatedState>;
  waiting?: Maybe<WaitingState>;
};

export type ContainerStatus = {
  __typename?: 'ContainerStatus';
  image?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  ready?: Maybe<Scalars['Boolean']>;
  restartCount?: Maybe<Scalars['Int']>;
  state?: Maybe<ContainerState>;
};

export type ContextAttributes = {
  buckets?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  configuration: Scalars['Map'];
  domain?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};

export type CostAnalysis = {
  __typename?: 'CostAnalysis';
  cpuCost?: Maybe<Scalars['Float']>;
  cpuEfficiency?: Maybe<Scalars['Float']>;
  efficiency?: Maybe<Scalars['Float']>;
  gpuCost?: Maybe<Scalars['Float']>;
  minutes?: Maybe<Scalars['Float']>;
  networkCost?: Maybe<Scalars['Float']>;
  pvCost?: Maybe<Scalars['Float']>;
  ramCost?: Maybe<Scalars['Float']>;
  ramEfficiency?: Maybe<Scalars['Float']>;
  sharedCost?: Maybe<Scalars['Float']>;
  totalCost?: Maybe<Scalars['Float']>;
};

export type CronJob = {
  __typename?: 'CronJob';
  events?: Maybe<Array<Maybe<Event>>>;
  jobs?: Maybe<Array<Maybe<Job>>>;
  metadata: Metadata;
  raw: Scalars['String'];
  spec: CronSpec;
  status: CronStatus;
};

export type CronSpec = {
  __typename?: 'CronSpec';
  concurrencyPolicy?: Maybe<Scalars['String']>;
  schedule: Scalars['String'];
  suspend?: Maybe<Scalars['Boolean']>;
};

export type CronStatus = {
  __typename?: 'CronStatus';
  active?: Maybe<Array<Maybe<JobReference>>>;
  lastScheduleTime?: Maybe<Scalars['String']>;
};

export type CrossVersionResourceTarget = {
  __typename?: 'CrossVersionResourceTarget';
  apiVersion?: Maybe<Scalars['String']>;
  kind?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
};

export type Dashboard = {
  __typename?: 'Dashboard';
  id: Scalars['String'];
  spec: DashboardSpec;
};

export type DashboardGraph = {
  __typename?: 'DashboardGraph';
  format?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  queries?: Maybe<Array<Maybe<DashboardMetric>>>;
};

export type DashboardLabel = {
  __typename?: 'DashboardLabel';
  name: Scalars['String'];
  values?: Maybe<Array<Maybe<Scalars['String']>>>;
};

export type DashboardMetric = {
  __typename?: 'DashboardMetric';
  legend?: Maybe<Scalars['String']>;
  query?: Maybe<Scalars['String']>;
  results?: Maybe<Array<Maybe<MetricResult>>>;
};

export type DashboardSpec = {
  __typename?: 'DashboardSpec';
  description?: Maybe<Scalars['String']>;
  graphs?: Maybe<Array<Maybe<DashboardGraph>>>;
  labels?: Maybe<Array<Maybe<DashboardLabel>>>;
  name?: Maybe<Scalars['String']>;
  timeslices?: Maybe<Array<Maybe<Scalars['String']>>>;
};

export enum Delta {
  Create = 'CREATE',
  Delete = 'DELETE',
  Update = 'UPDATE'
}

export type Deployment = {
  __typename?: 'Deployment';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  pods?: Maybe<Array<Maybe<Pod>>>;
  raw: Scalars['String'];
  spec: DeploymentSpec;
  status: DeploymentStatus;
};

export type DeploymentSpec = {
  __typename?: 'DeploymentSpec';
  replicas?: Maybe<Scalars['Int']>;
  strategy?: Maybe<DeploymentStrategy>;
};

export type DeploymentStatus = {
  __typename?: 'DeploymentStatus';
  availableReplicas?: Maybe<Scalars['Int']>;
  readyReplicas?: Maybe<Scalars['Int']>;
  replicas?: Maybe<Scalars['Int']>;
  unavailableReplicas?: Maybe<Scalars['Int']>;
};

export type DeploymentStrategy = {
  __typename?: 'DeploymentStrategy';
  rollingUpdate?: Maybe<RollingUpdate>;
  type?: Maybe<Scalars['String']>;
};

export type Event = {
  __typename?: 'Event';
  action?: Maybe<Scalars['String']>;
  count?: Maybe<Scalars['Int']>;
  eventTime?: Maybe<Scalars['String']>;
  lastTimestamp?: Maybe<Scalars['String']>;
  message?: Maybe<Scalars['String']>;
  reason?: Maybe<Scalars['String']>;
  type?: Maybe<Scalars['String']>;
};

export type FileContent = {
  __typename?: 'FileContent';
  content?: Maybe<Scalars['String']>;
  path?: Maybe<Scalars['String']>;
};

export type GitStatus = {
  __typename?: 'GitStatus';
  cloned?: Maybe<Scalars['Boolean']>;
  output?: Maybe<Scalars['String']>;
};

export type Group = {
  __typename?: 'Group';
  description?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  name: Scalars['String'];
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export type GroupAttributes = {
  description?: InputMaybe<Scalars['String']>;
  name: Scalars['String'];
};

export type GroupConnection = {
  __typename?: 'GroupConnection';
  edges?: Maybe<Array<Maybe<GroupEdge>>>;
  pageInfo: PageInfo;
};

export type GroupEdge = {
  __typename?: 'GroupEdge';
  cursor?: Maybe<Scalars['String']>;
  node?: Maybe<Group>;
};

export type GroupMember = {
  __typename?: 'GroupMember';
  group?: Maybe<Group>;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  updatedAt?: Maybe<Scalars['DateTime']>;
  user?: Maybe<User>;
};

export type GroupMemberConnection = {
  __typename?: 'GroupMemberConnection';
  edges?: Maybe<Array<Maybe<GroupMemberEdge>>>;
  pageInfo: PageInfo;
};

export type GroupMemberEdge = {
  __typename?: 'GroupMemberEdge';
  cursor?: Maybe<Scalars['String']>;
  node?: Maybe<GroupMember>;
};

export type HttpIngressRule = {
  __typename?: 'HttpIngressRule';
  paths?: Maybe<Array<Maybe<IngressPath>>>;
};

export type Ingress = {
  __typename?: 'Ingress';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  raw: Scalars['String'];
  spec: IngressSpec;
  status: ServiceStatus;
};

export type IngressBackend = {
  __typename?: 'IngressBackend';
  serviceName?: Maybe<Scalars['String']>;
  servicePort?: Maybe<Scalars['String']>;
};

export type IngressPath = {
  __typename?: 'IngressPath';
  backend?: Maybe<IngressBackend>;
  path?: Maybe<Scalars['String']>;
};

export type IngressRule = {
  __typename?: 'IngressRule';
  host?: Maybe<Scalars['String']>;
  http?: Maybe<HttpIngressRule>;
};

export type IngressSpec = {
  __typename?: 'IngressSpec';
  rules?: Maybe<Array<Maybe<IngressRule>>>;
  tls?: Maybe<Array<Maybe<IngressTls>>>;
};

export type IngressTls = {
  __typename?: 'IngressTls';
  hosts?: Maybe<Array<Maybe<Scalars['String']>>>;
};

export type Installation = {
  __typename?: 'Installation';
  id: Scalars['ID'];
  repository?: Maybe<Repository>;
};

export type InstallationConnection = {
  __typename?: 'InstallationConnection';
  edges?: Maybe<Array<Maybe<InstallationEdge>>>;
  pageInfo: PageInfo;
};

export type InstallationEdge = {
  __typename?: 'InstallationEdge';
  cursor?: Maybe<Scalars['String']>;
  node?: Maybe<Installation>;
};

export type Invite = {
  __typename?: 'Invite';
  email?: Maybe<Scalars['String']>;
  secureId: Scalars['String'];
};

export type InviteAttributes = {
  email?: InputMaybe<Scalars['String']>;
};

export type IssuerRef = {
  __typename?: 'IssuerRef';
  group?: Maybe<Scalars['String']>;
  kind?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
};

export type Job = {
  __typename?: 'Job';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  pods?: Maybe<Array<Maybe<Pod>>>;
  raw: Scalars['String'];
  spec: JobSpec;
  status: JobStatus;
};

export type JobReference = {
  __typename?: 'JobReference';
  name: Scalars['String'];
  namespace: Scalars['String'];
};

export type JobSpec = {
  __typename?: 'JobSpec';
  activeDeadlineSeconds?: Maybe<Scalars['Int']>;
  backoffLimit?: Maybe<Scalars['Int']>;
  parallelism?: Maybe<Scalars['Int']>;
};

export type JobStatus = {
  __typename?: 'JobStatus';
  active?: Maybe<Scalars['Int']>;
  completionTime?: Maybe<Scalars['String']>;
  failed?: Maybe<Scalars['Int']>;
  startTime?: Maybe<Scalars['String']>;
  succeeded?: Maybe<Scalars['Int']>;
};

/** supported kubernetes objects fetchable in runbooks */
export type KubernetesData = Deployment | StatefulSet;

export type KubernetesDatasource = {
  __typename?: 'KubernetesDatasource';
  name: Scalars['String'];
  resource: Scalars['String'];
};

export type LabelInput = {
  name?: InputMaybe<Scalars['String']>;
  value?: InputMaybe<Scalars['String']>;
};

export type LabelPair = {
  __typename?: 'LabelPair';
  name?: Maybe<Scalars['String']>;
  value?: Maybe<Scalars['String']>;
};

export type License = {
  __typename?: 'License';
  metadata: Metadata;
  spec: LicenseSpec;
  status?: Maybe<LicenseStatus>;
};

export type LicenseFeature = {
  __typename?: 'LicenseFeature';
  description?: Maybe<Scalars['String']>;
  name: Scalars['String'];
};

export type LicenseSpec = {
  __typename?: 'LicenseSpec';
  secretRef: SecretKeySelector;
};

export type LicenseStatus = {
  __typename?: 'LicenseStatus';
  features?: Maybe<Array<Maybe<LicenseFeature>>>;
  free?: Maybe<Scalars['Boolean']>;
  limits?: Maybe<Scalars['Map']>;
  plan?: Maybe<Scalars['String']>;
  secrets?: Maybe<Scalars['Map']>;
};

export type LoadBalancerIngressStatus = {
  __typename?: 'LoadBalancerIngressStatus';
  hostname?: Maybe<Scalars['String']>;
  ip?: Maybe<Scalars['String']>;
};

export type LoadBalancerStatus = {
  __typename?: 'LoadBalancerStatus';
  ingress?: Maybe<Array<Maybe<LoadBalancerIngressStatus>>>;
};

export type LogFilter = {
  __typename?: 'LogFilter';
  metadata: Metadata;
  spec: LogFilterSpec;
};

export type LogFilterSpec = {
  __typename?: 'LogFilterSpec';
  description?: Maybe<Scalars['String']>;
  labels?: Maybe<Array<Maybe<LogLabel>>>;
  name?: Maybe<Scalars['String']>;
  query?: Maybe<Scalars['String']>;
};

export type LogLabel = {
  __typename?: 'LogLabel';
  name?: Maybe<Scalars['String']>;
  value?: Maybe<Scalars['String']>;
};

export type LogStream = {
  __typename?: 'LogStream';
  stream?: Maybe<Scalars['Map']>;
  values?: Maybe<Array<Maybe<MetricResult>>>;
};

export type LoginInfo = {
  __typename?: 'LoginInfo';
  oidcUri?: Maybe<Scalars['String']>;
};

export type ManifestNetwork = {
  __typename?: 'ManifestNetwork';
  pluralDns?: Maybe<Scalars['Boolean']>;
  subdomain?: Maybe<Scalars['String']>;
};

export type Metadata = {
  __typename?: 'Metadata';
  annotations?: Maybe<Array<Maybe<LabelPair>>>;
  labels?: Maybe<Array<Maybe<LabelPair>>>;
  name: Scalars['String'];
  namespace?: Maybe<Scalars['String']>;
};

export type MetricResponse = {
  __typename?: 'MetricResponse';
  metric?: Maybe<Scalars['Map']>;
  values?: Maybe<Array<Maybe<MetricResult>>>;
};

export type MetricResult = {
  __typename?: 'MetricResult';
  timestamp?: Maybe<Scalars['Int']>;
  value?: Maybe<Scalars['String']>;
};

export type Namespace = {
  __typename?: 'Namespace';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  raw: Scalars['String'];
  spec: NamespaceSpec;
  status: NamespaceStatus;
};

export type NamespaceSpec = {
  __typename?: 'NamespaceSpec';
  finalizers?: Maybe<Array<Maybe<Scalars['String']>>>;
};

export type NamespaceStatus = {
  __typename?: 'NamespaceStatus';
  phase?: Maybe<Scalars['String']>;
};

export type Node = {
  __typename?: 'Node';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  pods?: Maybe<Array<Maybe<Pod>>>;
  raw: Scalars['String'];
  spec: NodeSpec;
  status: NodeStatus;
};

export type NodeCondition = {
  __typename?: 'NodeCondition';
  message?: Maybe<Scalars['String']>;
  reason?: Maybe<Scalars['String']>;
  status?: Maybe<Scalars['String']>;
  type?: Maybe<Scalars['String']>;
};

export type NodeMetric = {
  __typename?: 'NodeMetric';
  metadata: Metadata;
  timestamp?: Maybe<Scalars['String']>;
  usage?: Maybe<NodeUsage>;
  window?: Maybe<Scalars['String']>;
};

export type NodeSpec = {
  __typename?: 'NodeSpec';
  podCidr?: Maybe<Scalars['String']>;
  providerId?: Maybe<Scalars['String']>;
  unschedulable?: Maybe<Scalars['Boolean']>;
};

export type NodeStatus = {
  __typename?: 'NodeStatus';
  allocatable?: Maybe<Scalars['Map']>;
  capacity?: Maybe<Scalars['Map']>;
  conditions?: Maybe<Array<Maybe<NodeCondition>>>;
  phase?: Maybe<Scalars['String']>;
};

export type NodeUsage = {
  __typename?: 'NodeUsage';
  cpu?: Maybe<Scalars['String']>;
  memory?: Maybe<Scalars['String']>;
};

export type Notification = {
  __typename?: 'Notification';
  annotations?: Maybe<Scalars['Map']>;
  description?: Maybe<Scalars['String']>;
  fingerprint: Scalars['String'];
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  labels?: Maybe<Scalars['Map']>;
  repository: Scalars['String'];
  seenAt?: Maybe<Scalars['DateTime']>;
  severity?: Maybe<Severity>;
  status?: Maybe<NotificationStatus>;
  title: Scalars['String'];
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export type NotificationConnection = {
  __typename?: 'NotificationConnection';
  edges?: Maybe<Array<Maybe<NotificationEdge>>>;
  pageInfo: PageInfo;
};

export type NotificationDelta = {
  __typename?: 'NotificationDelta';
  delta?: Maybe<Delta>;
  payload?: Maybe<Notification>;
};

export type NotificationEdge = {
  __typename?: 'NotificationEdge';
  cursor?: Maybe<Scalars['String']>;
  node?: Maybe<Notification>;
};

export enum NotificationStatus {
  Firing = 'FIRING',
  Resolved = 'RESOLVED'
}

export type OverlayUpdate = {
  __typename?: 'OverlayUpdate';
  path?: Maybe<Array<Maybe<Scalars['String']>>>;
};

export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean'];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']>;
};

export type PathUpdate = {
  __typename?: 'PathUpdate';
  path?: Maybe<Array<Maybe<Scalars['String']>>>;
  valueFrom: Scalars['String'];
};

export enum Permission {
  Configure = 'CONFIGURE',
  Deploy = 'DEPLOY',
  Operate = 'OPERATE',
  Read = 'READ'
}

export type PluralContext = {
  __typename?: 'PluralContext';
  buckets?: Maybe<Array<Maybe<Scalars['String']>>>;
  configuration: Scalars['Map'];
  domains?: Maybe<Array<Maybe<Scalars['String']>>>;
};

export type PluralManifest = {
  __typename?: 'PluralManifest';
  bucketPrefix?: Maybe<Scalars['String']>;
  cluster?: Maybe<Scalars['String']>;
  network?: Maybe<ManifestNetwork>;
};

export type Pod = {
  __typename?: 'Pod';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  raw: Scalars['String'];
  spec: PodSpec;
  status: PodStatus;
};

export type PodCondition = {
  __typename?: 'PodCondition';
  lastProbeTime?: Maybe<Scalars['String']>;
  lastTransitionTime?: Maybe<Scalars['String']>;
  message?: Maybe<Scalars['String']>;
  reason?: Maybe<Scalars['String']>;
  status?: Maybe<Scalars['String']>;
  type?: Maybe<Scalars['String']>;
};

export type PodConnection = {
  __typename?: 'PodConnection';
  edges?: Maybe<Array<Maybe<PodEdge>>>;
  pageInfo: PageInfo;
};

export type PodDelta = {
  __typename?: 'PodDelta';
  delta?: Maybe<Delta>;
  payload?: Maybe<Pod>;
};

export type PodEdge = {
  __typename?: 'PodEdge';
  cursor?: Maybe<Scalars['String']>;
  node?: Maybe<Pod>;
};

export type PodSpec = {
  __typename?: 'PodSpec';
  containers?: Maybe<Array<Maybe<Container>>>;
  initContainers?: Maybe<Array<Maybe<Container>>>;
  nodeName?: Maybe<Scalars['String']>;
  serviceAccountName?: Maybe<Scalars['String']>;
};

export type PodStatus = {
  __typename?: 'PodStatus';
  conditions?: Maybe<Array<Maybe<PodCondition>>>;
  containerStatuses?: Maybe<Array<Maybe<ContainerStatus>>>;
  hostIp?: Maybe<Scalars['String']>;
  initContainerStatuses?: Maybe<Array<Maybe<ContainerStatus>>>;
  message?: Maybe<Scalars['String']>;
  phase?: Maybe<Scalars['String']>;
  podIp?: Maybe<Scalars['String']>;
  reason?: Maybe<Scalars['String']>;
};

export type Port = {
  __typename?: 'Port';
  containerPort?: Maybe<Scalars['Int']>;
  hostPort?: Maybe<Scalars['Int']>;
  protocol?: Maybe<Scalars['String']>;
};

export type PrometheusDatasource = {
  __typename?: 'PrometheusDatasource';
  format?: Maybe<Scalars['String']>;
  legend?: Maybe<Scalars['String']>;
  query: Scalars['String'];
};

export enum ReadType {
  Build = 'BUILD',
  Notification = 'NOTIFICATION'
}

export type Recipe = {
  __typename?: 'Recipe';
  description?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  name: Scalars['String'];
  oidcEnabled?: Maybe<Scalars['Boolean']>;
  provider?: Maybe<Scalars['String']>;
  recipeSections?: Maybe<Array<Maybe<RecipeSection>>>;
  restricted?: Maybe<Scalars['Boolean']>;
};

export type RecipeConnection = {
  __typename?: 'RecipeConnection';
  edges?: Maybe<Array<Maybe<RecipeEdge>>>;
  pageInfo: PageInfo;
};

export type RecipeEdge = {
  __typename?: 'RecipeEdge';
  cursor?: Maybe<Scalars['String']>;
  node?: Maybe<Recipe>;
};

export type RecipeItem = {
  __typename?: 'RecipeItem';
  configuration?: Maybe<Array<Maybe<ConfigurationItem>>>;
  id: Scalars['ID'];
};

export type RecipeSection = {
  __typename?: 'RecipeSection';
  configuration?: Maybe<Array<Maybe<ConfigurationItem>>>;
  id: Scalars['ID'];
  recipeItems?: Maybe<Array<Maybe<RecipeItem>>>;
  repository?: Maybe<Repository>;
};

export type Recommendation = {
  __typename?: 'Recommendation';
  containerRecommendations?: Maybe<Array<Maybe<ContainerRecommendation>>>;
};

export type Repository = {
  __typename?: 'Repository';
  configuration?: Maybe<Configuration>;
  description?: Maybe<Scalars['String']>;
  docs?: Maybe<Array<Maybe<FileContent>>>;
  grafanaDns?: Maybe<Scalars['String']>;
  icon?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  name: Scalars['String'];
};

export type RepositoryConnection = {
  __typename?: 'RepositoryConnection';
  edges?: Maybe<Array<Maybe<RepositoryEdge>>>;
  pageInfo: PageInfo;
};

export type RepositoryContext = {
  __typename?: 'RepositoryContext';
  context?: Maybe<Scalars['Map']>;
  repository: Scalars['String'];
};

export type RepositoryEdge = {
  __typename?: 'RepositoryEdge';
  cursor?: Maybe<Scalars['String']>;
  node?: Maybe<Repository>;
};

export type ResourceSpec = {
  __typename?: 'ResourceSpec';
  cpu?: Maybe<Scalars['String']>;
  memory?: Maybe<Scalars['String']>;
};

export type Resources = {
  __typename?: 'Resources';
  limits?: Maybe<ResourceSpec>;
  requests?: Maybe<ResourceSpec>;
};

export type Role = {
  __typename?: 'Role';
  description?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  name: Scalars['String'];
  permissions?: Maybe<Array<Maybe<Permission>>>;
  repositories?: Maybe<Array<Maybe<Scalars['String']>>>;
  roleBindings?: Maybe<Array<Maybe<RoleBinding>>>;
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export type RoleAttributes = {
  description?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  permissions?: InputMaybe<Array<InputMaybe<Permission>>>;
  repositories?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  roleBindings?: InputMaybe<Array<InputMaybe<BindingAttributes>>>;
};

export type RoleBinding = {
  __typename?: 'RoleBinding';
  group?: Maybe<Group>;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  updatedAt?: Maybe<Scalars['DateTime']>;
  user?: Maybe<User>;
};

export type RoleConnection = {
  __typename?: 'RoleConnection';
  edges?: Maybe<Array<Maybe<RoleEdge>>>;
  pageInfo: PageInfo;
};

export type RoleEdge = {
  __typename?: 'RoleEdge';
  cursor?: Maybe<Scalars['String']>;
  node?: Maybe<Role>;
};

export type RollingUpdate = {
  __typename?: 'RollingUpdate';
  maxSurge?: Maybe<Scalars['Int']>;
  maxUnavailable?: Maybe<Scalars['Int']>;
};

export type RootMutationType = {
  __typename?: 'RootMutationType';
  approveBuild?: Maybe<Build>;
  cancelBuild?: Maybe<Build>;
  createBuild?: Maybe<Build>;
  createGroup?: Maybe<Group>;
  createGroupMember?: Maybe<GroupMember>;
  createInvite?: Maybe<Invite>;
  createPeer?: Maybe<WireguardPeer>;
  createRole?: Maybe<Role>;
  createUpgradePolicy?: Maybe<UpgradePolicy>;
  createWebhook?: Maybe<Webhook>;
  deleteGroup?: Maybe<Group>;
  deleteGroupMember?: Maybe<GroupMember>;
  deleteJob?: Maybe<Job>;
  deleteNode?: Maybe<Node>;
  deletePeer?: Maybe<WireguardPeer>;
  deletePod?: Maybe<Pod>;
  deleteRole?: Maybe<Role>;
  deleteUpgradePolicy?: Maybe<UpgradePolicy>;
  deleteWebhook?: Maybe<Webhook>;
  executeRunbook?: Maybe<RunbookActionResponse>;
  installRecipe?: Maybe<Build>;
  installStack?: Maybe<Build>;
  loginLink?: Maybe<User>;
  markRead?: Maybe<User>;
  oauthCallback?: Maybe<User>;
  overlayConfiguration?: Maybe<Build>;
  readNotifications?: Maybe<User>;
  restartBuild?: Maybe<Build>;
  signIn?: Maybe<User>;
  signup?: Maybe<User>;
  updateConfiguration?: Maybe<Configuration>;
  updateGroup?: Maybe<Group>;
  updateRole?: Maybe<Role>;
  updateSmtp?: Maybe<Smtp>;
  updateUser?: Maybe<User>;
};


export type RootMutationTypeApproveBuildArgs = {
  id: Scalars['ID'];
};


export type RootMutationTypeCancelBuildArgs = {
  id: Scalars['ID'];
};


export type RootMutationTypeCreateBuildArgs = {
  attributes: BuildAttributes;
};


export type RootMutationTypeCreateGroupArgs = {
  attributes: GroupAttributes;
};


export type RootMutationTypeCreateGroupMemberArgs = {
  groupId: Scalars['ID'];
  userId: Scalars['ID'];
};


export type RootMutationTypeCreateInviteArgs = {
  attributes: InviteAttributes;
};


export type RootMutationTypeCreatePeerArgs = {
  email?: InputMaybe<Scalars['String']>;
  name: Scalars['String'];
  userId?: InputMaybe<Scalars['ID']>;
};


export type RootMutationTypeCreateRoleArgs = {
  attributes: RoleAttributes;
};


export type RootMutationTypeCreateUpgradePolicyArgs = {
  attributes: UpgradePolicyAttributes;
};


export type RootMutationTypeCreateWebhookArgs = {
  attributes: WebhookAttributes;
};


export type RootMutationTypeDeleteGroupArgs = {
  groupId: Scalars['ID'];
};


export type RootMutationTypeDeleteGroupMemberArgs = {
  groupId: Scalars['ID'];
  userId: Scalars['ID'];
};


export type RootMutationTypeDeleteJobArgs = {
  name: Scalars['String'];
  namespace: Scalars['String'];
};


export type RootMutationTypeDeleteNodeArgs = {
  name: Scalars['String'];
};


export type RootMutationTypeDeletePeerArgs = {
  name: Scalars['String'];
};


export type RootMutationTypeDeletePodArgs = {
  name: Scalars['String'];
  namespace: Scalars['String'];
};


export type RootMutationTypeDeleteRoleArgs = {
  id: Scalars['ID'];
};


export type RootMutationTypeDeleteUpgradePolicyArgs = {
  id: Scalars['ID'];
};


export type RootMutationTypeDeleteWebhookArgs = {
  id: Scalars['ID'];
};


export type RootMutationTypeExecuteRunbookArgs = {
  input: RunbookActionInput;
  name: Scalars['String'];
  namespace: Scalars['String'];
};


export type RootMutationTypeInstallRecipeArgs = {
  context: Scalars['Map'];
  id: Scalars['ID'];
  oidc?: InputMaybe<Scalars['Boolean']>;
};


export type RootMutationTypeInstallStackArgs = {
  context: ContextAttributes;
  name: Scalars['String'];
  oidc?: InputMaybe<Scalars['Boolean']>;
};


export type RootMutationTypeLoginLinkArgs = {
  key: Scalars['String'];
};


export type RootMutationTypeMarkReadArgs = {
  type?: InputMaybe<ReadType>;
};


export type RootMutationTypeOauthCallbackArgs = {
  code: Scalars['String'];
  redirect?: InputMaybe<Scalars['String']>;
};


export type RootMutationTypeOverlayConfigurationArgs = {
  context: Scalars['Map'];
  namespace: Scalars['String'];
};


export type RootMutationTypeRestartBuildArgs = {
  id: Scalars['ID'];
};


export type RootMutationTypeSignInArgs = {
  email: Scalars['String'];
  password: Scalars['String'];
};


export type RootMutationTypeSignupArgs = {
  attributes: UserAttributes;
  inviteId: Scalars['String'];
};


export type RootMutationTypeUpdateConfigurationArgs = {
  content: Scalars['String'];
  message?: InputMaybe<Scalars['String']>;
  repository: Scalars['String'];
  tool?: InputMaybe<Tool>;
};


export type RootMutationTypeUpdateGroupArgs = {
  attributes: GroupAttributes;
  groupId: Scalars['ID'];
};


export type RootMutationTypeUpdateRoleArgs = {
  attributes: RoleAttributes;
  id: Scalars['ID'];
};


export type RootMutationTypeUpdateSmtpArgs = {
  smtp: SmtpInput;
};


export type RootMutationTypeUpdateUserArgs = {
  attributes: UserAttributes;
  id?: InputMaybe<Scalars['ID']>;
};

export type RootQueryType = {
  __typename?: 'RootQueryType';
  application?: Maybe<Application>;
  applications?: Maybe<Array<Maybe<Application>>>;
  auditMetrics?: Maybe<Array<Maybe<AuditMetric>>>;
  audits?: Maybe<AuditConnection>;
  build?: Maybe<Build>;
  buildInfo?: Maybe<BuildInfo>;
  builds?: Maybe<BuildConnection>;
  cachedPods?: Maybe<Array<Maybe<Pod>>>;
  certificate?: Maybe<Certificate>;
  clusterInfo?: Maybe<ClusterInfo>;
  configuration?: Maybe<ConsoleConfiguration>;
  configurationOverlays?: Maybe<Array<Maybe<ConfigurationOverlay>>>;
  context?: Maybe<Array<Maybe<RepositoryContext>>>;
  cronJob?: Maybe<CronJob>;
  dashboard?: Maybe<Dashboard>;
  dashboards?: Maybe<Array<Maybe<Dashboard>>>;
  deployment?: Maybe<Deployment>;
  externalToken?: Maybe<Scalars['String']>;
  groupMembers?: Maybe<GroupMemberConnection>;
  groups?: Maybe<GroupConnection>;
  ingress?: Maybe<Ingress>;
  installations?: Maybe<InstallationConnection>;
  invite?: Maybe<Invite>;
  job?: Maybe<Job>;
  logFilters?: Maybe<Array<Maybe<LogFilter>>>;
  loginInfo?: Maybe<LoginInfo>;
  logs?: Maybe<Array<Maybe<LogStream>>>;
  me?: Maybe<User>;
  metric?: Maybe<Array<Maybe<MetricResponse>>>;
  myWireguardPeers?: Maybe<Array<Maybe<WireguardPeer>>>;
  namespaces?: Maybe<Array<Maybe<Namespace>>>;
  node?: Maybe<Node>;
  nodeMetric?: Maybe<NodeMetric>;
  nodeMetrics?: Maybe<Array<Maybe<NodeMetric>>>;
  nodes?: Maybe<Array<Maybe<Node>>>;
  notifications?: Maybe<NotificationConnection>;
  pluralContext?: Maybe<PluralContext>;
  pod?: Maybe<Pod>;
  pods?: Maybe<PodConnection>;
  recipe?: Maybe<Recipe>;
  recipes?: Maybe<RecipeConnection>;
  repositories?: Maybe<RepositoryConnection>;
  repository?: Maybe<Repository>;
  role?: Maybe<Role>;
  roles?: Maybe<RoleConnection>;
  runbook?: Maybe<Runbook>;
  runbooks?: Maybe<Array<Maybe<Runbook>>>;
  scalingRecommendation?: Maybe<VerticalPodAutoscaler>;
  service?: Maybe<Service>;
  smtp?: Maybe<Smtp>;
  stack?: Maybe<Stack>;
  statefulSet?: Maybe<StatefulSet>;
  upgradePolicies?: Maybe<Array<Maybe<UpgradePolicy>>>;
  users?: Maybe<UserConnection>;
  webhooks?: Maybe<WebhookConnection>;
  wireguardPeer?: Maybe<WireguardPeer>;
  wireguardPeers?: Maybe<Array<Maybe<WireguardPeer>>>;
};


export type RootQueryTypeApplicationArgs = {
  name: Scalars['String'];
};


export type RootQueryTypeAuditsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  repo?: InputMaybe<Scalars['String']>;
};


export type RootQueryTypeBuildArgs = {
  id: Scalars['ID'];
};


export type RootQueryTypeBuildsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


export type RootQueryTypeCachedPodsArgs = {
  namespaces?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


export type RootQueryTypeCertificateArgs = {
  name: Scalars['String'];
  namespace: Scalars['String'];
};


export type RootQueryTypeConfigurationOverlaysArgs = {
  namespace: Scalars['String'];
};


export type RootQueryTypeCronJobArgs = {
  name: Scalars['String'];
  namespace: Scalars['String'];
};


export type RootQueryTypeDashboardArgs = {
  labels?: InputMaybe<Array<InputMaybe<LabelInput>>>;
  name: Scalars['String'];
  offset?: InputMaybe<Scalars['Int']>;
  repo: Scalars['String'];
  step?: InputMaybe<Scalars['String']>;
};


export type RootQueryTypeDashboardsArgs = {
  repo: Scalars['String'];
};


export type RootQueryTypeDeploymentArgs = {
  name: Scalars['String'];
  namespace: Scalars['String'];
};


export type RootQueryTypeGroupMembersArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  groupId: Scalars['ID'];
  last?: InputMaybe<Scalars['Int']>;
};


export type RootQueryTypeGroupsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  q?: InputMaybe<Scalars['String']>;
};


export type RootQueryTypeIngressArgs = {
  name: Scalars['String'];
  namespace: Scalars['String'];
};


export type RootQueryTypeInstallationsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


export type RootQueryTypeInviteArgs = {
  id: Scalars['String'];
};


export type RootQueryTypeJobArgs = {
  name: Scalars['String'];
  namespace: Scalars['String'];
};


export type RootQueryTypeLogFiltersArgs = {
  namespace: Scalars['String'];
};


export type RootQueryTypeLoginInfoArgs = {
  redirect?: InputMaybe<Scalars['String']>;
};


export type RootQueryTypeLogsArgs = {
  end?: InputMaybe<Scalars['Long']>;
  limit: Scalars['Int'];
  query: Scalars['String'];
  start?: InputMaybe<Scalars['Long']>;
};


export type RootQueryTypeMetricArgs = {
  offset?: InputMaybe<Scalars['Int']>;
  query: Scalars['String'];
  step?: InputMaybe<Scalars['String']>;
};


export type RootQueryTypeNodeArgs = {
  name: Scalars['String'];
};


export type RootQueryTypeNodeMetricArgs = {
  name: Scalars['String'];
};


export type RootQueryTypeNotificationsArgs = {
  after?: InputMaybe<Scalars['String']>;
  all?: InputMaybe<Scalars['Boolean']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


export type RootQueryTypePodArgs = {
  name: Scalars['String'];
  namespace: Scalars['String'];
};


export type RootQueryTypePodsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  namespaces?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


export type RootQueryTypeRecipeArgs = {
  id: Scalars['ID'];
};


export type RootQueryTypeRecipesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id: Scalars['ID'];
  last?: InputMaybe<Scalars['Int']>;
};


export type RootQueryTypeRepositoriesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  query: Scalars['String'];
};


export type RootQueryTypeRepositoryArgs = {
  name: Scalars['String'];
};


export type RootQueryTypeRolesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  q?: InputMaybe<Scalars['String']>;
};


export type RootQueryTypeRunbookArgs = {
  name: Scalars['String'];
  namespace: Scalars['String'];
};


export type RootQueryTypeRunbooksArgs = {
  namespace: Scalars['String'];
  pinned?: InputMaybe<Scalars['Boolean']>;
};


export type RootQueryTypeScalingRecommendationArgs = {
  kind: AutoscalingTarget;
  name: Scalars['String'];
  namespace: Scalars['String'];
};


export type RootQueryTypeServiceArgs = {
  name: Scalars['String'];
  namespace: Scalars['String'];
};


export type RootQueryTypeStackArgs = {
  name: Scalars['String'];
};


export type RootQueryTypeStatefulSetArgs = {
  name: Scalars['String'];
  namespace: Scalars['String'];
};


export type RootQueryTypeUsersArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  q?: InputMaybe<Scalars['String']>;
};


export type RootQueryTypeWebhooksArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


export type RootQueryTypeWireguardPeerArgs = {
  name: Scalars['String'];
};

export type RootSubscriptionType = {
  __typename?: 'RootSubscriptionType';
  applicationDelta?: Maybe<ApplicationDelta>;
  buildDelta?: Maybe<BuildDelta>;
  commandDelta?: Maybe<CommandDelta>;
  notificationDelta?: Maybe<NotificationDelta>;
  podDelta?: Maybe<PodDelta>;
};


export type RootSubscriptionTypeBuildDeltaArgs = {
  buildId?: InputMaybe<Scalars['ID']>;
};


export type RootSubscriptionTypeCommandDeltaArgs = {
  buildId: Scalars['ID'];
};

export type Runbook = {
  __typename?: 'Runbook';
  data?: Maybe<Array<Maybe<RunbookData>>>;
  executions?: Maybe<RunbookExecutionConnection>;
  name: Scalars['String'];
  spec: RunbookSpec;
  status?: Maybe<RunbookStatus>;
};


export type RunbookDataArgs = {
  context?: InputMaybe<RunbookContext>;
};


export type RunbookExecutionsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

export type RunbookAction = {
  __typename?: 'RunbookAction';
  configuration?: Maybe<ConfigurationAction>;
  name: Scalars['String'];
  type: Scalars['String'];
};

export type RunbookActionInput = {
  action: Scalars['String'];
  context: Scalars['Map'];
};

export type RunbookActionResponse = {
  __typename?: 'RunbookActionResponse';
  redirectTo?: Maybe<Scalars['String']>;
};

export type RunbookAlertStatus = {
  __typename?: 'RunbookAlertStatus';
  annotations?: Maybe<Scalars['Map']>;
  fingerprint?: Maybe<Scalars['String']>;
  labels?: Maybe<Scalars['Map']>;
  name: Scalars['String'];
  startsAt?: Maybe<Scalars['String']>;
};

export type RunbookContext = {
  timeseriesStart?: InputMaybe<Scalars['Int']>;
  timeseriesStep?: InputMaybe<Scalars['String']>;
};

export type RunbookData = {
  __typename?: 'RunbookData';
  kubernetes?: Maybe<KubernetesData>;
  name: Scalars['String'];
  nodes?: Maybe<Array<Maybe<Node>>>;
  prometheus?: Maybe<Array<Maybe<MetricResponse>>>;
  source?: Maybe<RunbookDatasource>;
};

export type RunbookDatasource = {
  __typename?: 'RunbookDatasource';
  kubernetes?: Maybe<KubernetesDatasource>;
  name: Scalars['String'];
  prometheus?: Maybe<PrometheusDatasource>;
  type: Scalars['String'];
};

export type RunbookExecution = {
  __typename?: 'RunbookExecution';
  context: Scalars['Map'];
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  name: Scalars['String'];
  namespace: Scalars['String'];
  updatedAt?: Maybe<Scalars['DateTime']>;
  user?: Maybe<User>;
};

export type RunbookExecutionConnection = {
  __typename?: 'RunbookExecutionConnection';
  edges?: Maybe<Array<Maybe<RunbookExecutionEdge>>>;
  pageInfo: PageInfo;
};

export type RunbookExecutionEdge = {
  __typename?: 'RunbookExecutionEdge';
  cursor?: Maybe<Scalars['String']>;
  node?: Maybe<RunbookExecution>;
};

export type RunbookSpec = {
  __typename?: 'RunbookSpec';
  actions?: Maybe<Array<Maybe<RunbookAction>>>;
  datasources?: Maybe<Array<Maybe<RunbookDatasource>>>;
  description?: Maybe<Scalars['String']>;
  display?: Maybe<Scalars['Map']>;
  name: Scalars['String'];
};

export type RunbookStatus = {
  __typename?: 'RunbookStatus';
  alerts?: Maybe<Array<Maybe<RunbookAlertStatus>>>;
};

export type RunningState = {
  __typename?: 'RunningState';
  startedAt?: Maybe<Scalars['String']>;
};

export type SecretKeySelector = {
  __typename?: 'SecretKeySelector';
  key?: Maybe<Scalars['String']>;
  name: Scalars['String'];
};

export type Service = {
  __typename?: 'Service';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  pods?: Maybe<Array<Maybe<Pod>>>;
  raw: Scalars['String'];
  spec: ServiceSpec;
  status: ServiceStatus;
};

export type ServicePort = {
  __typename?: 'ServicePort';
  name?: Maybe<Scalars['String']>;
  port?: Maybe<Scalars['Int']>;
  protocol?: Maybe<Scalars['String']>;
  targetPort?: Maybe<Scalars['String']>;
};

export type ServiceSpec = {
  __typename?: 'ServiceSpec';
  clusterIp?: Maybe<Scalars['String']>;
  ports?: Maybe<Array<Maybe<ServicePort>>>;
  selector?: Maybe<Scalars['Map']>;
  type?: Maybe<Scalars['String']>;
};

export type ServiceStatus = {
  __typename?: 'ServiceStatus';
  loadBalancer?: Maybe<LoadBalancerStatus>;
};

export enum Severity {
  Critical = 'CRITICAL',
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM',
  None = 'NONE'
}

export type Smtp = {
  __typename?: 'Smtp';
  password?: Maybe<Scalars['String']>;
  port?: Maybe<Scalars['Int']>;
  sender?: Maybe<Scalars['String']>;
  server?: Maybe<Scalars['String']>;
  user?: Maybe<Scalars['String']>;
};

export type SmtpInput = {
  password?: InputMaybe<Scalars['String']>;
  port?: InputMaybe<Scalars['Int']>;
  sender?: InputMaybe<Scalars['String']>;
  server?: InputMaybe<Scalars['String']>;
  user?: InputMaybe<Scalars['String']>;
};

export type Stack = {
  __typename?: 'Stack';
  bundles?: Maybe<Array<Maybe<Recipe>>>;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  name: Scalars['String'];
  sections?: Maybe<Array<Maybe<RecipeSection>>>;
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export type StatefulSet = {
  __typename?: 'StatefulSet';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  pods?: Maybe<Array<Maybe<Pod>>>;
  raw: Scalars['String'];
  spec: StatefulSetSpec;
  status: StatefulSetStatus;
};

export type StatefulSetSpec = {
  __typename?: 'StatefulSetSpec';
  replicas?: Maybe<Scalars['Int']>;
  serviceName?: Maybe<Scalars['String']>;
};

export type StatefulSetStatus = {
  __typename?: 'StatefulSetStatus';
  currentReplicas?: Maybe<Scalars['Int']>;
  readyReplicas?: Maybe<Scalars['Int']>;
  replicas?: Maybe<Scalars['Int']>;
  updatedReplicas?: Maybe<Scalars['Int']>;
};

export enum Status {
  Cancelled = 'CANCELLED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Queued = 'QUEUED',
  Running = 'RUNNING',
  Successful = 'SUCCESSFUL'
}

export type StatusComponent = {
  __typename?: 'StatusComponent';
  group?: Maybe<Scalars['String']>;
  kind: Scalars['String'];
  name: Scalars['String'];
  status: Scalars['String'];
};

export type StatusCondition = {
  __typename?: 'StatusCondition';
  message: Scalars['String'];
  reason: Scalars['String'];
  status: Scalars['String'];
  type: Scalars['String'];
};

export type TerminatedState = {
  __typename?: 'TerminatedState';
  exitCode?: Maybe<Scalars['Int']>;
  finishedAt?: Maybe<Scalars['String']>;
  message?: Maybe<Scalars['String']>;
  reason?: Maybe<Scalars['String']>;
  startedAt?: Maybe<Scalars['String']>;
};

export enum Tool {
  Helm = 'HELM',
  Terraform = 'TERRAFORM'
}

export type UpgradePolicy = {
  __typename?: 'UpgradePolicy';
  description?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  name: Scalars['String'];
  target: Scalars['String'];
  type: UpgradePolicyType;
  updatedAt?: Maybe<Scalars['DateTime']>;
  weight?: Maybe<Scalars['Int']>;
};

export type UpgradePolicyAttributes = {
  description?: InputMaybe<Scalars['String']>;
  name: Scalars['String'];
  target: Scalars['String'];
  type: UpgradePolicyType;
  weight?: InputMaybe<Scalars['Int']>;
};

export enum UpgradePolicyType {
  Approval = 'APPROVAL',
  Deploy = 'DEPLOY',
  Ignore = 'IGNORE'
}

export type User = {
  __typename?: 'User';
  backgroundColor?: Maybe<Scalars['String']>;
  boundRoles?: Maybe<Array<Maybe<Role>>>;
  buildTimestamp?: Maybe<Scalars['DateTime']>;
  deletedAt?: Maybe<Scalars['DateTime']>;
  email: Scalars['String'];
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  jwt?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  profile?: Maybe<Scalars['String']>;
  readTimestamp?: Maybe<Scalars['DateTime']>;
  roles?: Maybe<UserRoles>;
  unreadNotifications?: Maybe<Scalars['Int']>;
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export type UserAttributes = {
  email?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  password?: InputMaybe<Scalars['String']>;
  roles?: InputMaybe<UserRoleAttributes>;
};

export type UserConnection = {
  __typename?: 'UserConnection';
  edges?: Maybe<Array<Maybe<UserEdge>>>;
  pageInfo: PageInfo;
};

export type UserEdge = {
  __typename?: 'UserEdge';
  cursor?: Maybe<Scalars['String']>;
  node?: Maybe<User>;
};

export type UserRoleAttributes = {
  admin?: InputMaybe<Scalars['Boolean']>;
};

export type UserRoles = {
  __typename?: 'UserRoles';
  admin?: Maybe<Scalars['Boolean']>;
};

export type VerticalPodAutoscaler = {
  __typename?: 'VerticalPodAutoscaler';
  metadata: Metadata;
  spec: VerticalPodAutoscalerSpec;
  status?: Maybe<VerticalPodAutoscalerStatus>;
};

export type VerticalPodAutoscalerSpec = {
  __typename?: 'VerticalPodAutoscalerSpec';
  targetRef: CrossVersionResourceTarget;
  updatePolicy: VerticalPodAutoscalerUpdatePolicy;
};

export type VerticalPodAutoscalerStatus = {
  __typename?: 'VerticalPodAutoscalerStatus';
  recommendation?: Maybe<Recommendation>;
};

export type VerticalPodAutoscalerUpdatePolicy = {
  __typename?: 'VerticalPodAutoscalerUpdatePolicy';
  updateMode?: Maybe<Scalars['String']>;
};

export type WaitingState = {
  __typename?: 'WaitingState';
  message?: Maybe<Scalars['String']>;
  reason?: Maybe<Scalars['String']>;
};

export type Webhook = {
  __typename?: 'Webhook';
  health: WebhookHealth;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  type: WebhookType;
  updatedAt?: Maybe<Scalars['DateTime']>;
  url: Scalars['String'];
};

export type WebhookAttributes = {
  url: Scalars['String'];
};

export type WebhookConnection = {
  __typename?: 'WebhookConnection';
  edges?: Maybe<Array<Maybe<WebhookEdge>>>;
  pageInfo: PageInfo;
};

export type WebhookEdge = {
  __typename?: 'WebhookEdge';
  cursor?: Maybe<Scalars['String']>;
  node?: Maybe<Webhook>;
};

export enum WebhookHealth {
  Healthy = 'HEALTHY',
  Unhealthy = 'UNHEALTHY'
}

export enum WebhookType {
  Piazza = 'PIAZZA',
  Slack = 'SLACK'
}

export type WireguardPeer = {
  __typename?: 'WireguardPeer';
  config?: Maybe<Scalars['String']>;
  metadata: Metadata;
  raw: Scalars['String'];
  spec: WireguardPeerSpec;
  status: WireguardPeerStatus;
  user?: Maybe<User>;
};

export type WireguardPeerSpec = {
  __typename?: 'WireguardPeerSpec';
  address?: Maybe<Scalars['String']>;
  publicKey?: Maybe<Scalars['String']>;
  wireguardRef?: Maybe<Scalars['String']>;
};

export type WireguardPeerStatus = {
  __typename?: 'WireguardPeerStatus';
  conditions?: Maybe<Array<Maybe<StatusCondition>>>;
  ready?: Maybe<Scalars['Boolean']>;
};
