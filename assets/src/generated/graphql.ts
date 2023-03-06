/* eslint-disable */
import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
const defaultOptions = {} as const;
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

export type ActionItem = {
  __typename?: 'ActionItem';
  link: Scalars['String'];
  type: ActionItemType;
};

export enum ActionItemType {
  Blog = 'BLOG',
  Issue = 'ISSUE',
  Pull = 'PULL'
}

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
  userManagement?: Maybe<Scalars['Boolean']>;
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

export type ClusterInformation = {
  __typename?: 'ClusterInformation';
  gitCommit?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  platform?: Maybe<Scalars['String']>;
  updatedAt?: Maybe<Scalars['DateTime']>;
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

export type ConsentRequest = {
  __typename?: 'ConsentRequest';
  requestedScope?: Maybe<Array<Maybe<Scalars['String']>>>;
  skip?: Maybe<Scalars['Boolean']>;
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

export type File = {
  __typename?: 'File';
  blob: Scalars['String'];
  contentType?: Maybe<Scalars['String']>;
  filename?: Maybe<Scalars['String']>;
  filesize?: Maybe<Scalars['Int']>;
  height?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  mediaType?: Maybe<MediaType>;
  message: IncidentMessage;
  updatedAt?: Maybe<Scalars['DateTime']>;
  width?: Maybe<Scalars['Int']>;
};

export type FileConnection = {
  __typename?: 'FileConnection';
  edges?: Maybe<Array<Maybe<FileEdge>>>;
  pageInfo: PageInfo;
};

export type FileContent = {
  __typename?: 'FileContent';
  content?: Maybe<Scalars['String']>;
  path?: Maybe<Scalars['String']>;
};

export type FileEdge = {
  __typename?: 'FileEdge';
  cursor?: Maybe<Scalars['String']>;
  node?: Maybe<File>;
};

export type Follower = {
  __typename?: 'Follower';
  id: Scalars['ID'];
  incident?: Maybe<Incident>;
  insertedAt?: Maybe<Scalars['DateTime']>;
  preferences?: Maybe<NotificationPreferences>;
  updatedAt?: Maybe<Scalars['DateTime']>;
  user: User;
};

export type FollowerConnection = {
  __typename?: 'FollowerConnection';
  edges?: Maybe<Array<Maybe<FollowerEdge>>>;
  pageInfo: PageInfo;
};

export type FollowerEdge = {
  __typename?: 'FollowerEdge';
  cursor?: Maybe<Scalars['String']>;
  node?: Maybe<Follower>;
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

export type Incident = {
  __typename?: 'Incident';
  clusterInformation?: Maybe<ClusterInformation>;
  creator: User;
  description?: Maybe<Scalars['String']>;
  files?: Maybe<FileConnection>;
  follower?: Maybe<Follower>;
  followers?: Maybe<FollowerConnection>;
  history?: Maybe<IncidentHistoryConnection>;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  messages?: Maybe<IncidentMessageConnection>;
  nextResponseAt?: Maybe<Scalars['DateTime']>;
  notificationCount?: Maybe<Scalars['Int']>;
  owner?: Maybe<User>;
  postmortem?: Maybe<Postmortem>;
  repository: Repository;
  severity: Scalars['Int'];
  status: IncidentStatus;
  subscription?: Maybe<SlimSubscription>;
  tags?: Maybe<Array<Maybe<Tag>>>;
  title: Scalars['String'];
  updatedAt?: Maybe<Scalars['DateTime']>;
};


export type IncidentFilesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


export type IncidentFollowersArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


export type IncidentHistoryArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};


export type IncidentMessagesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

export enum IncidentAction {
  Accept = 'ACCEPT',
  Complete = 'COMPLETE',
  Create = 'CREATE',
  Edit = 'EDIT',
  Severity = 'SEVERITY',
  Status = 'STATUS'
}

export type IncidentChange = {
  __typename?: 'IncidentChange';
  key: Scalars['String'];
  next?: Maybe<Scalars['String']>;
  prev?: Maybe<Scalars['String']>;
};

export type IncidentHistory = {
  __typename?: 'IncidentHistory';
  action: IncidentAction;
  actor: User;
  changes?: Maybe<Array<Maybe<IncidentChange>>>;
  id: Scalars['ID'];
  incident: Incident;
  insertedAt?: Maybe<Scalars['DateTime']>;
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export type IncidentHistoryConnection = {
  __typename?: 'IncidentHistoryConnection';
  edges?: Maybe<Array<Maybe<IncidentHistoryEdge>>>;
  pageInfo: PageInfo;
};

export type IncidentHistoryEdge = {
  __typename?: 'IncidentHistoryEdge';
  cursor?: Maybe<Scalars['String']>;
  node?: Maybe<IncidentHistory>;
};

export type IncidentMessage = {
  __typename?: 'IncidentMessage';
  creator: User;
  entities?: Maybe<Array<Maybe<MessageEntity>>>;
  file?: Maybe<File>;
  id: Scalars['ID'];
  incident: Incident;
  insertedAt?: Maybe<Scalars['DateTime']>;
  reactions?: Maybe<Array<Maybe<Reaction>>>;
  text: Scalars['String'];
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export type IncidentMessageConnection = {
  __typename?: 'IncidentMessageConnection';
  edges?: Maybe<Array<Maybe<IncidentMessageEdge>>>;
  pageInfo: PageInfo;
};

export type IncidentMessageEdge = {
  __typename?: 'IncidentMessageEdge';
  cursor?: Maybe<Scalars['String']>;
  node?: Maybe<IncidentMessage>;
};

export enum IncidentStatus {
  Complete = 'COMPLETE',
  InProgress = 'IN_PROGRESS',
  Open = 'OPEN',
  Resolved = 'RESOLVED'
}

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

export type Limit = {
  __typename?: 'Limit';
  dimension: Scalars['String'];
  quantity: Scalars['Int'];
};

export type LineItem = {
  __typename?: 'LineItem';
  cost: Scalars['Int'];
  dimension: Scalars['String'];
  name: Scalars['String'];
  period?: Maybe<Scalars['String']>;
  type?: Maybe<PlanType>;
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

export enum MediaType {
  Audio = 'AUDIO',
  Image = 'IMAGE',
  Other = 'OTHER',
  Pdf = 'PDF',
  Video = 'VIDEO'
}

export type MessageEntity = {
  __typename?: 'MessageEntity';
  endIndex?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  startIndex?: Maybe<Scalars['Int']>;
  text?: Maybe<Scalars['String']>;
  type: MessageEntityType;
  updatedAt?: Maybe<Scalars['DateTime']>;
  user?: Maybe<User>;
};

export enum MessageEntityType {
  Emoji = 'EMOJI',
  Mention = 'MENTION'
}

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

export type NotificationPreferences = {
  __typename?: 'NotificationPreferences';
  incidentUpdate?: Maybe<Scalars['Boolean']>;
  mention?: Maybe<Scalars['Boolean']>;
  message?: Maybe<Scalars['Boolean']>;
};

export enum NotificationStatus {
  Firing = 'FIRING',
  Resolved = 'RESOLVED'
}

/** Supported OIDC authentication methods. */
export enum OidcAuthMethod {
  Basic = 'BASIC',
  Post = 'POST'
}

export type OidcProvider = {
  __typename?: 'OidcProvider';
  authMethod: OidcAuthMethod;
  bindings?: Maybe<Array<Maybe<OidcProviderBinding>>>;
  clientId: Scalars['String'];
  clientSecret: Scalars['String'];
  configuration?: Maybe<OuathConfiguration>;
  consent?: Maybe<ConsentRequest>;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  redirectUris?: Maybe<Array<Maybe<Scalars['String']>>>;
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export type OidcProviderBinding = {
  __typename?: 'OidcProviderBinding';
  group?: Maybe<Group>;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  updatedAt?: Maybe<Scalars['DateTime']>;
  user?: Maybe<User>;
};

export type OuathConfiguration = {
  __typename?: 'OuathConfiguration';
  authorizationEndpoint?: Maybe<Scalars['String']>;
  issuer?: Maybe<Scalars['String']>;
  jwksUri?: Maybe<Scalars['String']>;
  tokenEndpoint?: Maybe<Scalars['String']>;
  userinfoEndpoint?: Maybe<Scalars['String']>;
};

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

export type Plan = {
  __typename?: 'Plan';
  cost: Scalars['Int'];
  default?: Maybe<Scalars['Boolean']>;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  lineItems?: Maybe<PlanLineItems>;
  metadata?: Maybe<PlanMetadata>;
  name: Scalars['String'];
  period?: Maybe<Scalars['String']>;
  serviceLevels?: Maybe<Array<Maybe<ServiceLevel>>>;
  updatedAt?: Maybe<Scalars['DateTime']>;
  visible: Scalars['Boolean'];
};

export type PlanFeature = {
  __typename?: 'PlanFeature';
  description: Scalars['String'];
  name: Scalars['String'];
};

export type PlanFeatures = {
  __typename?: 'PlanFeatures';
  audit?: Maybe<Scalars['Boolean']>;
  userManagement?: Maybe<Scalars['Boolean']>;
  vpn?: Maybe<Scalars['Boolean']>;
};

export type PlanLineItems = {
  __typename?: 'PlanLineItems';
  included?: Maybe<Array<Maybe<Limit>>>;
  items?: Maybe<Array<Maybe<LineItem>>>;
};

export type PlanMetadata = {
  __typename?: 'PlanMetadata';
  features?: Maybe<Array<Maybe<PlanFeature>>>;
  freeform?: Maybe<Scalars['Map']>;
};

export enum PlanType {
  Licensed = 'LICENSED',
  Metered = 'METERED'
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

export type Postmortem = {
  __typename?: 'Postmortem';
  actionItems?: Maybe<Array<Maybe<ActionItem>>>;
  content: Scalars['String'];
  creator: User;
  id: Scalars['ID'];
  insertedAt?: Maybe<Scalars['DateTime']>;
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export type PrometheusDatasource = {
  __typename?: 'PrometheusDatasource';
  format?: Maybe<Scalars['String']>;
  legend?: Maybe<Scalars['String']>;
  query: Scalars['String'];
};

export type Reaction = {
  __typename?: 'Reaction';
  creator: User;
  insertedAt?: Maybe<Scalars['DateTime']>;
  message: IncidentMessage;
  name: Scalars['String'];
  updatedAt?: Maybe<Scalars['DateTime']>;
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
  deletePeer?: Maybe<Scalars['Boolean']>;
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

export type ServiceLevel = {
  __typename?: 'ServiceLevel';
  maxSeverity?: Maybe<Scalars['Int']>;
  minSeverity?: Maybe<Scalars['Int']>;
  responseTime?: Maybe<Scalars['Int']>;
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

export type SlimSubscription = {
  __typename?: 'SlimSubscription';
  id: Scalars['ID'];
  lineItems?: Maybe<SubscriptionLineItems>;
  plan?: Maybe<Plan>;
};

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

export type SubscriptionLineItems = {
  __typename?: 'SubscriptionLineItems';
  items?: Maybe<Array<Maybe<Limit>>>;
};

export type Tag = {
  __typename?: 'Tag';
  id: Scalars['ID'];
  tag: Scalars['String'];
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
  status?: Maybe<WireguardPeerStatus>;
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

export type CostAnalysisFragment = { __typename?: 'CostAnalysis', minutes?: number | null, cpuCost?: number | null, pvCost?: number | null, ramCost?: number | null, totalCost?: number | null };

export type FileContentFragment = { __typename?: 'FileContent', content?: string | null, path?: string | null };

export type ConfigurationFragment = { __typename?: 'Configuration', terraform?: string | null, helm?: string | null };

export type ApplicationSpecFragment = { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', type: string, icons?: Array<string | null> | null, description?: string | null, version: string, links?: Array<{ __typename?: 'ApplicationLink', description?: string | null, url?: string | null } | null> | null }, components?: Array<{ __typename?: 'Component', group: string, kind: string } | null> | null };

export type ApplicationStatusFragment = { __typename?: 'ApplicationStatus', componentsReady: string, components?: Array<{ __typename?: 'StatusComponent', group?: string | null, kind: string, name: string, status: string } | null> | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null };

export type ApplicationFragment = { __typename?: 'Application', name: string, spec: { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', type: string, icons?: Array<string | null> | null, description?: string | null, version: string, links?: Array<{ __typename?: 'ApplicationLink', description?: string | null, url?: string | null } | null> | null }, components?: Array<{ __typename?: 'Component', group: string, kind: string } | null> | null }, status: { __typename?: 'ApplicationStatus', componentsReady: string, components?: Array<{ __typename?: 'StatusComponent', group?: string | null, kind: string, name: string, status: string } | null> | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, cost?: { __typename?: 'CostAnalysis', minutes?: number | null, cpuCost?: number | null, pvCost?: number | null, ramCost?: number | null, totalCost?: number | null } | null };

export type MetadataFragment = { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null };

export type ConfigurationOverlayFragment = { __typename?: 'ConfigurationOverlay', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, spec: { __typename?: 'ConfigurationOverlaySpec', name?: string | null, folder?: string | null, subfolder?: string | null, documentation?: string | null, inputType?: string | null, inputValues?: Array<string | null> | null, updates?: Array<{ __typename?: 'OverlayUpdate', path?: Array<string | null> | null } | null> | null } };

export type AppQueryVariables = Exact<{
  name: Scalars['String'];
}>;


export type AppQuery = { __typename?: 'RootQueryType', application?: { __typename?: 'Application', name: string, configuration?: { __typename?: 'Configuration', helm?: string | null, terraform?: string | null } | null, spec: { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', type: string, icons?: Array<string | null> | null, description?: string | null, version: string, links?: Array<{ __typename?: 'ApplicationLink', description?: string | null, url?: string | null } | null> | null }, components?: Array<{ __typename?: 'Component', group: string, kind: string } | null> | null }, status: { __typename?: 'ApplicationStatus', componentsReady: string, components?: Array<{ __typename?: 'StatusComponent', group?: string | null, kind: string, name: string, status: string } | null> | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, cost?: { __typename?: 'CostAnalysis', minutes?: number | null, cpuCost?: number | null, pvCost?: number | null, ramCost?: number | null, totalCost?: number | null } | null } | null, configurationOverlays?: Array<{ __typename?: 'ConfigurationOverlay', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, spec: { __typename?: 'ConfigurationOverlaySpec', name?: string | null, folder?: string | null, subfolder?: string | null, documentation?: string | null, inputType?: string | null, inputValues?: Array<string | null> | null, updates?: Array<{ __typename?: 'OverlayUpdate', path?: Array<string | null> | null } | null> | null } } | null> | null };

export type RepositoryFragment = { __typename?: 'Repository', id: string, name: string, icon?: string | null, description?: string | null, grafanaDns?: string | null, configuration?: { __typename?: 'Configuration', terraform?: string | null, helm?: string | null } | null, docs?: Array<{ __typename?: 'FileContent', content?: string | null, path?: string | null } | null> | null };

export type RepositoryQueryVariables = Exact<{
  name: Scalars['String'];
}>;


export type RepositoryQuery = { __typename?: 'RootQueryType', repository?: { __typename?: 'Repository', id: string, name: string, icon?: string | null, description?: string | null, grafanaDns?: string | null, configuration?: { __typename?: 'Configuration', terraform?: string | null, helm?: string | null } | null, docs?: Array<{ __typename?: 'FileContent', content?: string | null, path?: string | null } | null> | null } | null };

export type AuditFragment = { __typename?: 'Audit', id: string, type: AuditType, action: AuditAction, repository?: string | null, ip?: string | null, city?: string | null, country?: string | null, latitude?: string | null, longitude?: string | null, insertedAt?: Date | null, actor?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null };

export type PageInfoFragment = { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null };

export type BuildFragment = { __typename?: 'Build', id: string, repository: string, type: BuildType, sha?: string | null, status: Status, message?: string | null, insertedAt?: Date | null, completedAt?: Date | null, creator?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, approver?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null };

export type CommandFragment = { __typename?: 'Command', id: string, command: string, exitCode?: number | null, stdout?: string | null, completedAt?: Date | null, insertedAt?: Date | null };

export type ChangelogFragment = { __typename?: 'Changelog', id: string, repo: string, tool: string, content?: string | null };

export type UpgradePolicyFragment = { __typename?: 'UpgradePolicy', id: string, name: string, type: UpgradePolicyType, target: string, weight?: number | null, description?: string | null };

export type BuildsQueryVariables = Exact<{
  cursor?: InputMaybe<Scalars['String']>;
}>;


export type BuildsQuery = { __typename?: 'RootQueryType', builds?: { __typename?: 'BuildConnection', pageInfo: { __typename?: 'PageInfo', endCursor?: string | null, hasNextPage: boolean }, edges?: Array<{ __typename?: 'BuildEdge', node?: { __typename?: 'Build', id: string, repository: string, type: BuildType, sha?: string | null, status: Status, message?: string | null, insertedAt?: Date | null, completedAt?: Date | null, creator?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, approver?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null } | null } | null> | null } | null };

export type BuildQueryVariables = Exact<{
  buildId: Scalars['ID'];
}>;


export type BuildQuery = { __typename?: 'RootQueryType', build?: { __typename?: 'Build', id: string, repository: string, type: BuildType, sha?: string | null, status: Status, message?: string | null, insertedAt?: Date | null, completedAt?: Date | null, commands?: { __typename?: 'CommandConnection', edges?: Array<{ __typename?: 'CommandEdge', node?: { __typename?: 'Command', id: string, command: string, exitCode?: number | null, stdout?: string | null, completedAt?: Date | null, insertedAt?: Date | null } | null } | null> | null } | null, changelogs?: Array<{ __typename?: 'Changelog', id: string, repo: string, tool: string, content?: string | null } | null> | null, creator?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, approver?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null } | null };

export type UpgradePoliciesQueryVariables = Exact<{ [key: string]: never; }>;


export type UpgradePoliciesQuery = { __typename?: 'RootQueryType', upgradePolicies?: Array<{ __typename?: 'UpgradePolicy', id: string, name: string, type: UpgradePolicyType, target: string, weight?: number | null, description?: string | null } | null> | null };

export type CreateUpgradePolicyMutationVariables = Exact<{
  attributes: UpgradePolicyAttributes;
}>;


export type CreateUpgradePolicyMutation = { __typename?: 'RootMutationType', createUpgradePolicy?: { __typename?: 'UpgradePolicy', id: string, name: string, type: UpgradePolicyType, target: string, weight?: number | null, description?: string | null } | null };

export type DeleteUpgradePolicyMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteUpgradePolicyMutation = { __typename?: 'RootMutationType', deleteUpgradePolicy?: { __typename?: 'UpgradePolicy', id: string, name: string, type: UpgradePolicyType, target: string, weight?: number | null, description?: string | null } | null };

export type CreateBuildMutationVariables = Exact<{
  attributes: BuildAttributes;
}>;


export type CreateBuildMutation = { __typename?: 'RootMutationType', createBuild?: { __typename?: 'Build', id: string, repository: string, type: BuildType, sha?: string | null, status: Status, message?: string | null, insertedAt?: Date | null, completedAt?: Date | null, creator?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, approver?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null } | null };

export type CancelBuildMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type CancelBuildMutation = { __typename?: 'RootMutationType', cancelBuild?: { __typename?: 'Build', id: string, repository: string, type: BuildType, sha?: string | null, status: Status, message?: string | null, insertedAt?: Date | null, completedAt?: Date | null, creator?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, approver?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null } | null };

export type ApproveBuildMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type ApproveBuildMutation = { __typename?: 'RootMutationType', approveBuild?: { __typename?: 'Build', id: string, repository: string, type: BuildType, sha?: string | null, status: Status, message?: string | null, insertedAt?: Date | null, completedAt?: Date | null, creator?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, approver?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null } | null };

export type RestartBuildMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type RestartBuildMutation = { __typename?: 'RootMutationType', restartBuild?: { __typename?: 'Build', id: string, repository: string, type: BuildType, sha?: string | null, status: Status, message?: string | null, insertedAt?: Date | null, completedAt?: Date | null, creator?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, approver?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null } | null };

export type BuildSubSubscriptionVariables = Exact<{
  buildId?: InputMaybe<Scalars['ID']>;
}>;


export type BuildSubSubscription = { __typename?: 'RootSubscriptionType', buildDelta?: { __typename?: 'BuildDelta', delta?: Delta | null, payload?: { __typename?: 'Build', id: string, repository: string, type: BuildType, sha?: string | null, status: Status, message?: string | null, insertedAt?: Date | null, completedAt?: Date | null, changelogs?: Array<{ __typename?: 'Changelog', id: string, repo: string, tool: string, content?: string | null } | null> | null, creator?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, approver?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null } | null } | null };

export type CommandSubsSubscriptionVariables = Exact<{
  buildId: Scalars['ID'];
}>;


export type CommandSubsSubscription = { __typename?: 'RootSubscriptionType', commandDelta?: { __typename?: 'CommandDelta', delta?: Delta | null, payload?: { __typename?: 'Command', id: string, command: string, exitCode?: number | null, stdout?: string | null, completedAt?: Date | null, insertedAt?: Date | null } | null } | null };

export type DashboardFragment = { __typename?: 'Dashboard', id: string, spec: { __typename?: 'DashboardSpec', name?: string | null, description?: string | null, timeslices?: Array<string | null> | null, labels?: Array<{ __typename?: 'DashboardLabel', name: string, values?: Array<string | null> | null } | null> | null, graphs?: Array<{ __typename?: 'DashboardGraph', format?: string | null, name: string, queries?: Array<{ __typename?: 'DashboardMetric', query?: string | null, legend?: string | null, results?: Array<{ __typename?: 'MetricResult', timestamp?: number | null, value?: string | null } | null> | null } | null> | null } | null> | null } };

export type LogStreamFragment = { __typename?: 'LogStream', stream?: Map<string, unknown> | null, values?: Array<{ __typename?: 'MetricResult', timestamp?: number | null, value?: string | null } | null> | null };

export type MetricResponseFragment = { __typename?: 'MetricResponse', metric?: Map<string, unknown> | null, values?: Array<{ __typename?: 'MetricResult', timestamp?: number | null, value?: string | null } | null> | null };

export type DashboardsQueryVariables = Exact<{
  repo: Scalars['String'];
}>;


export type DashboardsQuery = { __typename?: 'RootQueryType', dashboards?: Array<{ __typename?: 'Dashboard', id: string, spec: { __typename?: 'DashboardSpec', name?: string | null, description?: string | null } } | null> | null };

export type DashboardQueryVariables = Exact<{
  repo: Scalars['String'];
  name: Scalars['String'];
  step?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  labels?: InputMaybe<Array<InputMaybe<LabelInput>> | InputMaybe<LabelInput>>;
}>;


export type DashboardQuery = { __typename?: 'RootQueryType', dashboard?: { __typename?: 'Dashboard', id: string, spec: { __typename?: 'DashboardSpec', name?: string | null, description?: string | null, timeslices?: Array<string | null> | null, labels?: Array<{ __typename?: 'DashboardLabel', name: string, values?: Array<string | null> | null } | null> | null, graphs?: Array<{ __typename?: 'DashboardGraph', format?: string | null, name: string, queries?: Array<{ __typename?: 'DashboardMetric', query?: string | null, legend?: string | null, results?: Array<{ __typename?: 'MetricResult', timestamp?: number | null, value?: string | null } | null> | null } | null> | null } | null> | null } } | null };

export type LogsQueryVariables = Exact<{
  query: Scalars['String'];
  start?: InputMaybe<Scalars['Long']>;
  limit: Scalars['Int'];
}>;


export type LogsQuery = { __typename?: 'RootQueryType', logs?: Array<{ __typename?: 'LogStream', stream?: Map<string, unknown> | null, values?: Array<{ __typename?: 'MetricResult', timestamp?: number | null, value?: string | null } | null> | null } | null> | null };

export type MetricsQueryVariables = Exact<{
  query: Scalars['String'];
  offset?: InputMaybe<Scalars['Int']>;
}>;


export type MetricsQuery = { __typename?: 'RootQueryType', metric?: Array<{ __typename?: 'MetricResponse', metric?: Map<string, unknown> | null, values?: Array<{ __typename?: 'MetricResult', timestamp?: number | null, value?: string | null } | null> | null } | null> | null };

export type IncidentUserFragment = { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null };

export type ClusterInformationFragment = { __typename?: 'ClusterInformation', gitCommit?: string | null, version?: string | null, platform?: string | null };

export type RepoFragment = { __typename?: 'Repository', id: string, name: string, description?: string | null, icon?: string | null };

export type PlanFragment = { __typename?: 'Plan', id: string, name: string, cost: number, period?: string | null, lineItems?: { __typename?: 'PlanLineItems', included?: Array<{ __typename?: 'Limit', dimension: string, quantity: number } | null> | null, items?: Array<{ __typename?: 'LineItem', name: string, dimension: string, cost: number, period?: string | null } | null> | null } | null, serviceLevels?: Array<{ __typename?: 'ServiceLevel', minSeverity?: number | null, maxSeverity?: number | null, responseTime?: number | null } | null> | null, metadata?: { __typename?: 'PlanMetadata', features?: Array<{ __typename?: 'PlanFeature', name: string, description: string } | null> | null } | null };

export type PostmortemFragment = { __typename?: 'Postmortem', id: string, content: string, actionItems?: Array<{ __typename?: 'ActionItem', type: ActionItemType, link: string } | null> | null };

export type FollowerFragment = { __typename?: 'Follower', id: string, incident?: { __typename?: 'Incident', id: string } | null, user: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null }, preferences?: { __typename?: 'NotificationPreferences', message?: boolean | null, incidentUpdate?: boolean | null } | null };

export type SubscriptionFragment = { __typename?: 'SlimSubscription', id: string, lineItems?: { __typename?: 'SubscriptionLineItems', items?: Array<{ __typename?: 'Limit', dimension: string, quantity: number } | null> | null } | null, plan?: { __typename?: 'Plan', id: string, name: string, cost: number, period?: string | null, lineItems?: { __typename?: 'PlanLineItems', included?: Array<{ __typename?: 'Limit', dimension: string, quantity: number } | null> | null, items?: Array<{ __typename?: 'LineItem', name: string, dimension: string, cost: number, period?: string | null } | null> | null } | null, serviceLevels?: Array<{ __typename?: 'ServiceLevel', minSeverity?: number | null, maxSeverity?: number | null, responseTime?: number | null } | null> | null, metadata?: { __typename?: 'PlanMetadata', features?: Array<{ __typename?: 'PlanFeature', name: string, description: string } | null> | null } | null } | null };

export type IncidentFragment = { __typename?: 'Incident', id: string, title: string, description?: string | null, severity: number, status: IncidentStatus, notificationCount?: number | null, nextResponseAt?: Date | null, insertedAt?: Date | null, creator: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null }, owner?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null } | null, repository: { __typename?: 'Repository', id: string, name: string, description?: string | null, icon?: string | null }, subscription?: { __typename?: 'SlimSubscription', id: string, lineItems?: { __typename?: 'SubscriptionLineItems', items?: Array<{ __typename?: 'Limit', dimension: string, quantity: number } | null> | null } | null, plan?: { __typename?: 'Plan', id: string, name: string, cost: number, period?: string | null, lineItems?: { __typename?: 'PlanLineItems', included?: Array<{ __typename?: 'Limit', dimension: string, quantity: number } | null> | null, items?: Array<{ __typename?: 'LineItem', name: string, dimension: string, cost: number, period?: string | null } | null> | null } | null, serviceLevels?: Array<{ __typename?: 'ServiceLevel', minSeverity?: number | null, maxSeverity?: number | null, responseTime?: number | null } | null> | null, metadata?: { __typename?: 'PlanMetadata', features?: Array<{ __typename?: 'PlanFeature', name: string, description: string } | null> | null } | null } | null } | null, clusterInformation?: { __typename?: 'ClusterInformation', gitCommit?: string | null, version?: string | null, platform?: string | null } | null, tags?: Array<{ __typename?: 'Tag', tag: string } | null> | null };

export type IncidentHistoryFragment = { __typename?: 'IncidentHistory', id: string, action: IncidentAction, insertedAt?: Date | null, changes?: Array<{ __typename?: 'IncidentChange', key: string, prev?: string | null, next?: string | null } | null> | null, actor: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null } };

export type FileFragment = { __typename?: 'File', id: string, blob: string, mediaType?: MediaType | null, contentType?: string | null, filesize?: number | null, filename?: string | null };

export type IncidentMessageFragment = { __typename?: 'IncidentMessage', id: string, text: string, insertedAt?: Date | null, creator: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null }, reactions?: Array<{ __typename?: 'Reaction', name: string, creator: { __typename?: 'User', id: string, email: string } } | null> | null, file?: { __typename?: 'File', id: string, blob: string, mediaType?: MediaType | null, contentType?: string | null, filesize?: number | null, filename?: string | null } | null, entities?: Array<{ __typename?: 'MessageEntity', type: MessageEntityType, text?: string | null, startIndex?: number | null, endIndex?: number | null, user?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null } | null } | null> | null };

export type IncidentNotificationFragment = { __typename?: 'Notification', id: string, insertedAt?: Date | null };

export type IncidentUserFragment = { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null };

export type ClusterInformationFragment = { __typename?: 'ClusterInformation', gitCommit?: string | null, version?: string | null, platform?: string | null };

export type RepoFragment = { __typename?: 'Repository', id: string, name: string, description?: string | null, icon?: string | null };

export type PlanFragment = { __typename?: 'Plan', id: string, name: string, cost: number, period?: string | null, lineItems?: { __typename?: 'PlanLineItems', included?: Array<{ __typename?: 'Limit', dimension: string, quantity: number } | null> | null, items?: Array<{ __typename?: 'LineItem', name: string, dimension: string, cost: number, period?: string | null } | null> | null } | null, serviceLevels?: Array<{ __typename?: 'ServiceLevel', minSeverity?: number | null, maxSeverity?: number | null, responseTime?: number | null } | null> | null, metadata?: { __typename?: 'PlanMetadata', features?: Array<{ __typename?: 'PlanFeature', name: string, description: string } | null> | null } | null };

export type PostmortemFragment = { __typename?: 'Postmortem', id: string, content: string, actionItems?: Array<{ __typename?: 'ActionItem', type: ActionItemType, link: string } | null> | null };

export type FollowerFragment = { __typename?: 'Follower', id: string, incident?: { __typename?: 'Incident', id: string } | null, user: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null }, preferences?: { __typename?: 'NotificationPreferences', message?: boolean | null, incidentUpdate?: boolean | null } | null };

export type SubscriptionFragment = { __typename?: 'SlimSubscription', id: string, lineItems?: { __typename?: 'SubscriptionLineItems', items?: Array<{ __typename?: 'Limit', dimension: string, quantity: number } | null> | null } | null, plan?: { __typename?: 'Plan', id: string, name: string, cost: number, period?: string | null, lineItems?: { __typename?: 'PlanLineItems', included?: Array<{ __typename?: 'Limit', dimension: string, quantity: number } | null> | null, items?: Array<{ __typename?: 'LineItem', name: string, dimension: string, cost: number, period?: string | null } | null> | null } | null, serviceLevels?: Array<{ __typename?: 'ServiceLevel', minSeverity?: number | null, maxSeverity?: number | null, responseTime?: number | null } | null> | null, metadata?: { __typename?: 'PlanMetadata', features?: Array<{ __typename?: 'PlanFeature', name: string, description: string } | null> | null } | null } | null };

export type IncidentFragment = { __typename?: 'Incident', id: string, title: string, description?: string | null, severity: number, status: IncidentStatus, notificationCount?: number | null, nextResponseAt?: Date | null, insertedAt?: Date | null, creator: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null }, owner?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null } | null, repository: { __typename?: 'Repository', id: string, name: string, description?: string | null, icon?: string | null }, subscription?: { __typename?: 'SlimSubscription', id: string, lineItems?: { __typename?: 'SubscriptionLineItems', items?: Array<{ __typename?: 'Limit', dimension: string, quantity: number } | null> | null } | null, plan?: { __typename?: 'Plan', id: string, name: string, cost: number, period?: string | null, lineItems?: { __typename?: 'PlanLineItems', included?: Array<{ __typename?: 'Limit', dimension: string, quantity: number } | null> | null, items?: Array<{ __typename?: 'LineItem', name: string, dimension: string, cost: number, period?: string | null } | null> | null } | null, serviceLevels?: Array<{ __typename?: 'ServiceLevel', minSeverity?: number | null, maxSeverity?: number | null, responseTime?: number | null } | null> | null, metadata?: { __typename?: 'PlanMetadata', features?: Array<{ __typename?: 'PlanFeature', name: string, description: string } | null> | null } | null } | null } | null, clusterInformation?: { __typename?: 'ClusterInformation', gitCommit?: string | null, version?: string | null, platform?: string | null } | null, tags?: Array<{ __typename?: 'Tag', tag: string } | null> | null };

export type IncidentHistoryFragment = { __typename?: 'IncidentHistory', id: string, action: IncidentAction, insertedAt?: Date | null, changes?: Array<{ __typename?: 'IncidentChange', key: string, prev?: string | null, next?: string | null } | null> | null, actor: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null } };

export type FileFragment = { __typename?: 'File', id: string, blob: string, mediaType?: MediaType | null, contentType?: string | null, filesize?: number | null, filename?: string | null };

export type IncidentMessageFragment = { __typename?: 'IncidentMessage', id: string, text: string, insertedAt?: Date | null, creator: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null }, reactions?: Array<{ __typename?: 'Reaction', name: string, creator: { __typename?: 'User', id: string, email: string } } | null> | null, file?: { __typename?: 'File', id: string, blob: string, mediaType?: MediaType | null, contentType?: string | null, filesize?: number | null, filename?: string | null } | null, entities?: Array<{ __typename?: 'MessageEntity', type: MessageEntityType, text?: string | null, startIndex?: number | null, endIndex?: number | null, user?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null } | null } | null> | null };

export type IncidentNotificationFragment = { __typename?: 'Notification', id: string, insertedAt?: Date | null };

export type GroupMemberFragment = { __typename?: 'GroupMember', user?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: Date | null } | null };

export type GroupFragment = { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: Date | null };

export type GroupsQueryVariables = Exact<{
  q?: InputMaybe<Scalars['String']>;
  cursor?: InputMaybe<Scalars['String']>;
}>;


export type GroupsQuery = { __typename?: 'RootQueryType', groups?: { __typename?: 'GroupConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'GroupEdge', node?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: Date | null } | null } | null> | null } | null };

export type SearchGroupsQueryVariables = Exact<{
  q?: InputMaybe<Scalars['String']>;
  cursor?: InputMaybe<Scalars['String']>;
}>;


export type SearchGroupsQuery = { __typename?: 'RootQueryType', groups?: { __typename?: 'GroupConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'GroupEdge', node?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: Date | null } | null } | null> | null } | null };

export type GroupMembersQueryVariables = Exact<{
  cursor?: InputMaybe<Scalars['String']>;
  id: Scalars['ID'];
}>;


export type GroupMembersQuery = { __typename?: 'RootQueryType', groupMembers?: { __typename?: 'GroupMemberConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'GroupMemberEdge', node?: { __typename?: 'GroupMember', user?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: Date | null } | null } | null } | null> | null } | null };

export type CreateGroupMemberMutationVariables = Exact<{
  groupId: Scalars['ID'];
  userId: Scalars['ID'];
}>;


export type CreateGroupMemberMutation = { __typename?: 'RootMutationType', createGroupMember?: { __typename?: 'GroupMember', user?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: Date | null } | null } | null };

export type DeleteMemberMutationVariables = Exact<{
  groupId: Scalars['ID'];
  userId: Scalars['ID'];
}>;


export type DeleteMemberMutation = { __typename?: 'RootMutationType', deleteGroupMember?: { __typename?: 'GroupMember', user?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: Date | null } | null } | null };

export type CreateGroupMutationVariables = Exact<{
  attributes: GroupAttributes;
}>;


export type CreateGroupMutation = { __typename?: 'RootMutationType', createGroup?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: Date | null } | null };

export type UpdateGroupMutationVariables = Exact<{
  id: Scalars['ID'];
  attributes: GroupAttributes;
}>;


export type UpdateGroupMutation = { __typename?: 'RootMutationType', updateGroup?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: Date | null } | null };

export type DeleteGroupMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteGroupMutation = { __typename?: 'RootMutationType', deleteGroup?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: Date | null } | null };

export type EventFragment = { __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null };

export type PodConditionFragment = { __typename?: 'PodCondition', message?: string | null, reason?: string | null, status?: string | null };

export type ContainerStatusFragment = { __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null };

export type ResourcesFragment = { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null };

export type ContainerFragment = { __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null };

export type PodMiniFragment = { __typename?: 'Pod', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } };

export type PodFragment = { __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } };

export type DeploymentFragment = { __typename?: 'Deployment', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'DeploymentStatus', availableReplicas?: number | null, replicas?: number | null, unavailableReplicas?: number | null }, spec: { __typename?: 'DeploymentSpec', replicas?: number | null, strategy?: { __typename?: 'DeploymentStrategy', type?: string | null } | null } };

export type StatefulSetFragment = { __typename?: 'StatefulSet', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'StatefulSetStatus', replicas?: number | null, currentReplicas?: number | null, readyReplicas?: number | null, updatedReplicas?: number | null }, spec: { __typename?: 'StatefulSetSpec', replicas?: number | null, serviceName?: string | null } };

export type ServiceFragment = { __typename?: 'Service', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'ServiceStatus', loadBalancer?: { __typename?: 'LoadBalancerStatus', ingress?: Array<{ __typename?: 'LoadBalancerIngressStatus', ip?: string | null } | null> | null } | null }, spec: { __typename?: 'ServiceSpec', type?: string | null, clusterIp?: string | null, ports?: Array<{ __typename?: 'ServicePort', name?: string | null, protocol?: string | null, port?: number | null, targetPort?: string | null } | null> | null } };

export type IngressFragment = { __typename?: 'Ingress', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'ServiceStatus', loadBalancer?: { __typename?: 'LoadBalancerStatus', ingress?: Array<{ __typename?: 'LoadBalancerIngressStatus', ip?: string | null, hostname?: string | null } | null> | null } | null }, spec: { __typename?: 'IngressSpec', tls?: Array<{ __typename?: 'IngressTls', hosts?: Array<string | null> | null } | null> | null, rules?: Array<{ __typename?: 'IngressRule', host?: string | null, http?: { __typename?: 'HttpIngressRule', paths?: Array<{ __typename?: 'IngressPath', path?: string | null, backend?: { __typename?: 'IngressBackend', serviceName?: string | null, servicePort?: string | null } | null } | null> | null } | null } | null> | null } };

export type NodeFragment = { __typename?: 'Node', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'NodeStatus', phase?: string | null, allocatable?: Map<string, unknown> | null, capacity?: Map<string, unknown> | null, conditions?: Array<{ __typename?: 'NodeCondition', type?: string | null, status?: string | null, message?: string | null } | null> | null }, spec: { __typename?: 'NodeSpec', podCidr?: string | null, providerId?: string | null } };

export type NodeMetricFragment = { __typename?: 'NodeMetric', timestamp?: string | null, window?: string | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null };

export type CronJobFragment = { __typename?: 'CronJob', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'CronStatus', lastScheduleTime?: string | null }, spec: { __typename?: 'CronSpec', schedule: string, suspend?: boolean | null, concurrencyPolicy?: string | null } };

export type JobStatusFragment = { __typename?: 'JobStatus', active?: number | null, completionTime?: string | null, succeeded?: number | null, failed?: number | null, startTime?: string | null };

export type JobFragment = { __typename?: 'Job', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'JobStatus', active?: number | null, completionTime?: string | null, succeeded?: number | null, failed?: number | null, startTime?: string | null }, spec: { __typename?: 'JobSpec', backoffLimit?: number | null, parallelism?: number | null, activeDeadlineSeconds?: number | null }, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null };

export type LogFilterFragment = { __typename?: 'LogFilter', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, spec: { __typename?: 'LogFilterSpec', name?: string | null, description?: string | null, query?: string | null, labels?: Array<{ __typename?: 'LogLabel', name?: string | null, value?: string | null } | null> | null } };

export type CertificateFragment = { __typename?: 'Certificate', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'CertificateStatus', renewalTime?: string | null, notBefore?: string | null, notAfter?: string | null }, spec: { __typename?: 'CertificateSpec', dnsNames?: Array<string | null> | null, secretName: string, issuerRef?: { __typename?: 'IssuerRef', group?: string | null, kind?: string | null, name?: string | null } | null } };

export type ContainerResourcesFragment = { __typename?: 'ContainerResources', cpu?: string | null, memory?: string | null };

export type VerticalPodAutoscalerFragment = { __typename?: 'VerticalPodAutoscaler', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status?: { __typename?: 'VerticalPodAutoscalerStatus', recommendation?: { __typename?: 'Recommendation', containerRecommendations?: Array<{ __typename?: 'ContainerRecommendation', containerName?: string | null, lowerBound?: { __typename?: 'ContainerResources', cpu?: string | null, memory?: string | null } | null, upperBound?: { __typename?: 'ContainerResources', cpu?: string | null, memory?: string | null } | null, uncappedTarget?: { __typename?: 'ContainerResources', cpu?: string | null, memory?: string | null } | null } | null> | null } | null } | null };

export type OidcProviderFragment = { __typename?: 'OidcProvider', id: string, clientId: string, authMethod: OidcAuthMethod, clientSecret: string, redirectUris?: Array<string | null> | null, bindings?: Array<{ __typename?: 'OidcProviderBinding', id: string, user?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: Date | null } | null } | null> | null };

export type RepositoryFragment = { __typename?: 'Repository', id: string, name: string, description?: string | null, icon?: string | null };

export type SmtpFragment = { __typename?: 'Smtp', server?: string | null, port?: number | null, sender?: string | null, user?: string | null, password?: string | null };

export type InstallationFragment = { __typename?: 'Installation', id: string, repository?: { __typename?: 'Repository', id: string, name: string, icon?: string | null, description?: string | null, grafanaDns?: string | null, configuration?: { __typename?: 'Configuration', terraform?: string | null, helm?: string | null } | null, docs?: Array<{ __typename?: 'FileContent', content?: string | null, path?: string | null } | null> | null } | null };

export type RecipeFragment = { __typename?: 'Recipe', id: string, name: string, description?: string | null, restricted?: boolean | null, provider?: string | null, oidcEnabled?: boolean | null };

export type ConfigurationItemFragment = { __typename?: 'ConfigurationItem', name?: string | null, default?: string | null, documentation?: string | null, type?: string | null, placeholder?: string | null, optional?: boolean | null, condition?: { __typename?: 'ConfigurationCondition', operation?: string | null, field?: string | null, value?: string | null } | null, validation?: { __typename?: 'ConfigurationValidation', type?: string | null, regex?: string | null, message?: string | null } | null };

export type RecipeSectionFragment = { __typename?: 'RecipeSection', id: string, repository?: { __typename?: 'Repository', id: string, name: string, icon?: string | null, description?: string | null, grafanaDns?: string | null, configuration?: { __typename?: 'Configuration', terraform?: string | null, helm?: string | null } | null, docs?: Array<{ __typename?: 'FileContent', content?: string | null, path?: string | null } | null> | null } | null, configuration?: Array<{ __typename?: 'ConfigurationItem', name?: string | null, default?: string | null, documentation?: string | null, type?: string | null, placeholder?: string | null, optional?: boolean | null, condition?: { __typename?: 'ConfigurationCondition', operation?: string | null, field?: string | null, value?: string | null } | null, validation?: { __typename?: 'ConfigurationValidation', type?: string | null, regex?: string | null, message?: string | null } | null } | null> | null, recipeItems?: Array<{ __typename?: 'RecipeItem', id: string, configuration?: Array<{ __typename?: 'ConfigurationItem', name?: string | null, default?: string | null, documentation?: string | null, type?: string | null, placeholder?: string | null, optional?: boolean | null, condition?: { __typename?: 'ConfigurationCondition', operation?: string | null, field?: string | null, value?: string | null } | null, validation?: { __typename?: 'ConfigurationValidation', type?: string | null, regex?: string | null, message?: string | null } | null } | null> | null } | null> | null };

export type SearchQueryVariables = Exact<{
  query: Scalars['String'];
}>;


export type SearchQuery = { __typename?: 'RootQueryType', repositories?: { __typename?: 'RepositoryConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'RepositoryEdge', node?: { __typename?: 'Repository', id: string, name: string, icon?: string | null, description?: string | null, grafanaDns?: string | null, configuration?: { __typename?: 'Configuration', terraform?: string | null, helm?: string | null } | null, docs?: Array<{ __typename?: 'FileContent', content?: string | null, path?: string | null } | null> | null } | null } | null> | null } | null };

export type RecipesQueryVariables = Exact<{
  id: Scalars['ID'];
  cursor?: InputMaybe<Scalars['String']>;
}>;


export type RecipesQuery = { __typename?: 'RootQueryType', recipes?: { __typename?: 'RecipeConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'RecipeEdge', node?: { __typename?: 'Recipe', id: string, name: string, description?: string | null, restricted?: boolean | null, provider?: string | null, oidcEnabled?: boolean | null } | null } | null> | null } | null };

export type RecipeQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type RecipeQuery = { __typename?: 'RootQueryType', recipe?: { __typename?: 'Recipe', id: string, name: string, description?: string | null, restricted?: boolean | null, provider?: string | null, oidcEnabled?: boolean | null, recipeSections?: Array<{ __typename?: 'RecipeSection', id: string, repository?: { __typename?: 'Repository', id: string, name: string, icon?: string | null, description?: string | null, grafanaDns?: string | null, configuration?: { __typename?: 'Configuration', terraform?: string | null, helm?: string | null } | null, docs?: Array<{ __typename?: 'FileContent', content?: string | null, path?: string | null } | null> | null } | null, configuration?: Array<{ __typename?: 'ConfigurationItem', name?: string | null, default?: string | null, documentation?: string | null, type?: string | null, placeholder?: string | null, optional?: boolean | null, condition?: { __typename?: 'ConfigurationCondition', operation?: string | null, field?: string | null, value?: string | null } | null, validation?: { __typename?: 'ConfigurationValidation', type?: string | null, regex?: string | null, message?: string | null } | null } | null> | null, recipeItems?: Array<{ __typename?: 'RecipeItem', id: string, configuration?: Array<{ __typename?: 'ConfigurationItem', name?: string | null, default?: string | null, documentation?: string | null, type?: string | null, placeholder?: string | null, optional?: boolean | null, condition?: { __typename?: 'ConfigurationCondition', operation?: string | null, field?: string | null, value?: string | null } | null, validation?: { __typename?: 'ConfigurationValidation', type?: string | null, regex?: string | null, message?: string | null } | null } | null> | null } | null> | null } | null> | null } | null, context?: Array<{ __typename?: 'RepositoryContext', repository: string, context?: Map<string, unknown> | null } | null> | null };

export type InstallMutationVariables = Exact<{
  id: Scalars['ID'];
  context: Scalars['Map'];
  oidc?: InputMaybe<Scalars['Boolean']>;
}>;


export type InstallMutation = { __typename?: 'RootMutationType', installRecipe?: { __typename?: 'Build', id: string, repository: string, type: BuildType, sha?: string | null, status: Status, message?: string | null, insertedAt?: Date | null, completedAt?: Date | null, creator?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, approver?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null } | null };

export type InstallationsQueryVariables = Exact<{
  cursor?: InputMaybe<Scalars['String']>;
}>;


export type InstallationsQuery = { __typename?: 'RootQueryType', installations?: { __typename?: 'InstallationConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'InstallationEdge', node?: { __typename?: 'Installation', id: string, repository?: { __typename?: 'Repository', id: string, name: string, icon?: string | null, description?: string | null, grafanaDns?: string | null, configuration?: { __typename?: 'Configuration', terraform?: string | null, helm?: string | null } | null, docs?: Array<{ __typename?: 'FileContent', content?: string | null, path?: string | null } | null> | null } | null } | null } | null> | null } | null };

export type ConfigurationsQueryVariables = Exact<{
  cursor?: InputMaybe<Scalars['String']>;
}>;


export type ConfigurationsQuery = { __typename?: 'RootQueryType', installations?: { __typename?: 'InstallationConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'InstallationEdge', node?: { __typename?: 'Installation', id: string, repository?: { __typename?: 'Repository', grafanaDns?: string | null, id: string, name: string, icon?: string | null, description?: string | null, configuration?: { __typename?: 'Configuration', terraform?: string | null, helm?: string | null } | null, docs?: Array<{ __typename?: 'FileContent', content?: string | null, path?: string | null } | null> | null } | null } | null } | null> | null } | null };

export type LicenseFragment = { __typename?: 'License', metadata: { __typename?: 'Metadata', name: string }, status?: { __typename?: 'LicenseStatus', free?: boolean | null, limits?: Map<string, unknown> | null, plan?: string | null, features?: Array<{ __typename?: 'LicenseFeature', name: string, description?: string | null } | null> | null } | null };

export type UpdateConfigurationMutationVariables = Exact<{
  repository: Scalars['String'];
  content: Scalars['String'];
  type?: InputMaybe<Tool>;
}>;


export type UpdateConfigurationMutation = { __typename?: 'RootMutationType', updateConfiguration?: { __typename?: 'Configuration', helm?: string | null, terraform?: string | null } | null };

export type ApplicationsQueryVariables = Exact<{ [key: string]: never; }>;


export type ApplicationsQuery = { __typename?: 'RootQueryType', applications?: Array<{ __typename?: 'Application', name: string, license?: { __typename?: 'License', metadata: { __typename?: 'Metadata', name: string }, status?: { __typename?: 'LicenseStatus', free?: boolean | null, limits?: Map<string, unknown> | null, plan?: string | null, features?: Array<{ __typename?: 'LicenseFeature', name: string, description?: string | null } | null> | null } | null } | null, spec: { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', type: string, icons?: Array<string | null> | null, description?: string | null, version: string, links?: Array<{ __typename?: 'ApplicationLink', description?: string | null, url?: string | null } | null> | null }, components?: Array<{ __typename?: 'Component', group: string, kind: string } | null> | null }, status: { __typename?: 'ApplicationStatus', componentsReady: string, components?: Array<{ __typename?: 'StatusComponent', group?: string | null, kind: string, name: string, status: string } | null> | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, cost?: { __typename?: 'CostAnalysis', minutes?: number | null, cpuCost?: number | null, pvCost?: number | null, ramCost?: number | null, totalCost?: number | null } | null } | null> | null };

export type ApplicationSubSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type ApplicationSubSubscription = { __typename?: 'RootSubscriptionType', applicationDelta?: { __typename?: 'ApplicationDelta', delta?: Delta | null, payload?: { __typename?: 'Application', name: string, spec: { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', type: string, icons?: Array<string | null> | null, description?: string | null, version: string, links?: Array<{ __typename?: 'ApplicationLink', description?: string | null, url?: string | null } | null> | null }, components?: Array<{ __typename?: 'Component', group: string, kind: string } | null> | null }, status: { __typename?: 'ApplicationStatus', componentsReady: string, components?: Array<{ __typename?: 'StatusComponent', group?: string | null, kind: string, name: string, status: string } | null> | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, cost?: { __typename?: 'CostAnalysis', minutes?: number | null, cpuCost?: number | null, pvCost?: number | null, ramCost?: number | null, totalCost?: number | null } | null } | null } | null };

export type LogFiltersQueryVariables = Exact<{
  namespace: Scalars['String'];
}>;


export type LogFiltersQuery = { __typename?: 'RootQueryType', logFilters?: Array<{ __typename?: 'LogFilter', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, spec: { __typename?: 'LogFilterSpec', name?: string | null, description?: string | null, query?: string | null, labels?: Array<{ __typename?: 'LogLabel', name?: string | null, value?: string | null } | null> | null } } | null> | null };

export type SmtpQueryVariables = Exact<{ [key: string]: never; }>;


export type SmtpQuery = { __typename?: 'RootQueryType', smtp?: { __typename?: 'Smtp', server?: string | null, port?: number | null, sender?: string | null, user?: string | null, password?: string | null } | null };

export type UpdateSmtpMutationVariables = Exact<{
  smtp: SmtpInput;
}>;


export type UpdateSmtpMutation = { __typename?: 'RootMutationType', updateSmtp?: { __typename?: 'Smtp', server?: string | null, port?: number | null, sender?: string | null, user?: string | null, password?: string | null } | null };

export type RunbookAlertStatusFragment = { __typename?: 'RunbookAlertStatus', name: string, startsAt?: string | null, labels?: Map<string, unknown> | null, annotations?: Map<string, unknown> | null, fingerprint?: string | null };

export type RunbookExecutionFragment = { __typename?: 'RunbookExecution', id: string, name: string, namespace: string, context: Map<string, unknown>, insertedAt?: Date | null, user?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null };

export type RunbookFragment = { __typename?: 'Runbook', name: string, status?: { __typename?: 'RunbookStatus', alerts?: Array<{ __typename?: 'RunbookAlertStatus', name: string, startsAt?: string | null, labels?: Map<string, unknown> | null, annotations?: Map<string, unknown> | null, fingerprint?: string | null } | null> | null } | null, spec: { __typename?: 'RunbookSpec', name: string, description?: string | null } };

export type RunbookDatasourceFragment = { __typename?: 'RunbookDatasource', name: string, type: string, prometheus?: { __typename?: 'PrometheusDatasource', query: string, format?: string | null, legend?: string | null } | null, kubernetes?: { __typename?: 'KubernetesDatasource', resource: string, name: string } | null };

export type RunbookDataFragment = { __typename?: 'RunbookData', name: string, source?: { __typename?: 'RunbookDatasource', name: string, type: string, prometheus?: { __typename?: 'PrometheusDatasource', query: string, format?: string | null, legend?: string | null } | null, kubernetes?: { __typename?: 'KubernetesDatasource', resource: string, name: string } | null } | null, prometheus?: Array<{ __typename?: 'MetricResponse', metric?: Map<string, unknown> | null, values?: Array<{ __typename?: 'MetricResult', timestamp?: number | null, value?: string | null } | null> | null } | null> | null, nodes?: Array<{ __typename?: 'Node', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'NodeStatus', phase?: string | null, allocatable?: Map<string, unknown> | null, capacity?: Map<string, unknown> | null, conditions?: Array<{ __typename?: 'NodeCondition', type?: string | null, status?: string | null, message?: string | null } | null> | null }, spec: { __typename?: 'NodeSpec', podCidr?: string | null, providerId?: string | null } } | null> | null, kubernetes?: { __typename: 'Deployment', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'DeploymentStatus', availableReplicas?: number | null, replicas?: number | null, unavailableReplicas?: number | null }, spec: { __typename?: 'DeploymentSpec', replicas?: number | null, strategy?: { __typename?: 'DeploymentStrategy', type?: string | null } | null } } | { __typename: 'StatefulSet', raw: string, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'StatefulSetStatus', replicas?: number | null, currentReplicas?: number | null, readyReplicas?: number | null, updatedReplicas?: number | null }, spec: { __typename?: 'StatefulSetSpec', replicas?: number | null, serviceName?: string | null } } | null };

export type UserFragment = { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null };

export type InviteFragment = { __typename?: 'Invite', secureId: string };

export type RoleBindingFragment = { __typename?: 'RoleBinding', id: string, user?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: Date | null } | null };

export type RoleFragment = { __typename?: 'Role', id: string, name: string, description?: string | null, repositories?: Array<string | null> | null, permissions?: Array<Permission | null> | null, roleBindings?: Array<{ __typename?: 'RoleBinding', id: string, user?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: Date | null } | null } | null> | null };

export type ManifestFragment = { __typename?: 'PluralManifest', cluster?: string | null, bucketPrefix?: string | null, network?: { __typename?: 'ManifestNetwork', pluralDns?: boolean | null, subdomain?: string | null } | null };

export type NotificationFragment = { __typename?: 'Notification', id: string, title: string, description?: string | null, repository: string, severity?: Severity | null, labels?: Map<string, unknown> | null, annotations?: Map<string, unknown> | null, seenAt?: Date | null };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'RootQueryType', externalToken?: string | null, me?: { __typename?: 'User', unreadNotifications?: number | null, id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, boundRoles?: Array<{ __typename?: 'Role', id: string, name: string, description?: string | null, repositories?: Array<string | null> | null, permissions?: Array<Permission | null> | null, roleBindings?: Array<{ __typename?: 'RoleBinding', id: string, user?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: Date | null } | null } | null> | null } | null> | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, clusterInfo?: { __typename?: 'ClusterInfo', version?: string | null, platform?: string | null, gitCommit?: string | null } | null, configuration?: { __typename?: 'ConsoleConfiguration', gitCommit?: string | null, isDemoProject?: boolean | null, isSandbox?: boolean | null, pluralLogin?: boolean | null, manifest?: { __typename?: 'PluralManifest', cluster?: string | null, bucketPrefix?: string | null, network?: { __typename?: 'ManifestNetwork', pluralDns?: boolean | null, subdomain?: string | null } | null } | null, gitStatus?: { __typename?: 'GitStatus', cloned?: boolean | null, output?: string | null } | null } | null };

export type SignInMutationVariables = Exact<{
  email: Scalars['String'];
  password: Scalars['String'];
}>;


export type SignInMutation = { __typename?: 'RootMutationType', signIn?: { __typename?: 'User', jwt?: string | null, id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null };

export type UpdateUserMutationVariables = Exact<{
  attributes: UserAttributes;
}>;


export type UpdateUserMutation = { __typename?: 'RootMutationType', updateUser?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null };

export type UsersQueryVariables = Exact<{
  cursor?: InputMaybe<Scalars['String']>;
}>;


export type UsersQuery = { __typename?: 'RootQueryType', users?: { __typename?: 'UserConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'UserEdge', node?: { __typename?: 'User', id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null } | null> | null } | null };

export type InviteUserMutationVariables = Exact<{
  email?: InputMaybe<Scalars['String']>;
}>;


export type InviteUserMutation = { __typename?: 'RootMutationType', createInvite?: { __typename?: 'Invite', secureId: string } | null };

export type InviteQueryVariables = Exact<{
  id: Scalars['String'];
}>;


export type InviteQuery = { __typename?: 'RootQueryType', invite?: { __typename?: 'Invite', email?: string | null } | null };

export type SignUpMutationVariables = Exact<{
  inviteId: Scalars['String'];
  attributes: UserAttributes;
}>;


export type SignUpMutation = { __typename?: 'RootMutationType', signup?: { __typename?: 'User', jwt?: string | null, id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null };

export type LinkMutationVariables = Exact<{
  key: Scalars['String'];
}>;


export type LinkMutation = { __typename?: 'RootMutationType', loginLink?: { __typename?: 'User', jwt?: string | null, id: string, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: Date | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null };

export type NotifsQueryVariables = Exact<{
  all?: InputMaybe<Scalars['Boolean']>;
  cursor?: InputMaybe<Scalars['String']>;
}>;


export type NotifsQuery = { __typename?: 'RootQueryType', notifications?: { __typename?: 'NotificationConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges?: Array<{ __typename?: 'NotificationEdge', node?: { __typename?: 'Notification', id: string, title: string, description?: string | null, repository: string, severity?: Severity | null, labels?: Map<string, unknown> | null, annotations?: Map<string, unknown> | null, seenAt?: Date | null } | null } | null> | null } | null };

export type WebhookFragment = { __typename?: 'Webhook', id: string, url: string, health: WebhookHealth, insertedAt?: Date | null };

export type WebhooksQueryVariables = Exact<{
  cursor?: InputMaybe<Scalars['String']>;
}>;


export type WebhooksQuery = { __typename?: 'RootQueryType', webhooks?: { __typename?: 'WebhookConnection', pageInfo: { __typename?: 'PageInfo', endCursor?: string | null, hasNextPage: boolean }, edges?: Array<{ __typename?: 'WebhookEdge', node?: { __typename?: 'Webhook', id: string, url: string, health: WebhookHealth, insertedAt?: Date | null } | null } | null> | null } | null };

export type CreateWebhookMutationVariables = Exact<{
  attributes: WebhookAttributes;
}>;


export type CreateWebhookMutation = { __typename?: 'RootMutationType', createWebhook?: { __typename?: 'Webhook', id: string, url: string, health: WebhookHealth, insertedAt?: Date | null } | null };

export type DeleteWebhookMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteWebhookMutation = { __typename?: 'RootMutationType', deleteWebhook?: { __typename?: 'Webhook', id: string, url: string, health: WebhookHealth, insertedAt?: Date | null } | null };

export const ApplicationSpecFragmentDoc = gql`
    fragment ApplicationSpec on ApplicationSpec {
  descriptor {
    type
    icons
    description
    version
    links {
      description
      url
    }
  }
  components {
    group
    kind
  }
}
    `;
export const ApplicationStatusFragmentDoc = gql`
    fragment ApplicationStatus on ApplicationStatus {
  components {
    group
    kind
    name
    status
  }
  conditions {
    message
    reason
    status
    type
  }
  componentsReady
}
    `;
export const CostAnalysisFragmentDoc = gql`
    fragment CostAnalysis on CostAnalysis {
  minutes
  cpuCost
  pvCost
  ramCost
  totalCost
}
    `;
export const ApplicationFragmentDoc = gql`
    fragment Application on Application {
  name
  spec {
    ...ApplicationSpec
  }
  status {
    ...ApplicationStatus
  }
  cost {
    ...CostAnalysis
  }
}
    ${ApplicationSpecFragmentDoc}
${ApplicationStatusFragmentDoc}
${CostAnalysisFragmentDoc}`;
export const MetadataFragmentDoc = gql`
    fragment Metadata on Metadata {
  name
  namespace
  labels {
    name
    value
  }
  annotations {
    name
    value
  }
}
    `;
export const ConfigurationOverlayFragmentDoc = gql`
    fragment ConfigurationOverlay on ConfigurationOverlay {
  metadata {
    ...Metadata
  }
  spec {
    name
    folder
    subfolder
    documentation
    inputType
    inputValues
    updates {
      path
    }
  }
}
    ${MetadataFragmentDoc}`;
export const UserFragmentDoc = gql`
    fragment User on User {
  id
  name
  email
  profile
  backgroundColor
  readTimestamp
  roles {
    admin
  }
}
    `;
export const AuditFragmentDoc = gql`
    fragment Audit on Audit {
  id
  type
  action
  repository
  ip
  city
  country
  latitude
  longitude
  actor {
    ...User
  }
  insertedAt
}
    ${UserFragmentDoc}`;
export const PageInfoFragmentDoc = gql`
    fragment PageInfo on PageInfo {
  hasNextPage
  endCursor
}
    `;
export const BuildFragmentDoc = gql`
    fragment Build on Build {
  id
  repository
  type
  sha
  status
  message
  insertedAt
  completedAt
  creator {
    ...User
  }
  approver {
    ...User
  }
}
    ${UserFragmentDoc}`;
export const CommandFragmentDoc = gql`
    fragment Command on Command {
  id
  command
  exitCode
  stdout
  completedAt
  insertedAt
}
    `;
export const ChangelogFragmentDoc = gql`
    fragment Changelog on Changelog {
  id
  repo
  tool
  content
}
    `;
export const UpgradePolicyFragmentDoc = gql`
    fragment UpgradePolicy on UpgradePolicy {
  id
  name
  type
  target
  weight
  description
}
    `;
export const DashboardFragmentDoc = gql`
    fragment Dashboard on Dashboard {
  id
  spec {
    name
    description
    timeslices
    labels {
      name
      values
    }
    graphs {
      queries {
        query
        legend
        results {
          timestamp
          value
        }
      }
      format
      name
    }
  }
}
    `;
export const LogStreamFragmentDoc = gql`
    fragment LogStream on LogStream {
  stream
  values {
    timestamp
    value
  }
}
    `;
export const PostmortemFragmentDoc = gql`
    fragment Postmortem on Postmortem {
  id
  content
  actionItems {
    type
    link
  }
}
    `;
export const IncidentUserFragmentDoc = gql`
    fragment IncidentUser on User {
  id
  name
  email
  profile
  backgroundColor
}
    `;
export const FollowerFragmentDoc = gql`
    fragment Follower on Follower {
  id
  incident {
    id
  }
  user {
    ...IncidentUser
  }
  preferences {
    message
    incidentUpdate
  }
}
    ${IncidentUserFragmentDoc}`;
export const RepoFragmentDoc = gql`
    fragment Repo on Repository {
  id
  name
  description
  icon
}
    `;
export const PlanFragmentDoc = gql`
    fragment Plan on Plan {
  id
  name
  cost
  period
  lineItems {
    included {
      dimension
      quantity
    }
    items {
      name
      dimension
      cost
      period
    }
  }
  serviceLevels {
    minSeverity
    maxSeverity
    responseTime
  }
  metadata {
    features {
      name
      description
    }
  }
}
    `;
export const SubscriptionFragmentDoc = gql`
    fragment Subscription on SlimSubscription {
  id
  lineItems {
    items {
      dimension
      quantity
    }
  }
  plan {
    ...Plan
  }
}
    ${PlanFragmentDoc}`;
export const ClusterInformationFragmentDoc = gql`
    fragment ClusterInformation on ClusterInformation {
  gitCommit
  version
  platform
}
    `;
export const IncidentFragmentDoc = gql`
    fragment Incident on Incident {
  id
  title
  description
  severity
  status
  notificationCount
  nextResponseAt
  creator {
    ...IncidentUser
  }
  owner {
    ...IncidentUser
  }
  repository {
    ...Repo
  }
  subscription {
    ...Subscription
  }
  clusterInformation {
    ...ClusterInformation
  }
  tags {
    tag
  }
  insertedAt
}
    ${IncidentUserFragmentDoc}
${RepoFragmentDoc}
${SubscriptionFragmentDoc}
${ClusterInformationFragmentDoc}`;
export const IncidentHistoryFragmentDoc = gql`
    fragment IncidentHistory on IncidentHistory {
  id
  action
  changes {
    key
    prev
    next
  }
  actor {
    ...IncidentUser
  }
  insertedAt
}
    ${IncidentUserFragmentDoc}`;
export const FileFragmentDoc = gql`
    fragment File on File {
  id
  blob
  mediaType
  contentType
  filesize
  filename
}
    `;
export const IncidentMessageFragmentDoc = gql`
    fragment IncidentMessage on IncidentMessage {
  id
  text
  creator {
    ...IncidentUser
  }
  reactions {
    name
    creator {
      id
      email
    }
  }
  file {
    ...File
  }
  entities {
    type
    user {
      ...IncidentUser
    }
    text
    startIndex
    endIndex
  }
  insertedAt
}
    ${IncidentUserFragmentDoc}
${FileFragmentDoc}`;
export const IncidentNotificationFragmentDoc = gql`
    fragment IncidentNotification on Notification {
  id
  insertedAt
}
    `;
export const PostmortemFragmentDoc = gql`
    fragment Postmortem on Postmortem {
  id
  content
  actionItems {
    type
    link
  }
}
    `;
export const IncidentUserFragmentDoc = gql`
    fragment IncidentUser on User {
  id
  name
  email
  profile
  backgroundColor
}
    `;
export const FollowerFragmentDoc = gql`
    fragment Follower on Follower {
  id
  incident {
    id
  }
  user {
    ...IncidentUser
  }
  preferences {
    message
    incidentUpdate
  }
}
    ${IncidentUserFragmentDoc}`;
export const RepoFragmentDoc = gql`
    fragment Repo on Repository {
  id
  name
  description
  icon
}
    `;
export const PlanFragmentDoc = gql`
    fragment Plan on Plan {
  id
  name
  cost
  period
  lineItems {
    included {
      dimension
      quantity
    }
    items {
      name
      dimension
      cost
      period
    }
  }
  serviceLevels {
    minSeverity
    maxSeverity
    responseTime
  }
  metadata {
    features {
      name
      description
    }
  }
}
    `;
export const SubscriptionFragmentDoc = gql`
    fragment Subscription on SlimSubscription {
  id
  lineItems {
    items {
      dimension
      quantity
    }
  }
  plan {
    ...Plan
  }
}
    ${PlanFragmentDoc}`;
export const ClusterInformationFragmentDoc = gql`
    fragment ClusterInformation on ClusterInformation {
  gitCommit
  version
  platform
}
    `;
export const IncidentFragmentDoc = gql`
    fragment Incident on Incident {
  id
  title
  description
  severity
  status
  notificationCount
  nextResponseAt
  creator {
    ...IncidentUser
  }
  owner {
    ...IncidentUser
  }
  repository {
    ...Repo
  }
  subscription {
    ...Subscription
  }
  clusterInformation {
    ...ClusterInformation
  }
  tags {
    tag
  }
  insertedAt
}
    ${IncidentUserFragmentDoc}
${RepoFragmentDoc}
${SubscriptionFragmentDoc}
${ClusterInformationFragmentDoc}`;
export const IncidentHistoryFragmentDoc = gql`
    fragment IncidentHistory on IncidentHistory {
  id
  action
  changes {
    key
    prev
    next
  }
  actor {
    ...IncidentUser
  }
  insertedAt
}
    ${IncidentUserFragmentDoc}`;
export const FileFragmentDoc = gql`
    fragment File on File {
  id
  blob
  mediaType
  contentType
  filesize
  filename
}
    `;
export const IncidentMessageFragmentDoc = gql`
    fragment IncidentMessage on IncidentMessage {
  id
  text
  creator {
    ...IncidentUser
  }
  reactions {
    name
    creator {
      id
      email
    }
  }
  file {
    ...File
  }
  entities {
    type
    user {
      ...IncidentUser
    }
    text
    startIndex
    endIndex
  }
  insertedAt
}
    ${IncidentUserFragmentDoc}
${FileFragmentDoc}`;
export const IncidentNotificationFragmentDoc = gql`
    fragment IncidentNotification on Notification {
  id
  insertedAt
}
    `;
export const GroupFragmentDoc = gql`
    fragment Group on Group {
  id
  name
  description
  insertedAt
}
    `;
export const GroupMemberFragmentDoc = gql`
    fragment GroupMember on GroupMember {
  user {
    ...User
  }
  group {
    ...Group
  }
}
    ${UserFragmentDoc}
${GroupFragmentDoc}`;
export const EventFragmentDoc = gql`
    fragment Event on Event {
  action
  lastTimestamp
  count
  message
  reason
  type
}
    `;
export const PodConditionFragmentDoc = gql`
    fragment PodCondition on PodCondition {
  message
  reason
  status
}
    `;
export const ContainerStatusFragmentDoc = gql`
    fragment ContainerStatus on ContainerStatus {
  restartCount
  ready
  name
  state {
    running {
      startedAt
    }
    terminated {
      exitCode
      message
      reason
    }
    waiting {
      message
      reason
    }
  }
}
    `;
export const ResourcesFragmentDoc = gql`
    fragment Resources on Resources {
  limits {
    cpu
    memory
  }
  requests {
    cpu
    memory
  }
}
    `;
export const ContainerFragmentDoc = gql`
    fragment Container on Container {
  name
  image
  ports {
    containerPort
    protocol
  }
  resources {
    ...Resources
  }
}
    ${ResourcesFragmentDoc}`;
export const PodMiniFragmentDoc = gql`
    fragment PodMini on Pod {
  metadata {
    ...Metadata
  }
  status {
    phase
    podIp
    reason
    containerStatuses {
      ...ContainerStatus
    }
    initContainerStatuses {
      ...ContainerStatus
    }
    conditions {
      lastProbeTime
      lastTransitionTime
      message
      reason
      status
      type
    }
  }
  spec {
    nodeName
    serviceAccountName
    containers {
      ...Container
    }
    initContainers {
      ...Container
    }
  }
}
    ${MetadataFragmentDoc}
${ContainerStatusFragmentDoc}
${ContainerFragmentDoc}`;
export const ServiceFragmentDoc = gql`
    fragment Service on Service {
  metadata {
    ...Metadata
  }
  status {
    loadBalancer {
      ingress {
        ip
      }
    }
  }
  spec {
    type
    clusterIp
    ports {
      name
      protocol
      port
      targetPort
    }
  }
  raw
}
    ${MetadataFragmentDoc}`;
export const IngressFragmentDoc = gql`
    fragment Ingress on Ingress {
  metadata {
    ...Metadata
  }
  status {
    loadBalancer {
      ingress {
        ip
        hostname
      }
    }
  }
  spec {
    tls {
      hosts
    }
    rules {
      host
      http {
        paths {
          path
          backend {
            serviceName
            servicePort
          }
        }
      }
    }
  }
  raw
}
    ${MetadataFragmentDoc}`;
export const NodeMetricFragmentDoc = gql`
    fragment NodeMetric on NodeMetric {
  metadata {
    ...Metadata
  }
  usage {
    cpu
    memory
  }
  timestamp
  window
}
    ${MetadataFragmentDoc}`;
export const CronJobFragmentDoc = gql`
    fragment CronJob on CronJob {
  metadata {
    ...Metadata
  }
  status {
    lastScheduleTime
  }
  spec {
    schedule
    suspend
    concurrencyPolicy
  }
  raw
}
    ${MetadataFragmentDoc}`;
export const JobStatusFragmentDoc = gql`
    fragment JobStatus on JobStatus {
  active
  completionTime
  succeeded
  failed
  startTime
}
    `;
export const PodFragmentDoc = gql`
    fragment Pod on Pod {
  metadata {
    ...Metadata
  }
  status {
    phase
    podIp
    reason
    containerStatuses {
      ...ContainerStatus
    }
    initContainerStatuses {
      ...ContainerStatus
    }
    conditions {
      lastProbeTime
      lastTransitionTime
      message
      reason
      status
      type
    }
  }
  spec {
    nodeName
    serviceAccountName
    containers {
      ...Container
    }
    initContainers {
      ...Container
    }
  }
  raw
}
    ${MetadataFragmentDoc}
${ContainerStatusFragmentDoc}
${ContainerFragmentDoc}`;
export const JobFragmentDoc = gql`
    fragment Job on Job {
  metadata {
    ...Metadata
  }
  status {
    ...JobStatus
  }
  spec {
    backoffLimit
    parallelism
    activeDeadlineSeconds
  }
  pods {
    ...Pod
  }
  raw
}
    ${MetadataFragmentDoc}
${JobStatusFragmentDoc}
${PodFragmentDoc}`;
export const LogFilterFragmentDoc = gql`
    fragment LogFilter on LogFilter {
  metadata {
    ...Metadata
  }
  spec {
    name
    description
    query
    labels {
      name
      value
    }
  }
}
    ${MetadataFragmentDoc}`;
export const CertificateFragmentDoc = gql`
    fragment Certificate on Certificate {
  metadata {
    ...Metadata
  }
  status {
    renewalTime
    notBefore
    notAfter
  }
  spec {
    dnsNames
    secretName
    issuerRef {
      group
      kind
      name
    }
  }
  raw
}
    ${MetadataFragmentDoc}`;
export const ContainerResourcesFragmentDoc = gql`
    fragment ContainerResources on ContainerResources {
  cpu
  memory
}
    `;
export const VerticalPodAutoscalerFragmentDoc = gql`
    fragment VerticalPodAutoscaler on VerticalPodAutoscaler {
  metadata {
    ...Metadata
  }
  status {
    recommendation {
      containerRecommendations {
        containerName
        lowerBound {
          ...ContainerResources
        }
        upperBound {
          ...ContainerResources
        }
        uncappedTarget {
          ...ContainerResources
        }
      }
    }
  }
}
    ${MetadataFragmentDoc}
${ContainerResourcesFragmentDoc}`;
export const GroupFragmentDoc = gql`
    fragment Group on Group {
  id
  name
  description
  insertedAt
}
    `;
export const OidcProviderFragmentDoc = gql`
    fragment OIDCProvider on OidcProvider {
  id
  clientId
  authMethod
  clientSecret
  redirectUris
  bindings {
    id
    user {
      ...User
    }
    group {
      ...Group
    }
  }
}
    ${UserFragmentDoc}
${GroupFragmentDoc}`;
export const SmtpFragmentDoc = gql`
    fragment Smtp on Smtp {
  server
  port
  sender
  user
  password
}
    `;
export const ConfigurationFragmentDoc = gql`
    fragment Configuration on Configuration {
  terraform
  helm
}
    `;
export const FileContentFragmentDoc = gql`
    fragment FileContent on FileContent {
  content
  path
}
    `;
export const RepositoryFragmentDoc = gql`
    fragment Repository on Repository {
  id
  name
  icon
  description
  grafanaDns
  configuration {
    ...Configuration
  }
  docs {
    ...FileContent
  }
}
    ${ConfigurationFragmentDoc}
${FileContentFragmentDoc}`;
export const InstallationFragmentDoc = gql`
    fragment Installation on Installation {
  id
  repository {
    ...Repository
  }
}
    ${RepositoryFragmentDoc}`;
export const RecipeFragmentDoc = gql`
    fragment Recipe on Recipe {
  id
  name
  description
  restricted
  provider
  oidcEnabled
}
    `;
export const ConfigurationItemFragmentDoc = gql`
    fragment ConfigurationItem on ConfigurationItem {
  name
  default
  documentation
  type
  placeholder
  optional
  condition {
    operation
    field
    value
  }
  validation {
    type
    regex
    message
  }
}
    `;
export const RecipeSectionFragmentDoc = gql`
    fragment RecipeSection on RecipeSection {
  id
  repository {
    ...Repository
  }
  configuration {
    ...ConfigurationItem
  }
  recipeItems {
    id
    configuration {
      ...ConfigurationItem
    }
  }
}
    ${RepositoryFragmentDoc}
${ConfigurationItemFragmentDoc}`;
export const LicenseFragmentDoc = gql`
    fragment License on License {
  metadata {
    name
  }
  status {
    free
    features {
      name
      description
    }
    limits
    plan
  }
}
    `;
export const RunbookExecutionFragmentDoc = gql`
    fragment RunbookExecution on RunbookExecution {
  id
  name
  namespace
  context
  user {
    ...User
  }
  insertedAt
}
    ${UserFragmentDoc}`;
export const RunbookAlertStatusFragmentDoc = gql`
    fragment RunbookAlertStatus on RunbookAlertStatus {
  name
  startsAt
  labels
  annotations
  fingerprint
}
    `;
export const RunbookFragmentDoc = gql`
    fragment Runbook on Runbook {
  name
  status {
    alerts {
      ...RunbookAlertStatus
    }
  }
  spec {
    name
    description
  }
}
    ${RunbookAlertStatusFragmentDoc}`;
export const RunbookDatasourceFragmentDoc = gql`
    fragment RunbookDatasource on RunbookDatasource {
  name
  type
  prometheus {
    query
    format
    legend
  }
  kubernetes {
    resource
    name
  }
}
    `;
export const MetricResponseFragmentDoc = gql`
    fragment MetricResponse on MetricResponse {
  metric
  values {
    timestamp
    value
  }
}
    `;
export const NodeFragmentDoc = gql`
    fragment Node on Node {
  metadata {
    ...Metadata
  }
  status {
    phase
    allocatable
    capacity
    conditions {
      type
      status
      message
    }
  }
  spec {
    podCidr
    providerId
  }
}
    ${MetadataFragmentDoc}`;
export const StatefulSetFragmentDoc = gql`
    fragment StatefulSet on StatefulSet {
  metadata {
    ...Metadata
  }
  status {
    replicas
    currentReplicas
    readyReplicas
    updatedReplicas
  }
  spec {
    replicas
    serviceName
  }
  raw
}
    ${MetadataFragmentDoc}`;
export const DeploymentFragmentDoc = gql`
    fragment Deployment on Deployment {
  metadata {
    ...Metadata
  }
  status {
    availableReplicas
    replicas
    unavailableReplicas
  }
  spec {
    replicas
    strategy {
      type
    }
  }
  raw
}
    ${MetadataFragmentDoc}`;
export const RunbookDataFragmentDoc = gql`
    fragment RunbookData on RunbookData {
  name
  source {
    ...RunbookDatasource
  }
  prometheus {
    ...MetricResponse
  }
  nodes {
    ...Node
  }
  kubernetes {
    __typename
    ... on StatefulSet {
      ...StatefulSet
    }
    ... on Deployment {
      ...Deployment
    }
  }
}
    ${RunbookDatasourceFragmentDoc}
${MetricResponseFragmentDoc}
${NodeFragmentDoc}
${StatefulSetFragmentDoc}
${DeploymentFragmentDoc}`;
export const InviteFragmentDoc = gql`
    fragment Invite on Invite {
  secureId
}
    `;
export const RoleBindingFragmentDoc = gql`
    fragment RoleBinding on RoleBinding {
  id
  user {
    ...User
  }
  group {
    ...Group
  }
}
    ${UserFragmentDoc}
${GroupFragmentDoc}`;
export const RoleFragmentDoc = gql`
    fragment Role on Role {
  id
  name
  description
  repositories
  permissions
  roleBindings {
    ...RoleBinding
  }
}
    ${RoleBindingFragmentDoc}`;
export const ManifestFragmentDoc = gql`
    fragment Manifest on PluralManifest {
  network {
    pluralDns
    subdomain
  }
  cluster
  bucketPrefix
}
    `;
export const NotificationFragmentDoc = gql`
    fragment Notification on Notification {
  id
  title
  description
  repository
  severity
  labels
  annotations
  seenAt
}
    `;
export const WebhookFragmentDoc = gql`
    fragment Webhook on Webhook {
  id
  url
  health
  insertedAt
}
    `;
export const AppDocument = gql`
    query App($name: String!) {
  application(name: $name) {
    configuration {
      helm
      terraform
    }
    ...Application
  }
  configurationOverlays(namespace: $name) {
    ...ConfigurationOverlay
  }
}
    ${ApplicationFragmentDoc}
${ConfigurationOverlayFragmentDoc}`;

/**
 * __useAppQuery__
 *
 * To run a query within a React component, call `useAppQuery` and pass it any options that fit your needs.
 * When your component renders, `useAppQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAppQuery({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useAppQuery(baseOptions: Apollo.QueryHookOptions<AppQuery, AppQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AppQuery, AppQueryVariables>(AppDocument, options);
      }
export function useAppLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AppQuery, AppQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AppQuery, AppQueryVariables>(AppDocument, options);
        }
export type AppQueryHookResult = ReturnType<typeof useAppQuery>;
export type AppLazyQueryHookResult = ReturnType<typeof useAppLazyQuery>;
export type AppQueryResult = Apollo.QueryResult<AppQuery, AppQueryVariables>;
export const RepositoryDocument = gql`
    query Repository($name: String!) {
  repository(name: $name) {
    ...Repository
  }
}
    ${RepositoryFragmentDoc}`;

/**
 * __useRepositoryQuery__
 *
 * To run a query within a React component, call `useRepositoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useRepositoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRepositoryQuery({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useRepositoryQuery(baseOptions: Apollo.QueryHookOptions<RepositoryQuery, RepositoryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RepositoryQuery, RepositoryQueryVariables>(RepositoryDocument, options);
      }
export function useRepositoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RepositoryQuery, RepositoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RepositoryQuery, RepositoryQueryVariables>(RepositoryDocument, options);
        }
export type RepositoryQueryHookResult = ReturnType<typeof useRepositoryQuery>;
export type RepositoryLazyQueryHookResult = ReturnType<typeof useRepositoryLazyQuery>;
export type RepositoryQueryResult = Apollo.QueryResult<RepositoryQuery, RepositoryQueryVariables>;
export const BuildsDocument = gql`
    query Builds($cursor: String) {
  builds(first: 15, after: $cursor) {
    pageInfo {
      endCursor
      hasNextPage
    }
    edges {
      node {
        ...Build
      }
    }
  }
}
    ${BuildFragmentDoc}`;

/**
 * __useBuildsQuery__
 *
 * To run a query within a React component, call `useBuildsQuery` and pass it any options that fit your needs.
 * When your component renders, `useBuildsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBuildsQuery({
 *   variables: {
 *      cursor: // value for 'cursor'
 *   },
 * });
 */
export function useBuildsQuery(baseOptions?: Apollo.QueryHookOptions<BuildsQuery, BuildsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<BuildsQuery, BuildsQueryVariables>(BuildsDocument, options);
      }
export function useBuildsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<BuildsQuery, BuildsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<BuildsQuery, BuildsQueryVariables>(BuildsDocument, options);
        }
export type BuildsQueryHookResult = ReturnType<typeof useBuildsQuery>;
export type BuildsLazyQueryHookResult = ReturnType<typeof useBuildsLazyQuery>;
export type BuildsQueryResult = Apollo.QueryResult<BuildsQuery, BuildsQueryVariables>;
export const BuildDocument = gql`
    query Build($buildId: ID!) {
  build(id: $buildId) {
    ...Build
    commands(first: 100) {
      edges {
        node {
          ...Command
        }
      }
    }
    changelogs {
      ...Changelog
    }
  }
}
    ${BuildFragmentDoc}
${CommandFragmentDoc}
${ChangelogFragmentDoc}`;

/**
 * __useBuildQuery__
 *
 * To run a query within a React component, call `useBuildQuery` and pass it any options that fit your needs.
 * When your component renders, `useBuildQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBuildQuery({
 *   variables: {
 *      buildId: // value for 'buildId'
 *   },
 * });
 */
export function useBuildQuery(baseOptions: Apollo.QueryHookOptions<BuildQuery, BuildQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<BuildQuery, BuildQueryVariables>(BuildDocument, options);
      }
export function useBuildLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<BuildQuery, BuildQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<BuildQuery, BuildQueryVariables>(BuildDocument, options);
        }
export type BuildQueryHookResult = ReturnType<typeof useBuildQuery>;
export type BuildLazyQueryHookResult = ReturnType<typeof useBuildLazyQuery>;
export type BuildQueryResult = Apollo.QueryResult<BuildQuery, BuildQueryVariables>;
export const UpgradePoliciesDocument = gql`
    query UpgradePolicies {
  upgradePolicies {
    ...UpgradePolicy
  }
}
    ${UpgradePolicyFragmentDoc}`;

/**
 * __useUpgradePoliciesQuery__
 *
 * To run a query within a React component, call `useUpgradePoliciesQuery` and pass it any options that fit your needs.
 * When your component renders, `useUpgradePoliciesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUpgradePoliciesQuery({
 *   variables: {
 *   },
 * });
 */
export function useUpgradePoliciesQuery(baseOptions?: Apollo.QueryHookOptions<UpgradePoliciesQuery, UpgradePoliciesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UpgradePoliciesQuery, UpgradePoliciesQueryVariables>(UpgradePoliciesDocument, options);
      }
export function useUpgradePoliciesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UpgradePoliciesQuery, UpgradePoliciesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UpgradePoliciesQuery, UpgradePoliciesQueryVariables>(UpgradePoliciesDocument, options);
        }
export type UpgradePoliciesQueryHookResult = ReturnType<typeof useUpgradePoliciesQuery>;
export type UpgradePoliciesLazyQueryHookResult = ReturnType<typeof useUpgradePoliciesLazyQuery>;
export type UpgradePoliciesQueryResult = Apollo.QueryResult<UpgradePoliciesQuery, UpgradePoliciesQueryVariables>;
export const CreateUpgradePolicyDocument = gql`
    mutation CreateUpgradePolicy($attributes: UpgradePolicyAttributes!) {
  createUpgradePolicy(attributes: $attributes) {
    ...UpgradePolicy
  }
}
    ${UpgradePolicyFragmentDoc}`;
export type CreateUpgradePolicyMutationFn = Apollo.MutationFunction<CreateUpgradePolicyMutation, CreateUpgradePolicyMutationVariables>;

/**
 * __useCreateUpgradePolicyMutation__
 *
 * To run a mutation, you first call `useCreateUpgradePolicyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateUpgradePolicyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createUpgradePolicyMutation, { data, loading, error }] = useCreateUpgradePolicyMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useCreateUpgradePolicyMutation(baseOptions?: Apollo.MutationHookOptions<CreateUpgradePolicyMutation, CreateUpgradePolicyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateUpgradePolicyMutation, CreateUpgradePolicyMutationVariables>(CreateUpgradePolicyDocument, options);
      }
export type CreateUpgradePolicyMutationHookResult = ReturnType<typeof useCreateUpgradePolicyMutation>;
export type CreateUpgradePolicyMutationResult = Apollo.MutationResult<CreateUpgradePolicyMutation>;
export type CreateUpgradePolicyMutationOptions = Apollo.BaseMutationOptions<CreateUpgradePolicyMutation, CreateUpgradePolicyMutationVariables>;
export const DeleteUpgradePolicyDocument = gql`
    mutation DeleteUpgradePolicy($id: ID!) {
  deleteUpgradePolicy(id: $id) {
    ...UpgradePolicy
  }
}
    ${UpgradePolicyFragmentDoc}`;
export type DeleteUpgradePolicyMutationFn = Apollo.MutationFunction<DeleteUpgradePolicyMutation, DeleteUpgradePolicyMutationVariables>;

/**
 * __useDeleteUpgradePolicyMutation__
 *
 * To run a mutation, you first call `useDeleteUpgradePolicyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteUpgradePolicyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteUpgradePolicyMutation, { data, loading, error }] = useDeleteUpgradePolicyMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteUpgradePolicyMutation(baseOptions?: Apollo.MutationHookOptions<DeleteUpgradePolicyMutation, DeleteUpgradePolicyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteUpgradePolicyMutation, DeleteUpgradePolicyMutationVariables>(DeleteUpgradePolicyDocument, options);
      }
export type DeleteUpgradePolicyMutationHookResult = ReturnType<typeof useDeleteUpgradePolicyMutation>;
export type DeleteUpgradePolicyMutationResult = Apollo.MutationResult<DeleteUpgradePolicyMutation>;
export type DeleteUpgradePolicyMutationOptions = Apollo.BaseMutationOptions<DeleteUpgradePolicyMutation, DeleteUpgradePolicyMutationVariables>;
export const CreateBuildDocument = gql`
    mutation CreateBuild($attributes: BuildAttributes!) {
  createBuild(attributes: $attributes) {
    ...Build
  }
}
    ${BuildFragmentDoc}`;
export type CreateBuildMutationFn = Apollo.MutationFunction<CreateBuildMutation, CreateBuildMutationVariables>;

/**
 * __useCreateBuildMutation__
 *
 * To run a mutation, you first call `useCreateBuildMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateBuildMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createBuildMutation, { data, loading, error }] = useCreateBuildMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useCreateBuildMutation(baseOptions?: Apollo.MutationHookOptions<CreateBuildMutation, CreateBuildMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateBuildMutation, CreateBuildMutationVariables>(CreateBuildDocument, options);
      }
export type CreateBuildMutationHookResult = ReturnType<typeof useCreateBuildMutation>;
export type CreateBuildMutationResult = Apollo.MutationResult<CreateBuildMutation>;
export type CreateBuildMutationOptions = Apollo.BaseMutationOptions<CreateBuildMutation, CreateBuildMutationVariables>;
export const CancelBuildDocument = gql`
    mutation CancelBuild($id: ID!) {
  cancelBuild(id: $id) {
    ...Build
  }
}
    ${BuildFragmentDoc}`;
export type CancelBuildMutationFn = Apollo.MutationFunction<CancelBuildMutation, CancelBuildMutationVariables>;

/**
 * __useCancelBuildMutation__
 *
 * To run a mutation, you first call `useCancelBuildMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCancelBuildMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [cancelBuildMutation, { data, loading, error }] = useCancelBuildMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useCancelBuildMutation(baseOptions?: Apollo.MutationHookOptions<CancelBuildMutation, CancelBuildMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CancelBuildMutation, CancelBuildMutationVariables>(CancelBuildDocument, options);
      }
export type CancelBuildMutationHookResult = ReturnType<typeof useCancelBuildMutation>;
export type CancelBuildMutationResult = Apollo.MutationResult<CancelBuildMutation>;
export type CancelBuildMutationOptions = Apollo.BaseMutationOptions<CancelBuildMutation, CancelBuildMutationVariables>;
export const ApproveBuildDocument = gql`
    mutation ApproveBuild($id: ID!) {
  approveBuild(id: $id) {
    ...Build
  }
}
    ${BuildFragmentDoc}`;
export type ApproveBuildMutationFn = Apollo.MutationFunction<ApproveBuildMutation, ApproveBuildMutationVariables>;

/**
 * __useApproveBuildMutation__
 *
 * To run a mutation, you first call `useApproveBuildMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useApproveBuildMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [approveBuildMutation, { data, loading, error }] = useApproveBuildMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useApproveBuildMutation(baseOptions?: Apollo.MutationHookOptions<ApproveBuildMutation, ApproveBuildMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ApproveBuildMutation, ApproveBuildMutationVariables>(ApproveBuildDocument, options);
      }
export type ApproveBuildMutationHookResult = ReturnType<typeof useApproveBuildMutation>;
export type ApproveBuildMutationResult = Apollo.MutationResult<ApproveBuildMutation>;
export type ApproveBuildMutationOptions = Apollo.BaseMutationOptions<ApproveBuildMutation, ApproveBuildMutationVariables>;
export const RestartBuildDocument = gql`
    mutation RestartBuild($id: ID!) {
  restartBuild(id: $id) {
    ...Build
  }
}
    ${BuildFragmentDoc}`;
export type RestartBuildMutationFn = Apollo.MutationFunction<RestartBuildMutation, RestartBuildMutationVariables>;

/**
 * __useRestartBuildMutation__
 *
 * To run a mutation, you first call `useRestartBuildMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRestartBuildMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [restartBuildMutation, { data, loading, error }] = useRestartBuildMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRestartBuildMutation(baseOptions?: Apollo.MutationHookOptions<RestartBuildMutation, RestartBuildMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RestartBuildMutation, RestartBuildMutationVariables>(RestartBuildDocument, options);
      }
export type RestartBuildMutationHookResult = ReturnType<typeof useRestartBuildMutation>;
export type RestartBuildMutationResult = Apollo.MutationResult<RestartBuildMutation>;
export type RestartBuildMutationOptions = Apollo.BaseMutationOptions<RestartBuildMutation, RestartBuildMutationVariables>;
export const BuildSubDocument = gql`
    subscription BuildSub($buildId: ID) {
  buildDelta(buildId: $buildId) {
    delta
    payload {
      ...Build
      changelogs {
        ...Changelog
      }
    }
  }
}
    ${BuildFragmentDoc}
${ChangelogFragmentDoc}`;

/**
 * __useBuildSubSubscription__
 *
 * To run a query within a React component, call `useBuildSubSubscription` and pass it any options that fit your needs.
 * When your component renders, `useBuildSubSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBuildSubSubscription({
 *   variables: {
 *      buildId: // value for 'buildId'
 *   },
 * });
 */
export function useBuildSubSubscription(baseOptions?: Apollo.SubscriptionHookOptions<BuildSubSubscription, BuildSubSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<BuildSubSubscription, BuildSubSubscriptionVariables>(BuildSubDocument, options);
      }
export type BuildSubSubscriptionHookResult = ReturnType<typeof useBuildSubSubscription>;
export type BuildSubSubscriptionResult = Apollo.SubscriptionResult<BuildSubSubscription>;
export const CommandSubsDocument = gql`
    subscription CommandSubs($buildId: ID!) {
  commandDelta(buildId: $buildId) {
    delta
    payload {
      ...Command
    }
  }
}
    ${CommandFragmentDoc}`;

/**
 * __useCommandSubsSubscription__
 *
 * To run a query within a React component, call `useCommandSubsSubscription` and pass it any options that fit your needs.
 * When your component renders, `useCommandSubsSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCommandSubsSubscription({
 *   variables: {
 *      buildId: // value for 'buildId'
 *   },
 * });
 */
export function useCommandSubsSubscription(baseOptions: Apollo.SubscriptionHookOptions<CommandSubsSubscription, CommandSubsSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<CommandSubsSubscription, CommandSubsSubscriptionVariables>(CommandSubsDocument, options);
      }
export type CommandSubsSubscriptionHookResult = ReturnType<typeof useCommandSubsSubscription>;
export type CommandSubsSubscriptionResult = Apollo.SubscriptionResult<CommandSubsSubscription>;
export const DashboardsDocument = gql`
    query Dashboards($repo: String!) {
  dashboards(repo: $repo) {
    id
    spec {
      name
      description
    }
  }
}
    `;

/**
 * __useDashboardsQuery__
 *
 * To run a query within a React component, call `useDashboardsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDashboardsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDashboardsQuery({
 *   variables: {
 *      repo: // value for 'repo'
 *   },
 * });
 */
export function useDashboardsQuery(baseOptions: Apollo.QueryHookOptions<DashboardsQuery, DashboardsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DashboardsQuery, DashboardsQueryVariables>(DashboardsDocument, options);
      }
export function useDashboardsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DashboardsQuery, DashboardsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DashboardsQuery, DashboardsQueryVariables>(DashboardsDocument, options);
        }
export type DashboardsQueryHookResult = ReturnType<typeof useDashboardsQuery>;
export type DashboardsLazyQueryHookResult = ReturnType<typeof useDashboardsLazyQuery>;
export type DashboardsQueryResult = Apollo.QueryResult<DashboardsQuery, DashboardsQueryVariables>;
export const DashboardDocument = gql`
    query Dashboard($repo: String!, $name: String!, $step: String, $offset: Int, $labels: [LabelInput]) {
  dashboard(
    repo: $repo
    name: $name
    step: $step
    offset: $offset
    labels: $labels
  ) {
    ...Dashboard
  }
}
    ${DashboardFragmentDoc}`;

/**
 * __useDashboardQuery__
 *
 * To run a query within a React component, call `useDashboardQuery` and pass it any options that fit your needs.
 * When your component renders, `useDashboardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDashboardQuery({
 *   variables: {
 *      repo: // value for 'repo'
 *      name: // value for 'name'
 *      step: // value for 'step'
 *      offset: // value for 'offset'
 *      labels: // value for 'labels'
 *   },
 * });
 */
export function useDashboardQuery(baseOptions: Apollo.QueryHookOptions<DashboardQuery, DashboardQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DashboardQuery, DashboardQueryVariables>(DashboardDocument, options);
      }
export function useDashboardLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DashboardQuery, DashboardQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DashboardQuery, DashboardQueryVariables>(DashboardDocument, options);
        }
export type DashboardQueryHookResult = ReturnType<typeof useDashboardQuery>;
export type DashboardLazyQueryHookResult = ReturnType<typeof useDashboardLazyQuery>;
export type DashboardQueryResult = Apollo.QueryResult<DashboardQuery, DashboardQueryVariables>;
export const LogsDocument = gql`
    query Logs($query: String!, $start: Long, $limit: Int!) {
  logs(query: $query, start: $start, limit: $limit) {
    ...LogStream
  }
}
    ${LogStreamFragmentDoc}`;

/**
 * __useLogsQuery__
 *
 * To run a query within a React component, call `useLogsQuery` and pass it any options that fit your needs.
 * When your component renders, `useLogsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLogsQuery({
 *   variables: {
 *      query: // value for 'query'
 *      start: // value for 'start'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useLogsQuery(baseOptions: Apollo.QueryHookOptions<LogsQuery, LogsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<LogsQuery, LogsQueryVariables>(LogsDocument, options);
      }
export function useLogsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<LogsQuery, LogsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<LogsQuery, LogsQueryVariables>(LogsDocument, options);
        }
export type LogsQueryHookResult = ReturnType<typeof useLogsQuery>;
export type LogsLazyQueryHookResult = ReturnType<typeof useLogsLazyQuery>;
export type LogsQueryResult = Apollo.QueryResult<LogsQuery, LogsQueryVariables>;
export const MetricsDocument = gql`
    query Metrics($query: String!, $offset: Int) {
  metric(query: $query, offset: $offset) {
    ...MetricResponse
  }
}
    ${MetricResponseFragmentDoc}`;

/**
 * __useMetricsQuery__
 *
 * To run a query within a React component, call `useMetricsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMetricsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMetricsQuery({
 *   variables: {
 *      query: // value for 'query'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useMetricsQuery(baseOptions: Apollo.QueryHookOptions<MetricsQuery, MetricsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MetricsQuery, MetricsQueryVariables>(MetricsDocument, options);
      }
export function useMetricsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MetricsQuery, MetricsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MetricsQuery, MetricsQueryVariables>(MetricsDocument, options);
        }
export type MetricsQueryHookResult = ReturnType<typeof useMetricsQuery>;
export type MetricsLazyQueryHookResult = ReturnType<typeof useMetricsLazyQuery>;
export type MetricsQueryResult = Apollo.QueryResult<MetricsQuery, MetricsQueryVariables>;
export const GroupsDocument = gql`
    query Groups($q: String, $cursor: String) {
  groups(q: $q, first: 20, after: $cursor) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...Group
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${GroupFragmentDoc}`;

/**
 * __useGroupsQuery__
 *
 * To run a query within a React component, call `useGroupsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGroupsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGroupsQuery({
 *   variables: {
 *      q: // value for 'q'
 *      cursor: // value for 'cursor'
 *   },
 * });
 */
export function useGroupsQuery(baseOptions?: Apollo.QueryHookOptions<GroupsQuery, GroupsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GroupsQuery, GroupsQueryVariables>(GroupsDocument, options);
      }
export function useGroupsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GroupsQuery, GroupsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GroupsQuery, GroupsQueryVariables>(GroupsDocument, options);
        }
export type GroupsQueryHookResult = ReturnType<typeof useGroupsQuery>;
export type GroupsLazyQueryHookResult = ReturnType<typeof useGroupsLazyQuery>;
export type GroupsQueryResult = Apollo.QueryResult<GroupsQuery, GroupsQueryVariables>;
export const SearchGroupsDocument = gql`
    query SearchGroups($q: String, $cursor: String) {
  groups(q: $q, after: $cursor, first: 5) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...Group
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${GroupFragmentDoc}`;

/**
 * __useSearchGroupsQuery__
 *
 * To run a query within a React component, call `useSearchGroupsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchGroupsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchGroupsQuery({
 *   variables: {
 *      q: // value for 'q'
 *      cursor: // value for 'cursor'
 *   },
 * });
 */
export function useSearchGroupsQuery(baseOptions?: Apollo.QueryHookOptions<SearchGroupsQuery, SearchGroupsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchGroupsQuery, SearchGroupsQueryVariables>(SearchGroupsDocument, options);
      }
export function useSearchGroupsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchGroupsQuery, SearchGroupsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchGroupsQuery, SearchGroupsQueryVariables>(SearchGroupsDocument, options);
        }
export type SearchGroupsQueryHookResult = ReturnType<typeof useSearchGroupsQuery>;
export type SearchGroupsLazyQueryHookResult = ReturnType<typeof useSearchGroupsLazyQuery>;
export type SearchGroupsQueryResult = Apollo.QueryResult<SearchGroupsQuery, SearchGroupsQueryVariables>;
export const GroupMembersDocument = gql`
    query GroupMembers($cursor: String, $id: ID!) {
  groupMembers(groupId: $id, after: $cursor, first: 20) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...GroupMember
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${GroupMemberFragmentDoc}`;

/**
 * __useGroupMembersQuery__
 *
 * To run a query within a React component, call `useGroupMembersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGroupMembersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGroupMembersQuery({
 *   variables: {
 *      cursor: // value for 'cursor'
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGroupMembersQuery(baseOptions: Apollo.QueryHookOptions<GroupMembersQuery, GroupMembersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GroupMembersQuery, GroupMembersQueryVariables>(GroupMembersDocument, options);
      }
export function useGroupMembersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GroupMembersQuery, GroupMembersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GroupMembersQuery, GroupMembersQueryVariables>(GroupMembersDocument, options);
        }
export type GroupMembersQueryHookResult = ReturnType<typeof useGroupMembersQuery>;
export type GroupMembersLazyQueryHookResult = ReturnType<typeof useGroupMembersLazyQuery>;
export type GroupMembersQueryResult = Apollo.QueryResult<GroupMembersQuery, GroupMembersQueryVariables>;
export const CreateGroupMemberDocument = gql`
    mutation CreateGroupMember($groupId: ID!, $userId: ID!) {
  createGroupMember(groupId: $groupId, userId: $userId) {
    ...GroupMember
  }
}
    ${GroupMemberFragmentDoc}`;
export type CreateGroupMemberMutationFn = Apollo.MutationFunction<CreateGroupMemberMutation, CreateGroupMemberMutationVariables>;

/**
 * __useCreateGroupMemberMutation__
 *
 * To run a mutation, you first call `useCreateGroupMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateGroupMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createGroupMemberMutation, { data, loading, error }] = useCreateGroupMemberMutation({
 *   variables: {
 *      groupId: // value for 'groupId'
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useCreateGroupMemberMutation(baseOptions?: Apollo.MutationHookOptions<CreateGroupMemberMutation, CreateGroupMemberMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateGroupMemberMutation, CreateGroupMemberMutationVariables>(CreateGroupMemberDocument, options);
      }
export type CreateGroupMemberMutationHookResult = ReturnType<typeof useCreateGroupMemberMutation>;
export type CreateGroupMemberMutationResult = Apollo.MutationResult<CreateGroupMemberMutation>;
export type CreateGroupMemberMutationOptions = Apollo.BaseMutationOptions<CreateGroupMemberMutation, CreateGroupMemberMutationVariables>;
export const DeleteMemberDocument = gql`
    mutation DeleteMember($groupId: ID!, $userId: ID!) {
  deleteGroupMember(groupId: $groupId, userId: $userId) {
    ...GroupMember
  }
}
    ${GroupMemberFragmentDoc}`;
export type DeleteMemberMutationFn = Apollo.MutationFunction<DeleteMemberMutation, DeleteMemberMutationVariables>;

/**
 * __useDeleteMemberMutation__
 *
 * To run a mutation, you first call `useDeleteMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteMemberMutation, { data, loading, error }] = useDeleteMemberMutation({
 *   variables: {
 *      groupId: // value for 'groupId'
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useDeleteMemberMutation(baseOptions?: Apollo.MutationHookOptions<DeleteMemberMutation, DeleteMemberMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteMemberMutation, DeleteMemberMutationVariables>(DeleteMemberDocument, options);
      }
export type DeleteMemberMutationHookResult = ReturnType<typeof useDeleteMemberMutation>;
export type DeleteMemberMutationResult = Apollo.MutationResult<DeleteMemberMutation>;
export type DeleteMemberMutationOptions = Apollo.BaseMutationOptions<DeleteMemberMutation, DeleteMemberMutationVariables>;
export const CreateGroupDocument = gql`
    mutation CreateGroup($attributes: GroupAttributes!) {
  createGroup(attributes: $attributes) {
    ...Group
  }
}
    ${GroupFragmentDoc}`;
export type CreateGroupMutationFn = Apollo.MutationFunction<CreateGroupMutation, CreateGroupMutationVariables>;

/**
 * __useCreateGroupMutation__
 *
 * To run a mutation, you first call `useCreateGroupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateGroupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createGroupMutation, { data, loading, error }] = useCreateGroupMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useCreateGroupMutation(baseOptions?: Apollo.MutationHookOptions<CreateGroupMutation, CreateGroupMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateGroupMutation, CreateGroupMutationVariables>(CreateGroupDocument, options);
      }
export type CreateGroupMutationHookResult = ReturnType<typeof useCreateGroupMutation>;
export type CreateGroupMutationResult = Apollo.MutationResult<CreateGroupMutation>;
export type CreateGroupMutationOptions = Apollo.BaseMutationOptions<CreateGroupMutation, CreateGroupMutationVariables>;
export const UpdateGroupDocument = gql`
    mutation UpdateGroup($id: ID!, $attributes: GroupAttributes!) {
  updateGroup(groupId: $id, attributes: $attributes) {
    ...Group
  }
}
    ${GroupFragmentDoc}`;
export type UpdateGroupMutationFn = Apollo.MutationFunction<UpdateGroupMutation, UpdateGroupMutationVariables>;

/**
 * __useUpdateGroupMutation__
 *
 * To run a mutation, you first call `useUpdateGroupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateGroupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateGroupMutation, { data, loading, error }] = useUpdateGroupMutation({
 *   variables: {
 *      id: // value for 'id'
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useUpdateGroupMutation(baseOptions?: Apollo.MutationHookOptions<UpdateGroupMutation, UpdateGroupMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateGroupMutation, UpdateGroupMutationVariables>(UpdateGroupDocument, options);
      }
export type UpdateGroupMutationHookResult = ReturnType<typeof useUpdateGroupMutation>;
export type UpdateGroupMutationResult = Apollo.MutationResult<UpdateGroupMutation>;
export type UpdateGroupMutationOptions = Apollo.BaseMutationOptions<UpdateGroupMutation, UpdateGroupMutationVariables>;
export const DeleteGroupDocument = gql`
    mutation DeleteGroup($id: ID!) {
  deleteGroup(groupId: $id) {
    ...Group
  }
}
    ${GroupFragmentDoc}`;
export type DeleteGroupMutationFn = Apollo.MutationFunction<DeleteGroupMutation, DeleteGroupMutationVariables>;

/**
 * __useDeleteGroupMutation__
 *
 * To run a mutation, you first call `useDeleteGroupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteGroupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteGroupMutation, { data, loading, error }] = useDeleteGroupMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteGroupMutation(baseOptions?: Apollo.MutationHookOptions<DeleteGroupMutation, DeleteGroupMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteGroupMutation, DeleteGroupMutationVariables>(DeleteGroupDocument, options);
      }
export type DeleteGroupMutationHookResult = ReturnType<typeof useDeleteGroupMutation>;
export type DeleteGroupMutationResult = Apollo.MutationResult<DeleteGroupMutation>;
export type DeleteGroupMutationOptions = Apollo.BaseMutationOptions<DeleteGroupMutation, DeleteGroupMutationVariables>;
export const SearchDocument = gql`
    query Search($query: String!) {
  repositories(query: $query, first: 20) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...Repository
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${RepositoryFragmentDoc}`;

/**
 * __useSearchQuery__
 *
 * To run a query within a React component, call `useSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchQuery({
 *   variables: {
 *      query: // value for 'query'
 *   },
 * });
 */
export function useSearchQuery(baseOptions: Apollo.QueryHookOptions<SearchQuery, SearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchQuery, SearchQueryVariables>(SearchDocument, options);
      }
export function useSearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchQuery, SearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchQuery, SearchQueryVariables>(SearchDocument, options);
        }
export type SearchQueryHookResult = ReturnType<typeof useSearchQuery>;
export type SearchLazyQueryHookResult = ReturnType<typeof useSearchLazyQuery>;
export type SearchQueryResult = Apollo.QueryResult<SearchQuery, SearchQueryVariables>;
export const RecipesDocument = gql`
    query Recipes($id: ID!, $cursor: String) {
  recipes(id: $id, after: $cursor, first: 20) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...Recipe
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${RecipeFragmentDoc}`;

/**
 * __useRecipesQuery__
 *
 * To run a query within a React component, call `useRecipesQuery` and pass it any options that fit your needs.
 * When your component renders, `useRecipesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRecipesQuery({
 *   variables: {
 *      id: // value for 'id'
 *      cursor: // value for 'cursor'
 *   },
 * });
 */
export function useRecipesQuery(baseOptions: Apollo.QueryHookOptions<RecipesQuery, RecipesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RecipesQuery, RecipesQueryVariables>(RecipesDocument, options);
      }
export function useRecipesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RecipesQuery, RecipesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RecipesQuery, RecipesQueryVariables>(RecipesDocument, options);
        }
export type RecipesQueryHookResult = ReturnType<typeof useRecipesQuery>;
export type RecipesLazyQueryHookResult = ReturnType<typeof useRecipesLazyQuery>;
export type RecipesQueryResult = Apollo.QueryResult<RecipesQuery, RecipesQueryVariables>;
export const RecipeDocument = gql`
    query Recipe($id: ID!) {
  recipe(id: $id) {
    ...Recipe
    recipeSections {
      ...RecipeSection
    }
  }
  context {
    repository
    context
  }
}
    ${RecipeFragmentDoc}
${RecipeSectionFragmentDoc}`;

/**
 * __useRecipeQuery__
 *
 * To run a query within a React component, call `useRecipeQuery` and pass it any options that fit your needs.
 * When your component renders, `useRecipeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRecipeQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRecipeQuery(baseOptions: Apollo.QueryHookOptions<RecipeQuery, RecipeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RecipeQuery, RecipeQueryVariables>(RecipeDocument, options);
      }
export function useRecipeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RecipeQuery, RecipeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RecipeQuery, RecipeQueryVariables>(RecipeDocument, options);
        }
export type RecipeQueryHookResult = ReturnType<typeof useRecipeQuery>;
export type RecipeLazyQueryHookResult = ReturnType<typeof useRecipeLazyQuery>;
export type RecipeQueryResult = Apollo.QueryResult<RecipeQuery, RecipeQueryVariables>;
export const InstallDocument = gql`
    mutation Install($id: ID!, $context: Map!, $oidc: Boolean) {
  installRecipe(id: $id, context: $context, oidc: $oidc) {
    ...Build
  }
}
    ${BuildFragmentDoc}`;
export type InstallMutationFn = Apollo.MutationFunction<InstallMutation, InstallMutationVariables>;

/**
 * __useInstallMutation__
 *
 * To run a mutation, you first call `useInstallMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useInstallMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [installMutation, { data, loading, error }] = useInstallMutation({
 *   variables: {
 *      id: // value for 'id'
 *      context: // value for 'context'
 *      oidc: // value for 'oidc'
 *   },
 * });
 */
export function useInstallMutation(baseOptions?: Apollo.MutationHookOptions<InstallMutation, InstallMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<InstallMutation, InstallMutationVariables>(InstallDocument, options);
      }
export type InstallMutationHookResult = ReturnType<typeof useInstallMutation>;
export type InstallMutationResult = Apollo.MutationResult<InstallMutation>;
export type InstallMutationOptions = Apollo.BaseMutationOptions<InstallMutation, InstallMutationVariables>;
export const InstallationsDocument = gql`
    query Installations($cursor: String) {
  installations(first: 20, after: $cursor) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        ...Installation
      }
    }
  }
}
    ${InstallationFragmentDoc}`;

/**
 * __useInstallationsQuery__
 *
 * To run a query within a React component, call `useInstallationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useInstallationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useInstallationsQuery({
 *   variables: {
 *      cursor: // value for 'cursor'
 *   },
 * });
 */
export function useInstallationsQuery(baseOptions?: Apollo.QueryHookOptions<InstallationsQuery, InstallationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<InstallationsQuery, InstallationsQueryVariables>(InstallationsDocument, options);
      }
export function useInstallationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<InstallationsQuery, InstallationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<InstallationsQuery, InstallationsQueryVariables>(InstallationsDocument, options);
        }
export type InstallationsQueryHookResult = ReturnType<typeof useInstallationsQuery>;
export type InstallationsLazyQueryHookResult = ReturnType<typeof useInstallationsLazyQuery>;
export type InstallationsQueryResult = Apollo.QueryResult<InstallationsQuery, InstallationsQueryVariables>;
export const ConfigurationsDocument = gql`
    query Configurations($cursor: String) {
  installations(first: 20, after: $cursor) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        id
        repository {
          ...Repository
          configuration {
            ...Configuration
          }
          grafanaDns
        }
      }
    }
  }
}
    ${RepositoryFragmentDoc}
${ConfigurationFragmentDoc}`;

/**
 * __useConfigurationsQuery__
 *
 * To run a query within a React component, call `useConfigurationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useConfigurationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useConfigurationsQuery({
 *   variables: {
 *      cursor: // value for 'cursor'
 *   },
 * });
 */
export function useConfigurationsQuery(baseOptions?: Apollo.QueryHookOptions<ConfigurationsQuery, ConfigurationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ConfigurationsQuery, ConfigurationsQueryVariables>(ConfigurationsDocument, options);
      }
export function useConfigurationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ConfigurationsQuery, ConfigurationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ConfigurationsQuery, ConfigurationsQueryVariables>(ConfigurationsDocument, options);
        }
export type ConfigurationsQueryHookResult = ReturnType<typeof useConfigurationsQuery>;
export type ConfigurationsLazyQueryHookResult = ReturnType<typeof useConfigurationsLazyQuery>;
export type ConfigurationsQueryResult = Apollo.QueryResult<ConfigurationsQuery, ConfigurationsQueryVariables>;
export const UpdateConfigurationDocument = gql`
    mutation UpdateConfiguration($repository: String!, $content: String!, $type: Tool) {
  updateConfiguration(repository: $repository, content: $content, tool: $type) {
    helm
    terraform
  }
}
    `;
export type UpdateConfigurationMutationFn = Apollo.MutationFunction<UpdateConfigurationMutation, UpdateConfigurationMutationVariables>;

/**
 * __useUpdateConfigurationMutation__
 *
 * To run a mutation, you first call `useUpdateConfigurationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateConfigurationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateConfigurationMutation, { data, loading, error }] = useUpdateConfigurationMutation({
 *   variables: {
 *      repository: // value for 'repository'
 *      content: // value for 'content'
 *      type: // value for 'type'
 *   },
 * });
 */
export function useUpdateConfigurationMutation(baseOptions?: Apollo.MutationHookOptions<UpdateConfigurationMutation, UpdateConfigurationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateConfigurationMutation, UpdateConfigurationMutationVariables>(UpdateConfigurationDocument, options);
      }
export type UpdateConfigurationMutationHookResult = ReturnType<typeof useUpdateConfigurationMutation>;
export type UpdateConfigurationMutationResult = Apollo.MutationResult<UpdateConfigurationMutation>;
export type UpdateConfigurationMutationOptions = Apollo.BaseMutationOptions<UpdateConfigurationMutation, UpdateConfigurationMutationVariables>;
export const ApplicationsDocument = gql`
    query Applications {
  applications {
    ...Application
    license {
      ...License
    }
  }
}
    ${ApplicationFragmentDoc}
${LicenseFragmentDoc}`;

/**
 * __useApplicationsQuery__
 *
 * To run a query within a React component, call `useApplicationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useApplicationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useApplicationsQuery({
 *   variables: {
 *   },
 * });
 */
export function useApplicationsQuery(baseOptions?: Apollo.QueryHookOptions<ApplicationsQuery, ApplicationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ApplicationsQuery, ApplicationsQueryVariables>(ApplicationsDocument, options);
      }
export function useApplicationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ApplicationsQuery, ApplicationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ApplicationsQuery, ApplicationsQueryVariables>(ApplicationsDocument, options);
        }
export type ApplicationsQueryHookResult = ReturnType<typeof useApplicationsQuery>;
export type ApplicationsLazyQueryHookResult = ReturnType<typeof useApplicationsLazyQuery>;
export type ApplicationsQueryResult = Apollo.QueryResult<ApplicationsQuery, ApplicationsQueryVariables>;
export const ApplicationSubDocument = gql`
    subscription ApplicationSub {
  applicationDelta {
    delta
    payload {
      ...Application
    }
  }
}
    ${ApplicationFragmentDoc}`;

/**
 * __useApplicationSubSubscription__
 *
 * To run a query within a React component, call `useApplicationSubSubscription` and pass it any options that fit your needs.
 * When your component renders, `useApplicationSubSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useApplicationSubSubscription({
 *   variables: {
 *   },
 * });
 */
export function useApplicationSubSubscription(baseOptions?: Apollo.SubscriptionHookOptions<ApplicationSubSubscription, ApplicationSubSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<ApplicationSubSubscription, ApplicationSubSubscriptionVariables>(ApplicationSubDocument, options);
      }
export type ApplicationSubSubscriptionHookResult = ReturnType<typeof useApplicationSubSubscription>;
export type ApplicationSubSubscriptionResult = Apollo.SubscriptionResult<ApplicationSubSubscription>;
export const LogFiltersDocument = gql`
    query LogFilters($namespace: String!) {
  logFilters(namespace: $namespace) {
    ...LogFilter
  }
}
    ${LogFilterFragmentDoc}`;

/**
 * __useLogFiltersQuery__
 *
 * To run a query within a React component, call `useLogFiltersQuery` and pass it any options that fit your needs.
 * When your component renders, `useLogFiltersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLogFiltersQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *   },
 * });
 */
export function useLogFiltersQuery(baseOptions: Apollo.QueryHookOptions<LogFiltersQuery, LogFiltersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<LogFiltersQuery, LogFiltersQueryVariables>(LogFiltersDocument, options);
      }
export function useLogFiltersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<LogFiltersQuery, LogFiltersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<LogFiltersQuery, LogFiltersQueryVariables>(LogFiltersDocument, options);
        }
export type LogFiltersQueryHookResult = ReturnType<typeof useLogFiltersQuery>;
export type LogFiltersLazyQueryHookResult = ReturnType<typeof useLogFiltersLazyQuery>;
export type LogFiltersQueryResult = Apollo.QueryResult<LogFiltersQuery, LogFiltersQueryVariables>;
export const SmtpDocument = gql`
    query Smtp {
  smtp {
    ...Smtp
  }
}
    ${SmtpFragmentDoc}`;

/**
 * __useSmtpQuery__
 *
 * To run a query within a React component, call `useSmtpQuery` and pass it any options that fit your needs.
 * When your component renders, `useSmtpQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSmtpQuery({
 *   variables: {
 *   },
 * });
 */
export function useSmtpQuery(baseOptions?: Apollo.QueryHookOptions<SmtpQuery, SmtpQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SmtpQuery, SmtpQueryVariables>(SmtpDocument, options);
      }
export function useSmtpLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SmtpQuery, SmtpQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SmtpQuery, SmtpQueryVariables>(SmtpDocument, options);
        }
export type SmtpQueryHookResult = ReturnType<typeof useSmtpQuery>;
export type SmtpLazyQueryHookResult = ReturnType<typeof useSmtpLazyQuery>;
export type SmtpQueryResult = Apollo.QueryResult<SmtpQuery, SmtpQueryVariables>;
export const UpdateSmtpDocument = gql`
    mutation UpdateSmtp($smtp: SmtpInput!) {
  updateSmtp(smtp: $smtp) {
    ...Smtp
  }
}
    ${SmtpFragmentDoc}`;
export type UpdateSmtpMutationFn = Apollo.MutationFunction<UpdateSmtpMutation, UpdateSmtpMutationVariables>;

/**
 * __useUpdateSmtpMutation__
 *
 * To run a mutation, you first call `useUpdateSmtpMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateSmtpMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateSmtpMutation, { data, loading, error }] = useUpdateSmtpMutation({
 *   variables: {
 *      smtp: // value for 'smtp'
 *   },
 * });
 */
export function useUpdateSmtpMutation(baseOptions?: Apollo.MutationHookOptions<UpdateSmtpMutation, UpdateSmtpMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateSmtpMutation, UpdateSmtpMutationVariables>(UpdateSmtpDocument, options);
      }
export type UpdateSmtpMutationHookResult = ReturnType<typeof useUpdateSmtpMutation>;
export type UpdateSmtpMutationResult = Apollo.MutationResult<UpdateSmtpMutation>;
export type UpdateSmtpMutationOptions = Apollo.BaseMutationOptions<UpdateSmtpMutation, UpdateSmtpMutationVariables>;
export const MeDocument = gql`
    query Me {
  me {
    ...User
    boundRoles {
      ...Role
    }
    unreadNotifications
  }
  externalToken
  clusterInfo {
    version
    platform
    gitCommit
  }
  configuration {
    gitCommit
    isDemoProject
    isSandbox
    pluralLogin
    manifest {
      ...Manifest
    }
    gitStatus {
      cloned
      output
    }
  }
}
    ${UserFragmentDoc}
${RoleFragmentDoc}
${ManifestFragmentDoc}`;

/**
 * __useMeQuery__
 *
 * To run a query within a React component, call `useMeQuery` and pass it any options that fit your needs.
 * When your component renders, `useMeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMeQuery({
 *   variables: {
 *   },
 * });
 */
export function useMeQuery(baseOptions?: Apollo.QueryHookOptions<MeQuery, MeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MeQuery, MeQueryVariables>(MeDocument, options);
      }
export function useMeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;
export const SignInDocument = gql`
    mutation signIn($email: String!, $password: String!) {
  signIn(email: $email, password: $password) {
    ...User
    jwt
  }
}
    ${UserFragmentDoc}`;
export type SignInMutationFn = Apollo.MutationFunction<SignInMutation, SignInMutationVariables>;

/**
 * __useSignInMutation__
 *
 * To run a mutation, you first call `useSignInMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSignInMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [signInMutation, { data, loading, error }] = useSignInMutation({
 *   variables: {
 *      email: // value for 'email'
 *      password: // value for 'password'
 *   },
 * });
 */
export function useSignInMutation(baseOptions?: Apollo.MutationHookOptions<SignInMutation, SignInMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SignInMutation, SignInMutationVariables>(SignInDocument, options);
      }
export type SignInMutationHookResult = ReturnType<typeof useSignInMutation>;
export type SignInMutationResult = Apollo.MutationResult<SignInMutation>;
export type SignInMutationOptions = Apollo.BaseMutationOptions<SignInMutation, SignInMutationVariables>;
export const UpdateUserDocument = gql`
    mutation UpdateUser($attributes: UserAttributes!) {
  updateUser(attributes: $attributes) {
    ...User
  }
}
    ${UserFragmentDoc}`;
export type UpdateUserMutationFn = Apollo.MutationFunction<UpdateUserMutation, UpdateUserMutationVariables>;

/**
 * __useUpdateUserMutation__
 *
 * To run a mutation, you first call `useUpdateUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserMutation, { data, loading, error }] = useUpdateUserMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useUpdateUserMutation(baseOptions?: Apollo.MutationHookOptions<UpdateUserMutation, UpdateUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateUserMutation, UpdateUserMutationVariables>(UpdateUserDocument, options);
      }
export type UpdateUserMutationHookResult = ReturnType<typeof useUpdateUserMutation>;
export type UpdateUserMutationResult = Apollo.MutationResult<UpdateUserMutation>;
export type UpdateUserMutationOptions = Apollo.BaseMutationOptions<UpdateUserMutation, UpdateUserMutationVariables>;
export const UsersDocument = gql`
    query Users($cursor: String) {
  users(first: 20, after: $cursor) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        ...User
      }
    }
  }
}
    ${UserFragmentDoc}`;

/**
 * __useUsersQuery__
 *
 * To run a query within a React component, call `useUsersQuery` and pass it any options that fit your needs.
 * When your component renders, `useUsersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUsersQuery({
 *   variables: {
 *      cursor: // value for 'cursor'
 *   },
 * });
 */
export function useUsersQuery(baseOptions?: Apollo.QueryHookOptions<UsersQuery, UsersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UsersQuery, UsersQueryVariables>(UsersDocument, options);
      }
export function useUsersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UsersQuery, UsersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UsersQuery, UsersQueryVariables>(UsersDocument, options);
        }
export type UsersQueryHookResult = ReturnType<typeof useUsersQuery>;
export type UsersLazyQueryHookResult = ReturnType<typeof useUsersLazyQuery>;
export type UsersQueryResult = Apollo.QueryResult<UsersQuery, UsersQueryVariables>;
export const InviteUserDocument = gql`
    mutation InviteUser($email: String) {
  createInvite(attributes: {email: $email}) {
    ...Invite
  }
}
    ${InviteFragmentDoc}`;
export type InviteUserMutationFn = Apollo.MutationFunction<InviteUserMutation, InviteUserMutationVariables>;

/**
 * __useInviteUserMutation__
 *
 * To run a mutation, you first call `useInviteUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useInviteUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [inviteUserMutation, { data, loading, error }] = useInviteUserMutation({
 *   variables: {
 *      email: // value for 'email'
 *   },
 * });
 */
export function useInviteUserMutation(baseOptions?: Apollo.MutationHookOptions<InviteUserMutation, InviteUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<InviteUserMutation, InviteUserMutationVariables>(InviteUserDocument, options);
      }
export type InviteUserMutationHookResult = ReturnType<typeof useInviteUserMutation>;
export type InviteUserMutationResult = Apollo.MutationResult<InviteUserMutation>;
export type InviteUserMutationOptions = Apollo.BaseMutationOptions<InviteUserMutation, InviteUserMutationVariables>;
export const InviteDocument = gql`
    query Invite($id: String!) {
  invite(id: $id) {
    email
  }
}
    `;

/**
 * __useInviteQuery__
 *
 * To run a query within a React component, call `useInviteQuery` and pass it any options that fit your needs.
 * When your component renders, `useInviteQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useInviteQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useInviteQuery(baseOptions: Apollo.QueryHookOptions<InviteQuery, InviteQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<InviteQuery, InviteQueryVariables>(InviteDocument, options);
      }
export function useInviteLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<InviteQuery, InviteQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<InviteQuery, InviteQueryVariables>(InviteDocument, options);
        }
export type InviteQueryHookResult = ReturnType<typeof useInviteQuery>;
export type InviteLazyQueryHookResult = ReturnType<typeof useInviteLazyQuery>;
export type InviteQueryResult = Apollo.QueryResult<InviteQuery, InviteQueryVariables>;
export const SignUpDocument = gql`
    mutation SignUp($inviteId: String!, $attributes: UserAttributes!) {
  signup(inviteId: $inviteId, attributes: $attributes) {
    ...User
    jwt
  }
}
    ${UserFragmentDoc}`;
export type SignUpMutationFn = Apollo.MutationFunction<SignUpMutation, SignUpMutationVariables>;

/**
 * __useSignUpMutation__
 *
 * To run a mutation, you first call `useSignUpMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSignUpMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [signUpMutation, { data, loading, error }] = useSignUpMutation({
 *   variables: {
 *      inviteId: // value for 'inviteId'
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useSignUpMutation(baseOptions?: Apollo.MutationHookOptions<SignUpMutation, SignUpMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SignUpMutation, SignUpMutationVariables>(SignUpDocument, options);
      }
export type SignUpMutationHookResult = ReturnType<typeof useSignUpMutation>;
export type SignUpMutationResult = Apollo.MutationResult<SignUpMutation>;
export type SignUpMutationOptions = Apollo.BaseMutationOptions<SignUpMutation, SignUpMutationVariables>;
export const LinkDocument = gql`
    mutation Link($key: String!) {
  loginLink(key: $key) {
    ...User
    jwt
  }
}
    ${UserFragmentDoc}`;
export type LinkMutationFn = Apollo.MutationFunction<LinkMutation, LinkMutationVariables>;

/**
 * __useLinkMutation__
 *
 * To run a mutation, you first call `useLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [linkMutation, { data, loading, error }] = useLinkMutation({
 *   variables: {
 *      key: // value for 'key'
 *   },
 * });
 */
export function useLinkMutation(baseOptions?: Apollo.MutationHookOptions<LinkMutation, LinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LinkMutation, LinkMutationVariables>(LinkDocument, options);
      }
export type LinkMutationHookResult = ReturnType<typeof useLinkMutation>;
export type LinkMutationResult = Apollo.MutationResult<LinkMutation>;
export type LinkMutationOptions = Apollo.BaseMutationOptions<LinkMutation, LinkMutationVariables>;
export const NotifsDocument = gql`
    query Notifs($all: Boolean, $cursor: String) {
  notifications(all: $all, after: $cursor, first: 50) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...Notification
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${NotificationFragmentDoc}`;

/**
 * __useNotifsQuery__
 *
 * To run a query within a React component, call `useNotifsQuery` and pass it any options that fit your needs.
 * When your component renders, `useNotifsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNotifsQuery({
 *   variables: {
 *      all: // value for 'all'
 *      cursor: // value for 'cursor'
 *   },
 * });
 */
export function useNotifsQuery(baseOptions?: Apollo.QueryHookOptions<NotifsQuery, NotifsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NotifsQuery, NotifsQueryVariables>(NotifsDocument, options);
      }
export function useNotifsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NotifsQuery, NotifsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NotifsQuery, NotifsQueryVariables>(NotifsDocument, options);
        }
export type NotifsQueryHookResult = ReturnType<typeof useNotifsQuery>;
export type NotifsLazyQueryHookResult = ReturnType<typeof useNotifsLazyQuery>;
export type NotifsQueryResult = Apollo.QueryResult<NotifsQuery, NotifsQueryVariables>;
export const WebhooksDocument = gql`
    query Webhooks($cursor: String) {
  webhooks(first: 20, after: $cursor) {
    pageInfo {
      endCursor
      hasNextPage
    }
    edges {
      node {
        ...Webhook
      }
    }
  }
}
    ${WebhookFragmentDoc}`;

/**
 * __useWebhooksQuery__
 *
 * To run a query within a React component, call `useWebhooksQuery` and pass it any options that fit your needs.
 * When your component renders, `useWebhooksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWebhooksQuery({
 *   variables: {
 *      cursor: // value for 'cursor'
 *   },
 * });
 */
export function useWebhooksQuery(baseOptions?: Apollo.QueryHookOptions<WebhooksQuery, WebhooksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<WebhooksQuery, WebhooksQueryVariables>(WebhooksDocument, options);
      }
export function useWebhooksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<WebhooksQuery, WebhooksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<WebhooksQuery, WebhooksQueryVariables>(WebhooksDocument, options);
        }
export type WebhooksQueryHookResult = ReturnType<typeof useWebhooksQuery>;
export type WebhooksLazyQueryHookResult = ReturnType<typeof useWebhooksLazyQuery>;
export type WebhooksQueryResult = Apollo.QueryResult<WebhooksQuery, WebhooksQueryVariables>;
export const CreateWebhookDocument = gql`
    mutation CreateWebhook($attributes: WebhookAttributes!) {
  createWebhook(attributes: $attributes) {
    ...Webhook
  }
}
    ${WebhookFragmentDoc}`;
export type CreateWebhookMutationFn = Apollo.MutationFunction<CreateWebhookMutation, CreateWebhookMutationVariables>;

/**
 * __useCreateWebhookMutation__
 *
 * To run a mutation, you first call `useCreateWebhookMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateWebhookMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createWebhookMutation, { data, loading, error }] = useCreateWebhookMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useCreateWebhookMutation(baseOptions?: Apollo.MutationHookOptions<CreateWebhookMutation, CreateWebhookMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateWebhookMutation, CreateWebhookMutationVariables>(CreateWebhookDocument, options);
      }
export type CreateWebhookMutationHookResult = ReturnType<typeof useCreateWebhookMutation>;
export type CreateWebhookMutationResult = Apollo.MutationResult<CreateWebhookMutation>;
export type CreateWebhookMutationOptions = Apollo.BaseMutationOptions<CreateWebhookMutation, CreateWebhookMutationVariables>;
export const DeleteWebhookDocument = gql`
    mutation DeleteWebhook($id: ID!) {
  deleteWebhook(id: $id) {
    ...Webhook
  }
}
    ${WebhookFragmentDoc}`;
export type DeleteWebhookMutationFn = Apollo.MutationFunction<DeleteWebhookMutation, DeleteWebhookMutationVariables>;

/**
 * __useDeleteWebhookMutation__
 *
 * To run a mutation, you first call `useDeleteWebhookMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteWebhookMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteWebhookMutation, { data, loading, error }] = useDeleteWebhookMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteWebhookMutation(baseOptions?: Apollo.MutationHookOptions<DeleteWebhookMutation, DeleteWebhookMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteWebhookMutation, DeleteWebhookMutationVariables>(DeleteWebhookDocument, options);
      }
export type DeleteWebhookMutationHookResult = ReturnType<typeof useDeleteWebhookMutation>;
export type DeleteWebhookMutationResult = Apollo.MutationResult<DeleteWebhookMutation>;
export type DeleteWebhookMutationOptions = Apollo.BaseMutationOptions<DeleteWebhookMutation, DeleteWebhookMutationVariables>;