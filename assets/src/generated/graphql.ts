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
  /**
   * The `DateTime` scalar type represents a date and time in the UTC
   * timezone. The DateTime appears in a JSON response as an ISO8601 formatted
   * string, including UTC timezone ("Z"). The parsed date and time string will
   * be converted to UTC if there is an offset.
   */
  DateTime: { input: string; output: string; }
  Json: { input: any; output: any; }
  Long: { input: any; output: any; }
  Map: { input: Record<string, unknown>; output: Record<string, unknown>; }
};

export type AccessToken = {
  __typename?: 'AccessToken';
  audits?: Maybe<AccessTokenAuditConnection>;
  id?: Maybe<Scalars['ID']['output']>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  scopes?: Maybe<Array<Maybe<AccessTokenScope>>>;
  token?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};


export type AccessTokenAuditsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type AccessTokenAudit = {
  __typename?: 'AccessTokenAudit';
  city?: Maybe<Scalars['String']['output']>;
  count?: Maybe<Scalars['Int']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  ip?: Maybe<Scalars['String']['output']>;
  latitude?: Maybe<Scalars['String']['output']>;
  longitude?: Maybe<Scalars['String']['output']>;
  timestamp?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type AccessTokenAuditConnection = {
  __typename?: 'AccessTokenAuditConnection';
  edges?: Maybe<Array<Maybe<AccessTokenAuditEdge>>>;
  pageInfo: PageInfo;
};

export type AccessTokenAuditEdge = {
  __typename?: 'AccessTokenAuditEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<AccessTokenAudit>;
};

export type AccessTokenConnection = {
  __typename?: 'AccessTokenConnection';
  edges?: Maybe<Array<Maybe<AccessTokenEdge>>>;
  pageInfo: PageInfo;
};

export type AccessTokenEdge = {
  __typename?: 'AccessTokenEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<AccessToken>;
};

export type AccessTokenScope = {
  __typename?: 'AccessTokenScope';
  api?: Maybe<Scalars['String']['output']>;
  apis?: Maybe<Array<Scalars['String']['output']>>;
  identifier?: Maybe<Scalars['String']['output']>;
  ids?: Maybe<Array<Scalars['String']['output']>>;
};

export type Account = {
  __typename?: 'Account';
  availableFeatures?: Maybe<AvailableFeatures>;
  delinquentAt?: Maybe<Scalars['DateTime']['output']>;
  grandfatheredUntil?: Maybe<Scalars['DateTime']['output']>;
  subscription?: Maybe<PluralSubscription>;
};

/** a condition that determines whether its configuration is viewable */
export type AddOnConfigCondition = {
  __typename?: 'AddOnConfigCondition';
  /** the field this condition applies to */
  field?: Maybe<Scalars['String']['output']>;
  /** the operation for this condition, eg EQ, LT, GT */
  operation?: Maybe<Scalars['String']['output']>;
  /** the value to apply the condition with, for binary operators like LT/GT */
  value?: Maybe<Scalars['String']['output']>;
};

/** Input configuration for an add-on you can install */
export type AddOnConfiguration = {
  __typename?: 'AddOnConfiguration';
  condition?: Maybe<AddOnConfigCondition>;
  /** a docstring explaining this configuration */
  documentation?: Maybe<Scalars['String']['output']>;
  /** name for this configuration */
  name?: Maybe<Scalars['String']['output']>;
  /** a type for the configuration (should eventually be coerced back to string) */
  type?: Maybe<Scalars['String']['output']>;
  /** the values for ENUM type conditions */
  values?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

/** the specification of a runtime service at a specific version */
export type AddonVersion = {
  __typename?: 'AddonVersion';
  /** checks if this is blocking a specific kubernetes upgrade */
  blocking?: Maybe<Scalars['Boolean']['output']>;
  /** any add-ons this might break */
  incompatibilities?: Maybe<Array<Maybe<VersionReference>>>;
  /** kubernetes versions this add-on works with */
  kube?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** the release page for a runtime service at a version, this is a heavy operation not suitable for lists */
  releaseUrl?: Maybe<Scalars['String']['output']>;
  /** any other add-ons this might require */
  requirements?: Maybe<Array<Maybe<VersionReference>>>;
  /** add-on version, semver formatted */
  version?: Maybe<Scalars['String']['output']>;
};


/** the specification of a runtime service at a specific version */
export type AddonVersionBlockingArgs = {
  kubeVersion: Scalars['String']['input'];
};


/** the specification of a runtime service at a specific version */
export type AddonVersionReleaseUrlArgs = {
  version: Scalars['String']['input'];
};

/** a representation of a bulk operation to be performed on all agent services */
export type AgentMigration = {
  __typename?: 'AgentMigration';
  completed?: Maybe<Scalars['Boolean']['output']>;
  configuration?: Maybe<Scalars['Map']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  ref?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type AgentMigrationAttributes = {
  configuration?: InputMaybe<Scalars['Json']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  ref?: InputMaybe<Scalars['String']['input']>;
};

/** a representation of a kubernetes api deprecation */
export type ApiDeprecation = {
  __typename?: 'ApiDeprecation';
  /** the kubernetes version the replacement api was created in */
  availableIn?: Maybe<Scalars['String']['output']>;
  /** whether you cannot safely upgrade to the next kubernetes version if this deprecation exists */
  blocking?: Maybe<Scalars['Boolean']['output']>;
  /** the component of this deprecation */
  component?: Maybe<ServiceComponent>;
  /** the kubernetes version the deprecation was posted */
  deprecatedIn?: Maybe<Scalars['String']['output']>;
  /** the kubernetes version the api version will be removed and unusable in */
  removedIn?: Maybe<Scalars['String']['output']>;
  /** the api you can replace this resource with */
  replacement?: Maybe<Scalars['String']['output']>;
};

export type Application = {
  __typename?: 'Application';
  configuration?: Maybe<Configuration>;
  cost?: Maybe<CostAnalysis>;
  info?: Maybe<Scalars['String']['output']>;
  license?: Maybe<License>;
  name: Scalars['String']['output'];
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
  description?: Maybe<Scalars['String']['output']>;
  icons?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  links?: Maybe<Array<Maybe<ApplicationLink>>>;
  type: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

export type ApplicationInfoItem = {
  __typename?: 'ApplicationInfoItem';
  name?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type ApplicationLink = {
  __typename?: 'ApplicationLink';
  description?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
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
  componentsReady: Scalars['String']['output'];
  conditions?: Maybe<Array<Maybe<StatusCondition>>>;
};

export type Audit = {
  __typename?: 'Audit';
  action: AuditAction;
  actor?: Maybe<User>;
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  ip?: Maybe<Scalars['String']['output']>;
  latitude?: Maybe<Scalars['String']['output']>;
  longitude?: Maybe<Scalars['String']['output']>;
  repository?: Maybe<Scalars['String']['output']>;
  type: AuditType;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
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
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Audit>;
};

export type AuditMetric = {
  __typename?: 'AuditMetric';
  count?: Maybe<Scalars['Int']['output']>;
  country?: Maybe<Scalars['String']['output']>;
};

export enum AuditType {
  Build = 'BUILD',
  Cluster = 'CLUSTER',
  ClusterProvider = 'CLUSTER_PROVIDER',
  ClusterRestore = 'CLUSTER_RESTORE',
  Configuration = 'CONFIGURATION',
  DeploymentSettings = 'DEPLOYMENT_SETTINGS',
  GitRepository = 'GIT_REPOSITORY',
  Global = 'GLOBAL',
  Group = 'GROUP',
  GroupMember = 'GROUP_MEMBER',
  ObjectStore = 'OBJECT_STORE',
  Pipeline = 'PIPELINE',
  Pod = 'POD',
  Policy = 'POLICY',
  ProviderCredential = 'PROVIDER_CREDENTIAL',
  Role = 'ROLE',
  Service = 'SERVICE',
  TempToken = 'TEMP_TOKEN',
  User = 'USER'
}

export enum AuthMethod {
  Basic = 'BASIC',
  Ssh = 'SSH'
}

export enum AutoscalingTarget {
  Deployment = 'DEPLOYMENT',
  Statefulset = 'STATEFULSET'
}

export type AvailableFeatures = {
  __typename?: 'AvailableFeatures';
  audits?: Maybe<Scalars['Boolean']['output']>;
  cd?: Maybe<Scalars['Boolean']['output']>;
  databaseManagement?: Maybe<Scalars['Boolean']['output']>;
  userManagement?: Maybe<Scalars['Boolean']['output']>;
  vpn?: Maybe<Scalars['Boolean']['output']>;
};

/** aws node customizations */
export type AwsCloud = {
  __typename?: 'AwsCloud';
  /** custom launch template for your nodes, useful for Golden AMI setups */
  launchTemplateId?: Maybe<Scalars['String']['output']>;
};

export type AwsCloudAttributes = {
  region?: InputMaybe<Scalars['String']['input']>;
};

/** aws specific cloud configuration */
export type AwsCloudSettings = {
  __typename?: 'AwsCloudSettings';
  region?: Maybe<Scalars['String']['output']>;
};

export type AwsNodeCloudAttributes = {
  launchTemplateId?: InputMaybe<Scalars['String']['input']>;
};

export type AwsSettingsAttributes = {
  accessKeyId: Scalars['String']['input'];
  secretAccessKey: Scalars['String']['input'];
};

export type AzureCloudAttributes = {
  location?: InputMaybe<Scalars['String']['input']>;
  network?: InputMaybe<Scalars['String']['input']>;
  resourceGroup?: InputMaybe<Scalars['String']['input']>;
  subscriptionId?: InputMaybe<Scalars['String']['input']>;
};

/** azure-specific cluster cloud configuration */
export type AzureCloudSettings = {
  __typename?: 'AzureCloudSettings';
  location?: Maybe<Scalars['String']['output']>;
  network?: Maybe<Scalars['String']['output']>;
  resourceGroup?: Maybe<Scalars['String']['output']>;
  subscriptionId?: Maybe<Scalars['String']['output']>;
};

export type AzureSettingsAttributes = {
  clientId: Scalars['ID']['input'];
  clientSecret: Scalars['String']['input'];
  subscriptionId: Scalars['String']['input'];
  tenantId: Scalars['String']['input'];
};

export type AzureStore = {
  __typename?: 'AzureStore';
  clientId: Scalars['String']['output'];
  container: Scalars['String']['output'];
  resourceGroup: Scalars['String']['output'];
  storageAccount: Scalars['String']['output'];
  subscriptionId: Scalars['String']['output'];
  tenantId: Scalars['String']['output'];
};

export type AzureStoreAttributes = {
  clientId: Scalars['String']['input'];
  clientSecret: Scalars['String']['input'];
  container: Scalars['String']['input'];
  resourceGroup: Scalars['String']['input'];
  storageAccount: Scalars['String']['input'];
  subscriptionId: Scalars['String']['input'];
  tenantId: Scalars['String']['input'];
};

export type BackupAttributes = {
  garbageCollected?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};

export type BindingAttributes = {
  groupId?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type Build = {
  __typename?: 'Build';
  approver?: Maybe<User>;
  changelogs?: Maybe<Array<Maybe<Changelog>>>;
  commands?: Maybe<CommandConnection>;
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  creator?: Maybe<User>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  repository: Scalars['String']['output'];
  sha?: Maybe<Scalars['String']['output']>;
  status: Status;
  type: BuildType;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};


export type BuildCommandsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type BuildAttributes = {
  message?: InputMaybe<Scalars['String']['input']>;
  repository: Scalars['String']['input'];
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
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Build>;
};

export type BuildInfo = {
  __typename?: 'BuildInfo';
  all?: Maybe<Scalars['Int']['output']>;
  failed?: Maybe<Scalars['Int']['output']>;
  queued?: Maybe<Scalars['Int']['output']>;
  running?: Maybe<Scalars['Int']['output']>;
  successful?: Maybe<Scalars['Int']['output']>;
};

export enum BuildType {
  Approval = 'APPROVAL',
  Bounce = 'BOUNCE',
  Config = 'CONFIG',
  Dedicated = 'DEDICATED',
  Deploy = 'DEPLOY',
  Destroy = 'DESTROY',
  Install = 'INSTALL'
}

export type Canary = {
  __typename?: 'Canary';
  canaryDeployment?: Maybe<Deployment>;
  events?: Maybe<Array<Maybe<Event>>>;
  ingress?: Maybe<Ingress>;
  ingressCanary?: Maybe<Ingress>;
  metadata: Metadata;
  primaryDeployment?: Maybe<Deployment>;
  raw: Scalars['String']['output'];
  spec: CanarySpec;
  status: CanaryStatus;
};

export type CanaryAnalysis = {
  __typename?: 'CanaryAnalysis';
  interval?: Maybe<Scalars['String']['output']>;
  maxWeight?: Maybe<Scalars['Int']['output']>;
  stepWeight?: Maybe<Scalars['Int']['output']>;
  stepWeights?: Maybe<Array<Maybe<Scalars['Int']['output']>>>;
  threshold?: Maybe<Scalars['Int']['output']>;
};

export type CanarySpec = {
  __typename?: 'CanarySpec';
  analysis?: Maybe<CanaryAnalysis>;
  autoscalerRef?: Maybe<TargetRef>;
  ingressRef?: Maybe<TargetRef>;
  provider?: Maybe<Scalars['String']['output']>;
  targetRef?: Maybe<TargetRef>;
};

export type CanaryStatus = {
  __typename?: 'CanaryStatus';
  canaryWeight?: Maybe<Scalars['Int']['output']>;
  conditions?: Maybe<Array<Maybe<StatusCondition>>>;
  failedChecks?: Maybe<Scalars['Int']['output']>;
  iterations?: Maybe<Scalars['Int']['output']>;
  lastTransitionTime?: Maybe<Scalars['String']['output']>;
  phase?: Maybe<Scalars['String']['output']>;
};

export type Certificate = {
  __typename?: 'Certificate';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  raw: Scalars['String']['output'];
  spec: CertificateSpec;
  status: CertificateStatus;
};

export type CertificateSpec = {
  __typename?: 'CertificateSpec';
  dnsNames?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  issuerRef?: Maybe<IssuerRef>;
  secretName: Scalars['String']['output'];
};

export type CertificateStatus = {
  __typename?: 'CertificateStatus';
  conditions?: Maybe<Array<Maybe<StatusCondition>>>;
  notAfter?: Maybe<Scalars['String']['output']>;
  notBefore?: Maybe<Scalars['String']['output']>;
  renewalTime?: Maybe<Scalars['String']['output']>;
};

export type Changelog = {
  __typename?: 'Changelog';
  content?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  repo: Scalars['String']['output'];
  tool: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type CloneAttributes = {
  s3AccessKeyId?: InputMaybe<Scalars['String']['input']>;
  s3Endpoint?: InputMaybe<Scalars['String']['input']>;
  s3SecretAccessKey?: InputMaybe<Scalars['String']['input']>;
  s3WalPath?: InputMaybe<Scalars['String']['input']>;
  uid?: InputMaybe<Scalars['String']['input']>;
};

export type CloudProviderSettingsAttributes = {
  aws?: InputMaybe<AwsSettingsAttributes>;
  azure?: InputMaybe<AzureSettingsAttributes>;
  gcp?: InputMaybe<GcpSettingsAttributes>;
};

/** the cloud configuration for a cluster */
export type CloudSettings = {
  __typename?: 'CloudSettings';
  aws?: Maybe<AwsCloudSettings>;
  azure?: Maybe<AzureCloudSettings>;
  gcp?: Maybe<GcpCloudSettings>;
};

export type CloudSettingsAttributes = {
  aws?: InputMaybe<AwsCloudAttributes>;
  azure?: InputMaybe<AzureCloudAttributes>;
  gcp?: InputMaybe<GcpCloudAttributes>;
};

/** a representation of a cluster you can deploy to */
export type Cluster = {
  __typename?: 'Cluster';
  /** all api deprecations for all services in this cluster */
  apiDeprecations?: Maybe<Array<Maybe<ApiDeprecation>>>;
  /** a custom credential to use when provisioning this cluster */
  credential?: Maybe<ProviderCredential>;
  /** current k8s version as told to us by the deployment operator */
  currentVersion?: Maybe<Scalars['String']['output']>;
  /** when this cluster was scheduled for deletion */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** a auth token to be used by the deploy operator, only readable on create */
  deployToken?: Maybe<Scalars['String']['output']>;
  /** the distribution of kubernetes this cluster is running */
  distro?: Maybe<ClusterDistro>;
  /** whether the current user can edit this cluster */
  editable?: Maybe<Scalars['Boolean']['output']>;
  /** a short, unique human readable name used to identify this cluster and does not necessarily map to the cloud resource name */
  handle?: Maybe<Scalars['String']['output']>;
  /** internal id of this cluster */
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** whether the deploy operator has been registered for this cluster */
  installed?: Maybe<Scalars['Boolean']['output']>;
  /** the url of the kas server you can access this cluster from */
  kasUrl?: Maybe<Scalars['String']['output']>;
  /** arbitrary json metadata to store user-specific state of this cluster (eg IAM roles for add-ons) */
  metadata?: Maybe<Scalars['Map']['output']>;
  /** human readable name of this cluster, will also translate to cloud k8s name */
  name: Scalars['String']['output'];
  /** list the cached node metrics for a cluster, can also be stale up to 5m */
  nodeMetrics?: Maybe<Array<Maybe<NodeMetric>>>;
  /** list of node pool specs managed by CAPI */
  nodePools?: Maybe<Array<Maybe<NodePool>>>;
  /** list cached nodes for a cluster, this can be stale up to 5m */
  nodes?: Maybe<Array<Maybe<Node>>>;
  /** the object store connection bound to this cluster for backup/restore */
  objectStore?: Maybe<ObjectStore>;
  /** last time the deploy operator pinged this cluster */
  pingedAt?: Maybe<Scalars['DateTime']['output']>;
  /** pr automations that are relevant to managing this cluster */
  prAutomations?: Maybe<Array<Maybe<PrAutomation>>>;
  /** if true, this cluster cannot be deleted */
  protect?: Maybe<Scalars['Boolean']['output']>;
  /** the provider we use to create this cluster (null if BYOK) */
  provider?: Maybe<ClusterProvider>;
  /** read policy for this cluster */
  readBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
  /** a custom git repository if you want to define your own CAPI manifests */
  repository?: Maybe<GitRepository>;
  /** the active restore for this cluster */
  restore?: Maybe<ClusterRestore>;
  /** a relay connection of all revisions of this service, these are periodically pruned up to a history limit */
  revisions?: Maybe<RevisionConnection>;
  /** fetches a list of runtime services found in this cluster, this is an expensive operation that should not be done in list queries */
  runtimeServices?: Maybe<Array<Maybe<RuntimeService>>>;
  /** whether this is the management cluster itself */
  self?: Maybe<Scalars['Boolean']['output']>;
  /** the service used to deploy the CAPI resources of this cluster */
  service?: Maybe<ServiceDeployment>;
  /** any errors which might have occurred during the bootstrap process */
  serviceErrors?: Maybe<Array<Maybe<ServiceError>>>;
  /** the cloud settings for this cluster (for instance its aws region) */
  settings?: Maybe<CloudSettings>;
  /** the status of the cluster as seen from the CAPI operator, since some clusters can be provisioned without CAPI, this can be null */
  status?: Maybe<ClusterStatus>;
  /** key/value tags to filter clusters */
  tags?: Maybe<Array<Maybe<Tag>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** desired k8s version for the cluster */
  version?: Maybe<Scalars['String']['output']>;
  /** write policy for this cluster */
  writeBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
};


/** a representation of a cluster you can deploy to */
export type ClusterRevisionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A common kubernetes cluster add-on like cert-manager, istio, etc */
export type ClusterAddOn = {
  __typename?: 'ClusterAddOn';
  configuration?: Maybe<Array<Maybe<AddOnConfiguration>>>;
  global?: Maybe<Scalars['Boolean']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  version?: Maybe<Scalars['String']['output']>;
};

export type ClusterAttributes = {
  cloudSettings?: InputMaybe<CloudSettingsAttributes>;
  /** a cloud credential to use when provisioning this cluster */
  credentialId?: InputMaybe<Scalars['ID']['input']>;
  distro?: InputMaybe<ClusterDistro>;
  /** a short, unique human readable name used to identify this cluster and does not necessarily map to the cloud resource name */
  handle?: InputMaybe<Scalars['String']['input']>;
  kubeconfig?: InputMaybe<KubeconfigAttributes>;
  metadata?: InputMaybe<Scalars['Json']['input']>;
  name: Scalars['String']['input'];
  nodePools?: InputMaybe<Array<InputMaybe<NodePoolAttributes>>>;
  protect?: InputMaybe<Scalars['Boolean']['input']>;
  providerId?: InputMaybe<Scalars['ID']['input']>;
  readBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
  tags?: InputMaybe<Array<InputMaybe<TagAttributes>>>;
  version?: InputMaybe<Scalars['String']['input']>;
  writeBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
};

export type ClusterBackup = {
  __typename?: 'ClusterBackup';
  cluster?: Maybe<Cluster>;
  garbageCollected?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  namespace: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type ClusterBackupConnection = {
  __typename?: 'ClusterBackupConnection';
  edges?: Maybe<Array<Maybe<ClusterBackupEdge>>>;
  pageInfo: PageInfo;
};

export type ClusterBackupEdge = {
  __typename?: 'ClusterBackupEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<ClusterBackup>;
};

/** a single condition struct for various phases of the cluster provisionining process */
export type ClusterCondition = {
  __typename?: 'ClusterCondition';
  lastTransitionTime?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  severity?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
};

export type ClusterConnection = {
  __typename?: 'ClusterConnection';
  edges?: Maybe<Array<Maybe<ClusterEdge>>>;
  pageInfo: PageInfo;
};

export enum ClusterDistro {
  Aks = 'AKS',
  Eks = 'EKS',
  Generic = 'GENERIC',
  Gke = 'GKE',
  K3S = 'K3S',
  Rke = 'RKE'
}

export type ClusterEdge = {
  __typename?: 'ClusterEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Cluster>;
};

export type ClusterInfo = {
  __typename?: 'ClusterInfo';
  gitCommit?: Maybe<Scalars['String']['output']>;
  gitVersion?: Maybe<Scalars['String']['output']>;
  platform?: Maybe<Scalars['String']['output']>;
  version?: Maybe<Scalars['String']['output']>;
};

export type ClusterPing = {
  currentVersion: Scalars['String']['input'];
  distro?: InputMaybe<ClusterDistro>;
};

/** a CAPI provider for a cluster, cloud is inferred from name if not provided manually */
export type ClusterProvider = {
  __typename?: 'ClusterProvider';
  /** the name of the cloud service for this provider */
  cloud: Scalars['String']['output'];
  /** a list of credentials eligible for this provider */
  credentials?: Maybe<Array<Maybe<ProviderCredential>>>;
  /** when the cluster provider was deleted */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** whether the current user can edit this resource */
  editable?: Maybe<Scalars['Boolean']['output']>;
  /** the details of how cluster manifests will be synced from git when created with this provider */
  git: GitRef;
  /** the id of this provider */
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** a human readable name for the provider, globally unique */
  name: Scalars['String']['output'];
  /** the namespace the CAPI resources are deployed into */
  namespace: Scalars['String']['output'];
  /** the repository for the CAPI service itself if customized */
  providerRepository?: Maybe<GitRepository>;
  /** the region names this provider can deploy to */
  regions?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** the repository used to serve cluster manifests */
  repository?: Maybe<GitRepository>;
  runtimeServices?: Maybe<Array<Maybe<RuntimeService>>>;
  /** the service of the CAPI controller itself */
  service?: Maybe<ServiceDeployment>;
  /** the kubernetes versions this provider currently supports */
  supportedVersions?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};


/** a CAPI provider for a cluster, cloud is inferred from name if not provided manually */
export type ClusterProviderRuntimeServicesArgs = {
  kubeVersion?: InputMaybe<Scalars['String']['input']>;
};

export type ClusterProviderAttributes = {
  cloud?: InputMaybe<Scalars['String']['input']>;
  cloudSettings?: InputMaybe<CloudProviderSettingsAttributes>;
  name: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

export type ClusterProviderConnection = {
  __typename?: 'ClusterProviderConnection';
  edges?: Maybe<Array<Maybe<ClusterProviderEdge>>>;
  pageInfo: PageInfo;
};

export type ClusterProviderEdge = {
  __typename?: 'ClusterProviderEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<ClusterProvider>;
};

export type ClusterProviderUpdateAttributes = {
  cloudSettings?: InputMaybe<CloudProviderSettingsAttributes>;
  /** if you optionally want to reconfigure the git repository for the cluster provider */
  service?: InputMaybe<ClusterServiceAttributes>;
};

export type ClusterRestore = {
  __typename?: 'ClusterRestore';
  backup?: Maybe<ClusterBackup>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  status: RestoreStatus;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type ClusterRestoreConnection = {
  __typename?: 'ClusterRestoreConnection';
  edges?: Maybe<Array<Maybe<ClusterRestoreEdge>>>;
  pageInfo: PageInfo;
};

export type ClusterRestoreEdge = {
  __typename?: 'ClusterRestoreEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<ClusterRestore>;
};

export type ClusterServiceAttributes = {
  git: GitRefAttributes;
  id: Scalars['ID']['input'];
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
};

/** the crd status of the cluster as seen by the CAPI operator */
export type ClusterStatus = {
  __typename?: 'ClusterStatus';
  conditions?: Maybe<Array<Maybe<ClusterCondition>>>;
  controlPlaneReady?: Maybe<Scalars['Boolean']['output']>;
  failureMessage?: Maybe<Scalars['String']['output']>;
  failureReason?: Maybe<Scalars['String']['output']>;
  phase?: Maybe<Scalars['String']['output']>;
};

/** a cluster info data struct */
export type ClusterStatusInfo = {
  __typename?: 'ClusterStatusInfo';
  count?: Maybe<Scalars['Int']['output']>;
  healthy?: Maybe<Scalars['Boolean']['output']>;
};

export type ClusterUpdateAttributes = {
  distro?: InputMaybe<ClusterDistro>;
  /** a short, unique human readable name used to identify this cluster and does not necessarily map to the cloud resource name */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** pass a kubeconfig for this cluster (DEPRECATED) */
  kubeconfig?: InputMaybe<KubeconfigAttributes>;
  metadata?: InputMaybe<Scalars['Json']['input']>;
  nodePools?: InputMaybe<Array<InputMaybe<NodePoolAttributes>>>;
  protect?: InputMaybe<Scalars['Boolean']['input']>;
  /** if you optionally want to reconfigure the git repository for the cluster service */
  service?: InputMaybe<ClusterServiceAttributes>;
  tags?: InputMaybe<Array<InputMaybe<TagAttributes>>>;
  version?: InputMaybe<Scalars['String']['input']>;
};

export type Command = {
  __typename?: 'Command';
  build?: Maybe<Build>;
  command: Scalars['String']['output'];
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  exitCode?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  stdout?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
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
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Command>;
};

export type Component = {
  __typename?: 'Component';
  group: Scalars['String']['output'];
  kind: Scalars['String']['output'];
};

export type ComponentAttributes = {
  content?: InputMaybe<ComponentContentAttributes>;
  group: Scalars['String']['input'];
  kind: Scalars['String']['input'];
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  state?: InputMaybe<ComponentState>;
  synced: Scalars['Boolean']['input'];
  version: Scalars['String']['input'];
};

/** dry run content of a service component */
export type ComponentContent = {
  __typename?: 'ComponentContent';
  /** the inferred desired state of this component */
  desired?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  live?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** the content of a component when visualized in dry run state */
export type ComponentContentAttributes = {
  /** the desired state of a service component as determined from the configured manifests */
  desired?: InputMaybe<Scalars['String']['input']>;
  live?: InputMaybe<Scalars['String']['input']>;
};

export enum ComponentState {
  Failed = 'FAILED',
  Paused = 'PAUSED',
  Pending = 'PENDING',
  Running = 'RUNNING'
}

/** A tree view of the kubernetes object hierarchy beneath a component */
export type ComponentTree = {
  __typename?: 'ComponentTree';
  certificates?: Maybe<Array<Maybe<Certificate>>>;
  configmaps?: Maybe<Array<Maybe<ConfigMap>>>;
  cronjobs?: Maybe<Array<Maybe<CronJob>>>;
  daemonsets?: Maybe<Array<Maybe<DaemonSet>>>;
  deployments?: Maybe<Array<Maybe<Deployment>>>;
  edges?: Maybe<Array<Maybe<ResourceEdge>>>;
  ingresses?: Maybe<Array<Maybe<Ingress>>>;
  replicasets?: Maybe<Array<Maybe<ReplicaSet>>>;
  root?: Maybe<KubernetesUnstructured>;
  secrets?: Maybe<Array<Maybe<Secret>>>;
  services?: Maybe<Array<Maybe<Service>>>;
  statefulsets?: Maybe<Array<Maybe<StatefulSet>>>;
};

/** attributes for declaratively specifying whether a config item is relevant given prior config */
export type ConditionAttributes = {
  field: Scalars['String']['input'];
  operation: Operation;
  value?: InputMaybe<Scalars['String']['input']>;
};

export type ConfigAttributes = {
  name: Scalars['String']['input'];
  value?: InputMaybe<Scalars['String']['input']>;
};

export type ConfigMap = {
  __typename?: 'ConfigMap';
  data: Scalars['Map']['output'];
  metadata: Metadata;
  raw: Scalars['String']['output'];
};

export type Configuration = {
  __typename?: 'Configuration';
  helm?: Maybe<Scalars['String']['output']>;
  readme?: Maybe<Scalars['String']['output']>;
  terraform?: Maybe<Scalars['String']['output']>;
};

export type ConfigurationAction = {
  __typename?: 'ConfigurationAction';
  updates?: Maybe<Array<Maybe<PathUpdate>>>;
};

export type ConfigurationCondition = {
  __typename?: 'ConfigurationCondition';
  field?: Maybe<Scalars['String']['output']>;
  operation?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type ConfigurationItem = {
  __typename?: 'ConfigurationItem';
  condition?: Maybe<ConfigurationCondition>;
  default?: Maybe<Scalars['String']['output']>;
  documentation?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  optional?: Maybe<Scalars['Boolean']['output']>;
  placeholder?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  validation?: Maybe<ConfigurationValidation>;
};

export type ConfigurationOverlay = {
  __typename?: 'ConfigurationOverlay';
  metadata: Metadata;
  spec: ConfigurationOverlaySpec;
};

export type ConfigurationOverlaySpec = {
  __typename?: 'ConfigurationOverlaySpec';
  documentation?: Maybe<Scalars['String']['output']>;
  folder?: Maybe<Scalars['String']['output']>;
  inputType?: Maybe<Scalars['String']['output']>;
  inputValues?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  name?: Maybe<Scalars['String']['output']>;
  subfolder?: Maybe<Scalars['String']['output']>;
  updates?: Maybe<Array<Maybe<OverlayUpdate>>>;
};

export enum ConfigurationType {
  Bool = 'BOOL',
  Bucket = 'BUCKET',
  Domain = 'DOMAIN',
  File = 'FILE',
  Function = 'FUNCTION',
  Int = 'INT',
  Password = 'PASSWORD',
  String = 'STRING'
}

export type ConfigurationValidation = {
  __typename?: 'ConfigurationValidation';
  message?: Maybe<Scalars['String']['output']>;
  regex?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
};

export enum Conjunction {
  And = 'AND',
  Or = 'OR'
}

export type ConsoleConfiguration = {
  __typename?: 'ConsoleConfiguration';
  byok?: Maybe<Scalars['Boolean']['output']>;
  features?: Maybe<AvailableFeatures>;
  gitCommit?: Maybe<Scalars['String']['output']>;
  gitStatus?: Maybe<GitStatus>;
  isDemoProject?: Maybe<Scalars['Boolean']['output']>;
  isSandbox?: Maybe<Scalars['Boolean']['output']>;
  manifest?: Maybe<PluralManifest>;
  pluralLogin?: Maybe<Scalars['Boolean']['output']>;
  vpnEnabled?: Maybe<Scalars['Boolean']['output']>;
};

export type Container = {
  __typename?: 'Container';
  image?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  ports?: Maybe<Array<Maybe<Port>>>;
  resources?: Maybe<Resources>;
};

/** the attributes for a container */
export type ContainerAttributes = {
  args?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  env?: InputMaybe<Array<InputMaybe<EnvAttributes>>>;
  envFrom?: InputMaybe<Array<InputMaybe<EnvFromAttributes>>>;
  image: Scalars['String']['input'];
};

/** container env variable */
export type ContainerEnv = {
  __typename?: 'ContainerEnv';
  name: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

/** env from declarations for containers */
export type ContainerEnvFrom = {
  __typename?: 'ContainerEnvFrom';
  configMap: Scalars['String']['output'];
  secret: Scalars['String']['output'];
};

export type ContainerRecommendation = {
  __typename?: 'ContainerRecommendation';
  containerName?: Maybe<Scalars['String']['output']>;
  lowerBound?: Maybe<ContainerResources>;
  name?: Maybe<Scalars['String']['output']>;
  target?: Maybe<ContainerResources>;
  uncappedTarget?: Maybe<ContainerResources>;
  upperBound?: Maybe<ContainerResources>;
};

export type ContainerResources = {
  __typename?: 'ContainerResources';
  cpu?: Maybe<Scalars['String']['output']>;
  memory?: Maybe<Scalars['String']['output']>;
};

/** a shortform spec for job containers, designed for ease-of-use */
export type ContainerSpec = {
  __typename?: 'ContainerSpec';
  args?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  env?: Maybe<Array<Maybe<ContainerEnv>>>;
  envFrom?: Maybe<Array<Maybe<ContainerEnvFrom>>>;
  image: Scalars['String']['output'];
};

export type ContainerState = {
  __typename?: 'ContainerState';
  running?: Maybe<RunningState>;
  terminated?: Maybe<TerminatedState>;
  waiting?: Maybe<WaitingState>;
};

export type ContainerStatus = {
  __typename?: 'ContainerStatus';
  image?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  ready?: Maybe<Scalars['Boolean']['output']>;
  restartCount?: Maybe<Scalars['Int']['output']>;
  state?: Maybe<ContainerState>;
};

export type ContextAttributes = {
  buckets?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  configuration: Scalars['Map']['input'];
  domain?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  protect?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

/** a binding from a service to a service context */
export type ContextBindingAttributes = {
  contextId: Scalars['String']['input'];
};

export type CostAnalysis = {
  __typename?: 'CostAnalysis';
  cpuCost?: Maybe<Scalars['Float']['output']>;
  cpuEfficiency?: Maybe<Scalars['Float']['output']>;
  efficiency?: Maybe<Scalars['Float']['output']>;
  gpuCost?: Maybe<Scalars['Float']['output']>;
  minutes?: Maybe<Scalars['Float']['output']>;
  networkCost?: Maybe<Scalars['Float']['output']>;
  pvCost?: Maybe<Scalars['Float']['output']>;
  ramCost?: Maybe<Scalars['Float']['output']>;
  ramEfficiency?: Maybe<Scalars['Float']['output']>;
  sharedCost?: Maybe<Scalars['Float']['output']>;
  totalCost?: Maybe<Scalars['Float']['output']>;
};

export type CronJob = {
  __typename?: 'CronJob';
  events?: Maybe<Array<Maybe<Event>>>;
  jobs?: Maybe<Array<Maybe<Job>>>;
  metadata: Metadata;
  raw: Scalars['String']['output'];
  spec: CronSpec;
  status: CronStatus;
};

export type CronSpec = {
  __typename?: 'CronSpec';
  concurrencyPolicy?: Maybe<Scalars['String']['output']>;
  schedule: Scalars['String']['output'];
  suspend?: Maybe<Scalars['Boolean']['output']>;
};

export type CronStatus = {
  __typename?: 'CronStatus';
  active?: Maybe<Array<Maybe<JobReference>>>;
  lastScheduleTime?: Maybe<Scalars['String']['output']>;
};

export type CrossVersionResourceTarget = {
  __typename?: 'CrossVersionResourceTarget';
  apiVersion?: Maybe<Scalars['String']['output']>;
  kind?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
};

export type DaemonSet = {
  __typename?: 'DaemonSet';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  pods?: Maybe<Array<Maybe<Pod>>>;
  raw: Scalars['String']['output'];
  spec: DaemonSetSpec;
  status: DaemonSetStatus;
};

export type DaemonSetSpec = {
  __typename?: 'DaemonSetSpec';
  strategy?: Maybe<DeploymentStrategy>;
};

export type DaemonSetStatus = {
  __typename?: 'DaemonSetStatus';
  currentNumberScheduled?: Maybe<Scalars['Int']['output']>;
  desiredNumberScheduled?: Maybe<Scalars['Int']['output']>;
  numberReady?: Maybe<Scalars['Int']['output']>;
};

export type Dashboard = {
  __typename?: 'Dashboard';
  id: Scalars['String']['output'];
  spec: DashboardSpec;
};

export type DashboardGraph = {
  __typename?: 'DashboardGraph';
  format?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  queries?: Maybe<Array<Maybe<DashboardMetric>>>;
};

export type DashboardLabel = {
  __typename?: 'DashboardLabel';
  name: Scalars['String']['output'];
  values?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type DashboardMetric = {
  __typename?: 'DashboardMetric';
  legend?: Maybe<Scalars['String']['output']>;
  query?: Maybe<Scalars['String']['output']>;
  results?: Maybe<Array<Maybe<MetricResult>>>;
};

export type DashboardSpec = {
  __typename?: 'DashboardSpec';
  description?: Maybe<Scalars['String']['output']>;
  graphs?: Maybe<Array<Maybe<DashboardGraph>>>;
  labels?: Maybe<Array<Maybe<DashboardLabel>>>;
  name?: Maybe<Scalars['String']['output']>;
  timeslices?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type DatabaseVolume = {
  __typename?: 'DatabaseVolume';
  size?: Maybe<Scalars['String']['output']>;
};

export enum Delta {
  Create = 'CREATE',
  Delete = 'DELETE',
  Update = 'UPDATE'
}

/** A representation to a service which configures renovate for a scm connection */
export type DependencyManagementService = {
  __typename?: 'DependencyManagementService';
  connection?: Maybe<ScmConnection>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  service?: Maybe<ServiceDeployment>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type DependencyManagementServiceConnection = {
  __typename?: 'DependencyManagementServiceConnection';
  edges?: Maybe<Array<Maybe<DependencyManagementServiceEdge>>>;
  pageInfo: PageInfo;
};

export type DependencyManagementServiceEdge = {
  __typename?: 'DependencyManagementServiceEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<DependencyManagementService>;
};

export type Deployment = {
  __typename?: 'Deployment';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  pods?: Maybe<Array<Maybe<Pod>>>;
  raw: Scalars['String']['output'];
  spec: DeploymentSpec;
  status: DeploymentStatus;
};

/** global settings for CD, these specify global read/write policies and also allow for customization of the repos for CAPI resources and the deploy operator */
export type DeploymentSettings = {
  __typename?: 'DeploymentSettings';
  /** custom helm values to apply to all agents (useful for things like adding customary annotations/labels) */
  agentHelmValues?: Maybe<Scalars['String']['output']>;
  /** the repo to fetch CAPI manifests from, for both providers and clusters */
  artifactRepository?: Maybe<GitRepository>;
  /** policy for creation of new clusters */
  createBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
  /** the repo to fetch the deploy operators manifests from */
  deployerRepository?: Maybe<GitRepository>;
  /** whether you've yet to enable CD for this instance */
  enabled: Scalars['Boolean']['output'];
  /** policy for managing git repos */
  gitBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the way we can connect to your loki instance */
  lokiConnection?: Maybe<HttpConnection>;
  name: Scalars['String']['output'];
  /** the way we can connect to your prometheus instance */
  prometheusConnection?: Maybe<HttpConnection>;
  /** read policy across all clusters */
  readBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
  /** whether the byok cluster has been brought under self-management */
  selfManaged?: Maybe<Scalars['Boolean']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** write policy across all clusters */
  writeBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
};

export type DeploymentSettingsAttributes = {
  /** custom helm values to apply to all agents (useful for things like adding customary annotations/labels) */
  agentHelmValues?: InputMaybe<Scalars['String']['input']>;
  artifactRepositoryId?: InputMaybe<Scalars['ID']['input']>;
  createBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
  deployerRepositoryId?: InputMaybe<Scalars['ID']['input']>;
  gitBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
  /** connection details for a loki instance to use */
  lokiConnection?: InputMaybe<HttpConnectionAttributes>;
  /** connection details for a prometheus instance to use */
  prometheusConnection?: InputMaybe<HttpConnectionAttributes>;
  readBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
  writeBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
};

export type DeploymentSpec = {
  __typename?: 'DeploymentSpec';
  replicas?: Maybe<Scalars['Int']['output']>;
  strategy?: Maybe<DeploymentStrategy>;
};

export type DeploymentStatus = {
  __typename?: 'DeploymentStatus';
  availableReplicas?: Maybe<Scalars['Int']['output']>;
  readyReplicas?: Maybe<Scalars['Int']['output']>;
  replicas?: Maybe<Scalars['Int']['output']>;
  unavailableReplicas?: Maybe<Scalars['Int']['output']>;
};

export type DeploymentStrategy = {
  __typename?: 'DeploymentStrategy';
  rollingUpdate?: Maybe<RollingUpdate>;
  type?: Maybe<Scalars['String']['output']>;
};

export type EnvAttributes = {
  name: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type EnvFromAttributes = {
  configMap: Scalars['String']['input'];
  secret: Scalars['String']['input'];
};

export type Event = {
  __typename?: 'Event';
  action?: Maybe<Scalars['String']['output']>;
  count?: Maybe<Scalars['Int']['output']>;
  eventTime?: Maybe<Scalars['String']['output']>;
  lastTimestamp?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
};

export type FileContent = {
  __typename?: 'FileContent';
  content?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
};

/** spec for a job gate */
export type GateJobAttributes = {
  annotations?: InputMaybe<Scalars['Json']['input']>;
  containers?: InputMaybe<Array<InputMaybe<ContainerAttributes>>>;
  labels?: InputMaybe<Scalars['Json']['input']>;
  namespace: Scalars['String']['input'];
  /** if you'd rather define the job spec via straight k8s yaml */
  raw?: InputMaybe<Scalars['String']['input']>;
  serviceAccount?: InputMaybe<Scalars['String']['input']>;
};

/** detailed gate specifications */
export type GateSpec = {
  __typename?: 'GateSpec';
  job?: Maybe<JobGateSpec>;
};

/** a more refined spec for parameters needed for complex gates */
export type GateSpecAttributes = {
  job?: InputMaybe<GateJobAttributes>;
};

export enum GateState {
  Closed = 'CLOSED',
  Open = 'OPEN',
  Pending = 'PENDING'
}

export type GateStatusAttributes = {
  jobRef?: InputMaybe<NamespacedName>;
};

export enum GateType {
  Approval = 'APPROVAL',
  Job = 'JOB',
  Window = 'WINDOW'
}

/** the allowed inputs for a deployment agent gate update */
export type GateUpdateAttributes = {
  state?: InputMaybe<GateState>;
  status?: InputMaybe<GateStatusAttributes>;
};

export type GcpCloudAttributes = {
  network?: InputMaybe<Scalars['String']['input']>;
  project?: InputMaybe<Scalars['String']['input']>;
  region?: InputMaybe<Scalars['String']['input']>;
};

/** gcp specific cluster cloud configuration */
export type GcpCloudSettings = {
  __typename?: 'GcpCloudSettings';
  network?: Maybe<Scalars['String']['output']>;
  project?: Maybe<Scalars['String']['output']>;
  region?: Maybe<Scalars['String']['output']>;
};

export type GcpSettingsAttributes = {
  applicationCredentials: Scalars['String']['input'];
};

export type GcsStore = {
  __typename?: 'GcsStore';
  bucket: Scalars['String']['output'];
  region?: Maybe<Scalars['String']['output']>;
};

export type GcsStoreAttributes = {
  applicationCredentials: Scalars['String']['input'];
  bucket: Scalars['String']['input'];
  region?: InputMaybe<Scalars['String']['input']>;
};

export type GitAttributes = {
  /** whether to run plural crypto on this repo */
  decrypt?: InputMaybe<Scalars['Boolean']['input']>;
  /** a manually supplied https path for non standard git setups.  This is auto-inferred in many cases */
  httpsPath?: InputMaybe<Scalars['String']['input']>;
  /** a passphrase to decrypt the given private key */
  passphrase?: InputMaybe<Scalars['String']['input']>;
  /** the http password for http authenticated repos */
  password?: InputMaybe<Scalars['String']['input']>;
  /** an ssh private key to use with this repo if an ssh url was given */
  privateKey?: InputMaybe<Scalars['String']['input']>;
  /** the url of this repository */
  url: Scalars['String']['input'];
  /** similar to https_path, a manually supplied url format for custom git.  Should be something like {url}/tree/{ref}/{folder} */
  urlFormat?: InputMaybe<Scalars['String']['input']>;
  /** the http username for authenticated http repos, defaults to apiKey for github */
  username?: InputMaybe<Scalars['String']['input']>;
};

/** a file fetched from a git repository, eg a docs .md file */
export type GitFile = {
  __typename?: 'GitFile';
  content: Scalars['String']['output'];
  path: Scalars['String']['output'];
};

export enum GitHealth {
  Failed = 'FAILED',
  Pullable = 'PULLABLE'
}

/** a representation of where to pull manifests from git */
export type GitRef = {
  __typename?: 'GitRef';
  /** the folder manifests live under */
  folder: Scalars['String']['output'];
  /** a general git ref, either a branch name or commit sha understandable by `git checkout <ref>` */
  ref: Scalars['String']['output'];
};

export type GitRefAttributes = {
  folder: Scalars['String']['input'];
  ref: Scalars['String']['input'];
};

/** a git repository available for deployments */
export type GitRepository = {
  __typename?: 'GitRepository';
  /** whether its a http or ssh url */
  authMethod?: Maybe<AuthMethod>;
  /** whether to run plural crypto unlock on this repo */
  decrypt?: Maybe<Scalars['Boolean']['output']>;
  /** whether the current user can edit this repo */
  editable?: Maybe<Scalars['Boolean']['output']>;
  /** the error message if there were any pull errors */
  error?: Maybe<Scalars['String']['output']>;
  /** whether we can currently pull this repo with the provided credentials */
  health?: Maybe<GitHealth>;
  /** the https url for this git repo */
  httpsPath?: Maybe<Scalars['String']['output']>;
  /** internal id of this repository */
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the last successsful git pull timestamp */
  pulledAt?: Maybe<Scalars['DateTime']['output']>;
  /** named refs like branches/tags for a repository */
  refs?: Maybe<Array<Scalars['String']['output']>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the git url of the repository, either https or ssh supported */
  url: Scalars['String']['output'];
  /** a format string to get the http url for a subfolder in a git repo */
  urlFormat?: Maybe<Scalars['String']['output']>;
};

export type GitRepositoryConnection = {
  __typename?: 'GitRepositoryConnection';
  edges?: Maybe<Array<Maybe<GitRepositoryEdge>>>;
  pageInfo: PageInfo;
};

export type GitRepositoryEdge = {
  __typename?: 'GitRepositoryEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<GitRepository>;
};

export type GitStatus = {
  __typename?: 'GitStatus';
  cloned?: Maybe<Scalars['Boolean']['output']>;
  output?: Maybe<Scalars['String']['output']>;
};

/** a rules based mechanism to redeploy a service across a fleet of clusters */
export type GlobalService = {
  __typename?: 'GlobalService';
  /** the kubernetes distribution to target with this global service */
  distro?: Maybe<ClusterDistro>;
  /** internal id of this global service */
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** a human readable name for this global service */
  name: Scalars['String']['output'];
  /** whether to only apply to clusters with this provider */
  provider?: Maybe<ClusterProvider>;
  /** the service to replicate across clusters */
  service?: Maybe<ServiceDeployment>;
  /** a set of tags to select clusters for this global service */
  tags?: Maybe<Array<Maybe<Tag>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** A reference for a globalized service, which targets clusters based on the configured criteria */
export type GlobalServiceAttributes = {
  /** kubernetes distribution to target */
  distro?: InputMaybe<ClusterDistro>;
  /** name for this global service */
  name: Scalars['String']['input'];
  /** cluster api provider to target */
  providerId?: InputMaybe<Scalars['ID']['input']>;
  /** the cluster tags to target */
  tags?: InputMaybe<Array<InputMaybe<TagAttributes>>>;
};

export type Group = {
  __typename?: 'Group';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type GroupAttributes = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type GroupConnection = {
  __typename?: 'GroupConnection';
  edges?: Maybe<Array<Maybe<GroupEdge>>>;
  pageInfo: PageInfo;
};

export type GroupEdge = {
  __typename?: 'GroupEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Group>;
};

export type GroupMember = {
  __typename?: 'GroupMember';
  group?: Maybe<Group>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
};

export type GroupMemberConnection = {
  __typename?: 'GroupMemberConnection';
  edges?: Maybe<Array<Maybe<GroupMemberEdge>>>;
  pageInfo: PageInfo;
};

export type GroupMemberEdge = {
  __typename?: 'GroupMemberEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<GroupMember>;
};

/** a chart manifest entry, including all versions */
export type HelmChartEntry = {
  __typename?: 'HelmChartEntry';
  /** the name of the chart */
  name?: Maybe<Scalars['String']['output']>;
  /** all found versions of the chart */
  versions?: Maybe<Array<Maybe<HelmChartVersion>>>;
};

/** a chart version contained within a helm repository manifest */
export type HelmChartVersion = {
  __typename?: 'HelmChartVersion';
  /** the version of the app contained w/in this chart */
  appVersion?: Maybe<Scalars['String']['output']>;
  /** sha digest of this chart's contents */
  digest?: Maybe<Scalars['String']['output']>;
  /** the name of the chart */
  name?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  /** the version of the chart itself */
  version?: Maybe<Scalars['String']['output']>;
};

export type HelmConfigAttributes = {
  chart?: InputMaybe<Scalars['String']['input']>;
  repository?: InputMaybe<NamespacedName>;
  set?: InputMaybe<HelmValueAttributes>;
  values?: InputMaybe<Scalars['String']['input']>;
  valuesFiles?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  version?: InputMaybe<Scalars['String']['input']>;
};

/** a crd representation of a helm repository */
export type HelmRepository = {
  __typename?: 'HelmRepository';
  /** the charts found in this repository (heavy operation, don't do in list endpoints) */
  charts?: Maybe<Array<Maybe<HelmChartEntry>>>;
  metadata: Metadata;
  spec: HelmRepositorySpec;
  /** can fetch the status of a given helm repository */
  status?: Maybe<HelmRepositoryStatus>;
};

/** a specification of how a helm repository is fetched */
export type HelmRepositorySpec = {
  __typename?: 'HelmRepositorySpec';
  provider?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

/** the state of this helm repository */
export type HelmRepositoryStatus = {
  __typename?: 'HelmRepositoryStatus';
  message?: Maybe<Scalars['String']['output']>;
  ready?: Maybe<Scalars['Boolean']['output']>;
};

export type HelmSpec = {
  __typename?: 'HelmSpec';
  /** the name of the chart this service is using */
  chart?: Maybe<Scalars['String']['output']>;
  /** pointer to the flux helm repository resource used for this chart */
  repository?: Maybe<ObjectReference>;
  /** a list of helm name/value pairs to precisely set individual values */
  set?: Maybe<Array<Maybe<HelmValue>>>;
  /** a helm values file to use with this service, requires auth and so is heavy to query */
  values?: Maybe<Scalars['String']['output']>;
  /** a list of relative paths to values files to use for helm applies */
  valuesFiles?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** the chart version in use currently */
  version?: Maybe<Scalars['String']['output']>;
};

/** a (possibly nested) helm value pair */
export type HelmValue = {
  __typename?: 'HelmValue';
  name: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type HelmValueAttributes = {
  /** helm value name, can be deeply nested via dot like `image.tag` */
  name?: InputMaybe<Scalars['String']['input']>;
  /** value of the attribute */
  value?: InputMaybe<Scalars['String']['input']>;
};

/** the details of how to connect to a http service like prometheus */
export type HttpConnection = {
  __typename?: 'HttpConnection';
  host: Scalars['String']['output'];
  /** password to connect w/ for basic auth */
  password?: Maybe<Scalars['String']['output']>;
  /** user to connect w/ for basic auth */
  user?: Maybe<Scalars['String']['output']>;
};

export type HttpConnectionAttributes = {
  host: Scalars['String']['input'];
  /** password to connect w/ for basic auth */
  password?: InputMaybe<Scalars['String']['input']>;
  /** user to connect w/ for basic auth */
  user?: InputMaybe<Scalars['String']['input']>;
};

export type HttpIngressRule = {
  __typename?: 'HttpIngressRule';
  paths?: Maybe<Array<Maybe<IngressPath>>>;
};

export type Ingress = {
  __typename?: 'Ingress';
  certificates?: Maybe<Array<Maybe<Certificate>>>;
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  raw: Scalars['String']['output'];
  spec: IngressSpec;
  status: ServiceStatus;
};

export type IngressBackend = {
  __typename?: 'IngressBackend';
  serviceName?: Maybe<Scalars['String']['output']>;
  servicePort?: Maybe<Scalars['String']['output']>;
};

export type IngressPath = {
  __typename?: 'IngressPath';
  backend?: Maybe<IngressBackend>;
  path?: Maybe<Scalars['String']['output']>;
};

export type IngressRule = {
  __typename?: 'IngressRule';
  host?: Maybe<Scalars['String']['output']>;
  http?: Maybe<HttpIngressRule>;
};

export type IngressSpec = {
  __typename?: 'IngressSpec';
  ingressClassName?: Maybe<Scalars['String']['output']>;
  rules?: Maybe<Array<Maybe<IngressRule>>>;
  tls?: Maybe<Array<Maybe<IngressTls>>>;
};

export type IngressTls = {
  __typename?: 'IngressTls';
  hosts?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type Installation = {
  __typename?: 'Installation';
  id: Scalars['ID']['output'];
  repository?: Maybe<Repository>;
};

export type InstallationConnection = {
  __typename?: 'InstallationConnection';
  edges?: Maybe<Array<Maybe<InstallationEdge>>>;
  pageInfo: PageInfo;
};

export type InstallationEdge = {
  __typename?: 'InstallationEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Installation>;
};

export type Invite = {
  __typename?: 'Invite';
  email?: Maybe<Scalars['String']['output']>;
  secureId: Scalars['String']['output'];
};

export type InviteAttributes = {
  email?: InputMaybe<Scalars['String']['input']>;
};

export type IssuerRef = {
  __typename?: 'IssuerRef';
  group?: Maybe<Scalars['String']['output']>;
  kind?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
};

export type Job = {
  __typename?: 'Job';
  events?: Maybe<Array<Maybe<Event>>>;
  logs?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  metadata: Metadata;
  pods?: Maybe<Array<Maybe<Pod>>>;
  raw: Scalars['String']['output'];
  spec: JobSpec;
  status: JobStatus;
};


export type JobLogsArgs = {
  container: Scalars['String']['input'];
  sinceSeconds: Scalars['Int']['input'];
};

/** the full specification of a job gate */
export type JobGateSpec = {
  __typename?: 'JobGateSpec';
  /** any pod annotations to apply */
  annotations?: Maybe<Scalars['Map']['output']>;
  /** list of containers to run in this job */
  containers?: Maybe<Array<Maybe<ContainerSpec>>>;
  /** any pod labels to apply */
  labels?: Maybe<Scalars['Map']['output']>;
  /** the namespace the job will run in */
  namespace: Scalars['String']['output'];
  /** a raw kubernetes job resource, overrides any other configuration */
  raw?: Maybe<Scalars['String']['output']>;
  /** the service account the pod will use */
  serviceAccount?: Maybe<Scalars['String']['output']>;
};

export type JobReference = {
  __typename?: 'JobReference';
  name: Scalars['String']['output'];
  namespace: Scalars['String']['output'];
};

export type JobSpec = {
  __typename?: 'JobSpec';
  activeDeadlineSeconds?: Maybe<Scalars['Int']['output']>;
  backoffLimit?: Maybe<Scalars['Int']['output']>;
  parallelism?: Maybe<Scalars['Int']['output']>;
};

export type JobStatus = {
  __typename?: 'JobStatus';
  active?: Maybe<Scalars['Int']['output']>;
  completionTime?: Maybe<Scalars['String']['output']>;
  failed?: Maybe<Scalars['Int']['output']>;
  startTime?: Maybe<Scalars['String']['output']>;
  succeeded?: Maybe<Scalars['Int']['output']>;
};

export type KubeconfigAttributes = {
  raw?: InputMaybe<Scalars['String']['input']>;
};

/** supported kubernetes objects fetchable in runbooks */
export type KubernetesData = Deployment | StatefulSet;

export type KubernetesDatasource = {
  __typename?: 'KubernetesDatasource';
  name: Scalars['String']['output'];
  resource: Scalars['String']['output'];
};

export type KubernetesUnstructured = {
  __typename?: 'KubernetesUnstructured';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  raw?: Maybe<Scalars['Map']['output']>;
};

/** metadata needed for configuring kustomize */
export type Kustomize = {
  __typename?: 'Kustomize';
  path: Scalars['String']['output'];
};

export type KustomizeAttributes = {
  /** the path to the kustomization file to use */
  path: Scalars['String']['input'];
};

export type LabelInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export type LabelPair = {
  __typename?: 'LabelPair';
  name?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type License = {
  __typename?: 'License';
  metadata: Metadata;
  spec: LicenseSpec;
  status?: Maybe<LicenseStatus>;
};

export type LicenseFeature = {
  __typename?: 'LicenseFeature';
  description?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
};

export type LicenseSpec = {
  __typename?: 'LicenseSpec';
  secretRef: SecretKeySelector;
};

export type LicenseStatus = {
  __typename?: 'LicenseStatus';
  features?: Maybe<Array<Maybe<LicenseFeature>>>;
  free?: Maybe<Scalars['Boolean']['output']>;
  limits?: Maybe<Scalars['Map']['output']>;
  plan?: Maybe<Scalars['String']['output']>;
  secrets?: Maybe<Scalars['Map']['output']>;
};

export type LoadBalancerIngressStatus = {
  __typename?: 'LoadBalancerIngressStatus';
  hostname?: Maybe<Scalars['String']['output']>;
  ip?: Maybe<Scalars['String']['output']>;
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
  description?: Maybe<Scalars['String']['output']>;
  labels?: Maybe<Array<Maybe<LogLabel>>>;
  name?: Maybe<Scalars['String']['output']>;
  query?: Maybe<Scalars['String']['output']>;
};

export type LogLabel = {
  __typename?: 'LogLabel';
  name?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type LogStream = {
  __typename?: 'LogStream';
  stream?: Maybe<Scalars['Map']['output']>;
  values?: Maybe<Array<Maybe<MetricResult>>>;
};

export type LoginInfo = {
  __typename?: 'LoginInfo';
  oidcUri?: Maybe<Scalars['String']['output']>;
};

export type ManifestNetwork = {
  __typename?: 'ManifestNetwork';
  pluralDns?: Maybe<Scalars['Boolean']['output']>;
  subdomain?: Maybe<Scalars['String']['output']>;
};

export enum MatchStrategy {
  All = 'ALL',
  Any = 'ANY',
  Recursive = 'RECURSIVE'
}

export type Metadata = {
  __typename?: 'Metadata';
  annotations?: Maybe<Array<Maybe<LabelPair>>>;
  creationTimestamp?: Maybe<Scalars['String']['output']>;
  labels?: Maybe<Array<Maybe<LabelPair>>>;
  name: Scalars['String']['output'];
  namespace?: Maybe<Scalars['String']['output']>;
  uid?: Maybe<Scalars['String']['output']>;
};

export type MetadataAttributes = {
  annotations?: InputMaybe<Scalars['Json']['input']>;
  labels?: InputMaybe<Scalars['Json']['input']>;
};

export type MetricResponse = {
  __typename?: 'MetricResponse';
  metric?: Maybe<Scalars['Map']['output']>;
  values?: Maybe<Array<Maybe<MetricResult>>>;
};

export type MetricResult = {
  __typename?: 'MetricResult';
  timestamp?: Maybe<Scalars['Long']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type Namespace = {
  __typename?: 'Namespace';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  raw: Scalars['String']['output'];
  spec: NamespaceSpec;
  status: NamespaceStatus;
};

/** metadata fields for created namespaces */
export type NamespaceMetadata = {
  __typename?: 'NamespaceMetadata';
  annotations?: Maybe<Scalars['Map']['output']>;
  labels?: Maybe<Scalars['Map']['output']>;
};

export type NamespaceSpec = {
  __typename?: 'NamespaceSpec';
  finalizers?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type NamespaceStatus = {
  __typename?: 'NamespaceStatus';
  phase?: Maybe<Scalars['String']['output']>;
};

export type NamespacedName = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};

export type Node = {
  __typename?: 'Node';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  pods?: Maybe<Array<Maybe<Pod>>>;
  raw: Scalars['String']['output'];
  spec: NodeSpec;
  status: NodeStatus;
};

/** cloud specific settings for a node pool */
export type NodeCloudSettings = {
  __typename?: 'NodeCloudSettings';
  aws?: Maybe<AwsCloud>;
};

export type NodeCondition = {
  __typename?: 'NodeCondition';
  message?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
};

export type NodeMetric = {
  __typename?: 'NodeMetric';
  metadata: Metadata;
  timestamp?: Maybe<Scalars['String']['output']>;
  usage?: Maybe<NodeUsage>;
  window?: Maybe<Scalars['String']['output']>;
};

/** a specification for a node pool to be created in this cluster */
export type NodePool = {
  __typename?: 'NodePool';
  /** cloud specific settings for the node groups */
  cloudSettings?: Maybe<NodeCloudSettings>;
  /** internal id for this node pool */
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the type of node to use (usually cloud-specific) */
  instanceType: Scalars['String']['output'];
  /** kubernetes labels to apply to the nodes in this pool, useful for node selectors */
  labels?: Maybe<Scalars['Map']['output']>;
  /** maximum number of instances in this node pool */
  maxSize: Scalars['Int']['output'];
  /** minimum number of instances in this node pool */
  minSize: Scalars['Int']['output'];
  /** name of this node pool (must be unique) */
  name: Scalars['String']['output'];
  /** whether this is a spot pool or not */
  spot?: Maybe<Scalars['Boolean']['output']>;
  /** any taints you'd want to apply to a node, for eg preventing scheduling on spot instances */
  taints?: Maybe<Array<Maybe<Taint>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type NodePoolAttributes = {
  cloudSettings?: InputMaybe<NodePoolCloudAttributes>;
  instanceType: Scalars['String']['input'];
  labels?: InputMaybe<Scalars['Json']['input']>;
  maxSize: Scalars['Int']['input'];
  minSize: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  taints?: InputMaybe<Array<InputMaybe<TaintAttributes>>>;
};

export type NodePoolCloudAttributes = {
  aws?: InputMaybe<AwsNodeCloudAttributes>;
};

export type NodeSpec = {
  __typename?: 'NodeSpec';
  podCidr?: Maybe<Scalars['String']['output']>;
  providerId?: Maybe<Scalars['String']['output']>;
  unschedulable?: Maybe<Scalars['Boolean']['output']>;
};

export type NodeStatus = {
  __typename?: 'NodeStatus';
  allocatable?: Maybe<Scalars['Map']['output']>;
  capacity?: Maybe<Scalars['Map']['output']>;
  conditions?: Maybe<Array<Maybe<NodeCondition>>>;
  phase?: Maybe<Scalars['String']['output']>;
};

export type NodeUsage = {
  __typename?: 'NodeUsage';
  cpu?: Maybe<Scalars['String']['output']>;
  memory?: Maybe<Scalars['String']['output']>;
};

export type Notification = {
  __typename?: 'Notification';
  annotations?: Maybe<Scalars['Map']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  fingerprint: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  labels?: Maybe<Scalars['Map']['output']>;
  repository: Scalars['String']['output'];
  seenAt?: Maybe<Scalars['DateTime']['output']>;
  severity?: Maybe<Severity>;
  status?: Maybe<NotificationStatus>;
  title: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
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
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Notification>;
};

export enum NotificationStatus {
  Firing = 'FIRING',
  Resolved = 'RESOLVED'
}

export type ObjectReference = {
  __typename?: 'ObjectReference';
  name?: Maybe<Scalars['String']['output']>;
  namespace?: Maybe<Scalars['String']['output']>;
};

export type ObjectStore = {
  __typename?: 'ObjectStore';
  azure?: Maybe<AzureStore>;
  gcs?: Maybe<GcsStore>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  s3?: Maybe<S3Store>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type ObjectStoreAttributes = {
  azure?: InputMaybe<AzureStoreAttributes>;
  gcs?: InputMaybe<GcsStoreAttributes>;
  name: Scalars['String']['input'];
  s3?: InputMaybe<S3StoreAttributes>;
};

export type ObjectStoreConnection = {
  __typename?: 'ObjectStoreConnection';
  edges?: Maybe<Array<Maybe<ObjectStoreEdge>>>;
  pageInfo: PageInfo;
};

export type ObjectStoreEdge = {
  __typename?: 'ObjectStoreEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<ObjectStore>;
};

export enum Operation {
  Eq = 'EQ',
  Gt = 'GT',
  Gte = 'GTE',
  Lt = 'LT',
  Lte = 'LTE',
  Not = 'NOT',
  Prefix = 'PREFIX',
  Suffix = 'SUFFIX'
}

export type OverlayUpdate = {
  __typename?: 'OverlayUpdate';
  path?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type PathUpdate = {
  __typename?: 'PathUpdate';
  path?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  valueFrom: Scalars['String']['output'];
};

export enum Permission {
  Configure = 'CONFIGURE',
  Deploy = 'DEPLOY',
  Operate = 'OPERATE',
  Read = 'READ'
}

/** a release pipeline, composed of multiple stages each with potentially multiple services */
export type Pipeline = {
  __typename?: 'Pipeline';
  /** lists the contexts applied to a pipeline */
  contexts?: Maybe<PipelineContextConnection>;
  /** edges linking two stages w/in the pipeline in a full DAG */
  edges?: Maybe<Array<Maybe<PipelineStageEdge>>>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the name of the pipeline */
  name: Scalars['String']['output'];
  /** the stages of this pipeline */
  stages?: Maybe<Array<Maybe<PipelineStage>>>;
  status?: Maybe<PipelineStatus>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};


/** a release pipeline, composed of multiple stages each with potentially multiple services */
export type PipelineContextsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** the top level input object for creating/deleting pipelines */
export type PipelineAttributes = {
  edges?: InputMaybe<Array<InputMaybe<PipelineEdgeAttributes>>>;
  stages?: InputMaybe<Array<InputMaybe<PipelineStageAttributes>>>;
};

export type PipelineConnection = {
  __typename?: 'PipelineConnection';
  edges?: Maybe<Array<Maybe<PipelineEdge>>>;
  pageInfo: PageInfo;
};

/** A variable context that can be used to generate pull requests as a pipeline progresses */
export type PipelineContext = {
  __typename?: 'PipelineContext';
  /** the context map that will be passed to the pipeline */
  context: Scalars['Map']['output'];
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  pipeline?: Maybe<Pipeline>;
  /** a history of pull requests created by this context thus far */
  pullRequests?: Maybe<Array<Maybe<PullRequest>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** attributes needed to create a new pipeline context */
export type PipelineContextAttributes = {
  context: Scalars['Json']['input'];
};

export type PipelineContextConnection = {
  __typename?: 'PipelineContextConnection';
  edges?: Maybe<Array<Maybe<PipelineContextEdge>>>;
  pageInfo: PageInfo;
};

export type PipelineContextEdge = {
  __typename?: 'PipelineContextEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<PipelineContext>;
};

export type PipelineEdge = {
  __typename?: 'PipelineEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Pipeline>;
};

/** specification of an edge between two pipeline stages */
export type PipelineEdgeAttributes = {
  /** the name of the pipeline stage this edge emits from */
  from?: InputMaybe<Scalars['String']['input']>;
  /** stage id the edge is from, can also be specified by name */
  fromId?: InputMaybe<Scalars['ID']['input']>;
  /** any optional promotion gates you wish to configure */
  gates?: InputMaybe<Array<InputMaybe<PipelineGateAttributes>>>;
  /** the name of the pipeline stage this edge points to */
  to?: InputMaybe<Scalars['String']['input']>;
  /** stage id the edge is to, can also be specified by name */
  toId?: InputMaybe<Scalars['ID']['input']>;
};

/** A gate blocking promotion along a release pipeline */
export type PipelineGate = {
  __typename?: 'PipelineGate';
  /** the last user to approve this gate */
  approver?: Maybe<User>;
  /** the cluster this gate can run on */
  cluster?: Maybe<Cluster>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the kubernetes job running this gate (should only be fetched lazily as this is a heavy operation) */
  job?: Maybe<Job>;
  /** the name of this gate as seen in the UI */
  name: Scalars['String']['output'];
  /** more detailed specification for complex gates */
  spec?: Maybe<GateSpec>;
  /** the current state of this gate */
  state: GateState;
  /** the type of gate this is */
  type: GateType;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** will configure a promotion gate for a pipeline */
export type PipelineGateAttributes = {
  /** the handle of a cluster this gate will execute on */
  cluster?: InputMaybe<Scalars['String']['input']>;
  /** the id of the cluster this gate will execute on */
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  /** the name of this gate */
  name: Scalars['String']['input'];
  /** a specification for more complex gate types */
  spec?: InputMaybe<GateSpecAttributes>;
  /** the type of gate this is */
  type: GateType;
};

export type PipelineGateConnection = {
  __typename?: 'PipelineGateConnection';
  edges?: Maybe<Array<Maybe<PipelineGateEdge>>>;
  pageInfo: PageInfo;
};

export type PipelineGateEdge = {
  __typename?: 'PipelineGateEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<PipelineGate>;
};

/** a representation of an individual pipeline promotion, which is a list of services/revisions and timestamps to determine promotion status */
export type PipelinePromotion = {
  __typename?: 'PipelinePromotion';
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the last time this promotion was fully promoted, it's no longer pending if promoted_at > revised_at */
  promotedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the last time this promotion was updated */
  revisedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the services included in this promotion */
  services?: Maybe<Array<Maybe<PromotionService>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** a pipeline stage, has a list of services and potentially a promotion which might be pending */
export type PipelineStage = {
  __typename?: 'PipelineStage';
  /** the context that is to be applied to this stage for PR promotions */
  context?: Maybe<PipelineContext>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the name of this stage (eg dev, prod, staging) */
  name: Scalars['String']['output'];
  /** a promotion which might be outstanding for this stage */
  promotion?: Maybe<PipelinePromotion>;
  /** the services within this stage */
  services?: Maybe<Array<Maybe<StageService>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** specification of a stage of a pipeline */
export type PipelineStageAttributes = {
  name: Scalars['String']['input'];
  services?: InputMaybe<Array<InputMaybe<StageServiceAttributes>>>;
};

/** an edge in the pipeline DAG */
export type PipelineStageEdge = {
  __typename?: 'PipelineStageEdge';
  from: PipelineStage;
  gates?: Maybe<Array<Maybe<PipelineGate>>>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** when the edge was last promoted, if greater than the promotion objects revised at, was successfully promoted */
  promotedAt?: Maybe<Scalars['DateTime']['output']>;
  to: PipelineStage;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** a report of gate statuses within a pipeline to gauge its health */
export type PipelineStatus = {
  __typename?: 'PipelineStatus';
  /** if > 0, consider the pipeline stopped */
  closed?: Maybe<Scalars['Int']['output']>;
  /** if > 0, consider the pipeline running */
  pending?: Maybe<Scalars['Int']['output']>;
};

export type Plan = {
  __typename?: 'Plan';
  id?: Maybe<Scalars['ID']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  period?: Maybe<Scalars['String']['output']>;
};

export type PluralCluster = {
  __typename?: 'PluralCluster';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  raw: Scalars['String']['output'];
  reference?: Maybe<Cluster>;
  status: PluralObjectStatus;
};

export type PluralContext = {
  __typename?: 'PluralContext';
  buckets?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  configuration: Scalars['Map']['output'];
  domains?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type PluralGitRepository = {
  __typename?: 'PluralGitRepository';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  raw: Scalars['String']['output'];
  reference?: Maybe<GitRepository>;
  status: PluralObjectStatus;
};

export type PluralManifest = {
  __typename?: 'PluralManifest';
  bucketPrefix?: Maybe<Scalars['String']['output']>;
  cluster?: Maybe<Scalars['String']['output']>;
  network?: Maybe<ManifestNetwork>;
};

export type PluralObjectStatus = {
  __typename?: 'PluralObjectStatus';
  conditions?: Maybe<Array<Maybe<StatusCondition>>>;
  id?: Maybe<Scalars['String']['output']>;
};

export type PluralServiceDeployment = {
  __typename?: 'PluralServiceDeployment';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  raw: Scalars['String']['output'];
  reference?: Maybe<ServiceDeployment>;
  status: PluralObjectStatus;
};

export type PluralSubscription = {
  __typename?: 'PluralSubscription';
  id?: Maybe<Scalars['ID']['output']>;
  plan?: Maybe<Plan>;
};

export type Pod = {
  __typename?: 'Pod';
  events?: Maybe<Array<Maybe<Event>>>;
  logs?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  metadata: Metadata;
  raw: Scalars['String']['output'];
  spec: PodSpec;
  status: PodStatus;
};


export type PodLogsArgs = {
  container: Scalars['String']['input'];
  sinceSeconds: Scalars['Int']['input'];
};

export type PodCondition = {
  __typename?: 'PodCondition';
  lastProbeTime?: Maybe<Scalars['String']['output']>;
  lastTransitionTime?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
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
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Pod>;
};

export type PodSpec = {
  __typename?: 'PodSpec';
  containers?: Maybe<Array<Maybe<Container>>>;
  initContainers?: Maybe<Array<Maybe<Container>>>;
  nodeName?: Maybe<Scalars['String']['output']>;
  serviceAccountName?: Maybe<Scalars['String']['output']>;
};

export type PodStatus = {
  __typename?: 'PodStatus';
  conditions?: Maybe<Array<Maybe<PodCondition>>>;
  containerStatuses?: Maybe<Array<Maybe<ContainerStatus>>>;
  hostIp?: Maybe<Scalars['String']['output']>;
  initContainerStatuses?: Maybe<Array<Maybe<ContainerStatus>>>;
  message?: Maybe<Scalars['String']['output']>;
  phase?: Maybe<Scalars['String']['output']>;
  podIp?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
};

export type PolicyBinding = {
  __typename?: 'PolicyBinding';
  group?: Maybe<Group>;
  id?: Maybe<Scalars['ID']['output']>;
  user?: Maybe<User>;
};

export type PolicyBindingAttributes = {
  groupId?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type Port = {
  __typename?: 'Port';
  containerPort?: Maybe<Scalars['Int']['output']>;
  hostPort?: Maybe<Scalars['Int']['output']>;
  protocol?: Maybe<Scalars['String']['output']>;
};

export type PostgresInstance = {
  __typename?: 'PostgresInstance';
  uid: Scalars['String']['output'];
};

export type PostgresSettings = {
  __typename?: 'PostgresSettings';
  version?: Maybe<Scalars['String']['output']>;
};

export type Postgresql = {
  __typename?: 'Postgresql';
  instances?: Maybe<Array<Maybe<PostgresInstance>>>;
  metadata: Metadata;
  spec: PostgresqlSpec;
  status?: Maybe<PostgresqlStatus>;
};

export type PostgresqlSpec = {
  __typename?: 'PostgresqlSpec';
  databases?: Maybe<Scalars['Map']['output']>;
  numberOfInstances?: Maybe<Scalars['Int']['output']>;
  pods?: Maybe<Array<Maybe<Pod>>>;
  postgresql?: Maybe<PostgresSettings>;
  resources?: Maybe<Resources>;
  teamId?: Maybe<Scalars['String']['output']>;
  users?: Maybe<Scalars['Map']['output']>;
  volume?: Maybe<DatabaseVolume>;
};

export type PostgresqlStatus = {
  __typename?: 'PostgresqlStatus';
  clusterStatus?: Maybe<Scalars['String']['output']>;
};

/** a description of how to generate a pr, which can either modify existing files or generate new ones w/in a repo */
export type PrAutomation = {
  __typename?: 'PrAutomation';
  /** link to an add-on name if this can update it */
  addon?: Maybe<Scalars['String']['output']>;
  /** link to a cluster if this is to perform an upgrade */
  cluster?: Maybe<Cluster>;
  configuration?: Maybe<Array<Maybe<PrConfiguration>>>;
  /** the scm connection to use for pr generation */
  connection?: Maybe<ScmConnection>;
  /** users who can generate prs with this automation */
  createBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
  creates?: Maybe<PrCreateSpec>;
  documentation?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** string id for a repository, eg for github, this is {organization}/{repository-name} */
  identifier: Scalars['String']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  message: Scalars['String']['output'];
  /** the name for this automation */
  name: Scalars['String']['output'];
  /** the git repository to use for sourcing external templates */
  repository?: Maybe<GitRepository>;
  /** An enum describing the high-level responsibility of this pr, eg creating a cluster or service, or upgrading a cluster */
  role?: Maybe<PrRole>;
  /** link to a service if this can update its configuration */
  service?: Maybe<ServiceDeployment>;
  title: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  updates?: Maybe<PrUpdateSpec>;
  /** write policy for this pr automation, also propagates to the notifications list for any created PRs */
  writeBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
};

/** A way to create a self-service means of generating PRs against an IaC repo */
export type PrAutomationAttributes = {
  /** link to an add-on name if this can update it */
  addon?: InputMaybe<Scalars['String']['input']>;
  branch?: InputMaybe<Scalars['String']['input']>;
  /** link to a cluster if this is to perform an upgrade */
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  configuration?: InputMaybe<Array<InputMaybe<PrConfigurationAttributes>>>;
  /** the scm connection to use for pr generation */
  connectionId?: InputMaybe<Scalars['ID']['input']>;
  /** users who can create prs with this automation */
  createBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
  creates?: InputMaybe<PrAutomationCreateSpecAttributes>;
  documentation?: InputMaybe<Scalars['String']['input']>;
  /** string id for a repository, eg for github, this is {organization}/{repository-name} */
  identifier?: InputMaybe<Scalars['String']['input']>;
  message?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  /** a git repository to use for create mode prs */
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
  role?: InputMaybe<PrRole>;
  /** link to a service if this can modify its configuration */
  serviceId?: InputMaybe<Scalars['ID']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  updates?: InputMaybe<PrAutomationUpdateSpecAttributes>;
  /** users who can update this automation */
  writeBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
};

export type PrAutomationConnection = {
  __typename?: 'PrAutomationConnection';
  edges?: Maybe<Array<Maybe<PrAutomationEdge>>>;
  pageInfo: PageInfo;
};

/** Operations to create new templated files within this pr */
export type PrAutomationCreateSpecAttributes = {
  git?: InputMaybe<GitRefAttributes>;
  templates?: InputMaybe<Array<InputMaybe<PrAutomationTemplateAttributes>>>;
};

export type PrAutomationEdge = {
  __typename?: 'PrAutomationEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<PrAutomation>;
};

/** templates to apply in this pr */
export type PrAutomationTemplateAttributes = {
  destination: Scalars['String']['input'];
  /** whether the source template is sourced from an external git repo bound to this automation */
  external: Scalars['Boolean']['input'];
  source: Scalars['String']['input'];
};

/** The operations to be performed on the files w/in the pr */
export type PrAutomationUpdateSpecAttributes = {
  files?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  matchStrategy?: InputMaybe<MatchStrategy>;
  /** list of regex scope replacement templates, useful for ANY strategies */
  regexReplacements?: InputMaybe<Array<InputMaybe<RegexReplacementAttributes>>>;
  regexes?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  replaceTemplate?: InputMaybe<Scalars['String']['input']>;
  yq?: InputMaybe<Scalars['String']['input']>;
};

/** the a configuration item for creating a new pr, used for templating the ultimate code changes made */
export type PrConfiguration = {
  __typename?: 'PrConfiguration';
  condition?: Maybe<PrConfigurationCondition>;
  default?: Maybe<Scalars['String']['output']>;
  documentation?: Maybe<Scalars['String']['output']>;
  longform?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  optional?: Maybe<Scalars['Boolean']['output']>;
  placeholder?: Maybe<Scalars['String']['output']>;
  type: ConfigurationType;
};

/** the a configuration item for creating a new pr */
export type PrConfigurationAttributes = {
  condition?: InputMaybe<ConditionAttributes>;
  default?: InputMaybe<Scalars['String']['input']>;
  documentation?: InputMaybe<Scalars['String']['input']>;
  longform?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  optional?: InputMaybe<Scalars['Boolean']['input']>;
  placeholder?: InputMaybe<Scalars['String']['input']>;
  type: ConfigurationType;
};

/** declaritive spec for whether a config item is relevant given prior config */
export type PrConfigurationCondition = {
  __typename?: 'PrConfigurationCondition';
  /** the prior field to check */
  field: Scalars['String']['output'];
  /** a boolean operation to apply */
  operation: Operation;
  /** a fixed value to check against if its a binary operation */
  value?: Maybe<Scalars['String']['output']>;
};

/** templated files used to add new files to a given pr */
export type PrCreateSpec = {
  __typename?: 'PrCreateSpec';
  /** pointer within an external git repository to source templates from */
  git?: Maybe<GitRef>;
  templates?: Maybe<Array<Maybe<PrTemplateSpec>>>;
};

export enum PrRole {
  Cluster = 'CLUSTER',
  Pipeline = 'PIPELINE',
  Service = 'SERVICE',
  Update = 'UPDATE',
  Upgrade = 'UPGRADE'
}

export enum PrStatus {
  Closed = 'CLOSED',
  Merged = 'MERGED',
  Open = 'OPEN'
}

/** the details of where to find and place a templated file */
export type PrTemplateSpec = {
  __typename?: 'PrTemplateSpec';
  destination: Scalars['String']['output'];
  external: Scalars['Boolean']['output'];
  source: Scalars['String']['output'];
};

/** existing file updates that can be performed in a PR */
export type PrUpdateSpec = {
  __typename?: 'PrUpdateSpec';
  files?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  matchStrategy?: Maybe<MatchStrategy>;
  regexReplacements?: Maybe<Array<Maybe<RegexReplacement>>>;
  regexes?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  replaceTemplate?: Maybe<Scalars['String']['output']>;
  yq?: Maybe<Scalars['String']['output']>;
};

export type PrometheusDatasource = {
  __typename?: 'PrometheusDatasource';
  format?: Maybe<Scalars['String']['output']>;
  legend?: Maybe<Scalars['String']['output']>;
  query: Scalars['String']['output'];
};

/** how a promotion for a service will be performed */
export type PromotionCriteria = {
  __typename?: 'PromotionCriteria';
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** whether you want to copy any configuration values from the source service */
  secrets?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** the source service in a prior stage to promote settings from */
  source?: Maybe<ServiceDeployment>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** actions to perform if this stage service were promoted */
export type PromotionCriteriaAttributes = {
  /** the handle of the cluster for the source service */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** the name of the source service */
  name?: InputMaybe<Scalars['String']['input']>;
  /** the secrets to copy over in a promotion */
  secrets?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  /** the id of the service to promote from */
  sourceId?: InputMaybe<Scalars['ID']['input']>;
};

/** a service to be potentially promoted */
export type PromotionService = {
  __typename?: 'PromotionService';
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the revision of the service to promote */
  revision?: Maybe<Revision>;
  /** a service to promote */
  service?: Maybe<ServiceDeployment>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** a cloud credential that can be used while creating new clusters */
export type ProviderCredential = {
  __typename?: 'ProviderCredential';
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  kind: Scalars['String']['output'];
  name: Scalars['String']['output'];
  namespace: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type ProviderCredentialAttributes = {
  kind?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/** A reference to a pull request for your kubernetes related IaC */
export type PullRequest = {
  __typename?: 'PullRequest';
  /** the cluster this pr is meant to modify */
  cluster?: Maybe<Cluster>;
  creator?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  labels?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** the service this pr is meant to modify */
  service?: Maybe<ServiceDeployment>;
  status: PrStatus;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  url: Scalars['String']['output'];
};

/** attributes for a pull request pointer record */
export type PullRequestAttributes = {
  cluster?: InputMaybe<NamespacedName>;
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  creator?: InputMaybe<Scalars['String']['input']>;
  labels?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  service?: InputMaybe<NamespacedName>;
  serviceId?: InputMaybe<Scalars['ID']['input']>;
  title: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type PullRequestConnection = {
  __typename?: 'PullRequestConnection';
  edges?: Maybe<Array<Maybe<PullRequestEdge>>>;
  pageInfo: PageInfo;
};

export type PullRequestEdge = {
  __typename?: 'PullRequestEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<PullRequest>;
};

export type RbacAttributes = {
  readBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
  writeBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
};

export enum ReadType {
  Build = 'BUILD',
  Notification = 'NOTIFICATION'
}

export type Recipe = {
  __typename?: 'Recipe';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  oidcEnabled?: Maybe<Scalars['Boolean']['output']>;
  provider?: Maybe<Scalars['String']['output']>;
  recipeSections?: Maybe<Array<Maybe<RecipeSection>>>;
  restricted?: Maybe<Scalars['Boolean']['output']>;
};

export type RecipeConnection = {
  __typename?: 'RecipeConnection';
  edges?: Maybe<Array<Maybe<RecipeEdge>>>;
  pageInfo: PageInfo;
};

export type RecipeEdge = {
  __typename?: 'RecipeEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Recipe>;
};

export type RecipeItem = {
  __typename?: 'RecipeItem';
  configuration?: Maybe<Array<Maybe<ConfigurationItem>>>;
  id: Scalars['ID']['output'];
};

export type RecipeSection = {
  __typename?: 'RecipeSection';
  configuration?: Maybe<Array<Maybe<ConfigurationItem>>>;
  id: Scalars['ID']['output'];
  recipeItems?: Maybe<Array<Maybe<RecipeItem>>>;
  repository?: Maybe<Repository>;
};

export type Recommendation = {
  __typename?: 'Recommendation';
  containerRecommendations?: Maybe<Array<Maybe<ContainerRecommendation>>>;
};

/** a fully specified regex/replace flow */
export type RegexReplacement = {
  __typename?: 'RegexReplacement';
  regex: Scalars['String']['output'];
  /** template string to replace any match with */
  replacement: Scalars['String']['output'];
};

/** a fully specify regex/replace flow */
export type RegexReplacementAttributes = {
  regex: Scalars['String']['input'];
  replacement: Scalars['String']['input'];
};

export type ReplicaSet = {
  __typename?: 'ReplicaSet';
  metadata: Metadata;
  pods?: Maybe<Array<Maybe<Pod>>>;
  raw: Scalars['String']['output'];
  spec: ReplicaSetSpec;
  status: ReplicaSetStatus;
};

export type ReplicaSetSpec = {
  __typename?: 'ReplicaSetSpec';
  replicas?: Maybe<Scalars['Int']['output']>;
};

export type ReplicaSetStatus = {
  __typename?: 'ReplicaSetStatus';
  availableReplicas?: Maybe<Scalars['Int']['output']>;
  conditions?: Maybe<Array<Maybe<StatusCondition>>>;
  fullyLabeledReplicas?: Maybe<Scalars['Int']['output']>;
  readyReplicas?: Maybe<Scalars['Int']['output']>;
  replicas?: Maybe<Scalars['Int']['output']>;
};

export type Repository = {
  __typename?: 'Repository';
  configuration?: Maybe<Configuration>;
  description?: Maybe<Scalars['String']['output']>;
  docs?: Maybe<Array<Maybe<FileContent>>>;
  grafanaDns?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type RepositoryConnection = {
  __typename?: 'RepositoryConnection';
  edges?: Maybe<Array<Maybe<RepositoryEdge>>>;
  pageInfo: PageInfo;
};

export type RepositoryContext = {
  __typename?: 'RepositoryContext';
  context?: Maybe<Scalars['Map']['output']>;
  repository: Scalars['String']['output'];
};

export type RepositoryEdge = {
  __typename?: 'RepositoryEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Repository>;
};

/** an edge representing mapping from kubernetes object metadata.uid -> metadata.uid */
export type ResourceEdge = {
  __typename?: 'ResourceEdge';
  from: Scalars['String']['output'];
  to: Scalars['String']['output'];
};

export type ResourceSpec = {
  __typename?: 'ResourceSpec';
  cpu?: Maybe<Scalars['String']['output']>;
  memory?: Maybe<Scalars['String']['output']>;
};

export type Resources = {
  __typename?: 'Resources';
  limits?: Maybe<ResourceSpec>;
  requests?: Maybe<ResourceSpec>;
};

export type RestoreAttributes = {
  status: RestoreStatus;
};

export enum RestoreStatus {
  Created = 'CREATED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Successful = 'SUCCESSFUL'
}

/** a representation of a past revision of a service */
export type Revision = {
  __typename?: 'Revision';
  /** git spec of the prior revision */
  git?: Maybe<GitRef>;
  /** description of how helm charts should be applied */
  helm?: Maybe<HelmSpec>;
  /** id of this revision */
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the commit message for this revision */
  message?: Maybe<Scalars['String']['output']>;
  /** the sha this service was pulled from */
  sha?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the service's semver */
  version: Scalars['String']['output'];
};

export type RevisionConnection = {
  __typename?: 'RevisionConnection';
  edges?: Maybe<Array<Maybe<RevisionEdge>>>;
  pageInfo: PageInfo;
};

export type RevisionEdge = {
  __typename?: 'RevisionEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Revision>;
};

export type Role = {
  __typename?: 'Role';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  permissions?: Maybe<Array<Maybe<Permission>>>;
  repositories?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  roleBindings?: Maybe<Array<Maybe<RoleBinding>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type RoleAttributes = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  permissions?: InputMaybe<Array<InputMaybe<Permission>>>;
  repositories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  roleBindings?: InputMaybe<Array<InputMaybe<BindingAttributes>>>;
};

export type RoleBinding = {
  __typename?: 'RoleBinding';
  group?: Maybe<Group>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
};

export type RoleConnection = {
  __typename?: 'RoleConnection';
  edges?: Maybe<Array<Maybe<RoleEdge>>>;
  pageInfo: PageInfo;
};

export type RoleEdge = {
  __typename?: 'RoleEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Role>;
};

export type RollingUpdate = {
  __typename?: 'RollingUpdate';
  maxSurge?: Maybe<Scalars['Int']['output']>;
  maxUnavailable?: Maybe<Scalars['Int']['output']>;
};

export type RootMutationType = {
  __typename?: 'RootMutationType';
  approveBuild?: Maybe<Build>;
  /** approves an approval pipeline gate */
  approveGate?: Maybe<PipelineGate>;
  cancelBuild?: Maybe<Build>;
  /** clones the spec of the given service to be deployed either into a new namespace or new cluster */
  cloneService?: Maybe<ServiceDeployment>;
  configureBackups?: Maybe<Cluster>;
  createAccessToken?: Maybe<AccessToken>;
  createAgentMigration?: Maybe<AgentMigration>;
  createBuild?: Maybe<Build>;
  createCluster?: Maybe<Cluster>;
  /** upserts a cluster backup resource */
  createClusterBackup?: Maybe<ClusterBackup>;
  createClusterProvider?: Maybe<ClusterProvider>;
  createClusterRestore?: Maybe<ClusterRestore>;
  createGitRepository?: Maybe<GitRepository>;
  createGlobalService?: Maybe<GlobalService>;
  createGroup?: Maybe<Group>;
  createGroupMember?: Maybe<GroupMember>;
  createInvite?: Maybe<Invite>;
  createObjectStore?: Maybe<ObjectStore>;
  createPeer?: Maybe<WireguardPeer>;
  /** creates a new pipeline context and binds it to the beginning stage */
  createPipelineContext?: Maybe<PipelineContext>;
  createPrAutomation?: Maybe<PrAutomation>;
  createProviderCredential?: Maybe<ProviderCredential>;
  createPullRequest?: Maybe<PullRequest>;
  /** just registers a pointer record to a PR after it was created externally be some other automation */
  createPullRequestPointer?: Maybe<PullRequest>;
  createRole?: Maybe<Role>;
  createScmConnection?: Maybe<ScmConnection>;
  createScmWebhook?: Maybe<ScmWebhook>;
  createServiceAccount?: Maybe<User>;
  createServiceAccountToken?: Maybe<AccessToken>;
  createServiceDeployment?: Maybe<ServiceDeployment>;
  createUpgradePolicy?: Maybe<UpgradePolicy>;
  createWebhook?: Maybe<Webhook>;
  deleteAccessToken?: Maybe<AccessToken>;
  deleteCertificate?: Maybe<Scalars['Boolean']['output']>;
  deleteCluster?: Maybe<Cluster>;
  deleteClusterProvider?: Maybe<ClusterProvider>;
  deleteGitRepository?: Maybe<GitRepository>;
  deleteGlobalService?: Maybe<GlobalService>;
  deleteGroup?: Maybe<Group>;
  deleteGroupMember?: Maybe<GroupMember>;
  deleteJob?: Maybe<Job>;
  deleteNode?: Maybe<Node>;
  deleteObjectStore?: Maybe<ObjectStore>;
  deletePeer?: Maybe<Scalars['Boolean']['output']>;
  deletePipeline?: Maybe<Pipeline>;
  deletePod?: Maybe<Pod>;
  deletePrAutomation?: Maybe<PrAutomation>;
  deleteProviderCredential?: Maybe<ProviderCredential>;
  deleteRole?: Maybe<Role>;
  deleteScmConnection?: Maybe<ScmConnection>;
  deleteServiceContext?: Maybe<ServiceContext>;
  deleteServiceDeployment?: Maybe<ServiceDeployment>;
  deleteUpgradePolicy?: Maybe<UpgradePolicy>;
  deleteUser?: Maybe<User>;
  deleteWebhook?: Maybe<Webhook>;
  delinkBackups?: Maybe<Cluster>;
  /** soft deletes a cluster, by deregistering it in our system but not disturbing any kubernetes objects */
  detachCluster?: Maybe<Cluster>;
  /** removes a service from storage, but bypasses waiting for the agent to fully drain it from its hosting cluster */
  detachServiceDeployment?: Maybe<ServiceDeployment>;
  enableDeployments?: Maybe<DeploymentSettings>;
  executeRunbook?: Maybe<RunbookActionResponse>;
  /** forces a pipeline gate to be in open state */
  forceGate?: Maybe<PipelineGate>;
  installAddOn?: Maybe<ServiceDeployment>;
  installRecipe?: Maybe<Build>;
  installStack?: Maybe<Build>;
  kickService?: Maybe<ServiceDeployment>;
  loginLink?: Maybe<User>;
  markRead?: Maybe<User>;
  /** merges configuration for a service */
  mergeService?: Maybe<ServiceDeployment>;
  oauthCallback?: Maybe<User>;
  overlayConfiguration?: Maybe<Build>;
  /** a regular status ping to be sent by the deploy operator */
  pingCluster?: Maybe<Cluster>;
  /** marks a service as being able to proceed to the next stage of a canary rollout */
  proceed?: Maybe<ServiceDeployment>;
  readNotifications?: Maybe<User>;
  reconfigureRenovate?: Maybe<ServiceDeployment>;
  /** registers a list of runtime services discovered for the current cluster */
  registerRuntimeServices?: Maybe<Scalars['Int']['output']>;
  restartBuild?: Maybe<Build>;
  restorePostgres?: Maybe<Postgresql>;
  /** rewires this service to use the given revision id */
  rollbackService?: Maybe<ServiceDeployment>;
  /** upserts a pipeline with a given name */
  savePipeline?: Maybe<Pipeline>;
  saveServiceContext?: Maybe<ServiceContext>;
  selfManage?: Maybe<ServiceDeployment>;
  /** creates the service to enable self-hosted renovate in one pass */
  setupRenovate?: Maybe<ServiceDeployment>;
  signIn?: Maybe<User>;
  signup?: Maybe<User>;
  updateCluster?: Maybe<Cluster>;
  updateClusterProvider?: Maybe<ClusterProvider>;
  updateClusterRestore?: Maybe<ClusterRestore>;
  updateConfiguration?: Maybe<Configuration>;
  updateDeploymentSettings?: Maybe<DeploymentSettings>;
  updateGate?: Maybe<PipelineGate>;
  updateGitRepository?: Maybe<GitRepository>;
  updateGlobalService?: Maybe<GlobalService>;
  updateGroup?: Maybe<Group>;
  updateObjectStore?: Maybe<ObjectStore>;
  updatePrAutomation?: Maybe<PrAutomation>;
  /** a reusable mutation for updating rbac settings on core services */
  updateRbac?: Maybe<Scalars['Boolean']['output']>;
  updateRole?: Maybe<Role>;
  updateScmConnection?: Maybe<ScmConnection>;
  updateServiceAccount?: Maybe<User>;
  /** updates only the components of a given service, to be sent after deploy operator syncs */
  updateServiceComponents?: Maybe<ServiceDeployment>;
  updateServiceDeployment?: Maybe<ServiceDeployment>;
  updateSmtp?: Maybe<Smtp>;
  updateUser?: Maybe<User>;
};


export type RootMutationTypeApproveBuildArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeApproveGateArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeCancelBuildArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeCloneServiceArgs = {
  attributes: ServiceCloneAttributes;
  cluster?: InputMaybe<Scalars['String']['input']>;
  clusterId: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeConfigureBackupsArgs = {
  clusterId: Scalars['ID']['input'];
  storeId: Scalars['ID']['input'];
};


export type RootMutationTypeCreateAccessTokenArgs = {
  scopes?: InputMaybe<Array<InputMaybe<ScopeAttributes>>>;
};


export type RootMutationTypeCreateAgentMigrationArgs = {
  attributes: AgentMigrationAttributes;
};


export type RootMutationTypeCreateBuildArgs = {
  attributes: BuildAttributes;
};


export type RootMutationTypeCreateClusterArgs = {
  attributes: ClusterAttributes;
};


export type RootMutationTypeCreateClusterBackupArgs = {
  attributes: BackupAttributes;
};


export type RootMutationTypeCreateClusterProviderArgs = {
  attributes: ClusterProviderAttributes;
};


export type RootMutationTypeCreateClusterRestoreArgs = {
  backupId: Scalars['ID']['input'];
};


export type RootMutationTypeCreateGitRepositoryArgs = {
  attributes: GitAttributes;
};


export type RootMutationTypeCreateGlobalServiceArgs = {
  attributes: GlobalServiceAttributes;
  cluster?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeCreateGroupArgs = {
  attributes: GroupAttributes;
};


export type RootMutationTypeCreateGroupMemberArgs = {
  groupId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type RootMutationTypeCreateInviteArgs = {
  attributes: InviteAttributes;
};


export type RootMutationTypeCreateObjectStoreArgs = {
  attributes: ObjectStoreAttributes;
};


export type RootMutationTypeCreatePeerArgs = {
  email?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeCreatePipelineContextArgs = {
  attributes: PipelineContextAttributes;
  pipelineId: Scalars['ID']['input'];
};


export type RootMutationTypeCreatePrAutomationArgs = {
  attributes: PrAutomationAttributes;
};


export type RootMutationTypeCreateProviderCredentialArgs = {
  attributes: ProviderCredentialAttributes;
  name: Scalars['String']['input'];
};


export type RootMutationTypeCreatePullRequestArgs = {
  branch?: InputMaybe<Scalars['String']['input']>;
  context?: InputMaybe<Scalars['Json']['input']>;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeCreatePullRequestPointerArgs = {
  attributes?: InputMaybe<PullRequestAttributes>;
};


export type RootMutationTypeCreateRoleArgs = {
  attributes: RoleAttributes;
};


export type RootMutationTypeCreateScmConnectionArgs = {
  attributes: ScmConnectionAttributes;
};


export type RootMutationTypeCreateScmWebhookArgs = {
  connectionId: Scalars['ID']['input'];
  owner: Scalars['String']['input'];
};


export type RootMutationTypeCreateServiceAccountArgs = {
  attributes: ServiceAccountAttributes;
};


export type RootMutationTypeCreateServiceAccountTokenArgs = {
  id: Scalars['ID']['input'];
  scopes?: InputMaybe<Array<InputMaybe<ScopeAttributes>>>;
};


export type RootMutationTypeCreateServiceDeploymentArgs = {
  attributes: ServiceDeploymentAttributes;
  cluster?: InputMaybe<Scalars['String']['input']>;
  clusterId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeCreateUpgradePolicyArgs = {
  attributes: UpgradePolicyAttributes;
};


export type RootMutationTypeCreateWebhookArgs = {
  attributes: WebhookAttributes;
};


export type RootMutationTypeDeleteAccessTokenArgs = {
  token: Scalars['String']['input'];
};


export type RootMutationTypeDeleteCertificateArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};


export type RootMutationTypeDeleteClusterArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteClusterProviderArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteGitRepositoryArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteGlobalServiceArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteGroupArgs = {
  groupId: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteGroupMemberArgs = {
  groupId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteJobArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeDeleteNodeArgs = {
  name: Scalars['String']['input'];
};


export type RootMutationTypeDeleteObjectStoreArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeletePeerArgs = {
  name: Scalars['String']['input'];
};


export type RootMutationTypeDeletePipelineArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeletePodArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeDeletePrAutomationArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteProviderCredentialArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteRoleArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteScmConnectionArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteServiceContextArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteServiceDeploymentArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteUpgradePolicyArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteWebhookArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDelinkBackupsArgs = {
  clusterId: Scalars['ID']['input'];
};


export type RootMutationTypeDetachClusterArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDetachServiceDeploymentArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeExecuteRunbookArgs = {
  input: RunbookActionInput;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};


export type RootMutationTypeForceGateArgs = {
  id: Scalars['ID']['input'];
  state?: InputMaybe<GateState>;
};


export type RootMutationTypeInstallAddOnArgs = {
  clusterId: Scalars['ID']['input'];
  configuration?: InputMaybe<Array<InputMaybe<ConfigAttributes>>>;
  global?: InputMaybe<GlobalServiceAttributes>;
  name: Scalars['String']['input'];
};


export type RootMutationTypeInstallRecipeArgs = {
  context: Scalars['Map']['input'];
  id: Scalars['ID']['input'];
  oidc?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootMutationTypeInstallStackArgs = {
  context: ContextAttributes;
  name: Scalars['String']['input'];
  oidc?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootMutationTypeKickServiceArgs = {
  cluster?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeLoginLinkArgs = {
  key: Scalars['String']['input'];
};


export type RootMutationTypeMarkReadArgs = {
  type?: InputMaybe<ReadType>;
};


export type RootMutationTypeMergeServiceArgs = {
  configuration?: InputMaybe<Array<InputMaybe<ConfigAttributes>>>;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeOauthCallbackArgs = {
  code: Scalars['String']['input'];
  redirect?: InputMaybe<Scalars['String']['input']>;
};


export type RootMutationTypeOverlayConfigurationArgs = {
  context: Scalars['Map']['input'];
  namespace: Scalars['String']['input'];
};


export type RootMutationTypePingClusterArgs = {
  attributes: ClusterPing;
};


export type RootMutationTypeProceedArgs = {
  cluster?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  promotion?: InputMaybe<ServicePromotion>;
};


export type RootMutationTypeReconfigureRenovateArgs = {
  repos?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  serviceId: Scalars['ID']['input'];
};


export type RootMutationTypeRegisterRuntimeServicesArgs = {
  serviceId?: InputMaybe<Scalars['ID']['input']>;
  services?: InputMaybe<Array<InputMaybe<RuntimeServiceAttributes>>>;
};


export type RootMutationTypeRestartBuildArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeRestorePostgresArgs = {
  clone?: InputMaybe<CloneAttributes>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  timestamp: Scalars['DateTime']['input'];
};


export type RootMutationTypeRollbackServiceArgs = {
  cluster?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  revisionId: Scalars['ID']['input'];
};


export type RootMutationTypeSavePipelineArgs = {
  attributes: PipelineAttributes;
  name: Scalars['String']['input'];
};


export type RootMutationTypeSaveServiceContextArgs = {
  attributes: ServiceContextAttributes;
  name: Scalars['String']['input'];
};


export type RootMutationTypeSelfManageArgs = {
  values: Scalars['String']['input'];
};


export type RootMutationTypeSetupRenovateArgs = {
  connectionId: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  namespace?: InputMaybe<Scalars['String']['input']>;
  repos?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type RootMutationTypeSignInArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type RootMutationTypeSignupArgs = {
  attributes: UserAttributes;
  inviteId: Scalars['String']['input'];
};


export type RootMutationTypeUpdateClusterArgs = {
  attributes: ClusterUpdateAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateClusterProviderArgs = {
  attributes: ClusterProviderUpdateAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateClusterRestoreArgs = {
  attributes: RestoreAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateConfigurationArgs = {
  content: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  repository: Scalars['String']['input'];
  tool?: InputMaybe<Tool>;
};


export type RootMutationTypeUpdateDeploymentSettingsArgs = {
  attributes: DeploymentSettingsAttributes;
};


export type RootMutationTypeUpdateGateArgs = {
  attributes: GateUpdateAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateGitRepositoryArgs = {
  attributes: GitAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateGlobalServiceArgs = {
  attributes: GlobalServiceAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateGroupArgs = {
  attributes: GroupAttributes;
  groupId: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateObjectStoreArgs = {
  attributes: ObjectStoreAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdatePrAutomationArgs = {
  attributes: PrAutomationAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateRbacArgs = {
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  providerId?: InputMaybe<Scalars['ID']['input']>;
  rbac: RbacAttributes;
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeUpdateRoleArgs = {
  attributes: RoleAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateScmConnectionArgs = {
  attributes: ScmConnectionAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateServiceAccountArgs = {
  attributes: ServiceAccountAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateServiceComponentsArgs = {
  components?: InputMaybe<Array<InputMaybe<ComponentAttributes>>>;
  errors?: InputMaybe<Array<InputMaybe<ServiceErrorAttributes>>>;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateServiceDeploymentArgs = {
  attributes: ServiceUpdateAttributes;
  cluster?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};


export type RootMutationTypeUpdateSmtpArgs = {
  smtp: SmtpInput;
};


export type RootMutationTypeUpdateUserArgs = {
  attributes: UserAttributes;
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type RootQueryType = {
  __typename?: 'RootQueryType';
  accessToken?: Maybe<AccessToken>;
  accessTokens?: Maybe<AccessTokenConnection>;
  account?: Maybe<Account>;
  ai?: Maybe<Scalars['String']['output']>;
  application?: Maybe<Application>;
  applications?: Maybe<Array<Maybe<Application>>>;
  auditMetrics?: Maybe<Array<Maybe<AuditMetric>>>;
  audits?: Maybe<AuditConnection>;
  build?: Maybe<Build>;
  buildInfo?: Maybe<BuildInfo>;
  builds?: Maybe<BuildConnection>;
  cachedPods?: Maybe<Array<Maybe<Pod>>>;
  canary?: Maybe<Canary>;
  certificate?: Maybe<Certificate>;
  /** fetches an individual cluster */
  cluster?: Maybe<Cluster>;
  /** list all addons currently resident in the artifacts repo */
  clusterAddOns?: Maybe<Array<Maybe<ClusterAddOn>>>;
  clusterBackup?: Maybe<ClusterBackup>;
  clusterBackups?: Maybe<ClusterBackupConnection>;
  clusterGate?: Maybe<PipelineGate>;
  clusterGates?: Maybe<Array<Maybe<PipelineGate>>>;
  clusterInfo?: Maybe<ClusterInfo>;
  /** fetches an individual cluster provider */
  clusterProvider?: Maybe<ClusterProvider>;
  /** a relay connection of all providers visible to the current user */
  clusterProviders?: Maybe<ClusterProviderConnection>;
  clusterRestore?: Maybe<ClusterRestore>;
  clusterRestores?: Maybe<ClusterRestoreConnection>;
  /** the services deployed in the current cluster, to be polled by the deploy operator */
  clusterServices?: Maybe<Array<Maybe<ServiceDeployment>>>;
  /** gets summary information for all healthy/unhealthy clusters in your fleet */
  clusterStatuses?: Maybe<Array<Maybe<ClusterStatusInfo>>>;
  /** a relay connection of all clusters visible to the current user */
  clusters?: Maybe<ClusterConnection>;
  /** renders a full hierarchy of resources recursively owned by this component (useful for CRD views) */
  componentTree?: Maybe<ComponentTree>;
  configMap?: Maybe<ConfigMap>;
  configMaps?: Maybe<Array<Maybe<ConfigMap>>>;
  configuration?: Maybe<ConsoleConfiguration>;
  configurationOverlays?: Maybe<Array<Maybe<ConfigurationOverlay>>>;
  context?: Maybe<Array<Maybe<RepositoryContext>>>;
  cronJob?: Maybe<CronJob>;
  daemonSet?: Maybe<DaemonSet>;
  dashboard?: Maybe<Dashboard>;
  dashboards?: Maybe<Array<Maybe<Dashboard>>>;
  dependencyManagementServices?: Maybe<DependencyManagementServiceConnection>;
  deployment?: Maybe<Deployment>;
  deploymentSettings?: Maybe<DeploymentSettings>;
  externalToken?: Maybe<Scalars['String']['output']>;
  gitRepositories?: Maybe<GitRepositoryConnection>;
  gitRepository?: Maybe<GitRepository>;
  globalService?: Maybe<GlobalService>;
  group?: Maybe<Group>;
  groupMembers?: Maybe<GroupMemberConnection>;
  groups?: Maybe<GroupConnection>;
  helmRepositories?: Maybe<Array<Maybe<HelmRepository>>>;
  helmRepository?: Maybe<HelmRepository>;
  ingress?: Maybe<Ingress>;
  installations?: Maybe<InstallationConnection>;
  invite?: Maybe<Invite>;
  job?: Maybe<Job>;
  logFilters?: Maybe<Array<Maybe<LogFilter>>>;
  loginInfo?: Maybe<LoginInfo>;
  logs?: Maybe<Array<Maybe<LogStream>>>;
  me?: Maybe<User>;
  metric?: Maybe<Array<Maybe<MetricResponse>>>;
  /** tells you what cluster a deploy token points to */
  myCluster?: Maybe<Cluster>;
  myWireguardPeers?: Maybe<Array<Maybe<WireguardPeer>>>;
  namespaces?: Maybe<Array<Maybe<Namespace>>>;
  node?: Maybe<Node>;
  nodeMetric?: Maybe<NodeMetric>;
  nodeMetrics?: Maybe<Array<Maybe<NodeMetric>>>;
  nodes?: Maybe<Array<Maybe<Node>>>;
  notifications?: Maybe<NotificationConnection>;
  objectStores?: Maybe<ObjectStoreConnection>;
  pagedClusterGates?: Maybe<PipelineGateConnection>;
  pagedClusterServices?: Maybe<ServiceDeploymentConnection>;
  pipeline?: Maybe<Pipeline>;
  pipelineContext?: Maybe<PipelineContext>;
  pipelineGate?: Maybe<PipelineGate>;
  pipelines?: Maybe<PipelineConnection>;
  pluralCluster?: Maybe<PluralCluster>;
  pluralContext?: Maybe<PluralContext>;
  pluralGitRepository?: Maybe<PluralGitRepository>;
  pluralServiceDeployment?: Maybe<PluralServiceDeployment>;
  pod?: Maybe<Pod>;
  pods?: Maybe<PodConnection>;
  postgresDatabase?: Maybe<Postgresql>;
  postgresDatabases?: Maybe<Array<Maybe<Postgresql>>>;
  prAutomation?: Maybe<PrAutomation>;
  prAutomations?: Maybe<PrAutomationConnection>;
  pullRequests?: Maybe<PullRequestConnection>;
  recipe?: Maybe<Recipe>;
  recipes?: Maybe<RecipeConnection>;
  repositories?: Maybe<RepositoryConnection>;
  repository?: Maybe<Repository>;
  role?: Maybe<Role>;
  roles?: Maybe<RoleConnection>;
  runbook?: Maybe<Runbook>;
  runbooks?: Maybe<Array<Maybe<Runbook>>>;
  /** fetch an individual runtime service for more thorough detail views */
  runtimeService?: Maybe<RuntimeService>;
  scalingRecommendation?: Maybe<VerticalPodAutoscaler>;
  scmConnection?: Maybe<ScmConnection>;
  scmConnections?: Maybe<ScmConnectionConnection>;
  scmWebhooks?: Maybe<ScmWebhookConnection>;
  secret?: Maybe<Secret>;
  secrets?: Maybe<Array<Maybe<Secret>>>;
  service?: Maybe<Service>;
  serviceAccounts?: Maybe<UserConnection>;
  serviceContext?: Maybe<ServiceContext>;
  /** fetches details of this service deployment, and can be called by the deploy operator */
  serviceDeployment?: Maybe<ServiceDeployment>;
  serviceDeployments?: Maybe<ServiceDeploymentConnection>;
  serviceStatuses?: Maybe<Array<Maybe<ServiceStatusCount>>>;
  smtp?: Maybe<Smtp>;
  stack?: Maybe<Stack>;
  statefulSet?: Maybe<StatefulSet>;
  /** adds the ability to search/filter through all tag name/value pairs */
  tagPairs?: Maybe<TagConnection>;
  /** lists tags applied to any clusters in the fleet */
  tags?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  temporaryToken?: Maybe<Scalars['String']['output']>;
  /** exchanges a kubeconfig token for user info */
  tokenExchange?: Maybe<User>;
  unstructuredResource?: Maybe<KubernetesUnstructured>;
  upgradePlan?: Maybe<UpgradePlan>;
  upgradePolicies?: Maybe<Array<Maybe<UpgradePolicy>>>;
  user?: Maybe<User>;
  users?: Maybe<UserConnection>;
  webhooks?: Maybe<WebhookConnection>;
  wireguardPeer?: Maybe<WireguardPeer>;
  wireguardPeers?: Maybe<Array<Maybe<WireguardPeer>>>;
};


export type RootQueryTypeAccessTokenArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeAccessTokensArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeAiArgs = {
  prompt: Scalars['String']['input'];
};


export type RootQueryTypeApplicationArgs = {
  name: Scalars['String']['input'];
};


export type RootQueryTypeAuditsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  repo?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeBuildArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeBuildsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeCachedPodsArgs = {
  namespaces?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type RootQueryTypeCanaryArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeCertificateArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeClusterArgs = {
  handle?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeClusterBackupArgs = {
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  namespace?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeClusterBackupsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  clusterId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeClusterGateArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeClusterProviderArgs = {
  cloud?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeClusterProvidersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeClusterRestoreArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeClusterRestoresArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  clusterId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeClusterStatusesArgs = {
  q?: InputMaybe<Scalars['String']['input']>;
  tag?: InputMaybe<TagInput>;
};


export type RootQueryTypeClustersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  backups?: InputMaybe<Scalars['Boolean']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  healthy?: InputMaybe<Scalars['Boolean']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
  tag?: InputMaybe<TagInput>;
  tagQuery?: InputMaybe<TagQuery>;
};


export type RootQueryTypeComponentTreeArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeConfigMapArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeConfigMapsArgs = {
  namespace: Scalars['String']['input'];
};


export type RootQueryTypeConfigurationOverlaysArgs = {
  namespace: Scalars['String']['input'];
};


export type RootQueryTypeCronJobArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeDaemonSetArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeDashboardArgs = {
  labels?: InputMaybe<Array<InputMaybe<LabelInput>>>;
  name: Scalars['String']['input'];
  offset?: InputMaybe<Scalars['Int']['input']>;
  repo: Scalars['String']['input'];
  step?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeDashboardsArgs = {
  repo: Scalars['String']['input'];
};


export type RootQueryTypeDependencyManagementServicesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeDeploymentArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeGitRepositoriesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeGitRepositoryArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeGlobalServiceArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeGroupArgs = {
  name: Scalars['String']['input'];
};


export type RootQueryTypeGroupMembersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  groupId: Scalars['ID']['input'];
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeGroupsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeHelmRepositoryArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};


export type RootQueryTypeIngressArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeInstallationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeInviteArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryTypeJobArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeLogFiltersArgs = {
  namespace: Scalars['String']['input'];
};


export type RootQueryTypeLoginInfoArgs = {
  redirect?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeLogsArgs = {
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  end?: InputMaybe<Scalars['Long']['input']>;
  limit: Scalars['Int']['input'];
  query: Scalars['String']['input'];
  start?: InputMaybe<Scalars['Long']['input']>;
};


export type RootQueryTypeMetricArgs = {
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
  step?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeNamespacesArgs = {
  clusterId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeNodeArgs = {
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
};


export type RootQueryTypeNodeMetricArgs = {
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
};


export type RootQueryTypeNodeMetricsArgs = {
  clusterId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeNotificationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  all?: InputMaybe<Scalars['Boolean']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeObjectStoresArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypePagedClusterGatesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypePagedClusterServicesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypePipelineArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypePipelineContextArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypePipelineGateArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypePipelinesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypePluralClusterArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypePluralGitRepositoryArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypePluralServiceDeploymentArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypePodArgs = {
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypePodsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  namespace?: InputMaybe<Scalars['String']['input']>;
  namespaces?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type RootQueryTypePostgresDatabaseArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};


export type RootQueryTypePrAutomationArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypePrAutomationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypePullRequestsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeRecipeArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeRecipesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['ID']['input'];
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeRepositoriesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type RootQueryTypeRepositoryArgs = {
  name: Scalars['String']['input'];
};


export type RootQueryTypeRolesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeRunbookArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};


export type RootQueryTypeRunbooksArgs = {
  namespace: Scalars['String']['input'];
  pinned?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryTypeRuntimeServiceArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeScalingRecommendationArgs = {
  kind: AutoscalingTarget;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
};


export type RootQueryTypeScmConnectionArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeScmConnectionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeScmWebhooksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeSecretArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeSecretsArgs = {
  namespace: Scalars['String']['input'];
};


export type RootQueryTypeServiceArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeServiceAccountsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeServiceContextArgs = {
  name: Scalars['String']['input'];
};


export type RootQueryTypeServiceDeploymentArgs = {
  cluster?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeServiceDeploymentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  cluster?: InputMaybe<Scalars['String']['input']>;
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<ServiceDeploymentStatus>;
};


export type RootQueryTypeServiceStatusesArgs = {
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<ServiceDeploymentStatus>;
};


export type RootQueryTypeStackArgs = {
  name: Scalars['String']['input'];
};


export type RootQueryTypeStatefulSetArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeTagPairsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
  tag?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeTagsArgs = {
  tag?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeTokenExchangeArgs = {
  token: Scalars['String']['input'];
};


export type RootQueryTypeUnstructuredResourceArgs = {
  group?: InputMaybe<Scalars['String']['input']>;
  kind: Scalars['String']['input'];
  name: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
  serviceId?: InputMaybe<Scalars['ID']['input']>;
  version: Scalars['String']['input'];
};


export type RootQueryTypeUpgradePlanArgs = {
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeUserArgs = {
  email: Scalars['String']['input'];
};


export type RootQueryTypeUsersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeWebhooksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeWireguardPeerArgs = {
  name: Scalars['String']['input'];
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
  buildId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootSubscriptionTypeCommandDeltaArgs = {
  buildId: Scalars['ID']['input'];
};

export type Runbook = {
  __typename?: 'Runbook';
  data?: Maybe<Array<Maybe<RunbookData>>>;
  executions?: Maybe<RunbookExecutionConnection>;
  name: Scalars['String']['output'];
  spec: RunbookSpec;
  status?: Maybe<RunbookStatus>;
};


export type RunbookDataArgs = {
  context?: InputMaybe<RunbookContext>;
};


export type RunbookExecutionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type RunbookAction = {
  __typename?: 'RunbookAction';
  configuration?: Maybe<ConfigurationAction>;
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type RunbookActionInput = {
  action: Scalars['String']['input'];
  context: Scalars['Map']['input'];
};

export type RunbookActionResponse = {
  __typename?: 'RunbookActionResponse';
  redirectTo?: Maybe<Scalars['String']['output']>;
};

export type RunbookAlertStatus = {
  __typename?: 'RunbookAlertStatus';
  annotations?: Maybe<Scalars['Map']['output']>;
  fingerprint?: Maybe<Scalars['String']['output']>;
  labels?: Maybe<Scalars['Map']['output']>;
  name: Scalars['String']['output'];
  startsAt?: Maybe<Scalars['String']['output']>;
};

export type RunbookContext = {
  timeseriesStart?: InputMaybe<Scalars['Int']['input']>;
  timeseriesStep?: InputMaybe<Scalars['String']['input']>;
};

export type RunbookData = {
  __typename?: 'RunbookData';
  kubernetes?: Maybe<KubernetesData>;
  name: Scalars['String']['output'];
  nodes?: Maybe<Array<Maybe<Node>>>;
  prometheus?: Maybe<Array<Maybe<MetricResponse>>>;
  source?: Maybe<RunbookDatasource>;
};

export type RunbookDatasource = {
  __typename?: 'RunbookDatasource';
  kubernetes?: Maybe<KubernetesDatasource>;
  name: Scalars['String']['output'];
  prometheus?: Maybe<PrometheusDatasource>;
  type: Scalars['String']['output'];
};

export type RunbookExecution = {
  __typename?: 'RunbookExecution';
  context: Scalars['Map']['output'];
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  namespace: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
};

export type RunbookExecutionConnection = {
  __typename?: 'RunbookExecutionConnection';
  edges?: Maybe<Array<Maybe<RunbookExecutionEdge>>>;
  pageInfo: PageInfo;
};

export type RunbookExecutionEdge = {
  __typename?: 'RunbookExecutionEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<RunbookExecution>;
};

export type RunbookSpec = {
  __typename?: 'RunbookSpec';
  actions?: Maybe<Array<Maybe<RunbookAction>>>;
  datasources?: Maybe<Array<Maybe<RunbookDatasource>>>;
  description?: Maybe<Scalars['String']['output']>;
  display?: Maybe<Scalars['Map']['output']>;
  name: Scalars['String']['output'];
};

export type RunbookStatus = {
  __typename?: 'RunbookStatus';
  alerts?: Maybe<Array<Maybe<RunbookAlertStatus>>>;
};

export type RunningState = {
  __typename?: 'RunningState';
  startedAt?: Maybe<Scalars['String']['output']>;
};

/** a full specification of a kubernetes runtime component's requirements */
export type RuntimeAddon = {
  __typename?: 'RuntimeAddon';
  /** the url to the add-ons git repository */
  gitUrl?: Maybe<Scalars['String']['output']>;
  /** an icon to identify this runtime add-on */
  icon?: Maybe<Scalars['String']['output']>;
  /** the add-on's readme, this is a heavy operation that should not be performed w/in lists */
  readme?: Maybe<Scalars['String']['output']>;
  /** the release page for a runtime service at a version, this is a heavy operation not suitable for lists */
  releaseUrl?: Maybe<Scalars['String']['output']>;
  versions?: Maybe<Array<Maybe<AddonVersion>>>;
};


/** a full specification of a kubernetes runtime component's requirements */
export type RuntimeAddonReleaseUrlArgs = {
  version: Scalars['String']['input'];
};

/** a service encapsulating a controller like istio/ingress-nginx/etc that is meant to extend the kubernetes api */
export type RuntimeService = {
  __typename?: 'RuntimeService';
  /** the full specification of this kubernetes add-on */
  addon?: Maybe<RuntimeAddon>;
  /** the version of the add-on you've currently deployed */
  addonVersion?: Maybe<AddonVersion>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** add-on name */
  name: Scalars['String']['output'];
  /** the plural service it came from */
  service?: Maybe<ServiceDeployment>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** add-on version, should be semver formatted */
  version: Scalars['String']['output'];
};

export type RuntimeServiceAttributes = {
  name: Scalars['String']['input'];
  version: Scalars['String']['input'];
};

export type S3Store = {
  __typename?: 'S3Store';
  accessKeyId: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  endpoint?: Maybe<Scalars['String']['output']>;
  region?: Maybe<Scalars['String']['output']>;
};

export type S3StoreAttributes = {
  accessKeyId: Scalars['String']['input'];
  bucket: Scalars['String']['input'];
  endpoint?: InputMaybe<Scalars['String']['input']>;
  region?: InputMaybe<Scalars['String']['input']>;
  secretAccessKey: Scalars['String']['input'];
};

/** an object representing the means to connect to SCM apis */
export type ScmConnection = {
  __typename?: 'ScmConnection';
  /** base url for HTTP apis for self-hosted versions if different from base url */
  apiUrl?: Maybe<Scalars['String']['output']>;
  /** base url for git clones for self-hosted versions */
  baseUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  type: ScmType;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  username?: Maybe<Scalars['String']['output']>;
};

/** an object representing a means to authenticate to a source control provider like Github */
export type ScmConnectionAttributes = {
  apiUrl?: InputMaybe<Scalars['String']['input']>;
  baseUrl?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  /** the owning entity in this scm provider, eg a github organization */
  owner?: InputMaybe<Scalars['String']['input']>;
  /** a ssh private key to be used for commit signing */
  signingPrivateKey?: InputMaybe<Scalars['String']['input']>;
  token?: InputMaybe<Scalars['String']['input']>;
  type: ScmType;
  username?: InputMaybe<Scalars['String']['input']>;
};

export type ScmConnectionConnection = {
  __typename?: 'ScmConnectionConnection';
  edges?: Maybe<Array<Maybe<ScmConnectionEdge>>>;
  pageInfo: PageInfo;
};

export type ScmConnectionEdge = {
  __typename?: 'ScmConnectionEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<ScmConnection>;
};

export enum ScmType {
  Github = 'GITHUB',
  Gitlab = 'GITLAB'
}

export type ScmWebhook = {
  __typename?: 'ScmWebhook';
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the name in your SCM provider for this webhook */
  name: Scalars['String']['output'];
  owner: Scalars['String']['output'];
  type: ScmType;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the url for this specific webhook */
  url: Scalars['String']['output'];
};

export type ScmWebhookConnection = {
  __typename?: 'ScmWebhookConnection';
  edges?: Maybe<Array<Maybe<ScmWebhookEdge>>>;
  pageInfo: PageInfo;
};

export type ScmWebhookEdge = {
  __typename?: 'ScmWebhookEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<ScmWebhook>;
};

export type ScopeAttributes = {
  api?: InputMaybe<Scalars['String']['input']>;
  apis?: InputMaybe<Array<Scalars['String']['input']>>;
  identifier?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type Secret = {
  __typename?: 'Secret';
  data: Scalars['Map']['output'];
  metadata: Metadata;
  type?: Maybe<Scalars['String']['output']>;
};

export type SecretKeySelector = {
  __typename?: 'SecretKeySelector';
  key?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
};

export type Service = {
  __typename?: 'Service';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  pods?: Maybe<Array<Maybe<Pod>>>;
  raw: Scalars['String']['output'];
  spec: ServiceSpec;
  status: ServiceStatus;
};

export type ServiceAccountAttributes = {
  assumeBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
  email?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  roles?: InputMaybe<UserRoleAttributes>;
};

export type ServiceCloneAttributes = {
  configuration?: InputMaybe<Array<InputMaybe<ConfigAttributes>>>;
  name: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/** representation of a kubernetes component deployed by a service */
export type ServiceComponent = {
  __typename?: 'ServiceComponent';
  /** any api deprecations discovered from this component */
  apiDeprecations?: Maybe<Array<Maybe<ApiDeprecation>>>;
  /** the live and desired states of this service component */
  content?: Maybe<ComponentContent>;
  /** api group of this resource */
  group?: Maybe<Scalars['String']['output']>;
  /** internal id */
  id: Scalars['ID']['output'];
  /** api kind of this resource */
  kind: Scalars['String']['output'];
  /** kubernetes name of this resource */
  name: Scalars['String']['output'];
  /** kubernetes namespace of this resource */
  namespace?: Maybe<Scalars['String']['output']>;
  /** the service this component belongs to */
  service?: Maybe<ServiceDeployment>;
  /** kubernetes component health enum */
  state?: Maybe<ComponentState>;
  /** whether this component has been applied to the k8s api */
  synced: Scalars['Boolean']['output'];
  /** api version of this resource */
  version?: Maybe<Scalars['String']['output']>;
};

/** a configuration item k/v pair */
export type ServiceConfiguration = {
  __typename?: 'ServiceConfiguration';
  name: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

/** A reusable bundle of configuration designed to make it easy to communicate between tools like tf/pulumi and k8s */
export type ServiceContext = {
  __typename?: 'ServiceContext';
  configuration?: Maybe<Scalars['Map']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  secrets?: Maybe<Array<Maybe<ServiceConfiguration>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** A reusable configuration context, useful for plumbing data from external tools like terraform/pulumi/etc */
export type ServiceContextAttributes = {
  configuration?: InputMaybe<Scalars['Json']['input']>;
  secrets?: InputMaybe<Array<InputMaybe<ConfigAttributes>>>;
};

/** a reference to a service deployed from a git repo into a cluster */
export type ServiceDeployment = {
  __typename?: 'ServiceDeployment';
  /** the cluster this service is deployed into */
  cluster?: Maybe<Cluster>;
  /** a n / m representation of the number of healthy components of this service */
  componentStatus?: Maybe<Scalars['String']['output']>;
  /** the kubernetes component of a service */
  components?: Maybe<Array<Maybe<ServiceComponent>>>;
  /** possibly secret configuration used to template the manifests of this service */
  configuration?: Maybe<Array<Maybe<ServiceConfiguration>>>;
  /** bound contexts for this service */
  contexts?: Maybe<Array<Maybe<ServiceContext>>>;
  /** the time this service was scheduled for deletion */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** fetches the /docs directory within this services git tree.  This is a heavy operation and should NOT be used in list queries */
  docs?: Maybe<Array<Maybe<GitFile>>>;
  /** whether this service should not actively reconcile state and instead simply report pending changes */
  dryRun?: Maybe<Scalars['Boolean']['output']>;
  /** whether this service is editable */
  editable?: Maybe<Scalars['Boolean']['output']>;
  /** a list of errors generated by the deployment operator */
  errors?: Maybe<Array<Maybe<ServiceError>>>;
  /** description on where in git the service's manifests should be fetched */
  git?: Maybe<GitRef>;
  /** the global service this service is the source for */
  globalService?: Maybe<GlobalService>;
  /** description of how helm charts should be applied */
  helm?: Maybe<HelmSpec>;
  helmRepository?: Maybe<HelmRepository>;
  /** internal id of this service */
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** the desired sync interval for this service */
  interval?: Maybe<Scalars['String']['output']>;
  /** kustomize related service metadata */
  kustomize?: Maybe<Kustomize>;
  /** the commit message currently in use */
  message?: Maybe<Scalars['String']['output']>;
  /** human readable name of this service, must be unique per cluster */
  name: Scalars['String']['output'];
  /** kubernetes namespace this service will be deployed to */
  namespace: Scalars['String']['output'];
  /** whether this service is controlled by a global service */
  owner?: Maybe<GlobalService>;
  /** how you'd like to perform a canary promotion */
  promotion?: Maybe<ServicePromotion>;
  /** if true, deletion of this service is not allowed */
  protect?: Maybe<Scalars['Boolean']['output']>;
  /** read policy for this service */
  readBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
  /** the git repo of this service */
  repository?: Maybe<GitRepository>;
  /** the current revision of this service */
  revision?: Maybe<Revision>;
  /** a relay connection of all revisions of this service, these are periodically pruned up to a history limit */
  revisions?: Maybe<RevisionConnection>;
  /** latest git sha we pulled from */
  sha?: Maybe<Scalars['String']['output']>;
  /** A summary status enum for the health of this service */
  status: ServiceDeploymentStatus;
  /** settings for advanced tuning of the sync process */
  syncConfig?: Maybe<SyncConfig>;
  /** https url to fetch the latest tarball of kubernetes manifests */
  tarball?: Maybe<Scalars['String']['output']>;
  /** if you should apply liquid templating to raw yaml files, defaults to true */
  templated?: Maybe<Scalars['Boolean']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** semver of this service */
  version: Scalars['String']['output'];
  /** write policy of this service */
  writeBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
};


/** a reference to a service deployed from a git repo into a cluster */
export type ServiceDeploymentRevisionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ServiceDeploymentAttributes = {
  configuration?: InputMaybe<Array<InputMaybe<ConfigAttributes>>>;
  contextBindings?: InputMaybe<Array<InputMaybe<ContextBindingAttributes>>>;
  docsPath?: InputMaybe<Scalars['String']['input']>;
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  git?: InputMaybe<GitRefAttributes>;
  helm?: InputMaybe<HelmConfigAttributes>;
  interval?: InputMaybe<Scalars['String']['input']>;
  kustomize?: InputMaybe<KustomizeAttributes>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  protect?: InputMaybe<Scalars['Boolean']['input']>;
  readBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
  syncConfig?: InputMaybe<SyncConfigAttributes>;
  /** if you should apply liquid templating to raw yaml files, defaults to true */
  templated?: InputMaybe<Scalars['Boolean']['input']>;
  version?: InputMaybe<Scalars['String']['input']>;
  writeBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
};

export type ServiceDeploymentConnection = {
  __typename?: 'ServiceDeploymentConnection';
  edges?: Maybe<Array<Maybe<ServiceDeploymentEdge>>>;
  pageInfo: PageInfo;
};

export type ServiceDeploymentEdge = {
  __typename?: 'ServiceDeploymentEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<ServiceDeployment>;
};

export enum ServiceDeploymentStatus {
  Failed = 'FAILED',
  Healthy = 'HEALTHY',
  Paused = 'PAUSED',
  Stale = 'STALE',
  Synced = 'SYNCED'
}

/** an error sent from the deploy operator about sync progress */
export type ServiceError = {
  __typename?: 'ServiceError';
  message: Scalars['String']['output'];
  source: Scalars['String']['output'];
};

export type ServiceErrorAttributes = {
  message: Scalars['String']['input'];
  source: Scalars['String']['input'];
};

export type ServicePort = {
  __typename?: 'ServicePort';
  name?: Maybe<Scalars['String']['output']>;
  port?: Maybe<Scalars['Int']['output']>;
  protocol?: Maybe<Scalars['String']['output']>;
  targetPort?: Maybe<Scalars['String']['output']>;
};

export enum ServicePromotion {
  Ignore = 'IGNORE',
  Proceed = 'PROCEED',
  Rollback = 'ROLLBACK'
}

export type ServiceSpec = {
  __typename?: 'ServiceSpec';
  clusterIp?: Maybe<Scalars['String']['output']>;
  ports?: Maybe<Array<Maybe<ServicePort>>>;
  selector?: Maybe<Scalars['Map']['output']>;
  type?: Maybe<Scalars['String']['output']>;
};

export type ServiceStatus = {
  __typename?: 'ServiceStatus';
  loadBalancer?: Maybe<LoadBalancerStatus>;
};

/** a rollup count of the statuses of services in a query */
export type ServiceStatusCount = {
  __typename?: 'ServiceStatusCount';
  count: Scalars['Int']['output'];
  status: ServiceDeploymentStatus;
};

export type ServiceUpdateAttributes = {
  configuration?: InputMaybe<Array<InputMaybe<ConfigAttributes>>>;
  contextBindings?: InputMaybe<Array<InputMaybe<ContextBindingAttributes>>>;
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  git?: InputMaybe<GitRefAttributes>;
  helm?: InputMaybe<HelmConfigAttributes>;
  interval?: InputMaybe<Scalars['String']['input']>;
  kustomize?: InputMaybe<KustomizeAttributes>;
  protect?: InputMaybe<Scalars['Boolean']['input']>;
  readBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
  /** if you should apply liquid templating to raw yaml files, defaults to true */
  templated?: InputMaybe<Scalars['Boolean']['input']>;
  version?: InputMaybe<Scalars['String']['input']>;
  writeBindings?: InputMaybe<Array<InputMaybe<PolicyBindingAttributes>>>;
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
  password?: Maybe<Scalars['String']['output']>;
  port?: Maybe<Scalars['Int']['output']>;
  sender?: Maybe<Scalars['String']['output']>;
  server?: Maybe<Scalars['String']['output']>;
  user?: Maybe<Scalars['String']['output']>;
};

export type SmtpInput = {
  password?: InputMaybe<Scalars['String']['input']>;
  port?: InputMaybe<Scalars['Int']['input']>;
  sender?: InputMaybe<Scalars['String']['input']>;
  server?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['String']['input']>;
};

export type Stack = {
  __typename?: 'Stack';
  bundles?: Maybe<Array<Maybe<Recipe>>>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  sections?: Maybe<Array<Maybe<RecipeSection>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** the configuration of a service within a pipeline stage, including optional promotion criteria */
export type StageService = {
  __typename?: 'StageService';
  /** criteria for how a promotion of this service shall be performed */
  criteria?: Maybe<PromotionCriteria>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** a pointer to a service */
  service?: Maybe<ServiceDeployment>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** the attributes of a service w/in a specific stage */
export type StageServiceAttributes = {
  criteria?: InputMaybe<PromotionCriteriaAttributes>;
  /** the cluster handle of this service */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** the name of this service */
  name?: InputMaybe<Scalars['String']['input']>;
  /** the name of this service */
  serviceId?: InputMaybe<Scalars['ID']['input']>;
};

export type StatefulSet = {
  __typename?: 'StatefulSet';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  pods?: Maybe<Array<Maybe<Pod>>>;
  raw: Scalars['String']['output'];
  spec: StatefulSetSpec;
  status: StatefulSetStatus;
};

export type StatefulSetSpec = {
  __typename?: 'StatefulSetSpec';
  replicas?: Maybe<Scalars['Int']['output']>;
  serviceName?: Maybe<Scalars['String']['output']>;
};

export type StatefulSetStatus = {
  __typename?: 'StatefulSetStatus';
  currentReplicas?: Maybe<Scalars['Int']['output']>;
  readyReplicas?: Maybe<Scalars['Int']['output']>;
  replicas?: Maybe<Scalars['Int']['output']>;
  updatedReplicas?: Maybe<Scalars['Int']['output']>;
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
  group?: Maybe<Scalars['String']['output']>;
  kind: Scalars['String']['output'];
  name: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type StatusCondition = {
  __typename?: 'StatusCondition';
  message: Scalars['String']['output'];
  reason: Scalars['String']['output'];
  status: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

/** Advanced configuration of how to sync resources */
export type SyncConfig = {
  __typename?: 'SyncConfig';
  namespaceMetadata?: Maybe<NamespaceMetadata>;
};

export type SyncConfigAttributes = {
  namespaceMetadata?: InputMaybe<MetadataAttributes>;
};

export type Tag = {
  __typename?: 'Tag';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type TagAttributes = {
  name: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type TagConnection = {
  __typename?: 'TagConnection';
  edges?: Maybe<Array<Maybe<TagEdge>>>;
  pageInfo: PageInfo;
};

export type TagEdge = {
  __typename?: 'TagEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Tag>;
};

export type TagInput = {
  name: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type TagQuery = {
  op: Conjunction;
  tags?: InputMaybe<Array<InputMaybe<TagInput>>>;
};

/** a kubernetes node taint */
export type Taint = {
  __typename?: 'Taint';
  effect: Scalars['String']['output'];
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type TaintAttributes = {
  effect: Scalars['String']['input'];
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type TargetRef = {
  __typename?: 'TargetRef';
  apiVersion?: Maybe<Scalars['String']['output']>;
  kind?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
};

export type TerminatedState = {
  __typename?: 'TerminatedState';
  exitCode?: Maybe<Scalars['Int']['output']>;
  finishedAt?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  startedAt?: Maybe<Scalars['String']['output']>;
};

export enum Tool {
  Helm = 'HELM',
  Terraform = 'TERRAFORM'
}

export type UpgradePlan = {
  __typename?: 'UpgradePlan';
  events?: Maybe<Array<Maybe<Event>>>;
  metadata: Metadata;
  pods?: Maybe<Array<Maybe<Pod>>>;
  raw: Scalars['String']['output'];
  spec: UpgradePlanSpec;
  status: UpgradePlanStatus;
};

export type UpgradePlanSpec = {
  __typename?: 'UpgradePlanSpec';
  concurrency?: Maybe<Scalars['Int']['output']>;
  cordon?: Maybe<Scalars['Boolean']['output']>;
  version?: Maybe<Scalars['String']['output']>;
};

export type UpgradePlanStatus = {
  __typename?: 'UpgradePlanStatus';
  conditions?: Maybe<Array<Maybe<StatusCondition>>>;
};

export type UpgradePolicy = {
  __typename?: 'UpgradePolicy';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  repositories?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  target: Scalars['String']['output'];
  type: UpgradePolicyType;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  weight?: Maybe<Scalars['Int']['output']>;
};

export type UpgradePolicyAttributes = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  repositories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  target: Scalars['String']['input'];
  type: UpgradePolicyType;
  weight?: InputMaybe<Scalars['Int']['input']>;
};

export enum UpgradePolicyType {
  Approval = 'APPROVAL',
  Deploy = 'DEPLOY',
  Ignore = 'IGNORE'
}

export type User = {
  __typename?: 'User';
  assumeBindings?: Maybe<Array<Maybe<PolicyBinding>>>;
  backgroundColor?: Maybe<Scalars['String']['output']>;
  boundRoles?: Maybe<Array<Maybe<Role>>>;
  buildTimestamp?: Maybe<Scalars['DateTime']['output']>;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  email: Scalars['String']['output'];
  groups?: Maybe<Array<Maybe<Group>>>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  jwt?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  pluralId?: Maybe<Scalars['String']['output']>;
  profile?: Maybe<Scalars['String']['output']>;
  readTimestamp?: Maybe<Scalars['DateTime']['output']>;
  roles?: Maybe<UserRoles>;
  unreadNotifications?: Maybe<Scalars['Int']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type UserAttributes = {
  email?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  roles?: InputMaybe<UserRoleAttributes>;
  signingPrivateKey?: InputMaybe<Scalars['String']['input']>;
};

export type UserConnection = {
  __typename?: 'UserConnection';
  edges?: Maybe<Array<Maybe<UserEdge>>>;
  pageInfo: PageInfo;
};

export type UserEdge = {
  __typename?: 'UserEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<User>;
};

export type UserRoleAttributes = {
  admin?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UserRoles = {
  __typename?: 'UserRoles';
  admin?: Maybe<Scalars['Boolean']['output']>;
};

/** a shortform reference to an addon by version */
export type VersionReference = {
  __typename?: 'VersionReference';
  name: Scalars['String']['output'];
  version: Scalars['String']['output'];
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
  updateMode?: Maybe<Scalars['String']['output']>;
};

export type WaitingState = {
  __typename?: 'WaitingState';
  message?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
};

export type Webhook = {
  __typename?: 'Webhook';
  health: WebhookHealth;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  type: WebhookType;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  url: Scalars['String']['output'];
};

export type WebhookAttributes = {
  url: Scalars['String']['input'];
};

export type WebhookConnection = {
  __typename?: 'WebhookConnection';
  edges?: Maybe<Array<Maybe<WebhookEdge>>>;
  pageInfo: PageInfo;
};

export type WebhookEdge = {
  __typename?: 'WebhookEdge';
  cursor?: Maybe<Scalars['String']['output']>;
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
  config?: Maybe<Scalars['String']['output']>;
  metadata: Metadata;
  raw: Scalars['String']['output'];
  spec: WireguardPeerSpec;
  status?: Maybe<WireguardPeerStatus>;
  user?: Maybe<User>;
};

export type WireguardPeerSpec = {
  __typename?: 'WireguardPeerSpec';
  address?: Maybe<Scalars['String']['output']>;
  publicKey?: Maybe<Scalars['String']['output']>;
  wireguardRef?: Maybe<Scalars['String']['output']>;
};

export type WireguardPeerStatus = {
  __typename?: 'WireguardPeerStatus';
  conditions?: Maybe<Array<Maybe<StatusCondition>>>;
  ready?: Maybe<Scalars['Boolean']['output']>;
};

export type CostAnalysisFragment = { __typename?: 'CostAnalysis', minutes?: number | null, cpuCost?: number | null, pvCost?: number | null, ramCost?: number | null, totalCost?: number | null };

export type FileContentFragment = { __typename?: 'FileContent', content?: string | null, path?: string | null };

export type ConfigurationFragment = { __typename?: 'Configuration', helm?: string | null, terraform?: string | null };

export type ApplicationSpecFragment = { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', type: string, icons?: Array<string | null> | null, description?: string | null, version: string, links?: Array<{ __typename?: 'ApplicationLink', description?: string | null, url?: string | null } | null> | null }, components?: Array<{ __typename?: 'Component', group: string, kind: string } | null> | null };

export type ApplicationStatusFragment = { __typename?: 'ApplicationStatus', componentsReady: string, components?: Array<{ __typename?: 'StatusComponent', group?: string | null, kind: string, name: string, status: string } | null> | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null };

export type ApplicationFragment = { __typename?: 'Application', name: string, spec: { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', type: string, icons?: Array<string | null> | null, description?: string | null, version: string, links?: Array<{ __typename?: 'ApplicationLink', description?: string | null, url?: string | null } | null> | null }, components?: Array<{ __typename?: 'Component', group: string, kind: string } | null> | null }, status: { __typename?: 'ApplicationStatus', componentsReady: string, components?: Array<{ __typename?: 'StatusComponent', group?: string | null, kind: string, name: string, status: string } | null> | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, cost?: { __typename?: 'CostAnalysis', minutes?: number | null, cpuCost?: number | null, pvCost?: number | null, ramCost?: number | null, totalCost?: number | null } | null };

export type ConfigurationOverlayFragment = { __typename?: 'ConfigurationOverlay', metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, spec: { __typename?: 'ConfigurationOverlaySpec', name?: string | null, folder?: string | null, subfolder?: string | null, documentation?: string | null, inputType?: string | null, inputValues?: Array<string | null> | null, updates?: Array<{ __typename?: 'OverlayUpdate', path?: Array<string | null> | null } | null> | null } };

export type AppQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type AppQuery = { __typename?: 'RootQueryType', application?: { __typename?: 'Application', name: string, configuration?: { __typename?: 'Configuration', helm?: string | null, terraform?: string | null } | null, spec: { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', type: string, icons?: Array<string | null> | null, description?: string | null, version: string, links?: Array<{ __typename?: 'ApplicationLink', description?: string | null, url?: string | null } | null> | null }, components?: Array<{ __typename?: 'Component', group: string, kind: string } | null> | null }, status: { __typename?: 'ApplicationStatus', componentsReady: string, components?: Array<{ __typename?: 'StatusComponent', group?: string | null, kind: string, name: string, status: string } | null> | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, cost?: { __typename?: 'CostAnalysis', minutes?: number | null, cpuCost?: number | null, pvCost?: number | null, ramCost?: number | null, totalCost?: number | null } | null } | null, configurationOverlays?: Array<{ __typename?: 'ConfigurationOverlay', metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, spec: { __typename?: 'ConfigurationOverlaySpec', name?: string | null, folder?: string | null, subfolder?: string | null, documentation?: string | null, inputType?: string | null, inputValues?: Array<string | null> | null, updates?: Array<{ __typename?: 'OverlayUpdate', path?: Array<string | null> | null } | null> | null } } | null> | null };

export type AppInfoQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type AppInfoQuery = { __typename?: 'RootQueryType', application?: { __typename?: 'Application', info?: string | null, name: string, spec: { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', type: string, icons?: Array<string | null> | null, description?: string | null, version: string, links?: Array<{ __typename?: 'ApplicationLink', description?: string | null, url?: string | null } | null> | null }, components?: Array<{ __typename?: 'Component', group: string, kind: string } | null> | null }, status: { __typename?: 'ApplicationStatus', componentsReady: string, components?: Array<{ __typename?: 'StatusComponent', group?: string | null, kind: string, name: string, status: string } | null> | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, cost?: { __typename?: 'CostAnalysis', minutes?: number | null, cpuCost?: number | null, pvCost?: number | null, ramCost?: number | null, totalCost?: number | null } | null } | null };

export type RepositoryFragment = { __typename?: 'Repository', id: string, name: string, icon?: string | null, description?: string | null, grafanaDns?: string | null, configuration?: { __typename?: 'Configuration', helm?: string | null, terraform?: string | null } | null, docs?: Array<{ __typename?: 'FileContent', content?: string | null, path?: string | null } | null> | null };

export type RepositoryQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type RepositoryQuery = { __typename?: 'RootQueryType', repository?: { __typename?: 'Repository', id: string, name: string, icon?: string | null, description?: string | null, grafanaDns?: string | null, configuration?: { __typename?: 'Configuration', helm?: string | null, terraform?: string | null } | null, docs?: Array<{ __typename?: 'FileContent', content?: string | null, path?: string | null } | null> | null } | null };

export type PrAutomationFragment = { __typename?: 'PrAutomation', id: string, name: string, documentation?: string | null, addon?: string | null, role?: PrRole | null, cluster?: { __typename?: 'Cluster', handle?: string | null, self?: boolean | null, protect?: boolean | null, deletedAt?: string | null, version?: string | null, currentVersion?: string | null, id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string } | null, repository?: { __typename?: 'GitRepository', url: string, refs?: Array<string> | null } | null, connection?: { __typename?: 'ScmConnection', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, type: ScmType, username?: string | null, baseUrl?: string | null, apiUrl?: string | null } | null, createBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, configuration?: Array<{ __typename?: 'PrConfiguration', default?: string | null, documentation?: string | null, longform?: string | null, name: string, optional?: boolean | null, placeholder?: string | null, type: ConfigurationType, condition?: { __typename?: 'PrConfigurationCondition', field: string, operation: Operation, value?: string | null } | null } | null> | null };

export type PrAutomationsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type PrAutomationsQuery = { __typename?: 'RootQueryType', prAutomations?: { __typename?: 'PrAutomationConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, hasPreviousPage: boolean, startCursor?: string | null }, edges?: Array<{ __typename?: 'PrAutomationEdge', node?: { __typename?: 'PrAutomation', id: string, name: string, documentation?: string | null, addon?: string | null, role?: PrRole | null, cluster?: { __typename?: 'Cluster', handle?: string | null, self?: boolean | null, protect?: boolean | null, deletedAt?: string | null, version?: string | null, currentVersion?: string | null, id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string } | null, repository?: { __typename?: 'GitRepository', url: string, refs?: Array<string> | null } | null, connection?: { __typename?: 'ScmConnection', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, type: ScmType, username?: string | null, baseUrl?: string | null, apiUrl?: string | null } | null, createBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, configuration?: Array<{ __typename?: 'PrConfiguration', default?: string | null, documentation?: string | null, longform?: string | null, name: string, optional?: boolean | null, placeholder?: string | null, type: ConfigurationType, condition?: { __typename?: 'PrConfigurationCondition', field: string, operation: Operation, value?: string | null } | null } | null> | null } | null } | null> | null } | null };

export type CreatePrAutomationMutationVariables = Exact<{
  attributes: PrAutomationAttributes;
}>;


export type CreatePrAutomationMutation = { __typename?: 'RootMutationType', createPrAutomation?: { __typename?: 'PrAutomation', id: string, name: string, documentation?: string | null, addon?: string | null, role?: PrRole | null, cluster?: { __typename?: 'Cluster', handle?: string | null, self?: boolean | null, protect?: boolean | null, deletedAt?: string | null, version?: string | null, currentVersion?: string | null, id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string } | null, repository?: { __typename?: 'GitRepository', url: string, refs?: Array<string> | null } | null, connection?: { __typename?: 'ScmConnection', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, type: ScmType, username?: string | null, baseUrl?: string | null, apiUrl?: string | null } | null, createBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, configuration?: Array<{ __typename?: 'PrConfiguration', default?: string | null, documentation?: string | null, longform?: string | null, name: string, optional?: boolean | null, placeholder?: string | null, type: ConfigurationType, condition?: { __typename?: 'PrConfigurationCondition', field: string, operation: Operation, value?: string | null } | null } | null> | null } | null };

export type UpdatePrAutomationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  attributes: PrAutomationAttributes;
}>;


export type UpdatePrAutomationMutation = { __typename?: 'RootMutationType', updatePrAutomation?: { __typename?: 'PrAutomation', id: string, name: string, documentation?: string | null, addon?: string | null, role?: PrRole | null, cluster?: { __typename?: 'Cluster', handle?: string | null, self?: boolean | null, protect?: boolean | null, deletedAt?: string | null, version?: string | null, currentVersion?: string | null, id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string } | null, repository?: { __typename?: 'GitRepository', url: string, refs?: Array<string> | null } | null, connection?: { __typename?: 'ScmConnection', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, type: ScmType, username?: string | null, baseUrl?: string | null, apiUrl?: string | null } | null, createBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, configuration?: Array<{ __typename?: 'PrConfiguration', default?: string | null, documentation?: string | null, longform?: string | null, name: string, optional?: boolean | null, placeholder?: string | null, type: ConfigurationType, condition?: { __typename?: 'PrConfigurationCondition', field: string, operation: Operation, value?: string | null } | null } | null> | null } | null };

export type DeletePrAutomationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeletePrAutomationMutation = { __typename?: 'RootMutationType', deletePrAutomation?: { __typename?: 'PrAutomation', id: string, name: string, documentation?: string | null, addon?: string | null, role?: PrRole | null, cluster?: { __typename?: 'Cluster', handle?: string | null, self?: boolean | null, protect?: boolean | null, deletedAt?: string | null, version?: string | null, currentVersion?: string | null, id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string } | null, repository?: { __typename?: 'GitRepository', url: string, refs?: Array<string> | null } | null, connection?: { __typename?: 'ScmConnection', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, type: ScmType, username?: string | null, baseUrl?: string | null, apiUrl?: string | null } | null, createBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, configuration?: Array<{ __typename?: 'PrConfiguration', default?: string | null, documentation?: string | null, longform?: string | null, name: string, optional?: boolean | null, placeholder?: string | null, type: ConfigurationType, condition?: { __typename?: 'PrConfigurationCondition', field: string, operation: Operation, value?: string | null } | null } | null> | null } | null };

export type ScmConnectionFragment = { __typename?: 'ScmConnection', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, type: ScmType, username?: string | null, baseUrl?: string | null, apiUrl?: string | null };

export type ScmConnectionsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type ScmConnectionsQuery = { __typename?: 'RootQueryType', scmConnections?: { __typename?: 'ScmConnectionConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, hasPreviousPage: boolean, startCursor?: string | null }, edges?: Array<{ __typename?: 'ScmConnectionEdge', node?: { __typename?: 'ScmConnection', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, type: ScmType, username?: string | null, baseUrl?: string | null, apiUrl?: string | null } | null } | null> | null } | null };

export type CreateScmConnectionMutationVariables = Exact<{
  attributes: ScmConnectionAttributes;
}>;


export type CreateScmConnectionMutation = { __typename?: 'RootMutationType', createScmConnection?: { __typename?: 'ScmConnection', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, type: ScmType, username?: string | null, baseUrl?: string | null, apiUrl?: string | null } | null };

export type UpdateScmConnectionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  attributes: ScmConnectionAttributes;
}>;


export type UpdateScmConnectionMutation = { __typename?: 'RootMutationType', updateScmConnection?: { __typename?: 'ScmConnection', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, type: ScmType, username?: string | null, baseUrl?: string | null, apiUrl?: string | null } | null };

export type DeleteScmConnectionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteScmConnectionMutation = { __typename?: 'RootMutationType', deleteScmConnection?: { __typename?: 'ScmConnection', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, type: ScmType, username?: string | null, baseUrl?: string | null, apiUrl?: string | null } | null };

export type SetupRenovateMutationVariables = Exact<{
  connectionId: Scalars['ID']['input'];
  repos: Array<InputMaybe<Scalars['String']['input']>> | InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  namespace?: InputMaybe<Scalars['String']['input']>;
}>;


export type SetupRenovateMutation = { __typename?: 'RootMutationType', setupRenovate?: { __typename?: 'ServiceDeployment', id: string } | null };

export type PageInfoFragment = { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, hasPreviousPage: boolean, startCursor?: string | null };

export type PluralContextQueryVariables = Exact<{ [key: string]: never; }>;


export type PluralContextQuery = { __typename?: 'RootQueryType', pluralContext?: { __typename?: 'PluralContext', buckets?: Array<string | null> | null, configuration: Record<string, unknown>, domains?: Array<string | null> | null } | null };

export type CreateBuildMutationVariables = Exact<{
  attributes: BuildAttributes;
}>;


export type CreateBuildMutation = { __typename?: 'RootMutationType', createBuild?: { __typename?: 'Build', id: string } | null };

export type AddOnConfigConditionFragment = { __typename?: 'AddOnConfigCondition', field?: string | null, operation?: string | null, value?: string | null };

export type AddOnConfigurationFragment = { __typename?: 'AddOnConfiguration', documentation?: string | null, name?: string | null, type?: string | null, values?: Array<string | null> | null, condition?: { __typename?: 'AddOnConfigCondition', field?: string | null, operation?: string | null, value?: string | null } | null };

export type ClusterAddOnFragment = { __typename?: 'ClusterAddOn', global?: boolean | null, icon?: string | null, name?: string | null, version?: string | null, configuration?: Array<{ __typename?: 'AddOnConfiguration', documentation?: string | null, name?: string | null, type?: string | null, values?: Array<string | null> | null, condition?: { __typename?: 'AddOnConfigCondition', field?: string | null, operation?: string | null, value?: string | null } | null } | null> | null };

export type ClusterAddOnsQueryVariables = Exact<{ [key: string]: never; }>;


export type ClusterAddOnsQuery = { __typename?: 'RootQueryType', clusterAddOns?: Array<{ __typename?: 'ClusterAddOn', global?: boolean | null, icon?: string | null, name?: string | null, version?: string | null, configuration?: Array<{ __typename?: 'AddOnConfiguration', documentation?: string | null, name?: string | null, type?: string | null, values?: Array<string | null> | null, condition?: { __typename?: 'AddOnConfigCondition', field?: string | null, operation?: string | null, value?: string | null } | null } | null> | null } | null> | null };

export type InstallAddOnMutationVariables = Exact<{
  clusterId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  configuration?: InputMaybe<Array<InputMaybe<ConfigAttributes>> | InputMaybe<ConfigAttributes>>;
  global?: InputMaybe<GlobalServiceAttributes>;
}>;


export type InstallAddOnMutation = { __typename?: 'RootMutationType', installAddOn?: { __typename?: 'ServiceDeployment', id: string, name: string, protect?: boolean | null, promotion?: ServicePromotion | null, message?: string | null, insertedAt?: string | null, updatedAt?: string | null, deletedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, dryRun?: boolean | null, git?: { __typename?: 'GitRef', ref: string, folder: string } | null, helm?: { __typename?: 'HelmSpec', chart?: string | null, version?: string | null, repository?: { __typename?: 'ObjectReference', namespace?: string | null, name?: string | null } | null } | null, cluster?: { __typename?: 'Cluster', id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', name: string, cloud: string } | null } | null, helmRepository?: { __typename?: 'HelmRepository', spec: { __typename?: 'HelmRepositorySpec', url: string }, status?: { __typename?: 'HelmRepositoryStatus', ready?: boolean | null, message?: string | null } | null } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, errors?: Array<{ __typename?: 'ServiceError', message: string, source: string } | null> | null, components?: Array<{ __typename?: 'ServiceComponent', apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', blocking?: boolean | null } | null> | null } | null> | null, globalService?: { __typename?: 'GlobalService', id: string, name: string } | null } | null };

export type ClusterNodeFragment = { __typename?: 'Node', metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'NodeStatus', phase?: string | null, allocatable?: Record<string, unknown> | null, capacity?: Record<string, unknown> | null, conditions?: Array<{ __typename?: 'NodeCondition', type?: string | null, status?: string | null, message?: string | null } | null> | null }, spec: { __typename?: 'NodeSpec', podCidr?: string | null, providerId?: string | null } };

export type ClusterConditionFragment = { __typename?: 'ClusterCondition', lastTransitionTime?: string | null, message?: string | null, reason?: string | null, severity?: string | null, status?: string | null, type?: string | null };

export type TaintFragment = { __typename?: 'Taint', effect: string, key: string, value: string };

export type NodePoolFragment = { __typename?: 'NodePool', id: string, name: string, minSize: number, maxSize: number, instanceType: string, spot?: boolean | null, labels?: Record<string, unknown> | null, taints?: Array<{ __typename?: 'Taint', effect: string, key: string, value: string } | null> | null };

export type ApiDeprecationFragment = { __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, version?: string | null, kind: string, name: string, namespace?: string | null, service?: { __typename?: 'ServiceDeployment', git?: { __typename?: 'GitRef', ref: string, folder: string } | null, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null };

export type RuntimeServiceFragment = { __typename?: 'RuntimeService', id: string, name: string, version: string, addon?: { __typename?: 'RuntimeAddon', icon?: string | null, readme?: string | null, versions?: Array<{ __typename?: 'AddonVersion', version?: string | null, kube?: Array<string | null> | null, incompatibilities?: Array<{ __typename?: 'VersionReference', version: string, name: string } | null> | null, requirements?: Array<{ __typename?: 'VersionReference', version: string, name: string } | null> | null } | null> | null } | null, service?: { __typename?: 'ServiceDeployment', git?: { __typename?: 'GitRef', ref: string, folder: string } | null, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null, helm?: { __typename?: 'HelmSpec', version?: string | null } | null } | null, addonVersion?: { __typename?: 'AddonVersion', blocking?: boolean | null, version?: string | null, kube?: Array<string | null> | null, incompatibilities?: Array<{ __typename?: 'VersionReference', version: string, name: string } | null> | null, requirements?: Array<{ __typename?: 'VersionReference', version: string, name: string } | null> | null } | null };

export type AddonVersionFragment = { __typename?: 'AddonVersion', version?: string | null, kube?: Array<string | null> | null, incompatibilities?: Array<{ __typename?: 'VersionReference', version: string, name: string } | null> | null, requirements?: Array<{ __typename?: 'VersionReference', version: string, name: string } | null> | null };

export type AddonVersionBlockingFragment = { __typename?: 'AddonVersion', blocking?: boolean | null };

export type ClustersRowFragment = { __typename?: 'Cluster', currentVersion?: string | null, id: string, self?: boolean | null, protect?: boolean | null, name: string, handle?: string | null, distro?: ClusterDistro | null, installed?: boolean | null, pingedAt?: string | null, deletedAt?: string | null, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, version?: string | null, kind: string, name: string, namespace?: string | null, service?: { __typename?: 'ServiceDeployment', git?: { __typename?: 'GitRef', ref: string, folder: string } | null, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, nodes?: Array<{ __typename?: 'Node', status: { __typename?: 'NodeStatus', capacity?: Record<string, unknown> | null } } | null> | null, nodeMetrics?: Array<{ __typename?: 'NodeMetric', usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null } | null> | null, provider?: { __typename?: 'ClusterProvider', id: string, cloud: string, name: string, namespace: string, supportedVersions?: Array<string | null> | null } | null, prAutomations?: Array<{ __typename?: 'PrAutomation', id: string, name: string, documentation?: string | null, addon?: string | null, role?: PrRole | null, cluster?: { __typename?: 'Cluster', handle?: string | null, self?: boolean | null, protect?: boolean | null, deletedAt?: string | null, version?: string | null, currentVersion?: string | null, id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string } | null, repository?: { __typename?: 'GitRepository', url: string, refs?: Array<string> | null } | null, connection?: { __typename?: 'ScmConnection', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, type: ScmType, username?: string | null, baseUrl?: string | null, apiUrl?: string | null } | null, createBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, configuration?: Array<{ __typename?: 'PrConfiguration', default?: string | null, documentation?: string | null, longform?: string | null, name: string, optional?: boolean | null, placeholder?: string | null, type: ConfigurationType, condition?: { __typename?: 'PrConfigurationCondition', field: string, operation: Operation, value?: string | null } | null } | null> | null } | null> | null, service?: { __typename?: 'ServiceDeployment', id: string, repository?: { __typename?: 'GitRepository', url: string } | null } | null, status?: { __typename?: 'ClusterStatus', conditions?: Array<{ __typename?: 'ClusterCondition', lastTransitionTime?: string | null, message?: string | null, reason?: string | null, severity?: string | null, status?: string | null, type?: string | null } | null> | null } | null, tags?: Array<{ __typename?: 'Tag', name: string, value: string } | null> | null };

export type ClusterFragment = { __typename?: 'Cluster', currentVersion?: string | null, id: string, name: string, handle?: string | null, pingedAt?: string | null, self?: boolean | null, version?: string | null, protect?: boolean | null, distro?: ClusterDistro | null, installed?: boolean | null, deletedAt?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, version?: string | null, kind: string, name: string, namespace?: string | null, service?: { __typename?: 'ServiceDeployment', git?: { __typename?: 'GitRef', ref: string, folder: string } | null, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, nodePools?: Array<{ __typename?: 'NodePool', id: string, name: string, minSize: number, maxSize: number, instanceType: string, spot?: boolean | null, labels?: Record<string, unknown> | null, taints?: Array<{ __typename?: 'Taint', effect: string, key: string, value: string } | null> | null } | null> | null, nodes?: Array<{ __typename?: 'Node', status: { __typename?: 'NodeStatus', capacity?: Record<string, unknown> | null, phase?: string | null, allocatable?: Record<string, unknown> | null, conditions?: Array<{ __typename?: 'NodeCondition', type?: string | null, status?: string | null, message?: string | null } | null> | null }, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, spec: { __typename?: 'NodeSpec', podCidr?: string | null, providerId?: string | null } } | null> | null, nodeMetrics?: Array<{ __typename?: 'NodeMetric', timestamp?: string | null, window?: string | null, usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, provider?: { __typename?: 'ClusterProvider', id: string, cloud: string, name: string, namespace: string, supportedVersions?: Array<string | null> | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, repository?: { __typename?: 'GitRepository', url: string } | null } | null, status?: { __typename?: 'ClusterStatus', controlPlaneReady?: boolean | null, failureMessage?: string | null, failureReason?: string | null, phase?: string | null, conditions?: Array<{ __typename?: 'ClusterCondition', lastTransitionTime?: string | null, message?: string | null, reason?: string | null, severity?: string | null, status?: string | null, type?: string | null } | null> | null } | null, tags?: Array<{ __typename?: 'Tag', name: string, value: string } | null> | null, prAutomations?: Array<{ __typename?: 'PrAutomation', id: string, name: string, documentation?: string | null, addon?: string | null, role?: PrRole | null, cluster?: { __typename?: 'Cluster', handle?: string | null, self?: boolean | null, protect?: boolean | null, deletedAt?: string | null, version?: string | null, currentVersion?: string | null, id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string } | null, repository?: { __typename?: 'GitRepository', url: string, refs?: Array<string> | null } | null, connection?: { __typename?: 'ScmConnection', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, type: ScmType, username?: string | null, baseUrl?: string | null, apiUrl?: string | null } | null, createBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, configuration?: Array<{ __typename?: 'PrConfiguration', default?: string | null, documentation?: string | null, longform?: string | null, name: string, optional?: boolean | null, placeholder?: string | null, type: ConfigurationType, condition?: { __typename?: 'PrConfigurationCondition', field: string, operation: Operation, value?: string | null } | null } | null> | null } | null> | null };

export type ClustersQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
  healthy?: InputMaybe<Scalars['Boolean']['input']>;
  tagQuery?: InputMaybe<TagQuery>;
}>;


export type ClustersQuery = { __typename?: 'RootQueryType', tags?: Array<string | null> | null, clusters?: { __typename?: 'ClusterConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, hasPreviousPage: boolean, startCursor?: string | null }, edges?: Array<{ __typename?: 'ClusterEdge', node?: { __typename?: 'Cluster', currentVersion?: string | null, id: string, self?: boolean | null, protect?: boolean | null, name: string, handle?: string | null, distro?: ClusterDistro | null, installed?: boolean | null, pingedAt?: string | null, deletedAt?: string | null, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, version?: string | null, kind: string, name: string, namespace?: string | null, service?: { __typename?: 'ServiceDeployment', git?: { __typename?: 'GitRef', ref: string, folder: string } | null, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, nodes?: Array<{ __typename?: 'Node', status: { __typename?: 'NodeStatus', capacity?: Record<string, unknown> | null } } | null> | null, nodeMetrics?: Array<{ __typename?: 'NodeMetric', usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null } | null> | null, provider?: { __typename?: 'ClusterProvider', id: string, cloud: string, name: string, namespace: string, supportedVersions?: Array<string | null> | null } | null, prAutomations?: Array<{ __typename?: 'PrAutomation', id: string, name: string, documentation?: string | null, addon?: string | null, role?: PrRole | null, cluster?: { __typename?: 'Cluster', handle?: string | null, self?: boolean | null, protect?: boolean | null, deletedAt?: string | null, version?: string | null, currentVersion?: string | null, id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string } | null, repository?: { __typename?: 'GitRepository', url: string, refs?: Array<string> | null } | null, connection?: { __typename?: 'ScmConnection', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, type: ScmType, username?: string | null, baseUrl?: string | null, apiUrl?: string | null } | null, createBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, configuration?: Array<{ __typename?: 'PrConfiguration', default?: string | null, documentation?: string | null, longform?: string | null, name: string, optional?: boolean | null, placeholder?: string | null, type: ConfigurationType, condition?: { __typename?: 'PrConfigurationCondition', field: string, operation: Operation, value?: string | null } | null } | null> | null } | null> | null, service?: { __typename?: 'ServiceDeployment', id: string, repository?: { __typename?: 'GitRepository', url: string } | null } | null, status?: { __typename?: 'ClusterStatus', conditions?: Array<{ __typename?: 'ClusterCondition', lastTransitionTime?: string | null, message?: string | null, reason?: string | null, severity?: string | null, status?: string | null, type?: string | null } | null> | null } | null, tags?: Array<{ __typename?: 'Tag', name: string, value: string } | null> | null } | null } | null> | null } | null, clusterStatuses?: Array<{ __typename?: 'ClusterStatusInfo', count?: number | null, healthy?: boolean | null } | null> | null };

export type ClusterTinyFragment = { __typename?: 'Cluster', id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null };

export type ClusterBasicFragment = { __typename?: 'Cluster', handle?: string | null, self?: boolean | null, protect?: boolean | null, deletedAt?: string | null, version?: string | null, currentVersion?: string | null, id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null };

export type ClustersTinyQueryVariables = Exact<{ [key: string]: never; }>;


export type ClustersTinyQuery = { __typename?: 'RootQueryType', clusters?: { __typename?: 'ClusterConnection', edges?: Array<{ __typename?: 'ClusterEdge', node?: { __typename?: 'Cluster', id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null } | null> | null } | null };

export type ClusterSelectorQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
  currentClusterId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type ClusterSelectorQuery = { __typename?: 'RootQueryType', clusters?: { __typename?: 'ClusterConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, hasPreviousPage: boolean, startCursor?: string | null }, edges?: Array<{ __typename?: 'ClusterEdge', node?: { __typename?: 'Cluster', id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null } | null> | null } | null, cluster?: { __typename?: 'Cluster', id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null };

export type ClusterQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ClusterQuery = { __typename?: 'RootQueryType', cluster?: { __typename?: 'Cluster', currentVersion?: string | null, id: string, name: string, handle?: string | null, pingedAt?: string | null, self?: boolean | null, version?: string | null, protect?: boolean | null, distro?: ClusterDistro | null, installed?: boolean | null, deletedAt?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, version?: string | null, kind: string, name: string, namespace?: string | null, service?: { __typename?: 'ServiceDeployment', git?: { __typename?: 'GitRef', ref: string, folder: string } | null, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, nodePools?: Array<{ __typename?: 'NodePool', id: string, name: string, minSize: number, maxSize: number, instanceType: string, spot?: boolean | null, labels?: Record<string, unknown> | null, taints?: Array<{ __typename?: 'Taint', effect: string, key: string, value: string } | null> | null } | null> | null, nodes?: Array<{ __typename?: 'Node', status: { __typename?: 'NodeStatus', capacity?: Record<string, unknown> | null, phase?: string | null, allocatable?: Record<string, unknown> | null, conditions?: Array<{ __typename?: 'NodeCondition', type?: string | null, status?: string | null, message?: string | null } | null> | null }, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, spec: { __typename?: 'NodeSpec', podCidr?: string | null, providerId?: string | null } } | null> | null, nodeMetrics?: Array<{ __typename?: 'NodeMetric', timestamp?: string | null, window?: string | null, usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, provider?: { __typename?: 'ClusterProvider', id: string, cloud: string, name: string, namespace: string, supportedVersions?: Array<string | null> | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, repository?: { __typename?: 'GitRepository', url: string } | null } | null, status?: { __typename?: 'ClusterStatus', controlPlaneReady?: boolean | null, failureMessage?: string | null, failureReason?: string | null, phase?: string | null, conditions?: Array<{ __typename?: 'ClusterCondition', lastTransitionTime?: string | null, message?: string | null, reason?: string | null, severity?: string | null, status?: string | null, type?: string | null } | null> | null } | null, tags?: Array<{ __typename?: 'Tag', name: string, value: string } | null> | null, prAutomations?: Array<{ __typename?: 'PrAutomation', id: string, name: string, documentation?: string | null, addon?: string | null, role?: PrRole | null, cluster?: { __typename?: 'Cluster', handle?: string | null, self?: boolean | null, protect?: boolean | null, deletedAt?: string | null, version?: string | null, currentVersion?: string | null, id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string } | null, repository?: { __typename?: 'GitRepository', url: string, refs?: Array<string> | null } | null, connection?: { __typename?: 'ScmConnection', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, type: ScmType, username?: string | null, baseUrl?: string | null, apiUrl?: string | null } | null, createBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, configuration?: Array<{ __typename?: 'PrConfiguration', default?: string | null, documentation?: string | null, longform?: string | null, name: string, optional?: boolean | null, placeholder?: string | null, type: ConfigurationType, condition?: { __typename?: 'PrConfigurationCondition', field: string, operation: Operation, value?: string | null } | null } | null> | null } | null> | null } | null };

export type ClusterPodsQueryVariables = Exact<{
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  namespace?: InputMaybe<Scalars['String']['input']>;
}>;


export type ClusterPodsQuery = { __typename?: 'RootQueryType', pods?: { __typename?: 'PodConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, hasPreviousPage: boolean, startCursor?: string | null }, edges?: Array<{ __typename?: 'PodEdge', node?: { __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null } | null> | null } | null };

export type ClusterNamespacesQueryVariables = Exact<{
  clusterId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type ClusterNamespacesQuery = { __typename?: 'RootQueryType', namespaces?: Array<{ __typename?: 'Namespace', metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null };

export type PolicyBindingFragment = { __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null };

export type ClusterBindingsFragment = { __typename?: 'Cluster', readBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null };

export type ClusterBindingsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ClusterBindingsQuery = { __typename?: 'RootQueryType', cluster?: { __typename?: 'Cluster', readBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null } | null };

export type RuntimeServicesQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  kubeVersion: Scalars['String']['input'];
  hasKubeVersion: Scalars['Boolean']['input'];
}>;


export type RuntimeServicesQuery = { __typename?: 'RootQueryType', cluster?: { __typename?: 'Cluster', id: string, name: string, currentVersion?: string | null, version?: string | null, runtimeServices?: Array<{ __typename?: 'RuntimeService', id: string, name: string, version: string, addon?: { __typename?: 'RuntimeAddon', icon?: string | null, readme?: string | null, versions?: Array<{ __typename?: 'AddonVersion', version?: string | null, kube?: Array<string | null> | null, incompatibilities?: Array<{ __typename?: 'VersionReference', version: string, name: string } | null> | null, requirements?: Array<{ __typename?: 'VersionReference', version: string, name: string } | null> | null } | null> | null } | null, service?: { __typename?: 'ServiceDeployment', git?: { __typename?: 'GitRef', ref: string, folder: string } | null, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null, helm?: { __typename?: 'HelmSpec', version?: string | null } | null } | null, addonVersion?: { __typename?: 'AddonVersion', blocking?: boolean | null, version?: string | null, kube?: Array<string | null> | null, incompatibilities?: Array<{ __typename?: 'VersionReference', version: string, name: string } | null> | null, requirements?: Array<{ __typename?: 'VersionReference', version: string, name: string } | null> | null } | null } | null> | null } | null };

export type AddonReleaseUrlQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  version: Scalars['String']['input'];
}>;


export type AddonReleaseUrlQuery = { __typename?: 'RootQueryType', runtimeService?: { __typename?: 'RuntimeService', id: string, addon?: { __typename?: 'RuntimeAddon', releaseUrl?: string | null } | null } | null };

export type UpdateClusterBindingsMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  rbac: RbacAttributes;
}>;


export type UpdateClusterBindingsMutation = { __typename?: 'RootMutationType', updateRbac?: boolean | null };

export type UpdateClusterMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  attributes: ClusterUpdateAttributes;
}>;


export type UpdateClusterMutation = { __typename?: 'RootMutationType', updateCluster?: { __typename?: 'Cluster', currentVersion?: string | null, id: string, name: string, handle?: string | null, pingedAt?: string | null, self?: boolean | null, version?: string | null, protect?: boolean | null, distro?: ClusterDistro | null, installed?: boolean | null, deletedAt?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, version?: string | null, kind: string, name: string, namespace?: string | null, service?: { __typename?: 'ServiceDeployment', git?: { __typename?: 'GitRef', ref: string, folder: string } | null, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, nodePools?: Array<{ __typename?: 'NodePool', id: string, name: string, minSize: number, maxSize: number, instanceType: string, spot?: boolean | null, labels?: Record<string, unknown> | null, taints?: Array<{ __typename?: 'Taint', effect: string, key: string, value: string } | null> | null } | null> | null, nodes?: Array<{ __typename?: 'Node', status: { __typename?: 'NodeStatus', capacity?: Record<string, unknown> | null, phase?: string | null, allocatable?: Record<string, unknown> | null, conditions?: Array<{ __typename?: 'NodeCondition', type?: string | null, status?: string | null, message?: string | null } | null> | null }, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, spec: { __typename?: 'NodeSpec', podCidr?: string | null, providerId?: string | null } } | null> | null, nodeMetrics?: Array<{ __typename?: 'NodeMetric', timestamp?: string | null, window?: string | null, usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, provider?: { __typename?: 'ClusterProvider', id: string, cloud: string, name: string, namespace: string, supportedVersions?: Array<string | null> | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, repository?: { __typename?: 'GitRepository', url: string } | null } | null, status?: { __typename?: 'ClusterStatus', controlPlaneReady?: boolean | null, failureMessage?: string | null, failureReason?: string | null, phase?: string | null, conditions?: Array<{ __typename?: 'ClusterCondition', lastTransitionTime?: string | null, message?: string | null, reason?: string | null, severity?: string | null, status?: string | null, type?: string | null } | null> | null } | null, tags?: Array<{ __typename?: 'Tag', name: string, value: string } | null> | null, prAutomations?: Array<{ __typename?: 'PrAutomation', id: string, name: string, documentation?: string | null, addon?: string | null, role?: PrRole | null, cluster?: { __typename?: 'Cluster', handle?: string | null, self?: boolean | null, protect?: boolean | null, deletedAt?: string | null, version?: string | null, currentVersion?: string | null, id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string } | null, repository?: { __typename?: 'GitRepository', url: string, refs?: Array<string> | null } | null, connection?: { __typename?: 'ScmConnection', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, type: ScmType, username?: string | null, baseUrl?: string | null, apiUrl?: string | null } | null, createBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, configuration?: Array<{ __typename?: 'PrConfiguration', default?: string | null, documentation?: string | null, longform?: string | null, name: string, optional?: boolean | null, placeholder?: string | null, type: ConfigurationType, condition?: { __typename?: 'PrConfigurationCondition', field: string, operation: Operation, value?: string | null } | null } | null> | null } | null> | null } | null };

export type CreateClusterMutationVariables = Exact<{
  attributes: ClusterAttributes;
}>;


export type CreateClusterMutation = { __typename?: 'RootMutationType', createCluster?: { __typename?: 'Cluster', deployToken?: string | null, currentVersion?: string | null, id: string, name: string, handle?: string | null, pingedAt?: string | null, self?: boolean | null, version?: string | null, protect?: boolean | null, distro?: ClusterDistro | null, installed?: boolean | null, deletedAt?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, version?: string | null, kind: string, name: string, namespace?: string | null, service?: { __typename?: 'ServiceDeployment', git?: { __typename?: 'GitRef', ref: string, folder: string } | null, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, nodePools?: Array<{ __typename?: 'NodePool', id: string, name: string, minSize: number, maxSize: number, instanceType: string, spot?: boolean | null, labels?: Record<string, unknown> | null, taints?: Array<{ __typename?: 'Taint', effect: string, key: string, value: string } | null> | null } | null> | null, nodes?: Array<{ __typename?: 'Node', status: { __typename?: 'NodeStatus', capacity?: Record<string, unknown> | null, phase?: string | null, allocatable?: Record<string, unknown> | null, conditions?: Array<{ __typename?: 'NodeCondition', type?: string | null, status?: string | null, message?: string | null } | null> | null }, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, spec: { __typename?: 'NodeSpec', podCidr?: string | null, providerId?: string | null } } | null> | null, nodeMetrics?: Array<{ __typename?: 'NodeMetric', timestamp?: string | null, window?: string | null, usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, provider?: { __typename?: 'ClusterProvider', id: string, cloud: string, name: string, namespace: string, supportedVersions?: Array<string | null> | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, repository?: { __typename?: 'GitRepository', url: string } | null } | null, status?: { __typename?: 'ClusterStatus', controlPlaneReady?: boolean | null, failureMessage?: string | null, failureReason?: string | null, phase?: string | null, conditions?: Array<{ __typename?: 'ClusterCondition', lastTransitionTime?: string | null, message?: string | null, reason?: string | null, severity?: string | null, status?: string | null, type?: string | null } | null> | null } | null, tags?: Array<{ __typename?: 'Tag', name: string, value: string } | null> | null, prAutomations?: Array<{ __typename?: 'PrAutomation', id: string, name: string, documentation?: string | null, addon?: string | null, role?: PrRole | null, cluster?: { __typename?: 'Cluster', handle?: string | null, self?: boolean | null, protect?: boolean | null, deletedAt?: string | null, version?: string | null, currentVersion?: string | null, id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string } | null, repository?: { __typename?: 'GitRepository', url: string, refs?: Array<string> | null } | null, connection?: { __typename?: 'ScmConnection', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, type: ScmType, username?: string | null, baseUrl?: string | null, apiUrl?: string | null } | null, createBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, configuration?: Array<{ __typename?: 'PrConfiguration', default?: string | null, documentation?: string | null, longform?: string | null, name: string, optional?: boolean | null, placeholder?: string | null, type: ConfigurationType, condition?: { __typename?: 'PrConfigurationCondition', field: string, operation: Operation, value?: string | null } | null } | null> | null } | null> | null } | null };

export type DeleteClusterMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteClusterMutation = { __typename?: 'RootMutationType', deleteCluster?: { __typename?: 'Cluster', currentVersion?: string | null, id: string, name: string, handle?: string | null, pingedAt?: string | null, self?: boolean | null, version?: string | null, protect?: boolean | null, distro?: ClusterDistro | null, installed?: boolean | null, deletedAt?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, version?: string | null, kind: string, name: string, namespace?: string | null, service?: { __typename?: 'ServiceDeployment', git?: { __typename?: 'GitRef', ref: string, folder: string } | null, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, nodePools?: Array<{ __typename?: 'NodePool', id: string, name: string, minSize: number, maxSize: number, instanceType: string, spot?: boolean | null, labels?: Record<string, unknown> | null, taints?: Array<{ __typename?: 'Taint', effect: string, key: string, value: string } | null> | null } | null> | null, nodes?: Array<{ __typename?: 'Node', status: { __typename?: 'NodeStatus', capacity?: Record<string, unknown> | null, phase?: string | null, allocatable?: Record<string, unknown> | null, conditions?: Array<{ __typename?: 'NodeCondition', type?: string | null, status?: string | null, message?: string | null } | null> | null }, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, spec: { __typename?: 'NodeSpec', podCidr?: string | null, providerId?: string | null } } | null> | null, nodeMetrics?: Array<{ __typename?: 'NodeMetric', timestamp?: string | null, window?: string | null, usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, provider?: { __typename?: 'ClusterProvider', id: string, cloud: string, name: string, namespace: string, supportedVersions?: Array<string | null> | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, repository?: { __typename?: 'GitRepository', url: string } | null } | null, status?: { __typename?: 'ClusterStatus', controlPlaneReady?: boolean | null, failureMessage?: string | null, failureReason?: string | null, phase?: string | null, conditions?: Array<{ __typename?: 'ClusterCondition', lastTransitionTime?: string | null, message?: string | null, reason?: string | null, severity?: string | null, status?: string | null, type?: string | null } | null> | null } | null, tags?: Array<{ __typename?: 'Tag', name: string, value: string } | null> | null, prAutomations?: Array<{ __typename?: 'PrAutomation', id: string, name: string, documentation?: string | null, addon?: string | null, role?: PrRole | null, cluster?: { __typename?: 'Cluster', handle?: string | null, self?: boolean | null, protect?: boolean | null, deletedAt?: string | null, version?: string | null, currentVersion?: string | null, id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string } | null, repository?: { __typename?: 'GitRepository', url: string, refs?: Array<string> | null } | null, connection?: { __typename?: 'ScmConnection', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, type: ScmType, username?: string | null, baseUrl?: string | null, apiUrl?: string | null } | null, createBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, configuration?: Array<{ __typename?: 'PrConfiguration', default?: string | null, documentation?: string | null, longform?: string | null, name: string, optional?: boolean | null, placeholder?: string | null, type: ConfigurationType, condition?: { __typename?: 'PrConfigurationCondition', field: string, operation: Operation, value?: string | null } | null } | null> | null } | null> | null } | null };

export type DetachClusterMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetachClusterMutation = { __typename?: 'RootMutationType', detachCluster?: { __typename?: 'Cluster', currentVersion?: string | null, id: string, name: string, handle?: string | null, pingedAt?: string | null, self?: boolean | null, version?: string | null, protect?: boolean | null, distro?: ClusterDistro | null, installed?: boolean | null, deletedAt?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, version?: string | null, kind: string, name: string, namespace?: string | null, service?: { __typename?: 'ServiceDeployment', git?: { __typename?: 'GitRef', ref: string, folder: string } | null, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, nodePools?: Array<{ __typename?: 'NodePool', id: string, name: string, minSize: number, maxSize: number, instanceType: string, spot?: boolean | null, labels?: Record<string, unknown> | null, taints?: Array<{ __typename?: 'Taint', effect: string, key: string, value: string } | null> | null } | null> | null, nodes?: Array<{ __typename?: 'Node', status: { __typename?: 'NodeStatus', capacity?: Record<string, unknown> | null, phase?: string | null, allocatable?: Record<string, unknown> | null, conditions?: Array<{ __typename?: 'NodeCondition', type?: string | null, status?: string | null, message?: string | null } | null> | null }, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, spec: { __typename?: 'NodeSpec', podCidr?: string | null, providerId?: string | null } } | null> | null, nodeMetrics?: Array<{ __typename?: 'NodeMetric', timestamp?: string | null, window?: string | null, usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, provider?: { __typename?: 'ClusterProvider', id: string, cloud: string, name: string, namespace: string, supportedVersions?: Array<string | null> | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, repository?: { __typename?: 'GitRepository', url: string } | null } | null, status?: { __typename?: 'ClusterStatus', controlPlaneReady?: boolean | null, failureMessage?: string | null, failureReason?: string | null, phase?: string | null, conditions?: Array<{ __typename?: 'ClusterCondition', lastTransitionTime?: string | null, message?: string | null, reason?: string | null, severity?: string | null, status?: string | null, type?: string | null } | null> | null } | null, tags?: Array<{ __typename?: 'Tag', name: string, value: string } | null> | null, prAutomations?: Array<{ __typename?: 'PrAutomation', id: string, name: string, documentation?: string | null, addon?: string | null, role?: PrRole | null, cluster?: { __typename?: 'Cluster', handle?: string | null, self?: boolean | null, protect?: boolean | null, deletedAt?: string | null, version?: string | null, currentVersion?: string | null, id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string } | null, repository?: { __typename?: 'GitRepository', url: string, refs?: Array<string> | null } | null, connection?: { __typename?: 'ScmConnection', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, type: ScmType, username?: string | null, baseUrl?: string | null, apiUrl?: string | null } | null, createBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, configuration?: Array<{ __typename?: 'PrConfiguration', default?: string | null, documentation?: string | null, longform?: string | null, name: string, optional?: boolean | null, placeholder?: string | null, type: ConfigurationType, condition?: { __typename?: 'PrConfigurationCondition', field: string, operation: Operation, value?: string | null } | null } | null> | null } | null> | null } | null };

export type ClusterStatusInfoFragment = { __typename?: 'ClusterStatusInfo', count?: number | null, healthy?: boolean | null };

export type ClusterStatusesQueryVariables = Exact<{
  clusterId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type ClusterStatusesQuery = { __typename?: 'RootQueryType', clusterStatuses?: Array<{ __typename?: 'ClusterStatusInfo', count?: number | null, healthy?: boolean | null } | null> | null };

export type TagPairsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
  tag?: InputMaybe<Scalars['String']['input']>;
}>;


export type TagPairsQuery = { __typename?: 'RootQueryType', tagPairs?: { __typename?: 'TagConnection', edges?: Array<{ __typename?: 'TagEdge', node?: { __typename?: 'Tag', name: string, value: string, id: string } | null } | null> | null } | null };

export type MetricResponseFragment = { __typename?: 'MetricResponse', metric?: Record<string, unknown> | null, values?: Array<{ __typename?: 'MetricResult', timestamp?: any | null, value?: string | null } | null> | null };

export type UsageQueryVariables = Exact<{
  cpu: Scalars['String']['input'];
  mem: Scalars['String']['input'];
  podCpu: Scalars['String']['input'];
  podMem: Scalars['String']['input'];
  step: Scalars['String']['input'];
  offset: Scalars['Int']['input'];
  clusterId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type UsageQuery = { __typename?: 'RootQueryType', cpu?: Array<{ __typename?: 'MetricResponse', metric?: Record<string, unknown> | null, values?: Array<{ __typename?: 'MetricResult', timestamp?: any | null, value?: string | null } | null> | null } | null> | null, mem?: Array<{ __typename?: 'MetricResponse', metric?: Record<string, unknown> | null, values?: Array<{ __typename?: 'MetricResult', timestamp?: any | null, value?: string | null } | null> | null } | null> | null, podCpu?: Array<{ __typename?: 'MetricResponse', metric?: Record<string, unknown> | null, values?: Array<{ __typename?: 'MetricResult', timestamp?: any | null, value?: string | null } | null> | null } | null> | null, podMem?: Array<{ __typename?: 'MetricResponse', metric?: Record<string, unknown> | null, values?: Array<{ __typename?: 'MetricResult', timestamp?: any | null, value?: string | null } | null> | null } | null> | null };

export type GitRepositoryFragment = { __typename?: 'GitRepository', id: string, url: string, health?: GitHealth | null, authMethod?: AuthMethod | null, editable?: boolean | null, error?: string | null, insertedAt?: string | null, pulledAt?: string | null, updatedAt?: string | null, urlFormat?: string | null, httpsPath?: string | null };

export type HelmRepositoryFragment = { __typename?: 'HelmRepository', metadata: { __typename?: 'Metadata', namespace?: string | null, name: string }, spec: { __typename?: 'HelmRepositorySpec', url: string, type?: string | null, provider?: string | null }, status?: { __typename?: 'HelmRepositoryStatus', ready?: boolean | null, message?: string | null } | null };

export type HelmChartVersionFragment = { __typename?: 'HelmChartVersion', name?: string | null, appVersion?: string | null, version?: string | null, digest?: string | null };

export type GitRepositoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type GitRepositoriesQuery = { __typename?: 'RootQueryType', gitRepositories?: { __typename?: 'GitRepositoryConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, hasPreviousPage: boolean, startCursor?: string | null }, edges?: Array<{ __typename?: 'GitRepositoryEdge', node?: { __typename?: 'GitRepository', id: string, url: string, health?: GitHealth | null, authMethod?: AuthMethod | null, editable?: boolean | null, error?: string | null, insertedAt?: string | null, pulledAt?: string | null, updatedAt?: string | null, urlFormat?: string | null, httpsPath?: string | null } | null } | null> | null } | null };

export type HelmRepositoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type HelmRepositoriesQuery = { __typename?: 'RootQueryType', helmRepositories?: Array<{ __typename?: 'HelmRepository', metadata: { __typename?: 'Metadata', namespace?: string | null, name: string }, spec: { __typename?: 'HelmRepositorySpec', url: string, type?: string | null, provider?: string | null }, status?: { __typename?: 'HelmRepositoryStatus', ready?: boolean | null, message?: string | null } | null } | null> | null };

export type HelmRepositoryQueryVariables = Exact<{
  namespace: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type HelmRepositoryQuery = { __typename?: 'RootQueryType', helmRepository?: { __typename?: 'HelmRepository', charts?: Array<{ __typename?: 'HelmChartEntry', name?: string | null, versions?: Array<{ __typename?: 'HelmChartVersion', name?: string | null, appVersion?: string | null, version?: string | null, digest?: string | null } | null> | null } | null> | null, metadata: { __typename?: 'Metadata', namespace?: string | null, name: string }, spec: { __typename?: 'HelmRepositorySpec', url: string, type?: string | null, provider?: string | null }, status?: { __typename?: 'HelmRepositoryStatus', ready?: boolean | null, message?: string | null } | null } | null };

export type GitRepositoryQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GitRepositoryQuery = { __typename?: 'RootQueryType', gitRepository?: { __typename?: 'GitRepository', refs?: Array<string> | null } | null };

export type CreateGitRepositoryMutationVariables = Exact<{
  attributes: GitAttributes;
}>;


export type CreateGitRepositoryMutation = { __typename?: 'RootMutationType', createGitRepository?: { __typename?: 'GitRepository', id: string, url: string, health?: GitHealth | null, authMethod?: AuthMethod | null, editable?: boolean | null, error?: string | null, insertedAt?: string | null, pulledAt?: string | null, updatedAt?: string | null, urlFormat?: string | null, httpsPath?: string | null } | null };

export type DeleteGitRepositoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteGitRepositoryMutation = { __typename?: 'RootMutationType', deleteGitRepository?: { __typename?: 'GitRepository', id: string } | null };

export type UpdateGitRepositoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  attributes: GitAttributes;
}>;


export type UpdateGitRepositoryMutation = { __typename?: 'RootMutationType', updateGitRepository?: { __typename?: 'GitRepository', id: string, url: string, health?: GitHealth | null, authMethod?: AuthMethod | null, editable?: boolean | null, error?: string | null, insertedAt?: string | null, pulledAt?: string | null, updatedAt?: string | null, urlFormat?: string | null, httpsPath?: string | null } | null };

export type GlobalServiceFragment = { __typename?: 'GlobalService', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, provider?: { __typename?: 'ClusterProvider', id: string, name: string, cloud: string, namespace: string } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string } | null, tags?: Array<{ __typename?: 'Tag', name: string, value: string } | null> | null };

export type CreateGlobalServiceMutationVariables = Exact<{
  attributes: GlobalServiceAttributes;
  cluster?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CreateGlobalServiceMutation = { __typename?: 'RootMutationType', createGlobalService?: { __typename?: 'GlobalService', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, provider?: { __typename?: 'ClusterProvider', id: string, name: string, cloud: string, namespace: string } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string } | null, tags?: Array<{ __typename?: 'Tag', name: string, value: string } | null> | null } | null };

export type DeleteGlobalServiceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteGlobalServiceMutation = { __typename?: 'RootMutationType', deleteGlobalService?: { __typename?: 'GlobalService', id: string } | null };

export type HttpConnectionFragment = { __typename?: 'HttpConnection', host: string, user?: string | null, password?: string | null };

export type DeploymentSettingsFragment = { __typename?: 'DeploymentSettings', id: string, name: string, enabled: boolean, selfManaged?: boolean | null, insertedAt?: string | null, updatedAt?: string | null, agentHelmValues?: string | null, lokiConnection?: { __typename?: 'HttpConnection', host: string, user?: string | null, password?: string | null } | null, prometheusConnection?: { __typename?: 'HttpConnection', host: string, user?: string | null, password?: string | null } | null, artifactRepository?: { __typename?: 'GitRepository', id: string, url: string, health?: GitHealth | null, authMethod?: AuthMethod | null, editable?: boolean | null, error?: string | null, insertedAt?: string | null, pulledAt?: string | null, updatedAt?: string | null, urlFormat?: string | null, httpsPath?: string | null } | null, deployerRepository?: { __typename?: 'GitRepository', id: string, url: string, health?: GitHealth | null, authMethod?: AuthMethod | null, editable?: boolean | null, error?: string | null, insertedAt?: string | null, pulledAt?: string | null, updatedAt?: string | null, urlFormat?: string | null, httpsPath?: string | null } | null, createBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, readBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, gitBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null };

export type UpdateDeploymentSettingsMutationVariables = Exact<{
  attributes: DeploymentSettingsAttributes;
}>;


export type UpdateDeploymentSettingsMutation = { __typename?: 'RootMutationType', updateDeploymentSettings?: { __typename?: 'DeploymentSettings', id: string, name: string, enabled: boolean, selfManaged?: boolean | null, insertedAt?: string | null, updatedAt?: string | null, agentHelmValues?: string | null, lokiConnection?: { __typename?: 'HttpConnection', host: string, user?: string | null, password?: string | null } | null, prometheusConnection?: { __typename?: 'HttpConnection', host: string, user?: string | null, password?: string | null } | null, artifactRepository?: { __typename?: 'GitRepository', id: string, url: string, health?: GitHealth | null, authMethod?: AuthMethod | null, editable?: boolean | null, error?: string | null, insertedAt?: string | null, pulledAt?: string | null, updatedAt?: string | null, urlFormat?: string | null, httpsPath?: string | null } | null, deployerRepository?: { __typename?: 'GitRepository', id: string, url: string, health?: GitHealth | null, authMethod?: AuthMethod | null, editable?: boolean | null, error?: string | null, insertedAt?: string | null, pulledAt?: string | null, updatedAt?: string | null, urlFormat?: string | null, httpsPath?: string | null } | null, createBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, readBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, gitBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null } | null };

export type DeploymentSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type DeploymentSettingsQuery = { __typename?: 'RootQueryType', deploymentSettings?: { __typename?: 'DeploymentSettings', id: string, name: string, enabled: boolean, selfManaged?: boolean | null, insertedAt?: string | null, updatedAt?: string | null, agentHelmValues?: string | null, lokiConnection?: { __typename?: 'HttpConnection', host: string, user?: string | null, password?: string | null } | null, prometheusConnection?: { __typename?: 'HttpConnection', host: string, user?: string | null, password?: string | null } | null, artifactRepository?: { __typename?: 'GitRepository', id: string, url: string, health?: GitHealth | null, authMethod?: AuthMethod | null, editable?: boolean | null, error?: string | null, insertedAt?: string | null, pulledAt?: string | null, updatedAt?: string | null, urlFormat?: string | null, httpsPath?: string | null } | null, deployerRepository?: { __typename?: 'GitRepository', id: string, url: string, health?: GitHealth | null, authMethod?: AuthMethod | null, editable?: boolean | null, error?: string | null, insertedAt?: string | null, pulledAt?: string | null, updatedAt?: string | null, urlFormat?: string | null, httpsPath?: string | null } | null, createBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, readBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, gitBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null } | null };

export type PipelineServiceDeploymentFragment = { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null };

export type ContainerSpecFragment = { __typename?: 'ContainerSpec', args?: Array<string | null> | null, image: string, env?: Array<{ __typename?: 'ContainerEnv', name: string, value: string } | null> | null, envFrom?: Array<{ __typename?: 'ContainerEnvFrom', configMap: string, secret: string } | null> | null };

export type JobGateSpecFragment = { __typename?: 'JobGateSpec', annotations?: Record<string, unknown> | null, labels?: Record<string, unknown> | null, namespace: string, raw?: string | null, serviceAccount?: string | null, containers?: Array<{ __typename?: 'ContainerSpec', args?: Array<string | null> | null, image: string, env?: Array<{ __typename?: 'ContainerEnv', name: string, value: string } | null> | null, envFrom?: Array<{ __typename?: 'ContainerEnvFrom', configMap: string, secret: string } | null> | null } | null> | null };

export type PipelineGateFragment = { __typename?: 'PipelineGate', id: string, name: string, state: GateState, type: GateType, insertedAt?: string | null, updatedAt?: string | null, approver?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, spec?: { __typename?: 'GateSpec', job?: { __typename?: 'JobGateSpec', annotations?: Record<string, unknown> | null, labels?: Record<string, unknown> | null, namespace: string, raw?: string | null, serviceAccount?: string | null, containers?: Array<{ __typename?: 'ContainerSpec', args?: Array<string | null> | null, image: string, env?: Array<{ __typename?: 'ContainerEnv', name: string, value: string } | null> | null, envFrom?: Array<{ __typename?: 'ContainerEnvFrom', configMap: string, secret: string } | null> | null } | null> | null } | null } | null };

export type RevisionFragment = { __typename?: 'Revision', id: string, insertedAt?: string | null, updatedAt?: string | null, message?: string | null, sha?: string | null, version: string, git?: { __typename?: 'GitRef', ref: string, folder: string } | null };

export type PromotionServiceFragment = { __typename?: 'PromotionService', id: string, insertedAt?: string | null, updatedAt?: string | null, revision?: { __typename?: 'Revision', id: string, insertedAt?: string | null, updatedAt?: string | null, message?: string | null, sha?: string | null, version: string, git?: { __typename?: 'GitRef', ref: string, folder: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null };

export type PipelinePromotionFragment = { __typename?: 'PipelinePromotion', id: string, insertedAt?: string | null, updatedAt?: string | null, promotedAt?: string | null, revisedAt?: string | null, services?: Array<{ __typename?: 'PromotionService', id: string, insertedAt?: string | null, updatedAt?: string | null, revision?: { __typename?: 'Revision', id: string, insertedAt?: string | null, updatedAt?: string | null, message?: string | null, sha?: string | null, version: string, git?: { __typename?: 'GitRef', ref: string, folder: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null };

export type PromotionCriteriaFragment = { __typename?: 'PromotionCriteria', id: string, secrets?: Array<string | null> | null, insertedAt?: string | null, updatedAt?: string | null, source?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null };

export type StageServiceFragment = { __typename?: 'StageService', id: string, insertedAt?: string | null, updatedAt?: string | null, criteria?: { __typename?: 'PromotionCriteria', id: string, secrets?: Array<string | null> | null, insertedAt?: string | null, updatedAt?: string | null, source?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null };

export type PipelineStageFragment = { __typename?: 'PipelineStage', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, promotion?: { __typename?: 'PipelinePromotion', id: string, insertedAt?: string | null, updatedAt?: string | null, promotedAt?: string | null, revisedAt?: string | null, services?: Array<{ __typename?: 'PromotionService', id: string, insertedAt?: string | null, updatedAt?: string | null, revision?: { __typename?: 'Revision', id: string, insertedAt?: string | null, updatedAt?: string | null, message?: string | null, sha?: string | null, version: string, git?: { __typename?: 'GitRef', ref: string, folder: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null, services?: Array<{ __typename?: 'StageService', id: string, insertedAt?: string | null, updatedAt?: string | null, criteria?: { __typename?: 'PromotionCriteria', id: string, secrets?: Array<string | null> | null, insertedAt?: string | null, updatedAt?: string | null, source?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null };

export type PipelineStageEdgeFragment = { __typename?: 'PipelineStageEdge', id: string, insertedAt?: string | null, promotedAt?: string | null, updatedAt?: string | null, gates?: Array<{ __typename?: 'PipelineGate', id: string, name: string, state: GateState, type: GateType, insertedAt?: string | null, updatedAt?: string | null, approver?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, spec?: { __typename?: 'GateSpec', job?: { __typename?: 'JobGateSpec', annotations?: Record<string, unknown> | null, labels?: Record<string, unknown> | null, namespace: string, raw?: string | null, serviceAccount?: string | null, containers?: Array<{ __typename?: 'ContainerSpec', args?: Array<string | null> | null, image: string, env?: Array<{ __typename?: 'ContainerEnv', name: string, value: string } | null> | null, envFrom?: Array<{ __typename?: 'ContainerEnvFrom', configMap: string, secret: string } | null> | null } | null> | null } | null } | null } | null> | null, from: { __typename?: 'PipelineStage', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, promotion?: { __typename?: 'PipelinePromotion', id: string, insertedAt?: string | null, updatedAt?: string | null, promotedAt?: string | null, revisedAt?: string | null, services?: Array<{ __typename?: 'PromotionService', id: string, insertedAt?: string | null, updatedAt?: string | null, revision?: { __typename?: 'Revision', id: string, insertedAt?: string | null, updatedAt?: string | null, message?: string | null, sha?: string | null, version: string, git?: { __typename?: 'GitRef', ref: string, folder: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null, services?: Array<{ __typename?: 'StageService', id: string, insertedAt?: string | null, updatedAt?: string | null, criteria?: { __typename?: 'PromotionCriteria', id: string, secrets?: Array<string | null> | null, insertedAt?: string | null, updatedAt?: string | null, source?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null }, to: { __typename?: 'PipelineStage', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, promotion?: { __typename?: 'PipelinePromotion', id: string, insertedAt?: string | null, updatedAt?: string | null, promotedAt?: string | null, revisedAt?: string | null, services?: Array<{ __typename?: 'PromotionService', id: string, insertedAt?: string | null, updatedAt?: string | null, revision?: { __typename?: 'Revision', id: string, insertedAt?: string | null, updatedAt?: string | null, message?: string | null, sha?: string | null, version: string, git?: { __typename?: 'GitRef', ref: string, folder: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null, services?: Array<{ __typename?: 'StageService', id: string, insertedAt?: string | null, updatedAt?: string | null, criteria?: { __typename?: 'PromotionCriteria', id: string, secrets?: Array<string | null> | null, insertedAt?: string | null, updatedAt?: string | null, source?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } };

export type PipelineStatusFragment = { __typename?: 'PipelineStatus', closed?: number | null, pending?: number | null };

export type PipelineFragment = { __typename?: 'Pipeline', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, edges?: Array<{ __typename?: 'PipelineStageEdge', id: string, insertedAt?: string | null, promotedAt?: string | null, updatedAt?: string | null, gates?: Array<{ __typename?: 'PipelineGate', id: string, name: string, state: GateState, type: GateType, insertedAt?: string | null, updatedAt?: string | null, approver?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, spec?: { __typename?: 'GateSpec', job?: { __typename?: 'JobGateSpec', annotations?: Record<string, unknown> | null, labels?: Record<string, unknown> | null, namespace: string, raw?: string | null, serviceAccount?: string | null, containers?: Array<{ __typename?: 'ContainerSpec', args?: Array<string | null> | null, image: string, env?: Array<{ __typename?: 'ContainerEnv', name: string, value: string } | null> | null, envFrom?: Array<{ __typename?: 'ContainerEnvFrom', configMap: string, secret: string } | null> | null } | null> | null } | null } | null } | null> | null, from: { __typename?: 'PipelineStage', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, promotion?: { __typename?: 'PipelinePromotion', id: string, insertedAt?: string | null, updatedAt?: string | null, promotedAt?: string | null, revisedAt?: string | null, services?: Array<{ __typename?: 'PromotionService', id: string, insertedAt?: string | null, updatedAt?: string | null, revision?: { __typename?: 'Revision', id: string, insertedAt?: string | null, updatedAt?: string | null, message?: string | null, sha?: string | null, version: string, git?: { __typename?: 'GitRef', ref: string, folder: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null, services?: Array<{ __typename?: 'StageService', id: string, insertedAt?: string | null, updatedAt?: string | null, criteria?: { __typename?: 'PromotionCriteria', id: string, secrets?: Array<string | null> | null, insertedAt?: string | null, updatedAt?: string | null, source?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null }, to: { __typename?: 'PipelineStage', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, promotion?: { __typename?: 'PipelinePromotion', id: string, insertedAt?: string | null, updatedAt?: string | null, promotedAt?: string | null, revisedAt?: string | null, services?: Array<{ __typename?: 'PromotionService', id: string, insertedAt?: string | null, updatedAt?: string | null, revision?: { __typename?: 'Revision', id: string, insertedAt?: string | null, updatedAt?: string | null, message?: string | null, sha?: string | null, version: string, git?: { __typename?: 'GitRef', ref: string, folder: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null, services?: Array<{ __typename?: 'StageService', id: string, insertedAt?: string | null, updatedAt?: string | null, criteria?: { __typename?: 'PromotionCriteria', id: string, secrets?: Array<string | null> | null, insertedAt?: string | null, updatedAt?: string | null, source?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } } | null> | null, stages?: Array<{ __typename?: 'PipelineStage', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, promotion?: { __typename?: 'PipelinePromotion', id: string, insertedAt?: string | null, updatedAt?: string | null, promotedAt?: string | null, revisedAt?: string | null, services?: Array<{ __typename?: 'PromotionService', id: string, insertedAt?: string | null, updatedAt?: string | null, revision?: { __typename?: 'Revision', id: string, insertedAt?: string | null, updatedAt?: string | null, message?: string | null, sha?: string | null, version: string, git?: { __typename?: 'GitRef', ref: string, folder: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null, services?: Array<{ __typename?: 'StageService', id: string, insertedAt?: string | null, updatedAt?: string | null, criteria?: { __typename?: 'PromotionCriteria', id: string, secrets?: Array<string | null> | null, insertedAt?: string | null, updatedAt?: string | null, source?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null> | null, status?: { __typename?: 'PipelineStatus', closed?: number | null, pending?: number | null } | null };

export type PipelinesQueryVariables = Exact<{
  q?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type PipelinesQuery = { __typename?: 'RootQueryType', pipelines?: { __typename?: 'PipelineConnection', edges?: Array<{ __typename?: 'PipelineEdge', cursor?: string | null, node?: { __typename?: 'Pipeline', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, edges?: Array<{ __typename?: 'PipelineStageEdge', id: string, insertedAt?: string | null, promotedAt?: string | null, updatedAt?: string | null, gates?: Array<{ __typename?: 'PipelineGate', id: string, name: string, state: GateState, type: GateType, insertedAt?: string | null, updatedAt?: string | null, approver?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, spec?: { __typename?: 'GateSpec', job?: { __typename?: 'JobGateSpec', annotations?: Record<string, unknown> | null, labels?: Record<string, unknown> | null, namespace: string, raw?: string | null, serviceAccount?: string | null, containers?: Array<{ __typename?: 'ContainerSpec', args?: Array<string | null> | null, image: string, env?: Array<{ __typename?: 'ContainerEnv', name: string, value: string } | null> | null, envFrom?: Array<{ __typename?: 'ContainerEnvFrom', configMap: string, secret: string } | null> | null } | null> | null } | null } | null } | null> | null, from: { __typename?: 'PipelineStage', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, promotion?: { __typename?: 'PipelinePromotion', id: string, insertedAt?: string | null, updatedAt?: string | null, promotedAt?: string | null, revisedAt?: string | null, services?: Array<{ __typename?: 'PromotionService', id: string, insertedAt?: string | null, updatedAt?: string | null, revision?: { __typename?: 'Revision', id: string, insertedAt?: string | null, updatedAt?: string | null, message?: string | null, sha?: string | null, version: string, git?: { __typename?: 'GitRef', ref: string, folder: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null, services?: Array<{ __typename?: 'StageService', id: string, insertedAt?: string | null, updatedAt?: string | null, criteria?: { __typename?: 'PromotionCriteria', id: string, secrets?: Array<string | null> | null, insertedAt?: string | null, updatedAt?: string | null, source?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null }, to: { __typename?: 'PipelineStage', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, promotion?: { __typename?: 'PipelinePromotion', id: string, insertedAt?: string | null, updatedAt?: string | null, promotedAt?: string | null, revisedAt?: string | null, services?: Array<{ __typename?: 'PromotionService', id: string, insertedAt?: string | null, updatedAt?: string | null, revision?: { __typename?: 'Revision', id: string, insertedAt?: string | null, updatedAt?: string | null, message?: string | null, sha?: string | null, version: string, git?: { __typename?: 'GitRef', ref: string, folder: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null, services?: Array<{ __typename?: 'StageService', id: string, insertedAt?: string | null, updatedAt?: string | null, criteria?: { __typename?: 'PromotionCriteria', id: string, secrets?: Array<string | null> | null, insertedAt?: string | null, updatedAt?: string | null, source?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } } | null> | null, stages?: Array<{ __typename?: 'PipelineStage', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, promotion?: { __typename?: 'PipelinePromotion', id: string, insertedAt?: string | null, updatedAt?: string | null, promotedAt?: string | null, revisedAt?: string | null, services?: Array<{ __typename?: 'PromotionService', id: string, insertedAt?: string | null, updatedAt?: string | null, revision?: { __typename?: 'Revision', id: string, insertedAt?: string | null, updatedAt?: string | null, message?: string | null, sha?: string | null, version: string, git?: { __typename?: 'GitRef', ref: string, folder: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null, services?: Array<{ __typename?: 'StageService', id: string, insertedAt?: string | null, updatedAt?: string | null, criteria?: { __typename?: 'PromotionCriteria', id: string, secrets?: Array<string | null> | null, insertedAt?: string | null, updatedAt?: string | null, source?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null> | null, status?: { __typename?: 'PipelineStatus', closed?: number | null, pending?: number | null } | null } | null } | null> | null, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, hasPreviousPage: boolean, startCursor?: string | null } } | null };

export type PipelineGateJobFragment = { __typename?: 'Job', raw: string, events?: Array<{ __typename?: 'Event', action?: string | null, count?: number | null, eventTime?: string | null, lastTimestamp?: string | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null, spec: { __typename?: 'JobSpec', activeDeadlineSeconds?: number | null, backoffLimit?: number | null, parallelism?: number | null }, status: { __typename?: 'JobStatus', active?: number | null, completionTime?: string | null, failed?: number | null, startTime?: string | null, succeeded?: number | null } };

export type JobGateQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type JobGateQuery = { __typename?: 'RootQueryType', pipelineGate?: { __typename?: 'PipelineGate', id: string, name: string, state: GateState, type: GateType, insertedAt?: string | null, updatedAt?: string | null, job?: { __typename?: 'Job', raw: string, events?: Array<{ __typename?: 'Event', action?: string | null, count?: number | null, eventTime?: string | null, lastTimestamp?: string | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null, spec: { __typename?: 'JobSpec', activeDeadlineSeconds?: number | null, backoffLimit?: number | null, parallelism?: number | null }, status: { __typename?: 'JobStatus', active?: number | null, completionTime?: string | null, failed?: number | null, startTime?: string | null, succeeded?: number | null } } | null, approver?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, spec?: { __typename?: 'GateSpec', job?: { __typename?: 'JobGateSpec', annotations?: Record<string, unknown> | null, labels?: Record<string, unknown> | null, namespace: string, raw?: string | null, serviceAccount?: string | null, containers?: Array<{ __typename?: 'ContainerSpec', args?: Array<string | null> | null, image: string, env?: Array<{ __typename?: 'ContainerEnv', name: string, value: string } | null> | null, envFrom?: Array<{ __typename?: 'ContainerEnvFrom', configMap: string, secret: string } | null> | null } | null> | null } | null } | null } | null };

export type JobGateLogsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  container: Scalars['String']['input'];
  sinceSeconds: Scalars['Int']['input'];
}>;


export type JobGateLogsQuery = { __typename?: 'RootQueryType', pipelineGate?: { __typename?: 'PipelineGate', job?: { __typename?: 'Job', logs?: Array<string | null> | null } | null } | null };

export type PipelineQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PipelineQuery = { __typename?: 'RootQueryType', pipeline?: { __typename?: 'Pipeline', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, edges?: Array<{ __typename?: 'PipelineStageEdge', id: string, insertedAt?: string | null, promotedAt?: string | null, updatedAt?: string | null, gates?: Array<{ __typename?: 'PipelineGate', id: string, name: string, state: GateState, type: GateType, insertedAt?: string | null, updatedAt?: string | null, approver?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, spec?: { __typename?: 'GateSpec', job?: { __typename?: 'JobGateSpec', annotations?: Record<string, unknown> | null, labels?: Record<string, unknown> | null, namespace: string, raw?: string | null, serviceAccount?: string | null, containers?: Array<{ __typename?: 'ContainerSpec', args?: Array<string | null> | null, image: string, env?: Array<{ __typename?: 'ContainerEnv', name: string, value: string } | null> | null, envFrom?: Array<{ __typename?: 'ContainerEnvFrom', configMap: string, secret: string } | null> | null } | null> | null } | null } | null } | null> | null, from: { __typename?: 'PipelineStage', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, promotion?: { __typename?: 'PipelinePromotion', id: string, insertedAt?: string | null, updatedAt?: string | null, promotedAt?: string | null, revisedAt?: string | null, services?: Array<{ __typename?: 'PromotionService', id: string, insertedAt?: string | null, updatedAt?: string | null, revision?: { __typename?: 'Revision', id: string, insertedAt?: string | null, updatedAt?: string | null, message?: string | null, sha?: string | null, version: string, git?: { __typename?: 'GitRef', ref: string, folder: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null, services?: Array<{ __typename?: 'StageService', id: string, insertedAt?: string | null, updatedAt?: string | null, criteria?: { __typename?: 'PromotionCriteria', id: string, secrets?: Array<string | null> | null, insertedAt?: string | null, updatedAt?: string | null, source?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null }, to: { __typename?: 'PipelineStage', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, promotion?: { __typename?: 'PipelinePromotion', id: string, insertedAt?: string | null, updatedAt?: string | null, promotedAt?: string | null, revisedAt?: string | null, services?: Array<{ __typename?: 'PromotionService', id: string, insertedAt?: string | null, updatedAt?: string | null, revision?: { __typename?: 'Revision', id: string, insertedAt?: string | null, updatedAt?: string | null, message?: string | null, sha?: string | null, version: string, git?: { __typename?: 'GitRef', ref: string, folder: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null, services?: Array<{ __typename?: 'StageService', id: string, insertedAt?: string | null, updatedAt?: string | null, criteria?: { __typename?: 'PromotionCriteria', id: string, secrets?: Array<string | null> | null, insertedAt?: string | null, updatedAt?: string | null, source?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } } | null> | null, stages?: Array<{ __typename?: 'PipelineStage', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, promotion?: { __typename?: 'PipelinePromotion', id: string, insertedAt?: string | null, updatedAt?: string | null, promotedAt?: string | null, revisedAt?: string | null, services?: Array<{ __typename?: 'PromotionService', id: string, insertedAt?: string | null, updatedAt?: string | null, revision?: { __typename?: 'Revision', id: string, insertedAt?: string | null, updatedAt?: string | null, message?: string | null, sha?: string | null, version: string, git?: { __typename?: 'GitRef', ref: string, folder: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null, services?: Array<{ __typename?: 'StageService', id: string, insertedAt?: string | null, updatedAt?: string | null, criteria?: { __typename?: 'PromotionCriteria', id: string, secrets?: Array<string | null> | null, insertedAt?: string | null, updatedAt?: string | null, source?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null> | null, status?: { __typename?: 'PipelineStatus', closed?: number | null, pending?: number | null } | null } | null };

export type DeletePipelineMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeletePipelineMutation = { __typename?: 'RootMutationType', deletePipeline?: { __typename?: 'Pipeline', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, edges?: Array<{ __typename?: 'PipelineStageEdge', id: string, insertedAt?: string | null, promotedAt?: string | null, updatedAt?: string | null, gates?: Array<{ __typename?: 'PipelineGate', id: string, name: string, state: GateState, type: GateType, insertedAt?: string | null, updatedAt?: string | null, approver?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, spec?: { __typename?: 'GateSpec', job?: { __typename?: 'JobGateSpec', annotations?: Record<string, unknown> | null, labels?: Record<string, unknown> | null, namespace: string, raw?: string | null, serviceAccount?: string | null, containers?: Array<{ __typename?: 'ContainerSpec', args?: Array<string | null> | null, image: string, env?: Array<{ __typename?: 'ContainerEnv', name: string, value: string } | null> | null, envFrom?: Array<{ __typename?: 'ContainerEnvFrom', configMap: string, secret: string } | null> | null } | null> | null } | null } | null } | null> | null, from: { __typename?: 'PipelineStage', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, promotion?: { __typename?: 'PipelinePromotion', id: string, insertedAt?: string | null, updatedAt?: string | null, promotedAt?: string | null, revisedAt?: string | null, services?: Array<{ __typename?: 'PromotionService', id: string, insertedAt?: string | null, updatedAt?: string | null, revision?: { __typename?: 'Revision', id: string, insertedAt?: string | null, updatedAt?: string | null, message?: string | null, sha?: string | null, version: string, git?: { __typename?: 'GitRef', ref: string, folder: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null, services?: Array<{ __typename?: 'StageService', id: string, insertedAt?: string | null, updatedAt?: string | null, criteria?: { __typename?: 'PromotionCriteria', id: string, secrets?: Array<string | null> | null, insertedAt?: string | null, updatedAt?: string | null, source?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null }, to: { __typename?: 'PipelineStage', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, promotion?: { __typename?: 'PipelinePromotion', id: string, insertedAt?: string | null, updatedAt?: string | null, promotedAt?: string | null, revisedAt?: string | null, services?: Array<{ __typename?: 'PromotionService', id: string, insertedAt?: string | null, updatedAt?: string | null, revision?: { __typename?: 'Revision', id: string, insertedAt?: string | null, updatedAt?: string | null, message?: string | null, sha?: string | null, version: string, git?: { __typename?: 'GitRef', ref: string, folder: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null, services?: Array<{ __typename?: 'StageService', id: string, insertedAt?: string | null, updatedAt?: string | null, criteria?: { __typename?: 'PromotionCriteria', id: string, secrets?: Array<string | null> | null, insertedAt?: string | null, updatedAt?: string | null, source?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } } | null> | null, stages?: Array<{ __typename?: 'PipelineStage', id: string, name: string, insertedAt?: string | null, updatedAt?: string | null, promotion?: { __typename?: 'PipelinePromotion', id: string, insertedAt?: string | null, updatedAt?: string | null, promotedAt?: string | null, revisedAt?: string | null, services?: Array<{ __typename?: 'PromotionService', id: string, insertedAt?: string | null, updatedAt?: string | null, revision?: { __typename?: 'Revision', id: string, insertedAt?: string | null, updatedAt?: string | null, message?: string | null, sha?: string | null, version: string, git?: { __typename?: 'GitRef', ref: string, folder: string } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null, services?: Array<{ __typename?: 'StageService', id: string, insertedAt?: string | null, updatedAt?: string | null, criteria?: { __typename?: 'PromotionCriteria', id: string, secrets?: Array<string | null> | null, insertedAt?: string | null, updatedAt?: string | null, source?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string, status: ServiceDeploymentStatus, componentStatus?: string | null, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null> | null, status?: { __typename?: 'PipelineStatus', closed?: number | null, pending?: number | null } | null } | null };

export type ApproveGateMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ApproveGateMutation = { __typename?: 'RootMutationType', approveGate?: { __typename?: 'PipelineGate', id: string, name: string, state: GateState, type: GateType, insertedAt?: string | null, updatedAt?: string | null, approver?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, spec?: { __typename?: 'GateSpec', job?: { __typename?: 'JobGateSpec', annotations?: Record<string, unknown> | null, labels?: Record<string, unknown> | null, namespace: string, raw?: string | null, serviceAccount?: string | null, containers?: Array<{ __typename?: 'ContainerSpec', args?: Array<string | null> | null, image: string, env?: Array<{ __typename?: 'ContainerEnv', name: string, value: string } | null> | null, envFrom?: Array<{ __typename?: 'ContainerEnvFrom', configMap: string, secret: string } | null> | null } | null> | null } | null } | null } | null };

export type ProviderCredentialFragment = { __typename?: 'ProviderCredential', id: string, insertedAt?: string | null, kind: string, name: string, namespace: string, updatedAt?: string | null };

export type ClusterProviderFragment = { __typename?: 'ClusterProvider', id: string, name: string, namespace: string, cloud: string, editable?: boolean | null, supportedVersions?: Array<string | null> | null, deletedAt?: string | null, insertedAt?: string | null, updatedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string }, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string } | null, credentials?: Array<{ __typename?: 'ProviderCredential', id: string, insertedAt?: string | null, kind: string, name: string, namespace: string, updatedAt?: string | null } | null> | null };

export type ClusterProvidersQueryVariables = Exact<{ [key: string]: never; }>;


export type ClusterProvidersQuery = { __typename?: 'RootQueryType', clusterProviders?: { __typename?: 'ClusterProviderConnection', edges?: Array<{ __typename?: 'ClusterProviderEdge', node?: { __typename?: 'ClusterProvider', id: string, name: string, namespace: string, cloud: string, editable?: boolean | null, supportedVersions?: Array<string | null> | null, deletedAt?: string | null, insertedAt?: string | null, updatedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string }, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string } | null, credentials?: Array<{ __typename?: 'ProviderCredential', id: string, insertedAt?: string | null, kind: string, name: string, namespace: string, updatedAt?: string | null } | null> | null } | null } | null> | null } | null };

export type CreateClusterProviderMutationVariables = Exact<{
  attributes: ClusterProviderAttributes;
}>;


export type CreateClusterProviderMutation = { __typename?: 'RootMutationType', createClusterProvider?: { __typename?: 'ClusterProvider', id: string, name: string, namespace: string, cloud: string, editable?: boolean | null, supportedVersions?: Array<string | null> | null, deletedAt?: string | null, insertedAt?: string | null, updatedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string }, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string } | null, credentials?: Array<{ __typename?: 'ProviderCredential', id: string, insertedAt?: string | null, kind: string, name: string, namespace: string, updatedAt?: string | null } | null> | null } | null };

export type UpdateClusterProviderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  attributes: ClusterProviderUpdateAttributes;
}>;


export type UpdateClusterProviderMutation = { __typename?: 'RootMutationType', updateClusterProvider?: { __typename?: 'ClusterProvider', id: string, name: string, namespace: string, cloud: string, editable?: boolean | null, supportedVersions?: Array<string | null> | null, deletedAt?: string | null, insertedAt?: string | null, updatedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string }, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string } | null, credentials?: Array<{ __typename?: 'ProviderCredential', id: string, insertedAt?: string | null, kind: string, name: string, namespace: string, updatedAt?: string | null } | null> | null } | null };

export type DeleteClusterProviderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteClusterProviderMutation = { __typename?: 'RootMutationType', deleteClusterProvider?: { __typename?: 'ClusterProvider', id: string, name: string, namespace: string, cloud: string, editable?: boolean | null, supportedVersions?: Array<string | null> | null, deletedAt?: string | null, insertedAt?: string | null, updatedAt?: string | null, git: { __typename?: 'GitRef', folder: string, ref: string }, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, namespace: string } | null, credentials?: Array<{ __typename?: 'ProviderCredential', id: string, insertedAt?: string | null, kind: string, name: string, namespace: string, updatedAt?: string | null } | null> | null } | null };

export type PullRequestFragment = { __typename?: 'PullRequest', id: string, title?: string | null, url: string, labels?: Array<string | null> | null, creator?: string | null, status: PrStatus, insertedAt?: string | null, updatedAt?: string | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, protect?: boolean | null, deletedAt?: string | null } | null, cluster?: { __typename?: 'Cluster', handle?: string | null, self?: boolean | null, protect?: boolean | null, deletedAt?: string | null, version?: string | null, currentVersion?: string | null, id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null };

export type CreatePullRequestMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  branch: Scalars['String']['input'];
  context: Scalars['Json']['input'];
}>;


export type CreatePullRequestMutation = { __typename?: 'RootMutationType', createPullRequest?: { __typename?: 'PullRequest', id: string, title?: string | null, url: string, labels?: Array<string | null> | null, creator?: string | null, status: PrStatus, insertedAt?: string | null, updatedAt?: string | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, protect?: boolean | null, deletedAt?: string | null } | null, cluster?: { __typename?: 'Cluster', handle?: string | null, self?: boolean | null, protect?: boolean | null, deletedAt?: string | null, version?: string | null, currentVersion?: string | null, id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null } | null };

export type PullRequestsQueryVariables = Exact<{
  q?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type PullRequestsQuery = { __typename?: 'RootQueryType', pullRequests?: { __typename?: 'PullRequestConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, hasPreviousPage: boolean, startCursor?: string | null }, edges?: Array<{ __typename?: 'PullRequestEdge', node?: { __typename?: 'PullRequest', id: string, title?: string | null, url: string, labels?: Array<string | null> | null, creator?: string | null, status: PrStatus, insertedAt?: string | null, updatedAt?: string | null, service?: { __typename?: 'ServiceDeployment', id: string, name: string, protect?: boolean | null, deletedAt?: string | null } | null, cluster?: { __typename?: 'Cluster', handle?: string | null, self?: boolean | null, protect?: boolean | null, deletedAt?: string | null, version?: string | null, currentVersion?: string | null, id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', cloud: string } | null } | null } | null } | null> | null } | null };

export type ServiceDeploymentRevisionFragment = { __typename?: 'Revision', id: string, sha?: string | null, version: string, message?: string | null, updatedAt?: string | null, insertedAt?: string | null, helm?: { __typename?: 'HelmSpec', chart?: string | null, version?: string | null } | null, git?: { __typename?: 'GitRef', folder: string, ref: string } | null };

export type ServiceDeploymentsRowFragment = { __typename?: 'ServiceDeployment', id: string, name: string, protect?: boolean | null, promotion?: ServicePromotion | null, message?: string | null, insertedAt?: string | null, updatedAt?: string | null, deletedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, dryRun?: boolean | null, git?: { __typename?: 'GitRef', ref: string, folder: string } | null, helm?: { __typename?: 'HelmSpec', chart?: string | null, version?: string | null, repository?: { __typename?: 'ObjectReference', namespace?: string | null, name?: string | null } | null } | null, cluster?: { __typename?: 'Cluster', id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', name: string, cloud: string } | null } | null, helmRepository?: { __typename?: 'HelmRepository', spec: { __typename?: 'HelmRepositorySpec', url: string }, status?: { __typename?: 'HelmRepositoryStatus', ready?: boolean | null, message?: string | null } | null } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, errors?: Array<{ __typename?: 'ServiceError', message: string, source: string } | null> | null, components?: Array<{ __typename?: 'ServiceComponent', apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', blocking?: boolean | null } | null> | null } | null> | null, globalService?: { __typename?: 'GlobalService', id: string, name: string } | null };

export type ServiceDeploymentDetailsFragment = { __typename?: 'ServiceDeployment', namespace: string, message?: string | null, version: string, id: string, name: string, protect?: boolean | null, promotion?: ServicePromotion | null, insertedAt?: string | null, updatedAt?: string | null, deletedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, dryRun?: boolean | null, helm?: { __typename?: 'HelmSpec', values?: string | null, valuesFiles?: Array<string | null> | null, chart?: string | null, version?: string | null, repository?: { __typename?: 'ObjectReference', namespace?: string | null, name?: string | null } | null } | null, docs?: Array<{ __typename?: 'GitFile', content: string, path: string } | null> | null, components?: Array<{ __typename?: 'ServiceComponent', id: string, name: string, group?: string | null, kind: string, namespace?: string | null, state?: ComponentState | null, synced: boolean, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', blocking?: boolean | null, availableIn?: string | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, version?: string | null, kind: string, name: string, namespace?: string | null, service?: { __typename?: 'ServiceDeployment', git?: { __typename?: 'GitRef', ref: string, folder: string } | null, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, content?: { __typename?: 'ComponentContent', desired?: string | null, live?: string | null } | null } | null> | null, git?: { __typename?: 'GitRef', ref: string, folder: string } | null, cluster?: { __typename?: 'Cluster', id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', name: string, cloud: string } | null } | null, helmRepository?: { __typename?: 'HelmRepository', spec: { __typename?: 'HelmRepositorySpec', url: string }, status?: { __typename?: 'HelmRepositoryStatus', ready?: boolean | null, message?: string | null } | null } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, errors?: Array<{ __typename?: 'ServiceError', message: string, source: string } | null> | null, globalService?: { __typename?: 'GlobalService', id: string, name: string } | null };

export type ServiceDeploymentComponentFragment = { __typename?: 'ServiceComponent', id: string, name: string, group?: string | null, kind: string, namespace?: string | null, state?: ComponentState | null, synced: boolean, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, version?: string | null, kind: string, name: string, namespace?: string | null, service?: { __typename?: 'ServiceDeployment', git?: { __typename?: 'GitRef', ref: string, folder: string } | null, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, content?: { __typename?: 'ComponentContent', desired?: string | null, live?: string | null } | null };

export type ServiceDeploymentRevisionsFragment = { __typename?: 'ServiceDeployment', revision?: { __typename?: 'Revision', id: string, sha?: string | null, version: string, message?: string | null, updatedAt?: string | null, insertedAt?: string | null, helm?: { __typename?: 'HelmSpec', chart?: string | null, version?: string | null } | null, git?: { __typename?: 'GitRef', folder: string, ref: string } | null } | null, revisions?: { __typename?: 'RevisionConnection', edges?: Array<{ __typename?: 'RevisionEdge', node?: { __typename?: 'Revision', id: string, sha?: string | null, version: string, message?: string | null, updatedAt?: string | null, insertedAt?: string | null, helm?: { __typename?: 'HelmSpec', chart?: string | null, version?: string | null } | null, git?: { __typename?: 'GitRef', folder: string, ref: string } | null } | null } | null> | null } | null };

export type ServiceDeploymentsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
  cluster?: InputMaybe<Scalars['String']['input']>;
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<ServiceDeploymentStatus>;
}>;


export type ServiceDeploymentsQuery = { __typename?: 'RootQueryType', serviceDeployments?: { __typename?: 'ServiceDeploymentConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, hasPreviousPage: boolean, startCursor?: string | null }, edges?: Array<{ __typename?: 'ServiceDeploymentEdge', node?: { __typename?: 'ServiceDeployment', id: string, name: string, protect?: boolean | null, promotion?: ServicePromotion | null, message?: string | null, insertedAt?: string | null, updatedAt?: string | null, deletedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, dryRun?: boolean | null, git?: { __typename?: 'GitRef', ref: string, folder: string } | null, helm?: { __typename?: 'HelmSpec', chart?: string | null, version?: string | null, repository?: { __typename?: 'ObjectReference', namespace?: string | null, name?: string | null } | null } | null, cluster?: { __typename?: 'Cluster', id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', name: string, cloud: string } | null } | null, helmRepository?: { __typename?: 'HelmRepository', spec: { __typename?: 'HelmRepositorySpec', url: string }, status?: { __typename?: 'HelmRepositoryStatus', ready?: boolean | null, message?: string | null } | null } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, errors?: Array<{ __typename?: 'ServiceError', message: string, source: string } | null> | null, components?: Array<{ __typename?: 'ServiceComponent', apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', blocking?: boolean | null } | null> | null } | null> | null, globalService?: { __typename?: 'GlobalService', id: string, name: string } | null } | null } | null> | null } | null, serviceStatuses?: Array<{ __typename?: 'ServiceStatusCount', count: number, status: ServiceDeploymentStatus } | null> | null };

export type ServiceDeploymentsTinyQueryVariables = Exact<{ [key: string]: never; }>;


export type ServiceDeploymentsTinyQuery = { __typename?: 'RootQueryType', serviceDeployments?: { __typename?: 'ServiceDeploymentConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, hasPreviousPage: boolean, startCursor?: string | null }, edges?: Array<{ __typename?: 'ServiceDeploymentEdge', node?: { __typename?: 'ServiceDeployment', id: string, name: string, cluster?: { __typename?: 'Cluster', id: string, name: string } | null } | null } | null> | null } | null };

export type ServiceDeploymentQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ServiceDeploymentQuery = { __typename?: 'RootQueryType', serviceDeployment?: { __typename?: 'ServiceDeployment', namespace: string, message?: string | null, version: string, id: string, name: string, protect?: boolean | null, promotion?: ServicePromotion | null, insertedAt?: string | null, updatedAt?: string | null, deletedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, dryRun?: boolean | null, helm?: { __typename?: 'HelmSpec', values?: string | null, valuesFiles?: Array<string | null> | null, chart?: string | null, version?: string | null, repository?: { __typename?: 'ObjectReference', namespace?: string | null, name?: string | null } | null } | null, docs?: Array<{ __typename?: 'GitFile', content: string, path: string } | null> | null, components?: Array<{ __typename?: 'ServiceComponent', id: string, name: string, group?: string | null, kind: string, namespace?: string | null, state?: ComponentState | null, synced: boolean, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', blocking?: boolean | null, availableIn?: string | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, version?: string | null, kind: string, name: string, namespace?: string | null, service?: { __typename?: 'ServiceDeployment', git?: { __typename?: 'GitRef', ref: string, folder: string } | null, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, content?: { __typename?: 'ComponentContent', desired?: string | null, live?: string | null } | null } | null> | null, git?: { __typename?: 'GitRef', ref: string, folder: string } | null, cluster?: { __typename?: 'Cluster', id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', name: string, cloud: string } | null } | null, helmRepository?: { __typename?: 'HelmRepository', spec: { __typename?: 'HelmRepositorySpec', url: string }, status?: { __typename?: 'HelmRepositoryStatus', ready?: boolean | null, message?: string | null } | null } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, errors?: Array<{ __typename?: 'ServiceError', message: string, source: string } | null> | null, globalService?: { __typename?: 'GlobalService', id: string, name: string } | null } | null };

export type ServiceDeploymentComponentsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ServiceDeploymentComponentsQuery = { __typename?: 'RootQueryType', serviceDeployment?: { __typename?: 'ServiceDeployment', id: string, name: string, cluster?: { __typename?: 'Cluster', id: string, name: string, handle?: string | null } | null, components?: Array<{ __typename?: 'ServiceComponent', id: string, name: string, group?: string | null, kind: string, namespace?: string | null, state?: ComponentState | null, synced: boolean, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', availableIn?: string | null, blocking?: boolean | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, version?: string | null, kind: string, name: string, namespace?: string | null, service?: { __typename?: 'ServiceDeployment', git?: { __typename?: 'GitRef', ref: string, folder: string } | null, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, content?: { __typename?: 'ComponentContent', desired?: string | null, live?: string | null } | null } | null> | null } | null };

export type ServiceDeploymentSecretsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ServiceDeploymentSecretsQuery = { __typename?: 'RootQueryType', serviceDeployment?: { __typename?: 'ServiceDeployment', configuration?: Array<{ __typename?: 'ServiceConfiguration', name: string, value: string } | null> | null, helm?: { __typename?: 'HelmSpec', values?: string | null } | null } | null };

export type ServiceDeploymentRevisionsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ServiceDeploymentRevisionsQuery = { __typename?: 'RootQueryType', serviceDeployment?: { __typename?: 'ServiceDeployment', revision?: { __typename?: 'Revision', id: string, sha?: string | null, version: string, message?: string | null, updatedAt?: string | null, insertedAt?: string | null, helm?: { __typename?: 'HelmSpec', chart?: string | null, version?: string | null } | null, git?: { __typename?: 'GitRef', folder: string, ref: string } | null } | null, revisions?: { __typename?: 'RevisionConnection', edges?: Array<{ __typename?: 'RevisionEdge', node?: { __typename?: 'Revision', id: string, sha?: string | null, version: string, message?: string | null, updatedAt?: string | null, insertedAt?: string | null, helm?: { __typename?: 'HelmSpec', chart?: string | null, version?: string | null } | null, git?: { __typename?: 'GitRef', folder: string, ref: string } | null } | null } | null> | null } | null } | null };

export type CreateServiceDeploymentMutationVariables = Exact<{
  attributes: ServiceDeploymentAttributes;
  cluster?: InputMaybe<Scalars['String']['input']>;
  clusterId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CreateServiceDeploymentMutation = { __typename?: 'RootMutationType', createServiceDeployment?: { __typename?: 'ServiceDeployment', id: string, name: string, protect?: boolean | null, promotion?: ServicePromotion | null, message?: string | null, insertedAt?: string | null, updatedAt?: string | null, deletedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, dryRun?: boolean | null, git?: { __typename?: 'GitRef', ref: string, folder: string } | null, helm?: { __typename?: 'HelmSpec', chart?: string | null, version?: string | null, repository?: { __typename?: 'ObjectReference', namespace?: string | null, name?: string | null } | null } | null, cluster?: { __typename?: 'Cluster', id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', name: string, cloud: string } | null } | null, helmRepository?: { __typename?: 'HelmRepository', spec: { __typename?: 'HelmRepositorySpec', url: string }, status?: { __typename?: 'HelmRepositoryStatus', ready?: boolean | null, message?: string | null } | null } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, errors?: Array<{ __typename?: 'ServiceError', message: string, source: string } | null> | null, components?: Array<{ __typename?: 'ServiceComponent', apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', blocking?: boolean | null } | null> | null } | null> | null, globalService?: { __typename?: 'GlobalService', id: string, name: string } | null } | null };

export type UpdateServiceDeploymentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  attributes: ServiceUpdateAttributes;
}>;


export type UpdateServiceDeploymentMutation = { __typename?: 'RootMutationType', updateServiceDeployment?: { __typename?: 'ServiceDeployment', namespace: string, message?: string | null, version: string, id: string, name: string, protect?: boolean | null, promotion?: ServicePromotion | null, insertedAt?: string | null, updatedAt?: string | null, deletedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, dryRun?: boolean | null, helm?: { __typename?: 'HelmSpec', values?: string | null, valuesFiles?: Array<string | null> | null, chart?: string | null, version?: string | null, repository?: { __typename?: 'ObjectReference', namespace?: string | null, name?: string | null } | null } | null, docs?: Array<{ __typename?: 'GitFile', content: string, path: string } | null> | null, components?: Array<{ __typename?: 'ServiceComponent', id: string, name: string, group?: string | null, kind: string, namespace?: string | null, state?: ComponentState | null, synced: boolean, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', blocking?: boolean | null, availableIn?: string | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, version?: string | null, kind: string, name: string, namespace?: string | null, service?: { __typename?: 'ServiceDeployment', git?: { __typename?: 'GitRef', ref: string, folder: string } | null, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, content?: { __typename?: 'ComponentContent', desired?: string | null, live?: string | null } | null } | null> | null, git?: { __typename?: 'GitRef', ref: string, folder: string } | null, cluster?: { __typename?: 'Cluster', id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', name: string, cloud: string } | null } | null, helmRepository?: { __typename?: 'HelmRepository', spec: { __typename?: 'HelmRepositorySpec', url: string }, status?: { __typename?: 'HelmRepositoryStatus', ready?: boolean | null, message?: string | null } | null } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, errors?: Array<{ __typename?: 'ServiceError', message: string, source: string } | null> | null, globalService?: { __typename?: 'GlobalService', id: string, name: string } | null } | null };

export type MergeServiceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  configuration?: InputMaybe<Array<InputMaybe<ConfigAttributes>> | InputMaybe<ConfigAttributes>>;
}>;


export type MergeServiceMutation = { __typename?: 'RootMutationType', mergeService?: { __typename?: 'ServiceDeployment', configuration?: Array<{ __typename?: 'ServiceConfiguration', name: string, value: string } | null> | null } | null };

export type DeleteServiceDeploymentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteServiceDeploymentMutation = { __typename?: 'RootMutationType', deleteServiceDeployment?: { __typename?: 'ServiceDeployment', id: string } | null };

export type DetachServiceDeploymentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetachServiceDeploymentMutation = { __typename?: 'RootMutationType', detachServiceDeployment?: { __typename?: 'ServiceDeployment', id: string } | null };

export type RollbackServiceMutationVariables = Exact<{
  id?: InputMaybe<Scalars['ID']['input']>;
  revisionId: Scalars['ID']['input'];
}>;


export type RollbackServiceMutation = { __typename?: 'RootMutationType', rollbackService?: { __typename?: 'ServiceDeployment', id: string, name: string, protect?: boolean | null, promotion?: ServicePromotion | null, message?: string | null, insertedAt?: string | null, updatedAt?: string | null, deletedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, dryRun?: boolean | null, git?: { __typename?: 'GitRef', ref: string, folder: string } | null, helm?: { __typename?: 'HelmSpec', chart?: string | null, version?: string | null, repository?: { __typename?: 'ObjectReference', namespace?: string | null, name?: string | null } | null } | null, cluster?: { __typename?: 'Cluster', id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', name: string, cloud: string } | null } | null, helmRepository?: { __typename?: 'HelmRepository', spec: { __typename?: 'HelmRepositorySpec', url: string }, status?: { __typename?: 'HelmRepositoryStatus', ready?: boolean | null, message?: string | null } | null } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, errors?: Array<{ __typename?: 'ServiceError', message: string, source: string } | null> | null, components?: Array<{ __typename?: 'ServiceComponent', apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', blocking?: boolean | null } | null> | null } | null> | null, globalService?: { __typename?: 'GlobalService', id: string, name: string } | null } | null };

export type ProceedServiceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  promotion?: InputMaybe<ServicePromotion>;
}>;


export type ProceedServiceMutation = { __typename?: 'RootMutationType', proceed?: { __typename?: 'ServiceDeployment', namespace: string, message?: string | null, version: string, id: string, name: string, protect?: boolean | null, promotion?: ServicePromotion | null, insertedAt?: string | null, updatedAt?: string | null, deletedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, dryRun?: boolean | null, helm?: { __typename?: 'HelmSpec', values?: string | null, valuesFiles?: Array<string | null> | null, chart?: string | null, version?: string | null, repository?: { __typename?: 'ObjectReference', namespace?: string | null, name?: string | null } | null } | null, docs?: Array<{ __typename?: 'GitFile', content: string, path: string } | null> | null, components?: Array<{ __typename?: 'ServiceComponent', id: string, name: string, group?: string | null, kind: string, namespace?: string | null, state?: ComponentState | null, synced: boolean, version?: string | null, apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', blocking?: boolean | null, availableIn?: string | null, deprecatedIn?: string | null, removedIn?: string | null, replacement?: string | null, component?: { __typename?: 'ServiceComponent', group?: string | null, version?: string | null, kind: string, name: string, namespace?: string | null, service?: { __typename?: 'ServiceDeployment', git?: { __typename?: 'GitRef', ref: string, folder: string } | null, repository?: { __typename?: 'GitRepository', httpsPath?: string | null, urlFormat?: string | null } | null } | null } | null } | null> | null, content?: { __typename?: 'ComponentContent', desired?: string | null, live?: string | null } | null } | null> | null, git?: { __typename?: 'GitRef', ref: string, folder: string } | null, cluster?: { __typename?: 'Cluster', id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', name: string, cloud: string } | null } | null, helmRepository?: { __typename?: 'HelmRepository', spec: { __typename?: 'HelmRepositorySpec', url: string }, status?: { __typename?: 'HelmRepositoryStatus', ready?: boolean | null, message?: string | null } | null } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, errors?: Array<{ __typename?: 'ServiceError', message: string, source: string } | null> | null, globalService?: { __typename?: 'GlobalService', id: string, name: string } | null } | null };

export type UpdateRbacMutationVariables = Exact<{
  serviceId?: InputMaybe<Scalars['ID']['input']>;
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  rbac: RbacAttributes;
}>;


export type UpdateRbacMutation = { __typename?: 'RootMutationType', updateRbac?: boolean | null };

export type SelfManageMutationVariables = Exact<{
  values: Scalars['String']['input'];
}>;


export type SelfManageMutation = { __typename?: 'RootMutationType', selfManage?: { __typename?: 'ServiceDeployment', id: string, name: string, protect?: boolean | null, promotion?: ServicePromotion | null, message?: string | null, insertedAt?: string | null, updatedAt?: string | null, deletedAt?: string | null, componentStatus?: string | null, status: ServiceDeploymentStatus, dryRun?: boolean | null, git?: { __typename?: 'GitRef', ref: string, folder: string } | null, helm?: { __typename?: 'HelmSpec', chart?: string | null, version?: string | null, repository?: { __typename?: 'ObjectReference', namespace?: string | null, name?: string | null } | null } | null, cluster?: { __typename?: 'Cluster', id: string, name: string, distro?: ClusterDistro | null, provider?: { __typename?: 'ClusterProvider', name: string, cloud: string } | null } | null, helmRepository?: { __typename?: 'HelmRepository', spec: { __typename?: 'HelmRepositorySpec', url: string }, status?: { __typename?: 'HelmRepositoryStatus', ready?: boolean | null, message?: string | null } | null } | null, repository?: { __typename?: 'GitRepository', id: string, url: string } | null, errors?: Array<{ __typename?: 'ServiceError', message: string, source: string } | null> | null, components?: Array<{ __typename?: 'ServiceComponent', apiDeprecations?: Array<{ __typename?: 'ApiDeprecation', blocking?: boolean | null } | null> | null } | null> | null, globalService?: { __typename?: 'GlobalService', id: string, name: string } | null } | null };

export type ServiceDeploymentBindingsFragment = { __typename?: 'ServiceDeployment', readBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null };

export type ServiceDeploymentBindingsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ServiceDeploymentBindingsQuery = { __typename?: 'RootQueryType', serviceDeployment?: { __typename?: 'ServiceDeployment', id: string, readBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null, writeBindings?: Array<{ __typename?: 'PolicyBinding', id?: string | null, user?: { __typename?: 'User', id: string, name: string, email: string } | null, group?: { __typename?: 'Group', id: string, name: string } | null } | null> | null } | null };

export type ServiceStatusCountFragment = { __typename?: 'ServiceStatusCount', count: number, status: ServiceDeploymentStatus };

export type ServiceStatusesQueryVariables = Exact<{
  clusterId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type ServiceStatusesQuery = { __typename?: 'RootQueryType', serviceStatuses?: Array<{ __typename?: 'ServiceStatusCount', count: number, status: ServiceDeploymentStatus } | null> | null };

export type ComponentTreeFragment = { __typename?: 'ComponentTree', root?: { __typename?: 'KubernetesUnstructured', raw?: Record<string, unknown> | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null, edges?: Array<{ __typename?: 'ResourceEdge', from: string, to: string } | null> | null, certificates?: Array<{ __typename?: 'Certificate', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, configmaps?: Array<{ __typename?: 'ConfigMap', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, cronjobs?: Array<{ __typename?: 'CronJob', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, daemonsets?: Array<{ __typename?: 'DaemonSet', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, deployments?: Array<{ __typename?: 'Deployment', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, ingresses?: Array<{ __typename?: 'Ingress', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, secrets?: Array<{ __typename?: 'Secret', metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, services?: Array<{ __typename?: 'Service', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, statefulsets?: Array<{ __typename?: 'StatefulSet', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null };

export type ComponentTreeQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ComponentTreeQuery = { __typename?: 'RootQueryType', componentTree?: { __typename?: 'ComponentTree', root?: { __typename?: 'KubernetesUnstructured', raw?: Record<string, unknown> | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null, edges?: Array<{ __typename?: 'ResourceEdge', from: string, to: string } | null> | null, certificates?: Array<{ __typename?: 'Certificate', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, configmaps?: Array<{ __typename?: 'ConfigMap', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, cronjobs?: Array<{ __typename?: 'CronJob', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, daemonsets?: Array<{ __typename?: 'DaemonSet', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, deployments?: Array<{ __typename?: 'Deployment', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, ingresses?: Array<{ __typename?: 'Ingress', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, secrets?: Array<{ __typename?: 'Secret', metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, services?: Array<{ __typename?: 'Service', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null, statefulsets?: Array<{ __typename?: 'StatefulSet', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null } } | null> | null } | null };

export type DatabaseTableRowFragment = { __typename?: 'Postgresql', instances?: Array<{ __typename?: 'PostgresInstance', uid: string } | null> | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, creationTimestamp?: string | null }, spec: { __typename?: 'PostgresqlSpec', numberOfInstances?: number | null, databases?: Record<string, unknown> | null, postgresql?: { __typename?: 'PostgresSettings', version?: string | null } | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null, volume?: { __typename?: 'DatabaseVolume', size?: string | null } | null }, status?: { __typename?: 'PostgresqlStatus', clusterStatus?: string | null } | null };

export type RestorePostgresMutationVariables = Exact<{
  clone?: InputMaybe<CloneAttributes>;
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  timestamp: Scalars['DateTime']['input'];
}>;


export type RestorePostgresMutation = { __typename?: 'RootMutationType', restorePostgres?: { __typename?: 'Postgresql', status?: { __typename?: 'PostgresqlStatus', clusterStatus?: string | null } | null } | null };

export type PostgresDatabasesQueryVariables = Exact<{ [key: string]: never; }>;


export type PostgresDatabasesQuery = { __typename?: 'RootQueryType', postgresDatabases?: Array<{ __typename?: 'Postgresql', instances?: Array<{ __typename?: 'PostgresInstance', uid: string } | null> | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, creationTimestamp?: string | null }, spec: { __typename?: 'PostgresqlSpec', numberOfInstances?: number | null, databases?: Record<string, unknown> | null, postgresql?: { __typename?: 'PostgresSettings', version?: string | null } | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null, volume?: { __typename?: 'DatabaseVolume', size?: string | null } | null }, status?: { __typename?: 'PostgresqlStatus', clusterStatus?: string | null } | null } | null> | null, applications?: Array<{ __typename?: 'Application', name: string, spec: { __typename?: 'ApplicationSpec', descriptor: { __typename?: 'ApplicationDescriptor', icons?: Array<string | null> | null } } } | null> | null };

export type PostgresDatabaseQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
}>;


export type PostgresDatabaseQuery = { __typename?: 'RootQueryType', postgresDatabase?: { __typename?: 'Postgresql', instances?: Array<{ __typename?: 'PostgresInstance', uid: string } | null> | null, metadata: { __typename?: 'Metadata', name: string, namespace?: string | null, creationTimestamp?: string | null }, spec: { __typename?: 'PostgresqlSpec', numberOfInstances?: number | null, databases?: Record<string, unknown> | null, postgresql?: { __typename?: 'PostgresSettings', version?: string | null } | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null, volume?: { __typename?: 'DatabaseVolume', size?: string | null } | null }, status?: { __typename?: 'PostgresqlStatus', clusterStatus?: string | null } | null } | null };

export type GroupMemberFragment = { __typename?: 'GroupMember', user?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null };

export type GroupFragment = { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null };

export type GroupsQueryVariables = Exact<{
  q?: InputMaybe<Scalars['String']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type GroupsQuery = { __typename?: 'RootQueryType', groups?: { __typename?: 'GroupConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, hasPreviousPage: boolean, startCursor?: string | null }, edges?: Array<{ __typename?: 'GroupEdge', node?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null } | null> | null } | null };

export type SearchGroupsQueryVariables = Exact<{
  q?: InputMaybe<Scalars['String']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type SearchGroupsQuery = { __typename?: 'RootQueryType', groups?: { __typename?: 'GroupConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, hasPreviousPage: boolean, startCursor?: string | null }, edges?: Array<{ __typename?: 'GroupEdge', node?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null } | null> | null } | null };

export type GroupMembersQueryVariables = Exact<{
  cursor?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
}>;


export type GroupMembersQuery = { __typename?: 'RootQueryType', groupMembers?: { __typename?: 'GroupMemberConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, hasPreviousPage: boolean, startCursor?: string | null }, edges?: Array<{ __typename?: 'GroupMemberEdge', node?: { __typename?: 'GroupMember', user?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null } | null } | null> | null } | null };

export type CreateGroupMemberMutationVariables = Exact<{
  groupId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
}>;


export type CreateGroupMemberMutation = { __typename?: 'RootMutationType', createGroupMember?: { __typename?: 'GroupMember', user?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null } | null };

export type DeleteGroupMemberMutationVariables = Exact<{
  groupId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
}>;


export type DeleteGroupMemberMutation = { __typename?: 'RootMutationType', deleteGroupMember?: { __typename?: 'GroupMember', user?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null } | null };

export type CreateGroupMutationVariables = Exact<{
  attributes: GroupAttributes;
}>;


export type CreateGroupMutation = { __typename?: 'RootMutationType', createGroup?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null };

export type UpdateGroupMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  attributes: GroupAttributes;
}>;


export type UpdateGroupMutation = { __typename?: 'RootMutationType', updateGroup?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null };

export type DeleteGroupMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteGroupMutation = { __typename?: 'RootMutationType', deleteGroup?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null };

export type CanaryStatusFragment = { __typename?: 'CanaryStatus', failedChecks?: number | null, canaryWeight?: number | null, iterations?: number | null, phase?: string | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null };

export type CanarySpecFragment = { __typename?: 'CanarySpec', provider?: string | null, analysis?: { __typename?: 'CanaryAnalysis', interval?: string | null, maxWeight?: number | null, stepWeight?: number | null, stepWeights?: Array<number | null> | null, threshold?: number | null } | null };

export type CanaryFragment = { __typename?: 'Canary', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'CanaryStatus', failedChecks?: number | null, canaryWeight?: number | null, iterations?: number | null, phase?: string | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, spec: { __typename?: 'CanarySpec', provider?: string | null, analysis?: { __typename?: 'CanaryAnalysis', interval?: string | null, maxWeight?: number | null, stepWeight?: number | null, stepWeights?: Array<number | null> | null, threshold?: number | null } | null } };

export type CanaryQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CanaryQuery = { __typename?: 'RootQueryType', canary?: { __typename?: 'Canary', raw: string, canaryDeployment?: { __typename?: 'Deployment', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'DeploymentStatus', availableReplicas?: number | null, replicas?: number | null, unavailableReplicas?: number | null }, spec: { __typename?: 'DeploymentSpec', replicas?: number | null, strategy?: { __typename?: 'DeploymentStrategy', type?: string | null } | null } } | null, primaryDeployment?: { __typename?: 'Deployment', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'DeploymentStatus', availableReplicas?: number | null, replicas?: number | null, unavailableReplicas?: number | null }, spec: { __typename?: 'DeploymentSpec', replicas?: number | null, strategy?: { __typename?: 'DeploymentStrategy', type?: string | null } | null } } | null, ingress?: { __typename?: 'Ingress', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'ServiceStatus', loadBalancer?: { __typename?: 'LoadBalancerStatus', ingress?: Array<{ __typename?: 'LoadBalancerIngressStatus', ip?: string | null, hostname?: string | null } | null> | null } | null }, spec: { __typename?: 'IngressSpec', ingressClassName?: string | null, tls?: Array<{ __typename?: 'IngressTls', hosts?: Array<string | null> | null } | null> | null, rules?: Array<{ __typename?: 'IngressRule', host?: string | null, http?: { __typename?: 'HttpIngressRule', paths?: Array<{ __typename?: 'IngressPath', path?: string | null, backend?: { __typename?: 'IngressBackend', serviceName?: string | null, servicePort?: string | null } | null } | null> | null } | null } | null> | null }, certificates?: Array<{ __typename?: 'Certificate', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'CertificateStatus', renewalTime?: string | null, notBefore?: string | null, notAfter?: string | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, spec: { __typename?: 'CertificateSpec', dnsNames?: Array<string | null> | null, secretName: string, issuerRef?: { __typename?: 'IssuerRef', group?: string | null, kind?: string | null, name?: string | null } | null } } | null> | null } | null, ingressCanary?: { __typename?: 'Ingress', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'ServiceStatus', loadBalancer?: { __typename?: 'LoadBalancerStatus', ingress?: Array<{ __typename?: 'LoadBalancerIngressStatus', ip?: string | null, hostname?: string | null } | null> | null } | null }, spec: { __typename?: 'IngressSpec', ingressClassName?: string | null, tls?: Array<{ __typename?: 'IngressTls', hosts?: Array<string | null> | null } | null> | null, rules?: Array<{ __typename?: 'IngressRule', host?: string | null, http?: { __typename?: 'HttpIngressRule', paths?: Array<{ __typename?: 'IngressPath', path?: string | null, backend?: { __typename?: 'IngressBackend', serviceName?: string | null, servicePort?: string | null } | null } | null> | null } | null } | null> | null }, certificates?: Array<{ __typename?: 'Certificate', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'CertificateStatus', renewalTime?: string | null, notBefore?: string | null, notAfter?: string | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, spec: { __typename?: 'CertificateSpec', dnsNames?: Array<string | null> | null, secretName: string, issuerRef?: { __typename?: 'IssuerRef', group?: string | null, kind?: string | null, name?: string | null } | null } } | null> | null } | null, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'CanaryStatus', failedChecks?: number | null, canaryWeight?: number | null, iterations?: number | null, phase?: string | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, spec: { __typename?: 'CanarySpec', provider?: string | null, analysis?: { __typename?: 'CanaryAnalysis', interval?: string | null, maxWeight?: number | null, stepWeight?: number | null, stepWeights?: Array<number | null> | null, threshold?: number | null } | null } } | null };

export type StatusConditionFragment = { __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string };

export type CertificateStatusFragment = { __typename?: 'CertificateStatus', renewalTime?: string | null, notBefore?: string | null, notAfter?: string | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null };

export type CertificateSpecFragment = { __typename?: 'CertificateSpec', dnsNames?: Array<string | null> | null, secretName: string, issuerRef?: { __typename?: 'IssuerRef', group?: string | null, kind?: string | null, name?: string | null } | null };

export type CertificateFragment = { __typename?: 'Certificate', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'CertificateStatus', renewalTime?: string | null, notBefore?: string | null, notAfter?: string | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, spec: { __typename?: 'CertificateSpec', dnsNames?: Array<string | null> | null, secretName: string, issuerRef?: { __typename?: 'IssuerRef', group?: string | null, kind?: string | null, name?: string | null } | null } };

export type CertificateQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CertificateQuery = { __typename?: 'RootQueryType', certificate?: { __typename?: 'Certificate', raw: string, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'CertificateStatus', renewalTime?: string | null, notBefore?: string | null, notAfter?: string | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, spec: { __typename?: 'CertificateSpec', dnsNames?: Array<string | null> | null, secretName: string, issuerRef?: { __typename?: 'IssuerRef', group?: string | null, kind?: string | null, name?: string | null } | null } } | null };

export type CronJobFragment = { __typename?: 'CronJob', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'CronStatus', lastScheduleTime?: string | null }, spec: { __typename?: 'CronSpec', schedule: string, suspend?: boolean | null, concurrencyPolicy?: string | null } };

export type CronJobQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CronJobQuery = { __typename?: 'RootQueryType', cronJob?: { __typename?: 'CronJob', raw: string, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, jobs?: Array<{ __typename?: 'Job', metadata: { __typename?: 'Metadata', name: string, namespace?: string | null }, status: { __typename?: 'JobStatus', active?: number | null, completionTime?: string | null, succeeded?: number | null, failed?: number | null, startTime?: string | null } } | null> | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'CronStatus', lastScheduleTime?: string | null }, spec: { __typename?: 'CronSpec', schedule: string, suspend?: boolean | null, concurrencyPolicy?: string | null } } | null };

export type DaemonSetStatusFragment = { __typename?: 'DaemonSetStatus', currentNumberScheduled?: number | null, desiredNumberScheduled?: number | null, numberReady?: number | null };

export type DaemonSetSpecFragment = { __typename?: 'DaemonSetSpec', strategy?: { __typename?: 'DeploymentStrategy', type?: string | null } | null };

export type DaemonSetFragment = { __typename?: 'DaemonSet', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'DaemonSetStatus', currentNumberScheduled?: number | null, desiredNumberScheduled?: number | null, numberReady?: number | null }, spec: { __typename?: 'DaemonSetSpec', strategy?: { __typename?: 'DeploymentStrategy', type?: string | null } | null }, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null };

export type DaemonSetQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type DaemonSetQuery = { __typename?: 'RootQueryType', daemonSet?: { __typename?: 'DaemonSet', raw: string, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'DaemonSetStatus', currentNumberScheduled?: number | null, desiredNumberScheduled?: number | null, numberReady?: number | null }, spec: { __typename?: 'DaemonSetSpec', strategy?: { __typename?: 'DeploymentStrategy', type?: string | null } | null }, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null } | null };

export type DeploymentFragment = { __typename?: 'Deployment', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'DeploymentStatus', availableReplicas?: number | null, replicas?: number | null, unavailableReplicas?: number | null }, spec: { __typename?: 'DeploymentSpec', replicas?: number | null, strategy?: { __typename?: 'DeploymentStrategy', type?: string | null } | null } };

export type DeploymentQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type DeploymentQuery = { __typename?: 'RootQueryType', deployment?: { __typename?: 'Deployment', raw: string, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'DeploymentStatus', availableReplicas?: number | null, replicas?: number | null, unavailableReplicas?: number | null }, spec: { __typename?: 'DeploymentSpec', replicas?: number | null, strategy?: { __typename?: 'DeploymentStrategy', type?: string | null } | null } } | null };

export type IngressFragment = { __typename?: 'Ingress', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'ServiceStatus', loadBalancer?: { __typename?: 'LoadBalancerStatus', ingress?: Array<{ __typename?: 'LoadBalancerIngressStatus', ip?: string | null, hostname?: string | null } | null> | null } | null }, spec: { __typename?: 'IngressSpec', ingressClassName?: string | null, tls?: Array<{ __typename?: 'IngressTls', hosts?: Array<string | null> | null } | null> | null, rules?: Array<{ __typename?: 'IngressRule', host?: string | null, http?: { __typename?: 'HttpIngressRule', paths?: Array<{ __typename?: 'IngressPath', path?: string | null, backend?: { __typename?: 'IngressBackend', serviceName?: string | null, servicePort?: string | null } | null } | null> | null } | null } | null> | null }, certificates?: Array<{ __typename?: 'Certificate', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'CertificateStatus', renewalTime?: string | null, notBefore?: string | null, notAfter?: string | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, spec: { __typename?: 'CertificateSpec', dnsNames?: Array<string | null> | null, secretName: string, issuerRef?: { __typename?: 'IssuerRef', group?: string | null, kind?: string | null, name?: string | null } | null } } | null> | null };

export type IngressQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type IngressQuery = { __typename?: 'RootQueryType', ingress?: { __typename?: 'Ingress', raw: string, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'ServiceStatus', loadBalancer?: { __typename?: 'LoadBalancerStatus', ingress?: Array<{ __typename?: 'LoadBalancerIngressStatus', ip?: string | null, hostname?: string | null } | null> | null } | null }, spec: { __typename?: 'IngressSpec', ingressClassName?: string | null, tls?: Array<{ __typename?: 'IngressTls', hosts?: Array<string | null> | null } | null> | null, rules?: Array<{ __typename?: 'IngressRule', host?: string | null, http?: { __typename?: 'HttpIngressRule', paths?: Array<{ __typename?: 'IngressPath', path?: string | null, backend?: { __typename?: 'IngressBackend', serviceName?: string | null, servicePort?: string | null } | null } | null> | null } | null } | null> | null }, certificates?: Array<{ __typename?: 'Certificate', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'CertificateStatus', renewalTime?: string | null, notBefore?: string | null, notAfter?: string | null, conditions?: Array<{ __typename?: 'StatusCondition', message: string, reason: string, status: string, type: string } | null> | null }, spec: { __typename?: 'CertificateSpec', dnsNames?: Array<string | null> | null, secretName: string, issuerRef?: { __typename?: 'IssuerRef', group?: string | null, kind?: string | null, name?: string | null } | null } } | null> | null } | null };

export type JobFragment = { __typename?: 'Job', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'JobStatus', active?: number | null, completionTime?: string | null, succeeded?: number | null, failed?: number | null, startTime?: string | null }, spec: { __typename?: 'JobSpec', backoffLimit?: number | null, parallelism?: number | null, activeDeadlineSeconds?: number | null }, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null };

export type JobQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type JobQuery = { __typename?: 'RootQueryType', job?: { __typename?: 'Job', raw: string, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'JobStatus', active?: number | null, completionTime?: string | null, succeeded?: number | null, failed?: number | null, startTime?: string | null }, spec: { __typename?: 'JobSpec', backoffLimit?: number | null, parallelism?: number | null, activeDeadlineSeconds?: number | null }, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null } | null };

export type MetadataFragment = { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null };

export type EventFragment = { __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null };

export type ResourceSpecFragment = { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null };

export type ResourcesFragment = { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null };

export type ContainerFragment = { __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null };

export type ContainerStatusFragment = { __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null };

export type PodFragment = { __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } };

export type JobStatusFragment = { __typename?: 'JobStatus', active?: number | null, completionTime?: string | null, succeeded?: number | null, failed?: number | null, startTime?: string | null };

export type NodeFragment = { __typename?: 'Node', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'NodeStatus', phase?: string | null, allocatable?: Record<string, unknown> | null, capacity?: Record<string, unknown> | null, conditions?: Array<{ __typename?: 'NodeCondition', type?: string | null, status?: string | null, message?: string | null } | null> | null }, spec: { __typename?: 'NodeSpec', podCidr?: string | null, providerId?: string | null }, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null };

export type NodeMetricFragment = { __typename?: 'NodeMetric', timestamp?: string | null, window?: string | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null };

export type NodeQueryVariables = Exact<{
  name: Scalars['String']['input'];
  clusterId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type NodeQuery = { __typename?: 'RootQueryType', node?: { __typename?: 'Node', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'NodeStatus', phase?: string | null, allocatable?: Record<string, unknown> | null, capacity?: Record<string, unknown> | null, conditions?: Array<{ __typename?: 'NodeCondition', type?: string | null, status?: string | null, message?: string | null } | null> | null }, spec: { __typename?: 'NodeSpec', podCidr?: string | null, providerId?: string | null }, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null } | null };

export type NodeMetricQueryVariables = Exact<{
  name: Scalars['String']['input'];
  clusterId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type NodeMetricQuery = { __typename?: 'RootQueryType', nodeMetric?: { __typename?: 'NodeMetric', timestamp?: string | null, window?: string | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, usage?: { __typename?: 'NodeUsage', cpu?: string | null, memory?: string | null } | null } | null };

export type PodWithEventsFragment = { __typename?: 'Pod', raw: string, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } };

export type PodQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  clusterId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type PodQuery = { __typename?: 'RootQueryType', pod?: { __typename?: 'Pod', raw: string, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null };

export type PodLogsQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  clusterId?: InputMaybe<Scalars['ID']['input']>;
  container: Scalars['String']['input'];
  sinceSeconds: Scalars['Int']['input'];
}>;


export type PodLogsQuery = { __typename?: 'RootQueryType', pod?: { __typename?: 'Pod', logs?: Array<string | null> | null } | null };

export type ServiceFragment = { __typename?: 'Service', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'ServiceStatus', loadBalancer?: { __typename?: 'LoadBalancerStatus', ingress?: Array<{ __typename?: 'LoadBalancerIngressStatus', ip?: string | null } | null> | null } | null }, spec: { __typename?: 'ServiceSpec', type?: string | null, clusterIp?: string | null, ports?: Array<{ __typename?: 'ServicePort', name?: string | null, protocol?: string | null, port?: number | null, targetPort?: string | null } | null> | null } };

export type ServiceQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type ServiceQuery = { __typename?: 'RootQueryType', service?: { __typename?: 'Service', raw: string, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'ServiceStatus', loadBalancer?: { __typename?: 'LoadBalancerStatus', ingress?: Array<{ __typename?: 'LoadBalancerIngressStatus', ip?: string | null } | null> | null } | null }, spec: { __typename?: 'ServiceSpec', type?: string | null, clusterIp?: string | null, ports?: Array<{ __typename?: 'ServicePort', name?: string | null, protocol?: string | null, port?: number | null, targetPort?: string | null } | null> | null } } | null };

export type StatefulSetFragment = { __typename?: 'StatefulSet', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'StatefulSetStatus', replicas?: number | null, currentReplicas?: number | null, readyReplicas?: number | null, updatedReplicas?: number | null }, spec: { __typename?: 'StatefulSetSpec', replicas?: number | null, serviceName?: string | null } };

export type StatefulSetQueryVariables = Exact<{
  name: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type StatefulSetQuery = { __typename?: 'RootQueryType', statefulSet?: { __typename?: 'StatefulSet', raw: string, pods?: Array<{ __typename?: 'Pod', raw: string, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'PodStatus', phase?: string | null, podIp?: string | null, reason?: string | null, containerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, initContainerStatuses?: Array<{ __typename?: 'ContainerStatus', restartCount?: number | null, ready?: boolean | null, name?: string | null, state?: { __typename?: 'ContainerState', running?: { __typename?: 'RunningState', startedAt?: string | null } | null, terminated?: { __typename?: 'TerminatedState', exitCode?: number | null, message?: string | null, reason?: string | null } | null, waiting?: { __typename?: 'WaitingState', message?: string | null, reason?: string | null } | null } | null } | null> | null, conditions?: Array<{ __typename?: 'PodCondition', lastProbeTime?: string | null, lastTransitionTime?: string | null, message?: string | null, reason?: string | null, status?: string | null, type?: string | null } | null> | null }, spec: { __typename?: 'PodSpec', nodeName?: string | null, serviceAccountName?: string | null, containers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null, initContainers?: Array<{ __typename?: 'Container', name?: string | null, image?: string | null, ports?: Array<{ __typename?: 'Port', containerPort?: number | null, protocol?: string | null } | null> | null, resources?: { __typename?: 'Resources', limits?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null, requests?: { __typename?: 'ResourceSpec', cpu?: string | null, memory?: string | null } | null } | null } | null> | null } } | null> | null, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, status: { __typename?: 'StatefulSetStatus', replicas?: number | null, currentReplicas?: number | null, readyReplicas?: number | null, updatedReplicas?: number | null }, spec: { __typename?: 'StatefulSetSpec', replicas?: number | null, serviceName?: string | null } } | null };

export type UnstructuredResourceFragment = { __typename?: 'KubernetesUnstructured', raw?: Record<string, unknown> | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null };

export type UnstructuredResourceQueryVariables = Exact<{
  group?: InputMaybe<Scalars['String']['input']>;
  kind: Scalars['String']['input'];
  name: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
  serviceId: Scalars['ID']['input'];
  version: Scalars['String']['input'];
}>;


export type UnstructuredResourceQuery = { __typename?: 'RootQueryType', unstructuredResource?: { __typename?: 'KubernetesUnstructured', raw?: Record<string, unknown> | null, metadata: { __typename?: 'Metadata', uid?: string | null, name: string, namespace?: string | null, labels?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null, annotations?: Array<{ __typename?: 'LabelPair', name?: string | null, value?: string | null } | null> | null }, events?: Array<{ __typename?: 'Event', action?: string | null, lastTimestamp?: string | null, count?: number | null, message?: string | null, reason?: string | null, type?: string | null } | null> | null } | null };

export type AccessTokenFragment = { __typename?: 'AccessToken', id?: string | null, insertedAt?: string | null, updatedAt?: string | null, token?: string | null, scopes?: Array<{ __typename?: 'AccessTokenScope', api?: string | null, apis?: Array<string> | null, identifier?: string | null, ids?: Array<string> | null } | null> | null };

export type AccessTokenAuditFragment = { __typename?: 'AccessTokenAudit', id?: string | null, city?: string | null, count?: number | null, country?: string | null, insertedAt?: string | null, ip?: string | null, latitude?: string | null, longitude?: string | null, timestamp?: string | null, updatedAt?: string | null };

export type AccessTokensQueryVariables = Exact<{ [key: string]: never; }>;


export type AccessTokensQuery = { __typename?: 'RootQueryType', accessTokens?: { __typename?: 'AccessTokenConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, hasPreviousPage: boolean, startCursor?: string | null }, edges?: Array<{ __typename?: 'AccessTokenEdge', node?: { __typename?: 'AccessToken', id?: string | null, insertedAt?: string | null, updatedAt?: string | null, token?: string | null, scopes?: Array<{ __typename?: 'AccessTokenScope', api?: string | null, apis?: Array<string> | null, identifier?: string | null, ids?: Array<string> | null } | null> | null } | null } | null> | null } | null };

export type TokenAuditsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type TokenAuditsQuery = { __typename?: 'RootQueryType', accessToken?: { __typename?: 'AccessToken', id?: string | null, audits?: { __typename?: 'AccessTokenAuditConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, hasPreviousPage: boolean, startCursor?: string | null }, edges?: Array<{ __typename?: 'AccessTokenAuditEdge', node?: { __typename?: 'AccessTokenAudit', id?: string | null, city?: string | null, count?: number | null, country?: string | null, insertedAt?: string | null, ip?: string | null, latitude?: string | null, longitude?: string | null, timestamp?: string | null, updatedAt?: string | null } | null } | null> | null } | null } | null };

export type CreateAccessTokenMutationVariables = Exact<{
  scopes?: InputMaybe<Array<InputMaybe<ScopeAttributes>> | InputMaybe<ScopeAttributes>>;
}>;


export type CreateAccessTokenMutation = { __typename?: 'RootMutationType', createAccessToken?: { __typename?: 'AccessToken', id?: string | null, insertedAt?: string | null, updatedAt?: string | null, token?: string | null, scopes?: Array<{ __typename?: 'AccessTokenScope', api?: string | null, apis?: Array<string> | null, identifier?: string | null, ids?: Array<string> | null } | null> | null } | null };

export type DeleteAccessTokenMutationVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type DeleteAccessTokenMutation = { __typename?: 'RootMutationType', deleteAccessToken?: { __typename?: 'AccessToken', id?: string | null, insertedAt?: string | null, updatedAt?: string | null, token?: string | null, scopes?: Array<{ __typename?: 'AccessTokenScope', api?: string | null, apis?: Array<string> | null, identifier?: string | null, ids?: Array<string> | null } | null> | null } | null };

export type UserFragment = { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null };

export type InviteFragment = { __typename?: 'Invite', secureId: string };

export type RoleBindingFragment = { __typename?: 'RoleBinding', id: string, user?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null };

export type RoleFragment = { __typename?: 'Role', id: string, name: string, description?: string | null, repositories?: Array<string | null> | null, permissions?: Array<Permission | null> | null, roleBindings?: Array<{ __typename?: 'RoleBinding', id: string, user?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null } | null> | null };

export type AvailableFeaturesFragment = { __typename?: 'AvailableFeatures', audits?: boolean | null, cd?: boolean | null, databaseManagement?: boolean | null, userManagement?: boolean | null, vpn?: boolean | null };

export type ManifestFragment = { __typename?: 'PluralManifest', cluster?: string | null, bucketPrefix?: string | null, network?: { __typename?: 'ManifestNetwork', pluralDns?: boolean | null, subdomain?: string | null } | null };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'RootQueryType', externalToken?: string | null, me?: { __typename?: 'User', unreadNotifications?: number | null, id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, boundRoles?: Array<{ __typename?: 'Role', id: string, name: string, description?: string | null, repositories?: Array<string | null> | null, permissions?: Array<Permission | null> | null, roleBindings?: Array<{ __typename?: 'RoleBinding', id: string, user?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, group?: { __typename?: 'Group', id: string, name: string, description?: string | null, insertedAt?: string | null, updatedAt?: string | null } | null } | null> | null } | null> | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null, clusterInfo?: { __typename?: 'ClusterInfo', version?: string | null, platform?: string | null, gitCommit?: string | null } | null, configuration?: { __typename?: 'ConsoleConfiguration', vpnEnabled?: boolean | null, gitCommit?: string | null, isDemoProject?: boolean | null, isSandbox?: boolean | null, pluralLogin?: boolean | null, byok?: boolean | null, manifest?: { __typename?: 'PluralManifest', cluster?: string | null, bucketPrefix?: string | null, network?: { __typename?: 'ManifestNetwork', pluralDns?: boolean | null, subdomain?: string | null } | null } | null, gitStatus?: { __typename?: 'GitStatus', cloned?: boolean | null, output?: string | null } | null, features?: { __typename?: 'AvailableFeatures', audits?: boolean | null, cd?: boolean | null, databaseManagement?: boolean | null, userManagement?: boolean | null, vpn?: boolean | null } | null } | null };

export type UsersQueryVariables = Exact<{
  q?: InputMaybe<Scalars['String']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type UsersQuery = { __typename?: 'RootQueryType', users?: { __typename?: 'UserConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, hasPreviousPage: boolean, startCursor?: string | null }, edges?: Array<{ __typename?: 'UserEdge', node?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null } | null> | null } | null };

export type SearchUsersQueryVariables = Exact<{
  q?: InputMaybe<Scalars['String']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type SearchUsersQuery = { __typename?: 'RootQueryType', users?: { __typename?: 'UserConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, hasPreviousPage: boolean, startCursor?: string | null }, edges?: Array<{ __typename?: 'UserEdge', node?: { __typename?: 'User', id: string, pluralId?: string | null, name: string, email: string, profile?: string | null, backgroundColor?: string | null, readTimestamp?: string | null, roles?: { __typename?: 'UserRoles', admin?: boolean | null } | null } | null } | null> | null } | null };

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
  uid
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
export const ConfigurationFragmentDoc = gql`
    fragment Configuration on Configuration {
  helm
  terraform
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
export const PageInfoFragmentDoc = gql`
    fragment PageInfo on PageInfo {
  hasNextPage
  endCursor
  hasPreviousPage
  startCursor
}
    `;
export const AddOnConfigConditionFragmentDoc = gql`
    fragment AddOnConfigCondition on AddOnConfigCondition {
  field
  operation
  value
}
    `;
export const AddOnConfigurationFragmentDoc = gql`
    fragment AddOnConfiguration on AddOnConfiguration {
  documentation
  name
  type
  values
  condition {
    ...AddOnConfigCondition
  }
}
    ${AddOnConfigConditionFragmentDoc}`;
export const ClusterAddOnFragmentDoc = gql`
    fragment ClusterAddOn on ClusterAddOn {
  global
  icon
  name
  version
  configuration {
    ...AddOnConfiguration
  }
}
    ${AddOnConfigurationFragmentDoc}`;
export const AddonVersionFragmentDoc = gql`
    fragment AddonVersion on AddonVersion {
  version
  kube
  incompatibilities {
    version
    name
  }
  requirements {
    version
    name
  }
}
    `;
export const AddonVersionBlockingFragmentDoc = gql`
    fragment AddonVersionBlocking on AddonVersion {
  blocking(kubeVersion: $kubeVersion)
}
    `;
export const RuntimeServiceFragmentDoc = gql`
    fragment RuntimeService on RuntimeService {
  id
  name
  version
  addon {
    icon
    versions {
      ...AddonVersion
    }
    readme
  }
  service {
    git {
      ref
      folder
    }
    repository {
      httpsPath
      urlFormat
    }
    helm {
      version
    }
  }
  addonVersion {
    ...AddonVersionBlocking @include(if: $hasKubeVersion)
    ...AddonVersion
  }
}
    ${AddonVersionFragmentDoc}
${AddonVersionBlockingFragmentDoc}`;
export const ApiDeprecationFragmentDoc = gql`
    fragment ApiDeprecation on ApiDeprecation {
  availableIn
  blocking
  component {
    group
    version
    kind
    name
    namespace
    service {
      git {
        ref
        folder
      }
      repository {
        httpsPath
        urlFormat
      }
    }
  }
  deprecatedIn
  removedIn
  replacement
}
    `;
export const ClusterTinyFragmentDoc = gql`
    fragment ClusterTiny on Cluster {
  id
  name
  provider {
    cloud
  }
  distro
}
    `;
export const ClusterBasicFragmentDoc = gql`
    fragment ClusterBasic on Cluster {
  ...ClusterTiny
  handle
  self
  protect
  deletedAt
  version
  currentVersion
}
    ${ClusterTinyFragmentDoc}`;
export const ScmConnectionFragmentDoc = gql`
    fragment ScmConnection on ScmConnection {
  id
  name
  insertedAt
  updatedAt
  type
  username
  baseUrl
  apiUrl
}
    `;
export const PolicyBindingFragmentDoc = gql`
    fragment PolicyBinding on PolicyBinding {
  id
  user {
    id
    name
    email
  }
  group {
    id
    name
  }
}
    `;
export const PrAutomationFragmentDoc = gql`
    fragment PrAutomation on PrAutomation {
  id
  name
  documentation
  addon
  cluster {
    ...ClusterBasic
  }
  service {
    id
    name
  }
  repository {
    url
    refs
  }
  role
  documentation
  connection {
    ...ScmConnection
  }
  createBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
  configuration {
    condition {
      field
      operation
      value
    }
    default
    documentation
    longform
    name
    optional
    placeholder
    type
  }
}
    ${ClusterBasicFragmentDoc}
${ScmConnectionFragmentDoc}
${PolicyBindingFragmentDoc}`;
export const ClusterConditionFragmentDoc = gql`
    fragment ClusterCondition on ClusterCondition {
  lastTransitionTime
  message
  reason
  severity
  status
  type
}
    `;
export const ClustersRowFragmentDoc = gql`
    fragment ClustersRow on Cluster {
  apiDeprecations {
    ...ApiDeprecation
  }
  currentVersion
  id
  self
  protect
  name
  handle
  distro
  nodes {
    status {
      capacity
    }
  }
  nodeMetrics {
    usage {
      cpu
      memory
    }
  }
  installed
  pingedAt
  deletedAt
  provider {
    id
    cloud
    name
    namespace
    supportedVersions
  }
  prAutomations {
    ...PrAutomation
  }
  self
  service {
    id
    repository {
      url
    }
  }
  status {
    conditions {
      ...ClusterCondition
    }
  }
  version
  tags {
    name
    value
  }
  distro
}
    ${ApiDeprecationFragmentDoc}
${PrAutomationFragmentDoc}
${ClusterConditionFragmentDoc}`;
export const TaintFragmentDoc = gql`
    fragment Taint on Taint {
  effect
  key
  value
}
    `;
export const NodePoolFragmentDoc = gql`
    fragment NodePool on NodePool {
  id
  name
  minSize
  maxSize
  instanceType
  spot
  labels
  taints {
    ...Taint
  }
}
    ${TaintFragmentDoc}`;
export const ClusterNodeFragmentDoc = gql`
    fragment ClusterNode on Node {
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
export const ClusterFragmentDoc = gql`
    fragment Cluster on Cluster {
  ...ClustersRow
  apiDeprecations {
    ...ApiDeprecation
  }
  currentVersion
  id
  name
  handle
  nodePools {
    ...NodePool
  }
  nodes {
    ...ClusterNode
  }
  nodeMetrics {
    ...NodeMetric
  }
  pingedAt
  provider {
    id
    cloud
    name
    namespace
    supportedVersions
  }
  self
  service {
    id
    name
    repository {
      url
    }
  }
  status {
    conditions {
      ...ClusterCondition
    }
    controlPlaneReady
    failureMessage
    failureReason
    phase
  }
  version
  tags {
    name
    value
  }
}
    ${ClustersRowFragmentDoc}
${ApiDeprecationFragmentDoc}
${NodePoolFragmentDoc}
${ClusterNodeFragmentDoc}
${NodeMetricFragmentDoc}
${ClusterConditionFragmentDoc}`;
export const ClusterBindingsFragmentDoc = gql`
    fragment ClusterBindings on Cluster {
  readBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
}
    ${PolicyBindingFragmentDoc}`;
export const ClusterStatusInfoFragmentDoc = gql`
    fragment ClusterStatusInfo on ClusterStatusInfo {
  count
  healthy
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
export const HelmRepositoryFragmentDoc = gql`
    fragment HelmRepository on HelmRepository {
  metadata {
    namespace
    name
  }
  spec {
    url
    type
    provider
  }
  status {
    ready
    message
  }
}
    `;
export const HelmChartVersionFragmentDoc = gql`
    fragment HelmChartVersion on HelmChartVersion {
  name
  appVersion
  version
  digest
}
    `;
export const GlobalServiceFragmentDoc = gql`
    fragment GlobalService on GlobalService {
  id
  name
  provider {
    id
    name
    cloud
    namespace
  }
  service {
    id
    name
  }
  tags {
    name
    value
  }
  insertedAt
  updatedAt
}
    `;
export const HttpConnectionFragmentDoc = gql`
    fragment HttpConnection on HttpConnection {
  host
  user
  password
}
    `;
export const GitRepositoryFragmentDoc = gql`
    fragment GitRepository on GitRepository {
  id
  url
  health
  authMethod
  editable
  error
  insertedAt
  pulledAt
  updatedAt
  urlFormat
  httpsPath
}
    `;
export const DeploymentSettingsFragmentDoc = gql`
    fragment DeploymentSettings on DeploymentSettings {
  id
  name
  enabled
  selfManaged
  insertedAt
  updatedAt
  agentHelmValues
  lokiConnection {
    ...HttpConnection
  }
  prometheusConnection {
    ...HttpConnection
  }
  artifactRepository {
    ...GitRepository
  }
  deployerRepository {
    ...GitRepository
  }
  createBindings {
    ...PolicyBinding
  }
  readBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
  gitBindings {
    ...PolicyBinding
  }
}
    ${HttpConnectionFragmentDoc}
${GitRepositoryFragmentDoc}
${PolicyBindingFragmentDoc}`;
export const UserFragmentDoc = gql`
    fragment User on User {
  id
  pluralId
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
export const ContainerSpecFragmentDoc = gql`
    fragment ContainerSpec on ContainerSpec {
  args
  env {
    name
    value
  }
  envFrom {
    configMap
    secret
  }
  image
}
    `;
export const JobGateSpecFragmentDoc = gql`
    fragment JobGateSpec on JobGateSpec {
  annotations
  containers {
    ...ContainerSpec
  }
  labels
  namespace
  raw
  serviceAccount
}
    ${ContainerSpecFragmentDoc}`;
export const PipelineGateFragmentDoc = gql`
    fragment PipelineGate on PipelineGate {
  id
  name
  state
  type
  approver {
    ...User
  }
  spec {
    job {
      ...JobGateSpec
    }
  }
  insertedAt
  updatedAt
}
    ${UserFragmentDoc}
${JobGateSpecFragmentDoc}`;
export const RevisionFragmentDoc = gql`
    fragment Revision on Revision {
  id
  git {
    ref
    folder
  }
  insertedAt
  updatedAt
  message
  sha
  version
}
    `;
export const PipelineServiceDeploymentFragmentDoc = gql`
    fragment PipelineServiceDeployment on ServiceDeployment {
  id
  name
  namespace
  cluster {
    id
    name
  }
  status
  componentStatus
}
    `;
export const PromotionServiceFragmentDoc = gql`
    fragment PromotionService on PromotionService {
  id
  revision {
    ...Revision
  }
  service {
    ...PipelineServiceDeployment
  }
  insertedAt
  updatedAt
}
    ${RevisionFragmentDoc}
${PipelineServiceDeploymentFragmentDoc}`;
export const PipelinePromotionFragmentDoc = gql`
    fragment PipelinePromotion on PipelinePromotion {
  id
  services {
    ...PromotionService
  }
  insertedAt
  updatedAt
  promotedAt
  revisedAt
}
    ${PromotionServiceFragmentDoc}`;
export const PromotionCriteriaFragmentDoc = gql`
    fragment PromotionCriteria on PromotionCriteria {
  id
  secrets
  source {
    ...PipelineServiceDeployment
  }
  insertedAt
  updatedAt
}
    ${PipelineServiceDeploymentFragmentDoc}`;
export const StageServiceFragmentDoc = gql`
    fragment StageService on StageService {
  id
  criteria {
    ...PromotionCriteria
  }
  insertedAt
  updatedAt
  service {
    ...PipelineServiceDeployment
  }
}
    ${PromotionCriteriaFragmentDoc}
${PipelineServiceDeploymentFragmentDoc}`;
export const PipelineStageFragmentDoc = gql`
    fragment PipelineStage on PipelineStage {
  id
  name
  insertedAt
  updatedAt
  promotion {
    ...PipelinePromotion
  }
  services {
    ...StageService
  }
}
    ${PipelinePromotionFragmentDoc}
${StageServiceFragmentDoc}`;
export const PipelineStageEdgeFragmentDoc = gql`
    fragment PipelineStageEdge on PipelineStageEdge {
  id
  insertedAt
  promotedAt
  updatedAt
  gates {
    ...PipelineGate
  }
  from {
    ...PipelineStage
  }
  to {
    ...PipelineStage
  }
}
    ${PipelineGateFragmentDoc}
${PipelineStageFragmentDoc}`;
export const PipelineStatusFragmentDoc = gql`
    fragment PipelineStatus on PipelineStatus {
  closed
  pending
}
    `;
export const PipelineFragmentDoc = gql`
    fragment Pipeline on Pipeline {
  id
  name
  insertedAt
  updatedAt
  edges {
    ...PipelineStageEdge
  }
  stages {
    ...PipelineStage
  }
  status {
    ...PipelineStatus
  }
}
    ${PipelineStageEdgeFragmentDoc}
${PipelineStageFragmentDoc}
${PipelineStatusFragmentDoc}`;
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
export const ResourceSpecFragmentDoc = gql`
    fragment ResourceSpec on ResourceSpec {
  cpu
  memory
}
    `;
export const ResourcesFragmentDoc = gql`
    fragment Resources on Resources {
  limits {
    ...ResourceSpec
  }
  requests {
    ...ResourceSpec
  }
}
    ${ResourceSpecFragmentDoc}`;
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
export const PipelineGateJobFragmentDoc = gql`
    fragment PipelineGateJob on Job {
  events {
    action
    count
    eventTime
    lastTimestamp
    message
    reason
    type
  }
  metadata {
    ...Metadata
  }
  pods {
    ...Pod
  }
  raw
  spec {
    activeDeadlineSeconds
    backoffLimit
    parallelism
  }
  status {
    active
    completionTime
    failed
    startTime
    succeeded
  }
}
    ${MetadataFragmentDoc}
${PodFragmentDoc}`;
export const ProviderCredentialFragmentDoc = gql`
    fragment ProviderCredential on ProviderCredential {
  id
  insertedAt
  kind
  name
  namespace
  updatedAt
}
    `;
export const ClusterProviderFragmentDoc = gql`
    fragment ClusterProvider on ClusterProvider {
  id
  name
  namespace
  cloud
  editable
  git {
    folder
    ref
  }
  repository {
    id
    url
  }
  service {
    id
    name
    namespace
  }
  credentials {
    ...ProviderCredential
  }
  supportedVersions
  deletedAt
  insertedAt
  updatedAt
}
    ${ProviderCredentialFragmentDoc}`;
export const PullRequestFragmentDoc = gql`
    fragment PullRequest on PullRequest {
  id
  service {
    id
    name
    protect
    deletedAt
  }
  cluster {
    ...ClusterBasic
  }
  title
  url
  labels
  creator
  status
  insertedAt
  updatedAt
}
    ${ClusterBasicFragmentDoc}`;
export const ServiceDeploymentsRowFragmentDoc = gql`
    fragment ServiceDeploymentsRow on ServiceDeployment {
  id
  name
  protect
  promotion
  message
  git {
    ref
    folder
  }
  helm {
    chart
    version
    repository {
      namespace
      name
    }
  }
  cluster {
    id
    name
    provider {
      name
      cloud
    }
    distro
  }
  helmRepository {
    spec {
      url
    }
    status {
      ready
      message
    }
  }
  repository {
    id
    url
  }
  insertedAt
  updatedAt
  deletedAt
  componentStatus
  status
  errors {
    message
    source
  }
  components {
    apiDeprecations {
      blocking
    }
  }
  globalService {
    id
    name
  }
  dryRun
}
    `;
export const ServiceDeploymentComponentFragmentDoc = gql`
    fragment ServiceDeploymentComponent on ServiceComponent {
  id
  name
  group
  kind
  namespace
  state
  synced
  version
  apiDeprecations {
    ...ApiDeprecation
  }
  content {
    desired
    live
  }
}
    ${ApiDeprecationFragmentDoc}`;
export const ServiceDeploymentDetailsFragmentDoc = gql`
    fragment ServiceDeploymentDetails on ServiceDeployment {
  ...ServiceDeploymentsRow
  namespace
  message
  version
  helm {
    values
    valuesFiles
  }
  docs {
    content
    path
  }
  components {
    ...ServiceDeploymentComponent
  }
}
    ${ServiceDeploymentsRowFragmentDoc}
${ServiceDeploymentComponentFragmentDoc}`;
export const ServiceDeploymentRevisionFragmentDoc = gql`
    fragment ServiceDeploymentRevision on Revision {
  id
  sha
  version
  message
  updatedAt
  insertedAt
  helm {
    chart
    version
  }
  git {
    folder
    ref
  }
}
    `;
export const ServiceDeploymentRevisionsFragmentDoc = gql`
    fragment ServiceDeploymentRevisions on ServiceDeployment {
  revision {
    ...ServiceDeploymentRevision
  }
  revisions(first: 500) {
    edges {
      node {
        ...ServiceDeploymentRevision
      }
    }
  }
}
    ${ServiceDeploymentRevisionFragmentDoc}`;
export const ServiceDeploymentBindingsFragmentDoc = gql`
    fragment ServiceDeploymentBindings on ServiceDeployment {
  readBindings {
    ...PolicyBinding
  }
  writeBindings {
    ...PolicyBinding
  }
}
    ${PolicyBindingFragmentDoc}`;
export const ServiceStatusCountFragmentDoc = gql`
    fragment ServiceStatusCount on ServiceStatusCount {
  count
  status
}
    `;
export const ComponentTreeFragmentDoc = gql`
    fragment ComponentTree on ComponentTree {
  root {
    metadata {
      ...Metadata
    }
    raw
  }
  edges {
    from
    to
  }
  certificates {
    metadata {
      ...Metadata
    }
    raw
  }
  configmaps {
    metadata {
      ...Metadata
    }
    raw
  }
  cronjobs {
    metadata {
      ...Metadata
    }
    raw
  }
  daemonsets {
    metadata {
      ...Metadata
    }
    raw
  }
  deployments {
    metadata {
      ...Metadata
    }
    raw
  }
  ingresses {
    metadata {
      ...Metadata
    }
    raw
  }
  secrets {
    metadata {
      ...Metadata
    }
  }
  services {
    metadata {
      ...Metadata
    }
    raw
  }
  statefulsets {
    metadata {
      ...Metadata
    }
    raw
  }
}
    ${MetadataFragmentDoc}`;
export const DatabaseTableRowFragmentDoc = gql`
    fragment DatabaseTableRow on Postgresql {
  instances {
    uid
  }
  metadata {
    name
    namespace
    creationTimestamp
  }
  spec {
    numberOfInstances
    databases
    postgresql {
      version
    }
    resources {
      ...Resources
    }
    databases
    volume {
      size
    }
  }
  status {
    clusterStatus
  }
}
    ${ResourcesFragmentDoc}`;
export const GroupFragmentDoc = gql`
    fragment Group on Group {
  id
  name
  description
  insertedAt
  updatedAt
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
export const StatusConditionFragmentDoc = gql`
    fragment StatusCondition on StatusCondition {
  message
  reason
  status
  type
}
    `;
export const CanaryStatusFragmentDoc = gql`
    fragment CanaryStatus on CanaryStatus {
  failedChecks
  canaryWeight
  iterations
  phase
  conditions {
    ...StatusCondition
  }
}
    ${StatusConditionFragmentDoc}`;
export const CanarySpecFragmentDoc = gql`
    fragment CanarySpec on CanarySpec {
  provider
  analysis {
    interval
    maxWeight
    stepWeight
    stepWeights
    threshold
  }
}
    `;
export const CanaryFragmentDoc = gql`
    fragment Canary on Canary {
  metadata {
    ...Metadata
  }
  status {
    ...CanaryStatus
  }
  spec {
    ...CanarySpec
  }
  raw
}
    ${MetadataFragmentDoc}
${CanaryStatusFragmentDoc}
${CanarySpecFragmentDoc}`;
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
export const DaemonSetStatusFragmentDoc = gql`
    fragment DaemonSetStatus on DaemonSetStatus {
  currentNumberScheduled
  desiredNumberScheduled
  numberReady
}
    `;
export const DaemonSetSpecFragmentDoc = gql`
    fragment DaemonSetSpec on DaemonSetSpec {
  strategy {
    type
  }
}
    `;
export const DaemonSetFragmentDoc = gql`
    fragment DaemonSet on DaemonSet {
  metadata {
    ...Metadata
  }
  status {
    ...DaemonSetStatus
  }
  spec {
    ...DaemonSetSpec
  }
  pods {
    ...Pod
  }
  raw
}
    ${MetadataFragmentDoc}
${DaemonSetStatusFragmentDoc}
${DaemonSetSpecFragmentDoc}
${PodFragmentDoc}`;
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
export const CertificateStatusFragmentDoc = gql`
    fragment CertificateStatus on CertificateStatus {
  renewalTime
  notBefore
  notAfter
  conditions {
    ...StatusCondition
  }
}
    ${StatusConditionFragmentDoc}`;
export const CertificateSpecFragmentDoc = gql`
    fragment CertificateSpec on CertificateSpec {
  dnsNames
  secretName
  issuerRef {
    group
    kind
    name
  }
}
    `;
export const CertificateFragmentDoc = gql`
    fragment Certificate on Certificate {
  metadata {
    ...Metadata
  }
  status {
    ...CertificateStatus
  }
  spec {
    ...CertificateSpec
  }
  raw
}
    ${MetadataFragmentDoc}
${CertificateStatusFragmentDoc}
${CertificateSpecFragmentDoc}`;
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
    ingressClassName
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
  certificates {
    ...Certificate
  }
  raw
}
    ${MetadataFragmentDoc}
${CertificateFragmentDoc}`;
export const JobStatusFragmentDoc = gql`
    fragment JobStatus on JobStatus {
  active
  completionTime
  succeeded
  failed
  startTime
}
    `;
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
  raw
  pods {
    ...Pod
  }
  events {
    ...Event
  }
}
    ${MetadataFragmentDoc}
${PodFragmentDoc}
${EventFragmentDoc}`;
export const PodWithEventsFragmentDoc = gql`
    fragment PodWithEvents on Pod {
  ...Pod
  events {
    ...Event
  }
}
    ${PodFragmentDoc}
${EventFragmentDoc}`;
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
export const UnstructuredResourceFragmentDoc = gql`
    fragment UnstructuredResource on KubernetesUnstructured {
  raw
  metadata {
    ...Metadata
  }
  events {
    ...Event
  }
}
    ${MetadataFragmentDoc}
${EventFragmentDoc}`;
export const AccessTokenFragmentDoc = gql`
    fragment AccessToken on AccessToken {
  id
  insertedAt
  updatedAt
  token
  scopes {
    api
    apis
    identifier
    ids
  }
}
    `;
export const AccessTokenAuditFragmentDoc = gql`
    fragment AccessTokenAudit on AccessTokenAudit {
  id
  city
  count
  country
  insertedAt
  ip
  latitude
  longitude
  timestamp
  updatedAt
}
    `;
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
export const AvailableFeaturesFragmentDoc = gql`
    fragment AvailableFeatures on AvailableFeatures {
  audits
  cd
  databaseManagement
  userManagement
  vpn
}
    `;
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
export function useAppSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<AppQuery, AppQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AppQuery, AppQueryVariables>(AppDocument, options);
        }
export type AppQueryHookResult = ReturnType<typeof useAppQuery>;
export type AppLazyQueryHookResult = ReturnType<typeof useAppLazyQuery>;
export type AppSuspenseQueryHookResult = ReturnType<typeof useAppSuspenseQuery>;
export type AppQueryResult = Apollo.QueryResult<AppQuery, AppQueryVariables>;
export const AppInfoDocument = gql`
    query AppInfo($name: String!) {
  application(name: $name) {
    ...Application
    info
  }
}
    ${ApplicationFragmentDoc}`;

/**
 * __useAppInfoQuery__
 *
 * To run a query within a React component, call `useAppInfoQuery` and pass it any options that fit your needs.
 * When your component renders, `useAppInfoQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAppInfoQuery({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useAppInfoQuery(baseOptions: Apollo.QueryHookOptions<AppInfoQuery, AppInfoQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AppInfoQuery, AppInfoQueryVariables>(AppInfoDocument, options);
      }
export function useAppInfoLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AppInfoQuery, AppInfoQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AppInfoQuery, AppInfoQueryVariables>(AppInfoDocument, options);
        }
export function useAppInfoSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<AppInfoQuery, AppInfoQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AppInfoQuery, AppInfoQueryVariables>(AppInfoDocument, options);
        }
export type AppInfoQueryHookResult = ReturnType<typeof useAppInfoQuery>;
export type AppInfoLazyQueryHookResult = ReturnType<typeof useAppInfoLazyQuery>;
export type AppInfoSuspenseQueryHookResult = ReturnType<typeof useAppInfoSuspenseQuery>;
export type AppInfoQueryResult = Apollo.QueryResult<AppInfoQuery, AppInfoQueryVariables>;
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
export function useRepositorySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<RepositoryQuery, RepositoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<RepositoryQuery, RepositoryQueryVariables>(RepositoryDocument, options);
        }
export type RepositoryQueryHookResult = ReturnType<typeof useRepositoryQuery>;
export type RepositoryLazyQueryHookResult = ReturnType<typeof useRepositoryLazyQuery>;
export type RepositorySuspenseQueryHookResult = ReturnType<typeof useRepositorySuspenseQuery>;
export type RepositoryQueryResult = Apollo.QueryResult<RepositoryQuery, RepositoryQueryVariables>;
export const PrAutomationsDocument = gql`
    query PrAutomations($first: Int = 100, $after: String) {
  prAutomations(first: $first, after: $after) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...PrAutomation
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${PrAutomationFragmentDoc}`;

/**
 * __usePrAutomationsQuery__
 *
 * To run a query within a React component, call `usePrAutomationsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePrAutomationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePrAutomationsQuery({
 *   variables: {
 *      first: // value for 'first'
 *      after: // value for 'after'
 *   },
 * });
 */
export function usePrAutomationsQuery(baseOptions?: Apollo.QueryHookOptions<PrAutomationsQuery, PrAutomationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PrAutomationsQuery, PrAutomationsQueryVariables>(PrAutomationsDocument, options);
      }
export function usePrAutomationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PrAutomationsQuery, PrAutomationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PrAutomationsQuery, PrAutomationsQueryVariables>(PrAutomationsDocument, options);
        }
export function usePrAutomationsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PrAutomationsQuery, PrAutomationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PrAutomationsQuery, PrAutomationsQueryVariables>(PrAutomationsDocument, options);
        }
export type PrAutomationsQueryHookResult = ReturnType<typeof usePrAutomationsQuery>;
export type PrAutomationsLazyQueryHookResult = ReturnType<typeof usePrAutomationsLazyQuery>;
export type PrAutomationsSuspenseQueryHookResult = ReturnType<typeof usePrAutomationsSuspenseQuery>;
export type PrAutomationsQueryResult = Apollo.QueryResult<PrAutomationsQuery, PrAutomationsQueryVariables>;
export const CreatePrAutomationDocument = gql`
    mutation CreatePrAutomation($attributes: PrAutomationAttributes!) {
  createPrAutomation(attributes: $attributes) {
    ...PrAutomation
  }
}
    ${PrAutomationFragmentDoc}`;
export type CreatePrAutomationMutationFn = Apollo.MutationFunction<CreatePrAutomationMutation, CreatePrAutomationMutationVariables>;

/**
 * __useCreatePrAutomationMutation__
 *
 * To run a mutation, you first call `useCreatePrAutomationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreatePrAutomationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createPrAutomationMutation, { data, loading, error }] = useCreatePrAutomationMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useCreatePrAutomationMutation(baseOptions?: Apollo.MutationHookOptions<CreatePrAutomationMutation, CreatePrAutomationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreatePrAutomationMutation, CreatePrAutomationMutationVariables>(CreatePrAutomationDocument, options);
      }
export type CreatePrAutomationMutationHookResult = ReturnType<typeof useCreatePrAutomationMutation>;
export type CreatePrAutomationMutationResult = Apollo.MutationResult<CreatePrAutomationMutation>;
export type CreatePrAutomationMutationOptions = Apollo.BaseMutationOptions<CreatePrAutomationMutation, CreatePrAutomationMutationVariables>;
export const UpdatePrAutomationDocument = gql`
    mutation UpdatePrAutomation($id: ID!, $attributes: PrAutomationAttributes!) {
  updatePrAutomation(id: $id, attributes: $attributes) {
    ...PrAutomation
  }
}
    ${PrAutomationFragmentDoc}`;
export type UpdatePrAutomationMutationFn = Apollo.MutationFunction<UpdatePrAutomationMutation, UpdatePrAutomationMutationVariables>;

/**
 * __useUpdatePrAutomationMutation__
 *
 * To run a mutation, you first call `useUpdatePrAutomationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdatePrAutomationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updatePrAutomationMutation, { data, loading, error }] = useUpdatePrAutomationMutation({
 *   variables: {
 *      id: // value for 'id'
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useUpdatePrAutomationMutation(baseOptions?: Apollo.MutationHookOptions<UpdatePrAutomationMutation, UpdatePrAutomationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdatePrAutomationMutation, UpdatePrAutomationMutationVariables>(UpdatePrAutomationDocument, options);
      }
export type UpdatePrAutomationMutationHookResult = ReturnType<typeof useUpdatePrAutomationMutation>;
export type UpdatePrAutomationMutationResult = Apollo.MutationResult<UpdatePrAutomationMutation>;
export type UpdatePrAutomationMutationOptions = Apollo.BaseMutationOptions<UpdatePrAutomationMutation, UpdatePrAutomationMutationVariables>;
export const DeletePrAutomationDocument = gql`
    mutation DeletePrAutomation($id: ID!) {
  deletePrAutomation(id: $id) {
    ...PrAutomation
  }
}
    ${PrAutomationFragmentDoc}`;
export type DeletePrAutomationMutationFn = Apollo.MutationFunction<DeletePrAutomationMutation, DeletePrAutomationMutationVariables>;

/**
 * __useDeletePrAutomationMutation__
 *
 * To run a mutation, you first call `useDeletePrAutomationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeletePrAutomationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deletePrAutomationMutation, { data, loading, error }] = useDeletePrAutomationMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeletePrAutomationMutation(baseOptions?: Apollo.MutationHookOptions<DeletePrAutomationMutation, DeletePrAutomationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeletePrAutomationMutation, DeletePrAutomationMutationVariables>(DeletePrAutomationDocument, options);
      }
export type DeletePrAutomationMutationHookResult = ReturnType<typeof useDeletePrAutomationMutation>;
export type DeletePrAutomationMutationResult = Apollo.MutationResult<DeletePrAutomationMutation>;
export type DeletePrAutomationMutationOptions = Apollo.BaseMutationOptions<DeletePrAutomationMutation, DeletePrAutomationMutationVariables>;
export const ScmConnectionsDocument = gql`
    query ScmConnections($first: Int = 100, $after: String) {
  scmConnections(first: $first, after: $after) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ScmConnection
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${ScmConnectionFragmentDoc}`;

/**
 * __useScmConnectionsQuery__
 *
 * To run a query within a React component, call `useScmConnectionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useScmConnectionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useScmConnectionsQuery({
 *   variables: {
 *      first: // value for 'first'
 *      after: // value for 'after'
 *   },
 * });
 */
export function useScmConnectionsQuery(baseOptions?: Apollo.QueryHookOptions<ScmConnectionsQuery, ScmConnectionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ScmConnectionsQuery, ScmConnectionsQueryVariables>(ScmConnectionsDocument, options);
      }
export function useScmConnectionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ScmConnectionsQuery, ScmConnectionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ScmConnectionsQuery, ScmConnectionsQueryVariables>(ScmConnectionsDocument, options);
        }
export function useScmConnectionsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ScmConnectionsQuery, ScmConnectionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ScmConnectionsQuery, ScmConnectionsQueryVariables>(ScmConnectionsDocument, options);
        }
export type ScmConnectionsQueryHookResult = ReturnType<typeof useScmConnectionsQuery>;
export type ScmConnectionsLazyQueryHookResult = ReturnType<typeof useScmConnectionsLazyQuery>;
export type ScmConnectionsSuspenseQueryHookResult = ReturnType<typeof useScmConnectionsSuspenseQuery>;
export type ScmConnectionsQueryResult = Apollo.QueryResult<ScmConnectionsQuery, ScmConnectionsQueryVariables>;
export const CreateScmConnectionDocument = gql`
    mutation CreateScmConnection($attributes: ScmConnectionAttributes!) {
  createScmConnection(attributes: $attributes) {
    ...ScmConnection
  }
}
    ${ScmConnectionFragmentDoc}`;
export type CreateScmConnectionMutationFn = Apollo.MutationFunction<CreateScmConnectionMutation, CreateScmConnectionMutationVariables>;

/**
 * __useCreateScmConnectionMutation__
 *
 * To run a mutation, you first call `useCreateScmConnectionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateScmConnectionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createScmConnectionMutation, { data, loading, error }] = useCreateScmConnectionMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useCreateScmConnectionMutation(baseOptions?: Apollo.MutationHookOptions<CreateScmConnectionMutation, CreateScmConnectionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateScmConnectionMutation, CreateScmConnectionMutationVariables>(CreateScmConnectionDocument, options);
      }
export type CreateScmConnectionMutationHookResult = ReturnType<typeof useCreateScmConnectionMutation>;
export type CreateScmConnectionMutationResult = Apollo.MutationResult<CreateScmConnectionMutation>;
export type CreateScmConnectionMutationOptions = Apollo.BaseMutationOptions<CreateScmConnectionMutation, CreateScmConnectionMutationVariables>;
export const UpdateScmConnectionDocument = gql`
    mutation UpdateScmConnection($id: ID!, $attributes: ScmConnectionAttributes!) {
  updateScmConnection(id: $id, attributes: $attributes) {
    ...ScmConnection
  }
}
    ${ScmConnectionFragmentDoc}`;
export type UpdateScmConnectionMutationFn = Apollo.MutationFunction<UpdateScmConnectionMutation, UpdateScmConnectionMutationVariables>;

/**
 * __useUpdateScmConnectionMutation__
 *
 * To run a mutation, you first call `useUpdateScmConnectionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateScmConnectionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateScmConnectionMutation, { data, loading, error }] = useUpdateScmConnectionMutation({
 *   variables: {
 *      id: // value for 'id'
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useUpdateScmConnectionMutation(baseOptions?: Apollo.MutationHookOptions<UpdateScmConnectionMutation, UpdateScmConnectionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateScmConnectionMutation, UpdateScmConnectionMutationVariables>(UpdateScmConnectionDocument, options);
      }
export type UpdateScmConnectionMutationHookResult = ReturnType<typeof useUpdateScmConnectionMutation>;
export type UpdateScmConnectionMutationResult = Apollo.MutationResult<UpdateScmConnectionMutation>;
export type UpdateScmConnectionMutationOptions = Apollo.BaseMutationOptions<UpdateScmConnectionMutation, UpdateScmConnectionMutationVariables>;
export const DeleteScmConnectionDocument = gql`
    mutation DeleteScmConnection($id: ID!) {
  deleteScmConnection(id: $id) {
    ...ScmConnection
  }
}
    ${ScmConnectionFragmentDoc}`;
export type DeleteScmConnectionMutationFn = Apollo.MutationFunction<DeleteScmConnectionMutation, DeleteScmConnectionMutationVariables>;

/**
 * __useDeleteScmConnectionMutation__
 *
 * To run a mutation, you first call `useDeleteScmConnectionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteScmConnectionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteScmConnectionMutation, { data, loading, error }] = useDeleteScmConnectionMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteScmConnectionMutation(baseOptions?: Apollo.MutationHookOptions<DeleteScmConnectionMutation, DeleteScmConnectionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteScmConnectionMutation, DeleteScmConnectionMutationVariables>(DeleteScmConnectionDocument, options);
      }
export type DeleteScmConnectionMutationHookResult = ReturnType<typeof useDeleteScmConnectionMutation>;
export type DeleteScmConnectionMutationResult = Apollo.MutationResult<DeleteScmConnectionMutation>;
export type DeleteScmConnectionMutationOptions = Apollo.BaseMutationOptions<DeleteScmConnectionMutation, DeleteScmConnectionMutationVariables>;
export const SetupRenovateDocument = gql`
    mutation SetupRenovate($connectionId: ID!, $repos: [String]!, $name: String, $namespace: String) {
  setupRenovate(
    connectionId: $connectionId
    repos: $repos
    name: $name
    namespace: $namespace
  ) {
    id
  }
}
    `;
export type SetupRenovateMutationFn = Apollo.MutationFunction<SetupRenovateMutation, SetupRenovateMutationVariables>;

/**
 * __useSetupRenovateMutation__
 *
 * To run a mutation, you first call `useSetupRenovateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetupRenovateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setupRenovateMutation, { data, loading, error }] = useSetupRenovateMutation({
 *   variables: {
 *      connectionId: // value for 'connectionId'
 *      repos: // value for 'repos'
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *   },
 * });
 */
export function useSetupRenovateMutation(baseOptions?: Apollo.MutationHookOptions<SetupRenovateMutation, SetupRenovateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetupRenovateMutation, SetupRenovateMutationVariables>(SetupRenovateDocument, options);
      }
export type SetupRenovateMutationHookResult = ReturnType<typeof useSetupRenovateMutation>;
export type SetupRenovateMutationResult = Apollo.MutationResult<SetupRenovateMutation>;
export type SetupRenovateMutationOptions = Apollo.BaseMutationOptions<SetupRenovateMutation, SetupRenovateMutationVariables>;
export const PluralContextDocument = gql`
    query PluralContext {
  pluralContext {
    buckets
    configuration
    domains
  }
}
    `;

/**
 * __usePluralContextQuery__
 *
 * To run a query within a React component, call `usePluralContextQuery` and pass it any options that fit your needs.
 * When your component renders, `usePluralContextQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePluralContextQuery({
 *   variables: {
 *   },
 * });
 */
export function usePluralContextQuery(baseOptions?: Apollo.QueryHookOptions<PluralContextQuery, PluralContextQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PluralContextQuery, PluralContextQueryVariables>(PluralContextDocument, options);
      }
export function usePluralContextLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PluralContextQuery, PluralContextQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PluralContextQuery, PluralContextQueryVariables>(PluralContextDocument, options);
        }
export function usePluralContextSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PluralContextQuery, PluralContextQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PluralContextQuery, PluralContextQueryVariables>(PluralContextDocument, options);
        }
export type PluralContextQueryHookResult = ReturnType<typeof usePluralContextQuery>;
export type PluralContextLazyQueryHookResult = ReturnType<typeof usePluralContextLazyQuery>;
export type PluralContextSuspenseQueryHookResult = ReturnType<typeof usePluralContextSuspenseQuery>;
export type PluralContextQueryResult = Apollo.QueryResult<PluralContextQuery, PluralContextQueryVariables>;
export const CreateBuildDocument = gql`
    mutation CreateBuild($attributes: BuildAttributes!) {
  createBuild(attributes: $attributes) {
    id
  }
}
    `;
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
export const ClusterAddOnsDocument = gql`
    query ClusterAddOns {
  clusterAddOns {
    ...ClusterAddOn
  }
}
    ${ClusterAddOnFragmentDoc}`;

/**
 * __useClusterAddOnsQuery__
 *
 * To run a query within a React component, call `useClusterAddOnsQuery` and pass it any options that fit your needs.
 * When your component renders, `useClusterAddOnsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClusterAddOnsQuery({
 *   variables: {
 *   },
 * });
 */
export function useClusterAddOnsQuery(baseOptions?: Apollo.QueryHookOptions<ClusterAddOnsQuery, ClusterAddOnsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClusterAddOnsQuery, ClusterAddOnsQueryVariables>(ClusterAddOnsDocument, options);
      }
export function useClusterAddOnsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClusterAddOnsQuery, ClusterAddOnsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClusterAddOnsQuery, ClusterAddOnsQueryVariables>(ClusterAddOnsDocument, options);
        }
export function useClusterAddOnsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ClusterAddOnsQuery, ClusterAddOnsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ClusterAddOnsQuery, ClusterAddOnsQueryVariables>(ClusterAddOnsDocument, options);
        }
export type ClusterAddOnsQueryHookResult = ReturnType<typeof useClusterAddOnsQuery>;
export type ClusterAddOnsLazyQueryHookResult = ReturnType<typeof useClusterAddOnsLazyQuery>;
export type ClusterAddOnsSuspenseQueryHookResult = ReturnType<typeof useClusterAddOnsSuspenseQuery>;
export type ClusterAddOnsQueryResult = Apollo.QueryResult<ClusterAddOnsQuery, ClusterAddOnsQueryVariables>;
export const InstallAddOnDocument = gql`
    mutation InstallAddOn($clusterId: ID!, $name: String!, $configuration: [ConfigAttributes], $global: GlobalServiceAttributes) {
  installAddOn(
    clusterId: $clusterId
    configuration: $configuration
    global: $global
    name: $name
  ) {
    ...ServiceDeploymentsRow
  }
}
    ${ServiceDeploymentsRowFragmentDoc}`;
export type InstallAddOnMutationFn = Apollo.MutationFunction<InstallAddOnMutation, InstallAddOnMutationVariables>;

/**
 * __useInstallAddOnMutation__
 *
 * To run a mutation, you first call `useInstallAddOnMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useInstallAddOnMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [installAddOnMutation, { data, loading, error }] = useInstallAddOnMutation({
 *   variables: {
 *      clusterId: // value for 'clusterId'
 *      name: // value for 'name'
 *      configuration: // value for 'configuration'
 *      global: // value for 'global'
 *   },
 * });
 */
export function useInstallAddOnMutation(baseOptions?: Apollo.MutationHookOptions<InstallAddOnMutation, InstallAddOnMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<InstallAddOnMutation, InstallAddOnMutationVariables>(InstallAddOnDocument, options);
      }
export type InstallAddOnMutationHookResult = ReturnType<typeof useInstallAddOnMutation>;
export type InstallAddOnMutationResult = Apollo.MutationResult<InstallAddOnMutation>;
export type InstallAddOnMutationOptions = Apollo.BaseMutationOptions<InstallAddOnMutation, InstallAddOnMutationVariables>;
export const ClustersDocument = gql`
    query Clusters($first: Int = 100, $after: String, $q: String, $healthy: Boolean, $tagQuery: TagQuery) {
  clusters(
    first: $first
    after: $after
    q: $q
    healthy: $healthy
    tagQuery: $tagQuery
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ClustersRow
      }
    }
  }
  clusterStatuses {
    ...ClusterStatusInfo
  }
  tags
}
    ${PageInfoFragmentDoc}
${ClustersRowFragmentDoc}
${ClusterStatusInfoFragmentDoc}`;

/**
 * __useClustersQuery__
 *
 * To run a query within a React component, call `useClustersQuery` and pass it any options that fit your needs.
 * When your component renders, `useClustersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClustersQuery({
 *   variables: {
 *      first: // value for 'first'
 *      after: // value for 'after'
 *      q: // value for 'q'
 *      healthy: // value for 'healthy'
 *      tagQuery: // value for 'tagQuery'
 *   },
 * });
 */
export function useClustersQuery(baseOptions?: Apollo.QueryHookOptions<ClustersQuery, ClustersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClustersQuery, ClustersQueryVariables>(ClustersDocument, options);
      }
export function useClustersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClustersQuery, ClustersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClustersQuery, ClustersQueryVariables>(ClustersDocument, options);
        }
export function useClustersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ClustersQuery, ClustersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ClustersQuery, ClustersQueryVariables>(ClustersDocument, options);
        }
export type ClustersQueryHookResult = ReturnType<typeof useClustersQuery>;
export type ClustersLazyQueryHookResult = ReturnType<typeof useClustersLazyQuery>;
export type ClustersSuspenseQueryHookResult = ReturnType<typeof useClustersSuspenseQuery>;
export type ClustersQueryResult = Apollo.QueryResult<ClustersQuery, ClustersQueryVariables>;
export const ClustersTinyDocument = gql`
    query ClustersTiny {
  clusters(first: 200) {
    edges {
      node {
        ...ClusterTiny
      }
    }
  }
}
    ${ClusterTinyFragmentDoc}`;

/**
 * __useClustersTinyQuery__
 *
 * To run a query within a React component, call `useClustersTinyQuery` and pass it any options that fit your needs.
 * When your component renders, `useClustersTinyQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClustersTinyQuery({
 *   variables: {
 *   },
 * });
 */
export function useClustersTinyQuery(baseOptions?: Apollo.QueryHookOptions<ClustersTinyQuery, ClustersTinyQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClustersTinyQuery, ClustersTinyQueryVariables>(ClustersTinyDocument, options);
      }
export function useClustersTinyLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClustersTinyQuery, ClustersTinyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClustersTinyQuery, ClustersTinyQueryVariables>(ClustersTinyDocument, options);
        }
export function useClustersTinySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ClustersTinyQuery, ClustersTinyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ClustersTinyQuery, ClustersTinyQueryVariables>(ClustersTinyDocument, options);
        }
export type ClustersTinyQueryHookResult = ReturnType<typeof useClustersTinyQuery>;
export type ClustersTinyLazyQueryHookResult = ReturnType<typeof useClustersTinyLazyQuery>;
export type ClustersTinySuspenseQueryHookResult = ReturnType<typeof useClustersTinySuspenseQuery>;
export type ClustersTinyQueryResult = Apollo.QueryResult<ClustersTinyQuery, ClustersTinyQueryVariables>;
export const ClusterSelectorDocument = gql`
    query ClusterSelector($first: Int = 100, $after: String, $q: String, $currentClusterId: ID) {
  clusters(first: $first, after: $after, q: $q) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ClusterTiny
      }
    }
  }
  cluster(id: $currentClusterId) {
    ...ClusterTiny
  }
}
    ${PageInfoFragmentDoc}
${ClusterTinyFragmentDoc}`;

/**
 * __useClusterSelectorQuery__
 *
 * To run a query within a React component, call `useClusterSelectorQuery` and pass it any options that fit your needs.
 * When your component renders, `useClusterSelectorQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClusterSelectorQuery({
 *   variables: {
 *      first: // value for 'first'
 *      after: // value for 'after'
 *      q: // value for 'q'
 *      currentClusterId: // value for 'currentClusterId'
 *   },
 * });
 */
export function useClusterSelectorQuery(baseOptions?: Apollo.QueryHookOptions<ClusterSelectorQuery, ClusterSelectorQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClusterSelectorQuery, ClusterSelectorQueryVariables>(ClusterSelectorDocument, options);
      }
export function useClusterSelectorLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClusterSelectorQuery, ClusterSelectorQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClusterSelectorQuery, ClusterSelectorQueryVariables>(ClusterSelectorDocument, options);
        }
export function useClusterSelectorSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ClusterSelectorQuery, ClusterSelectorQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ClusterSelectorQuery, ClusterSelectorQueryVariables>(ClusterSelectorDocument, options);
        }
export type ClusterSelectorQueryHookResult = ReturnType<typeof useClusterSelectorQuery>;
export type ClusterSelectorLazyQueryHookResult = ReturnType<typeof useClusterSelectorLazyQuery>;
export type ClusterSelectorSuspenseQueryHookResult = ReturnType<typeof useClusterSelectorSuspenseQuery>;
export type ClusterSelectorQueryResult = Apollo.QueryResult<ClusterSelectorQuery, ClusterSelectorQueryVariables>;
export const ClusterDocument = gql`
    query Cluster($id: ID!) {
  cluster(id: $id) {
    ...Cluster
  }
}
    ${ClusterFragmentDoc}`;

/**
 * __useClusterQuery__
 *
 * To run a query within a React component, call `useClusterQuery` and pass it any options that fit your needs.
 * When your component renders, `useClusterQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClusterQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useClusterQuery(baseOptions: Apollo.QueryHookOptions<ClusterQuery, ClusterQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClusterQuery, ClusterQueryVariables>(ClusterDocument, options);
      }
export function useClusterLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClusterQuery, ClusterQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClusterQuery, ClusterQueryVariables>(ClusterDocument, options);
        }
export function useClusterSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ClusterQuery, ClusterQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ClusterQuery, ClusterQueryVariables>(ClusterDocument, options);
        }
export type ClusterQueryHookResult = ReturnType<typeof useClusterQuery>;
export type ClusterLazyQueryHookResult = ReturnType<typeof useClusterLazyQuery>;
export type ClusterSuspenseQueryHookResult = ReturnType<typeof useClusterSuspenseQuery>;
export type ClusterQueryResult = Apollo.QueryResult<ClusterQuery, ClusterQueryVariables>;
export const ClusterPodsDocument = gql`
    query ClusterPods($clusterId: ID, $namespace: String) {
  pods(first: 100, clusterId: $clusterId, namespace: $namespace) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...Pod
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${PodFragmentDoc}`;

/**
 * __useClusterPodsQuery__
 *
 * To run a query within a React component, call `useClusterPodsQuery` and pass it any options that fit your needs.
 * When your component renders, `useClusterPodsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClusterPodsQuery({
 *   variables: {
 *      clusterId: // value for 'clusterId'
 *      namespace: // value for 'namespace'
 *   },
 * });
 */
export function useClusterPodsQuery(baseOptions?: Apollo.QueryHookOptions<ClusterPodsQuery, ClusterPodsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClusterPodsQuery, ClusterPodsQueryVariables>(ClusterPodsDocument, options);
      }
export function useClusterPodsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClusterPodsQuery, ClusterPodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClusterPodsQuery, ClusterPodsQueryVariables>(ClusterPodsDocument, options);
        }
export function useClusterPodsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ClusterPodsQuery, ClusterPodsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ClusterPodsQuery, ClusterPodsQueryVariables>(ClusterPodsDocument, options);
        }
export type ClusterPodsQueryHookResult = ReturnType<typeof useClusterPodsQuery>;
export type ClusterPodsLazyQueryHookResult = ReturnType<typeof useClusterPodsLazyQuery>;
export type ClusterPodsSuspenseQueryHookResult = ReturnType<typeof useClusterPodsSuspenseQuery>;
export type ClusterPodsQueryResult = Apollo.QueryResult<ClusterPodsQuery, ClusterPodsQueryVariables>;
export const ClusterNamespacesDocument = gql`
    query ClusterNamespaces($clusterId: ID) {
  namespaces(clusterId: $clusterId) {
    metadata {
      ...Metadata
    }
  }
}
    ${MetadataFragmentDoc}`;

/**
 * __useClusterNamespacesQuery__
 *
 * To run a query within a React component, call `useClusterNamespacesQuery` and pass it any options that fit your needs.
 * When your component renders, `useClusterNamespacesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClusterNamespacesQuery({
 *   variables: {
 *      clusterId: // value for 'clusterId'
 *   },
 * });
 */
export function useClusterNamespacesQuery(baseOptions?: Apollo.QueryHookOptions<ClusterNamespacesQuery, ClusterNamespacesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClusterNamespacesQuery, ClusterNamespacesQueryVariables>(ClusterNamespacesDocument, options);
      }
export function useClusterNamespacesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClusterNamespacesQuery, ClusterNamespacesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClusterNamespacesQuery, ClusterNamespacesQueryVariables>(ClusterNamespacesDocument, options);
        }
export function useClusterNamespacesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ClusterNamespacesQuery, ClusterNamespacesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ClusterNamespacesQuery, ClusterNamespacesQueryVariables>(ClusterNamespacesDocument, options);
        }
export type ClusterNamespacesQueryHookResult = ReturnType<typeof useClusterNamespacesQuery>;
export type ClusterNamespacesLazyQueryHookResult = ReturnType<typeof useClusterNamespacesLazyQuery>;
export type ClusterNamespacesSuspenseQueryHookResult = ReturnType<typeof useClusterNamespacesSuspenseQuery>;
export type ClusterNamespacesQueryResult = Apollo.QueryResult<ClusterNamespacesQuery, ClusterNamespacesQueryVariables>;
export const ClusterBindingsDocument = gql`
    query ClusterBindings($id: ID!) {
  cluster(id: $id) {
    ...ClusterBindings
  }
}
    ${ClusterBindingsFragmentDoc}`;

/**
 * __useClusterBindingsQuery__
 *
 * To run a query within a React component, call `useClusterBindingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useClusterBindingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClusterBindingsQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useClusterBindingsQuery(baseOptions: Apollo.QueryHookOptions<ClusterBindingsQuery, ClusterBindingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClusterBindingsQuery, ClusterBindingsQueryVariables>(ClusterBindingsDocument, options);
      }
export function useClusterBindingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClusterBindingsQuery, ClusterBindingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClusterBindingsQuery, ClusterBindingsQueryVariables>(ClusterBindingsDocument, options);
        }
export function useClusterBindingsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ClusterBindingsQuery, ClusterBindingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ClusterBindingsQuery, ClusterBindingsQueryVariables>(ClusterBindingsDocument, options);
        }
export type ClusterBindingsQueryHookResult = ReturnType<typeof useClusterBindingsQuery>;
export type ClusterBindingsLazyQueryHookResult = ReturnType<typeof useClusterBindingsLazyQuery>;
export type ClusterBindingsSuspenseQueryHookResult = ReturnType<typeof useClusterBindingsSuspenseQuery>;
export type ClusterBindingsQueryResult = Apollo.QueryResult<ClusterBindingsQuery, ClusterBindingsQueryVariables>;
export const RuntimeServicesDocument = gql`
    query RuntimeServices($id: ID!, $kubeVersion: String!, $hasKubeVersion: Boolean!) {
  cluster(id: $id) {
    id
    name
    currentVersion
    version
    runtimeServices {
      ...RuntimeService
    }
  }
}
    ${RuntimeServiceFragmentDoc}`;

/**
 * __useRuntimeServicesQuery__
 *
 * To run a query within a React component, call `useRuntimeServicesQuery` and pass it any options that fit your needs.
 * When your component renders, `useRuntimeServicesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRuntimeServicesQuery({
 *   variables: {
 *      id: // value for 'id'
 *      kubeVersion: // value for 'kubeVersion'
 *      hasKubeVersion: // value for 'hasKubeVersion'
 *   },
 * });
 */
export function useRuntimeServicesQuery(baseOptions: Apollo.QueryHookOptions<RuntimeServicesQuery, RuntimeServicesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RuntimeServicesQuery, RuntimeServicesQueryVariables>(RuntimeServicesDocument, options);
      }
export function useRuntimeServicesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RuntimeServicesQuery, RuntimeServicesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RuntimeServicesQuery, RuntimeServicesQueryVariables>(RuntimeServicesDocument, options);
        }
export function useRuntimeServicesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<RuntimeServicesQuery, RuntimeServicesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<RuntimeServicesQuery, RuntimeServicesQueryVariables>(RuntimeServicesDocument, options);
        }
export type RuntimeServicesQueryHookResult = ReturnType<typeof useRuntimeServicesQuery>;
export type RuntimeServicesLazyQueryHookResult = ReturnType<typeof useRuntimeServicesLazyQuery>;
export type RuntimeServicesSuspenseQueryHookResult = ReturnType<typeof useRuntimeServicesSuspenseQuery>;
export type RuntimeServicesQueryResult = Apollo.QueryResult<RuntimeServicesQuery, RuntimeServicesQueryVariables>;
export const AddonReleaseUrlDocument = gql`
    query AddonReleaseURL($id: ID!, $version: String!) {
  runtimeService(id: $id) {
    id
    addon {
      releaseUrl(version: $version)
    }
  }
}
    `;

/**
 * __useAddonReleaseUrlQuery__
 *
 * To run a query within a React component, call `useAddonReleaseUrlQuery` and pass it any options that fit your needs.
 * When your component renders, `useAddonReleaseUrlQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAddonReleaseUrlQuery({
 *   variables: {
 *      id: // value for 'id'
 *      version: // value for 'version'
 *   },
 * });
 */
export function useAddonReleaseUrlQuery(baseOptions: Apollo.QueryHookOptions<AddonReleaseUrlQuery, AddonReleaseUrlQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AddonReleaseUrlQuery, AddonReleaseUrlQueryVariables>(AddonReleaseUrlDocument, options);
      }
export function useAddonReleaseUrlLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AddonReleaseUrlQuery, AddonReleaseUrlQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AddonReleaseUrlQuery, AddonReleaseUrlQueryVariables>(AddonReleaseUrlDocument, options);
        }
export function useAddonReleaseUrlSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<AddonReleaseUrlQuery, AddonReleaseUrlQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AddonReleaseUrlQuery, AddonReleaseUrlQueryVariables>(AddonReleaseUrlDocument, options);
        }
export type AddonReleaseUrlQueryHookResult = ReturnType<typeof useAddonReleaseUrlQuery>;
export type AddonReleaseUrlLazyQueryHookResult = ReturnType<typeof useAddonReleaseUrlLazyQuery>;
export type AddonReleaseUrlSuspenseQueryHookResult = ReturnType<typeof useAddonReleaseUrlSuspenseQuery>;
export type AddonReleaseUrlQueryResult = Apollo.QueryResult<AddonReleaseUrlQuery, AddonReleaseUrlQueryVariables>;
export const UpdateClusterBindingsDocument = gql`
    mutation UpdateClusterBindings($id: ID!, $rbac: RbacAttributes!) {
  updateRbac(clusterId: $id, rbac: $rbac)
}
    `;
export type UpdateClusterBindingsMutationFn = Apollo.MutationFunction<UpdateClusterBindingsMutation, UpdateClusterBindingsMutationVariables>;

/**
 * __useUpdateClusterBindingsMutation__
 *
 * To run a mutation, you first call `useUpdateClusterBindingsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateClusterBindingsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateClusterBindingsMutation, { data, loading, error }] = useUpdateClusterBindingsMutation({
 *   variables: {
 *      id: // value for 'id'
 *      rbac: // value for 'rbac'
 *   },
 * });
 */
export function useUpdateClusterBindingsMutation(baseOptions?: Apollo.MutationHookOptions<UpdateClusterBindingsMutation, UpdateClusterBindingsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateClusterBindingsMutation, UpdateClusterBindingsMutationVariables>(UpdateClusterBindingsDocument, options);
      }
export type UpdateClusterBindingsMutationHookResult = ReturnType<typeof useUpdateClusterBindingsMutation>;
export type UpdateClusterBindingsMutationResult = Apollo.MutationResult<UpdateClusterBindingsMutation>;
export type UpdateClusterBindingsMutationOptions = Apollo.BaseMutationOptions<UpdateClusterBindingsMutation, UpdateClusterBindingsMutationVariables>;
export const UpdateClusterDocument = gql`
    mutation UpdateCluster($id: ID!, $attributes: ClusterUpdateAttributes!) {
  updateCluster(id: $id, attributes: $attributes) {
    ...Cluster
  }
}
    ${ClusterFragmentDoc}`;
export type UpdateClusterMutationFn = Apollo.MutationFunction<UpdateClusterMutation, UpdateClusterMutationVariables>;

/**
 * __useUpdateClusterMutation__
 *
 * To run a mutation, you first call `useUpdateClusterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateClusterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateClusterMutation, { data, loading, error }] = useUpdateClusterMutation({
 *   variables: {
 *      id: // value for 'id'
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useUpdateClusterMutation(baseOptions?: Apollo.MutationHookOptions<UpdateClusterMutation, UpdateClusterMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateClusterMutation, UpdateClusterMutationVariables>(UpdateClusterDocument, options);
      }
export type UpdateClusterMutationHookResult = ReturnType<typeof useUpdateClusterMutation>;
export type UpdateClusterMutationResult = Apollo.MutationResult<UpdateClusterMutation>;
export type UpdateClusterMutationOptions = Apollo.BaseMutationOptions<UpdateClusterMutation, UpdateClusterMutationVariables>;
export const CreateClusterDocument = gql`
    mutation CreateCluster($attributes: ClusterAttributes!) {
  createCluster(attributes: $attributes) {
    ...Cluster
    deployToken
  }
}
    ${ClusterFragmentDoc}`;
export type CreateClusterMutationFn = Apollo.MutationFunction<CreateClusterMutation, CreateClusterMutationVariables>;

/**
 * __useCreateClusterMutation__
 *
 * To run a mutation, you first call `useCreateClusterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateClusterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createClusterMutation, { data, loading, error }] = useCreateClusterMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useCreateClusterMutation(baseOptions?: Apollo.MutationHookOptions<CreateClusterMutation, CreateClusterMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateClusterMutation, CreateClusterMutationVariables>(CreateClusterDocument, options);
      }
export type CreateClusterMutationHookResult = ReturnType<typeof useCreateClusterMutation>;
export type CreateClusterMutationResult = Apollo.MutationResult<CreateClusterMutation>;
export type CreateClusterMutationOptions = Apollo.BaseMutationOptions<CreateClusterMutation, CreateClusterMutationVariables>;
export const DeleteClusterDocument = gql`
    mutation DeleteCluster($id: ID!) {
  deleteCluster(id: $id) {
    ...Cluster
  }
}
    ${ClusterFragmentDoc}`;
export type DeleteClusterMutationFn = Apollo.MutationFunction<DeleteClusterMutation, DeleteClusterMutationVariables>;

/**
 * __useDeleteClusterMutation__
 *
 * To run a mutation, you first call `useDeleteClusterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteClusterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteClusterMutation, { data, loading, error }] = useDeleteClusterMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteClusterMutation(baseOptions?: Apollo.MutationHookOptions<DeleteClusterMutation, DeleteClusterMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteClusterMutation, DeleteClusterMutationVariables>(DeleteClusterDocument, options);
      }
export type DeleteClusterMutationHookResult = ReturnType<typeof useDeleteClusterMutation>;
export type DeleteClusterMutationResult = Apollo.MutationResult<DeleteClusterMutation>;
export type DeleteClusterMutationOptions = Apollo.BaseMutationOptions<DeleteClusterMutation, DeleteClusterMutationVariables>;
export const DetachClusterDocument = gql`
    mutation DetachCluster($id: ID!) {
  detachCluster(id: $id) {
    ...Cluster
  }
}
    ${ClusterFragmentDoc}`;
export type DetachClusterMutationFn = Apollo.MutationFunction<DetachClusterMutation, DetachClusterMutationVariables>;

/**
 * __useDetachClusterMutation__
 *
 * To run a mutation, you first call `useDetachClusterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDetachClusterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [detachClusterMutation, { data, loading, error }] = useDetachClusterMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetachClusterMutation(baseOptions?: Apollo.MutationHookOptions<DetachClusterMutation, DetachClusterMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DetachClusterMutation, DetachClusterMutationVariables>(DetachClusterDocument, options);
      }
export type DetachClusterMutationHookResult = ReturnType<typeof useDetachClusterMutation>;
export type DetachClusterMutationResult = Apollo.MutationResult<DetachClusterMutation>;
export type DetachClusterMutationOptions = Apollo.BaseMutationOptions<DetachClusterMutation, DetachClusterMutationVariables>;
export const ClusterStatusesDocument = gql`
    query ClusterStatuses($clusterId: ID) {
  clusterStatuses {
    ...ClusterStatusInfo
  }
}
    ${ClusterStatusInfoFragmentDoc}`;

/**
 * __useClusterStatusesQuery__
 *
 * To run a query within a React component, call `useClusterStatusesQuery` and pass it any options that fit your needs.
 * When your component renders, `useClusterStatusesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClusterStatusesQuery({
 *   variables: {
 *      clusterId: // value for 'clusterId'
 *   },
 * });
 */
export function useClusterStatusesQuery(baseOptions?: Apollo.QueryHookOptions<ClusterStatusesQuery, ClusterStatusesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClusterStatusesQuery, ClusterStatusesQueryVariables>(ClusterStatusesDocument, options);
      }
export function useClusterStatusesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClusterStatusesQuery, ClusterStatusesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClusterStatusesQuery, ClusterStatusesQueryVariables>(ClusterStatusesDocument, options);
        }
export function useClusterStatusesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ClusterStatusesQuery, ClusterStatusesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ClusterStatusesQuery, ClusterStatusesQueryVariables>(ClusterStatusesDocument, options);
        }
export type ClusterStatusesQueryHookResult = ReturnType<typeof useClusterStatusesQuery>;
export type ClusterStatusesLazyQueryHookResult = ReturnType<typeof useClusterStatusesLazyQuery>;
export type ClusterStatusesSuspenseQueryHookResult = ReturnType<typeof useClusterStatusesSuspenseQuery>;
export type ClusterStatusesQueryResult = Apollo.QueryResult<ClusterStatusesQuery, ClusterStatusesQueryVariables>;
export const TagPairsDocument = gql`
    query TagPairs($first: Int = 30, $q: String, $tag: String) {
  tagPairs(first: $first, q: $q, tag: $tag) {
    edges {
      node {
        name
        value
        id
      }
    }
  }
}
    `;

/**
 * __useTagPairsQuery__
 *
 * To run a query within a React component, call `useTagPairsQuery` and pass it any options that fit your needs.
 * When your component renders, `useTagPairsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTagPairsQuery({
 *   variables: {
 *      first: // value for 'first'
 *      q: // value for 'q'
 *      tag: // value for 'tag'
 *   },
 * });
 */
export function useTagPairsQuery(baseOptions?: Apollo.QueryHookOptions<TagPairsQuery, TagPairsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TagPairsQuery, TagPairsQueryVariables>(TagPairsDocument, options);
      }
export function useTagPairsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TagPairsQuery, TagPairsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TagPairsQuery, TagPairsQueryVariables>(TagPairsDocument, options);
        }
export function useTagPairsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TagPairsQuery, TagPairsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TagPairsQuery, TagPairsQueryVariables>(TagPairsDocument, options);
        }
export type TagPairsQueryHookResult = ReturnType<typeof useTagPairsQuery>;
export type TagPairsLazyQueryHookResult = ReturnType<typeof useTagPairsLazyQuery>;
export type TagPairsSuspenseQueryHookResult = ReturnType<typeof useTagPairsSuspenseQuery>;
export type TagPairsQueryResult = Apollo.QueryResult<TagPairsQuery, TagPairsQueryVariables>;
export const UsageDocument = gql`
    query Usage($cpu: String!, $mem: String!, $podCpu: String!, $podMem: String!, $step: String!, $offset: Int!, $clusterId: ID) {
  cpu: metric(clusterId: $clusterId, query: $cpu, offset: $offset, step: $step) {
    ...MetricResponse
  }
  mem: metric(clusterId: $clusterId, query: $mem, offset: $offset, step: $step) {
    ...MetricResponse
  }
  podCpu: metric(
    clusterId: $clusterId
    query: $podCpu
    offset: $offset
    step: $step
  ) {
    ...MetricResponse
  }
  podMem: metric(
    clusterId: $clusterId
    query: $podMem
    offset: $offset
    step: $step
  ) {
    ...MetricResponse
  }
}
    ${MetricResponseFragmentDoc}`;

/**
 * __useUsageQuery__
 *
 * To run a query within a React component, call `useUsageQuery` and pass it any options that fit your needs.
 * When your component renders, `useUsageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUsageQuery({
 *   variables: {
 *      cpu: // value for 'cpu'
 *      mem: // value for 'mem'
 *      podCpu: // value for 'podCpu'
 *      podMem: // value for 'podMem'
 *      step: // value for 'step'
 *      offset: // value for 'offset'
 *      clusterId: // value for 'clusterId'
 *   },
 * });
 */
export function useUsageQuery(baseOptions: Apollo.QueryHookOptions<UsageQuery, UsageQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UsageQuery, UsageQueryVariables>(UsageDocument, options);
      }
export function useUsageLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UsageQuery, UsageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UsageQuery, UsageQueryVariables>(UsageDocument, options);
        }
export function useUsageSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<UsageQuery, UsageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<UsageQuery, UsageQueryVariables>(UsageDocument, options);
        }
export type UsageQueryHookResult = ReturnType<typeof useUsageQuery>;
export type UsageLazyQueryHookResult = ReturnType<typeof useUsageLazyQuery>;
export type UsageSuspenseQueryHookResult = ReturnType<typeof useUsageSuspenseQuery>;
export type UsageQueryResult = Apollo.QueryResult<UsageQuery, UsageQueryVariables>;
export const GitRepositoriesDocument = gql`
    query GitRepositories {
  gitRepositories(first: 100) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...GitRepository
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${GitRepositoryFragmentDoc}`;

/**
 * __useGitRepositoriesQuery__
 *
 * To run a query within a React component, call `useGitRepositoriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGitRepositoriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGitRepositoriesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGitRepositoriesQuery(baseOptions?: Apollo.QueryHookOptions<GitRepositoriesQuery, GitRepositoriesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GitRepositoriesQuery, GitRepositoriesQueryVariables>(GitRepositoriesDocument, options);
      }
export function useGitRepositoriesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GitRepositoriesQuery, GitRepositoriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GitRepositoriesQuery, GitRepositoriesQueryVariables>(GitRepositoriesDocument, options);
        }
export function useGitRepositoriesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GitRepositoriesQuery, GitRepositoriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GitRepositoriesQuery, GitRepositoriesQueryVariables>(GitRepositoriesDocument, options);
        }
export type GitRepositoriesQueryHookResult = ReturnType<typeof useGitRepositoriesQuery>;
export type GitRepositoriesLazyQueryHookResult = ReturnType<typeof useGitRepositoriesLazyQuery>;
export type GitRepositoriesSuspenseQueryHookResult = ReturnType<typeof useGitRepositoriesSuspenseQuery>;
export type GitRepositoriesQueryResult = Apollo.QueryResult<GitRepositoriesQuery, GitRepositoriesQueryVariables>;
export const HelmRepositoriesDocument = gql`
    query HelmRepositories {
  helmRepositories {
    ...HelmRepository
  }
}
    ${HelmRepositoryFragmentDoc}`;

/**
 * __useHelmRepositoriesQuery__
 *
 * To run a query within a React component, call `useHelmRepositoriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useHelmRepositoriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHelmRepositoriesQuery({
 *   variables: {
 *   },
 * });
 */
export function useHelmRepositoriesQuery(baseOptions?: Apollo.QueryHookOptions<HelmRepositoriesQuery, HelmRepositoriesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<HelmRepositoriesQuery, HelmRepositoriesQueryVariables>(HelmRepositoriesDocument, options);
      }
export function useHelmRepositoriesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<HelmRepositoriesQuery, HelmRepositoriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<HelmRepositoriesQuery, HelmRepositoriesQueryVariables>(HelmRepositoriesDocument, options);
        }
export function useHelmRepositoriesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<HelmRepositoriesQuery, HelmRepositoriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<HelmRepositoriesQuery, HelmRepositoriesQueryVariables>(HelmRepositoriesDocument, options);
        }
export type HelmRepositoriesQueryHookResult = ReturnType<typeof useHelmRepositoriesQuery>;
export type HelmRepositoriesLazyQueryHookResult = ReturnType<typeof useHelmRepositoriesLazyQuery>;
export type HelmRepositoriesSuspenseQueryHookResult = ReturnType<typeof useHelmRepositoriesSuspenseQuery>;
export type HelmRepositoriesQueryResult = Apollo.QueryResult<HelmRepositoriesQuery, HelmRepositoriesQueryVariables>;
export const HelmRepositoryDocument = gql`
    query HelmRepository($namespace: String!, $name: String!) {
  helmRepository(namespace: $namespace, name: $name) {
    ...HelmRepository
    charts {
      name
      versions {
        ...HelmChartVersion
      }
    }
  }
}
    ${HelmRepositoryFragmentDoc}
${HelmChartVersionFragmentDoc}`;

/**
 * __useHelmRepositoryQuery__
 *
 * To run a query within a React component, call `useHelmRepositoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useHelmRepositoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHelmRepositoryQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useHelmRepositoryQuery(baseOptions: Apollo.QueryHookOptions<HelmRepositoryQuery, HelmRepositoryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<HelmRepositoryQuery, HelmRepositoryQueryVariables>(HelmRepositoryDocument, options);
      }
export function useHelmRepositoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<HelmRepositoryQuery, HelmRepositoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<HelmRepositoryQuery, HelmRepositoryQueryVariables>(HelmRepositoryDocument, options);
        }
export function useHelmRepositorySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<HelmRepositoryQuery, HelmRepositoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<HelmRepositoryQuery, HelmRepositoryQueryVariables>(HelmRepositoryDocument, options);
        }
export type HelmRepositoryQueryHookResult = ReturnType<typeof useHelmRepositoryQuery>;
export type HelmRepositoryLazyQueryHookResult = ReturnType<typeof useHelmRepositoryLazyQuery>;
export type HelmRepositorySuspenseQueryHookResult = ReturnType<typeof useHelmRepositorySuspenseQuery>;
export type HelmRepositoryQueryResult = Apollo.QueryResult<HelmRepositoryQuery, HelmRepositoryQueryVariables>;
export const GitRepositoryDocument = gql`
    query GitRepository($id: ID!) {
  gitRepository(id: $id) {
    refs
  }
}
    `;

/**
 * __useGitRepositoryQuery__
 *
 * To run a query within a React component, call `useGitRepositoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGitRepositoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGitRepositoryQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGitRepositoryQuery(baseOptions: Apollo.QueryHookOptions<GitRepositoryQuery, GitRepositoryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GitRepositoryQuery, GitRepositoryQueryVariables>(GitRepositoryDocument, options);
      }
export function useGitRepositoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GitRepositoryQuery, GitRepositoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GitRepositoryQuery, GitRepositoryQueryVariables>(GitRepositoryDocument, options);
        }
export function useGitRepositorySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GitRepositoryQuery, GitRepositoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GitRepositoryQuery, GitRepositoryQueryVariables>(GitRepositoryDocument, options);
        }
export type GitRepositoryQueryHookResult = ReturnType<typeof useGitRepositoryQuery>;
export type GitRepositoryLazyQueryHookResult = ReturnType<typeof useGitRepositoryLazyQuery>;
export type GitRepositorySuspenseQueryHookResult = ReturnType<typeof useGitRepositorySuspenseQuery>;
export type GitRepositoryQueryResult = Apollo.QueryResult<GitRepositoryQuery, GitRepositoryQueryVariables>;
export const CreateGitRepositoryDocument = gql`
    mutation CreateGitRepository($attributes: GitAttributes!) {
  createGitRepository(attributes: $attributes) {
    ...GitRepository
  }
}
    ${GitRepositoryFragmentDoc}`;
export type CreateGitRepositoryMutationFn = Apollo.MutationFunction<CreateGitRepositoryMutation, CreateGitRepositoryMutationVariables>;

/**
 * __useCreateGitRepositoryMutation__
 *
 * To run a mutation, you first call `useCreateGitRepositoryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateGitRepositoryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createGitRepositoryMutation, { data, loading, error }] = useCreateGitRepositoryMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useCreateGitRepositoryMutation(baseOptions?: Apollo.MutationHookOptions<CreateGitRepositoryMutation, CreateGitRepositoryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateGitRepositoryMutation, CreateGitRepositoryMutationVariables>(CreateGitRepositoryDocument, options);
      }
export type CreateGitRepositoryMutationHookResult = ReturnType<typeof useCreateGitRepositoryMutation>;
export type CreateGitRepositoryMutationResult = Apollo.MutationResult<CreateGitRepositoryMutation>;
export type CreateGitRepositoryMutationOptions = Apollo.BaseMutationOptions<CreateGitRepositoryMutation, CreateGitRepositoryMutationVariables>;
export const DeleteGitRepositoryDocument = gql`
    mutation DeleteGitRepository($id: ID!) {
  deleteGitRepository(id: $id) {
    id
  }
}
    `;
export type DeleteGitRepositoryMutationFn = Apollo.MutationFunction<DeleteGitRepositoryMutation, DeleteGitRepositoryMutationVariables>;

/**
 * __useDeleteGitRepositoryMutation__
 *
 * To run a mutation, you first call `useDeleteGitRepositoryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteGitRepositoryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteGitRepositoryMutation, { data, loading, error }] = useDeleteGitRepositoryMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteGitRepositoryMutation(baseOptions?: Apollo.MutationHookOptions<DeleteGitRepositoryMutation, DeleteGitRepositoryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteGitRepositoryMutation, DeleteGitRepositoryMutationVariables>(DeleteGitRepositoryDocument, options);
      }
export type DeleteGitRepositoryMutationHookResult = ReturnType<typeof useDeleteGitRepositoryMutation>;
export type DeleteGitRepositoryMutationResult = Apollo.MutationResult<DeleteGitRepositoryMutation>;
export type DeleteGitRepositoryMutationOptions = Apollo.BaseMutationOptions<DeleteGitRepositoryMutation, DeleteGitRepositoryMutationVariables>;
export const UpdateGitRepositoryDocument = gql`
    mutation UpdateGitRepository($id: ID!, $attributes: GitAttributes!) {
  updateGitRepository(id: $id, attributes: $attributes) {
    ...GitRepository
  }
}
    ${GitRepositoryFragmentDoc}`;
export type UpdateGitRepositoryMutationFn = Apollo.MutationFunction<UpdateGitRepositoryMutation, UpdateGitRepositoryMutationVariables>;

/**
 * __useUpdateGitRepositoryMutation__
 *
 * To run a mutation, you first call `useUpdateGitRepositoryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateGitRepositoryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateGitRepositoryMutation, { data, loading, error }] = useUpdateGitRepositoryMutation({
 *   variables: {
 *      id: // value for 'id'
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useUpdateGitRepositoryMutation(baseOptions?: Apollo.MutationHookOptions<UpdateGitRepositoryMutation, UpdateGitRepositoryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateGitRepositoryMutation, UpdateGitRepositoryMutationVariables>(UpdateGitRepositoryDocument, options);
      }
export type UpdateGitRepositoryMutationHookResult = ReturnType<typeof useUpdateGitRepositoryMutation>;
export type UpdateGitRepositoryMutationResult = Apollo.MutationResult<UpdateGitRepositoryMutation>;
export type UpdateGitRepositoryMutationOptions = Apollo.BaseMutationOptions<UpdateGitRepositoryMutation, UpdateGitRepositoryMutationVariables>;
export const CreateGlobalServiceDocument = gql`
    mutation CreateGlobalService($attributes: GlobalServiceAttributes!, $cluster: String, $name: String, $serviceId: ID) {
  createGlobalService(
    attributes: $attributes
    cluster: $cluster
    name: $name
    serviceId: $serviceId
  ) {
    ...GlobalService
  }
}
    ${GlobalServiceFragmentDoc}`;
export type CreateGlobalServiceMutationFn = Apollo.MutationFunction<CreateGlobalServiceMutation, CreateGlobalServiceMutationVariables>;

/**
 * __useCreateGlobalServiceMutation__
 *
 * To run a mutation, you first call `useCreateGlobalServiceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateGlobalServiceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createGlobalServiceMutation, { data, loading, error }] = useCreateGlobalServiceMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *      cluster: // value for 'cluster'
 *      name: // value for 'name'
 *      serviceId: // value for 'serviceId'
 *   },
 * });
 */
export function useCreateGlobalServiceMutation(baseOptions?: Apollo.MutationHookOptions<CreateGlobalServiceMutation, CreateGlobalServiceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateGlobalServiceMutation, CreateGlobalServiceMutationVariables>(CreateGlobalServiceDocument, options);
      }
export type CreateGlobalServiceMutationHookResult = ReturnType<typeof useCreateGlobalServiceMutation>;
export type CreateGlobalServiceMutationResult = Apollo.MutationResult<CreateGlobalServiceMutation>;
export type CreateGlobalServiceMutationOptions = Apollo.BaseMutationOptions<CreateGlobalServiceMutation, CreateGlobalServiceMutationVariables>;
export const DeleteGlobalServiceDocument = gql`
    mutation DeleteGlobalService($id: ID!) {
  deleteGlobalService(id: $id) {
    id
  }
}
    `;
export type DeleteGlobalServiceMutationFn = Apollo.MutationFunction<DeleteGlobalServiceMutation, DeleteGlobalServiceMutationVariables>;

/**
 * __useDeleteGlobalServiceMutation__
 *
 * To run a mutation, you first call `useDeleteGlobalServiceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteGlobalServiceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteGlobalServiceMutation, { data, loading, error }] = useDeleteGlobalServiceMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteGlobalServiceMutation(baseOptions?: Apollo.MutationHookOptions<DeleteGlobalServiceMutation, DeleteGlobalServiceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteGlobalServiceMutation, DeleteGlobalServiceMutationVariables>(DeleteGlobalServiceDocument, options);
      }
export type DeleteGlobalServiceMutationHookResult = ReturnType<typeof useDeleteGlobalServiceMutation>;
export type DeleteGlobalServiceMutationResult = Apollo.MutationResult<DeleteGlobalServiceMutation>;
export type DeleteGlobalServiceMutationOptions = Apollo.BaseMutationOptions<DeleteGlobalServiceMutation, DeleteGlobalServiceMutationVariables>;
export const UpdateDeploymentSettingsDocument = gql`
    mutation UpdateDeploymentSettings($attributes: DeploymentSettingsAttributes!) {
  updateDeploymentSettings(attributes: $attributes) {
    ...DeploymentSettings
  }
}
    ${DeploymentSettingsFragmentDoc}`;
export type UpdateDeploymentSettingsMutationFn = Apollo.MutationFunction<UpdateDeploymentSettingsMutation, UpdateDeploymentSettingsMutationVariables>;

/**
 * __useUpdateDeploymentSettingsMutation__
 *
 * To run a mutation, you first call `useUpdateDeploymentSettingsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateDeploymentSettingsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateDeploymentSettingsMutation, { data, loading, error }] = useUpdateDeploymentSettingsMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useUpdateDeploymentSettingsMutation(baseOptions?: Apollo.MutationHookOptions<UpdateDeploymentSettingsMutation, UpdateDeploymentSettingsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateDeploymentSettingsMutation, UpdateDeploymentSettingsMutationVariables>(UpdateDeploymentSettingsDocument, options);
      }
export type UpdateDeploymentSettingsMutationHookResult = ReturnType<typeof useUpdateDeploymentSettingsMutation>;
export type UpdateDeploymentSettingsMutationResult = Apollo.MutationResult<UpdateDeploymentSettingsMutation>;
export type UpdateDeploymentSettingsMutationOptions = Apollo.BaseMutationOptions<UpdateDeploymentSettingsMutation, UpdateDeploymentSettingsMutationVariables>;
export const DeploymentSettingsDocument = gql`
    query DeploymentSettings {
  deploymentSettings {
    ...DeploymentSettings
  }
}
    ${DeploymentSettingsFragmentDoc}`;

/**
 * __useDeploymentSettingsQuery__
 *
 * To run a query within a React component, call `useDeploymentSettingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDeploymentSettingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDeploymentSettingsQuery({
 *   variables: {
 *   },
 * });
 */
export function useDeploymentSettingsQuery(baseOptions?: Apollo.QueryHookOptions<DeploymentSettingsQuery, DeploymentSettingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DeploymentSettingsQuery, DeploymentSettingsQueryVariables>(DeploymentSettingsDocument, options);
      }
export function useDeploymentSettingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DeploymentSettingsQuery, DeploymentSettingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DeploymentSettingsQuery, DeploymentSettingsQueryVariables>(DeploymentSettingsDocument, options);
        }
export function useDeploymentSettingsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<DeploymentSettingsQuery, DeploymentSettingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<DeploymentSettingsQuery, DeploymentSettingsQueryVariables>(DeploymentSettingsDocument, options);
        }
export type DeploymentSettingsQueryHookResult = ReturnType<typeof useDeploymentSettingsQuery>;
export type DeploymentSettingsLazyQueryHookResult = ReturnType<typeof useDeploymentSettingsLazyQuery>;
export type DeploymentSettingsSuspenseQueryHookResult = ReturnType<typeof useDeploymentSettingsSuspenseQuery>;
export type DeploymentSettingsQueryResult = Apollo.QueryResult<DeploymentSettingsQuery, DeploymentSettingsQueryVariables>;
export const PipelinesDocument = gql`
    query Pipelines($q: String, $first: Int = 50, $after: String) {
  pipelines(q: $q, first: $first, after: $after) {
    edges {
      cursor
      node {
        ...Pipeline
      }
    }
    pageInfo {
      ...PageInfo
    }
  }
}
    ${PipelineFragmentDoc}
${PageInfoFragmentDoc}`;

/**
 * __usePipelinesQuery__
 *
 * To run a query within a React component, call `usePipelinesQuery` and pass it any options that fit your needs.
 * When your component renders, `usePipelinesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePipelinesQuery({
 *   variables: {
 *      q: // value for 'q'
 *      first: // value for 'first'
 *      after: // value for 'after'
 *   },
 * });
 */
export function usePipelinesQuery(baseOptions?: Apollo.QueryHookOptions<PipelinesQuery, PipelinesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PipelinesQuery, PipelinesQueryVariables>(PipelinesDocument, options);
      }
export function usePipelinesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PipelinesQuery, PipelinesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PipelinesQuery, PipelinesQueryVariables>(PipelinesDocument, options);
        }
export function usePipelinesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PipelinesQuery, PipelinesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PipelinesQuery, PipelinesQueryVariables>(PipelinesDocument, options);
        }
export type PipelinesQueryHookResult = ReturnType<typeof usePipelinesQuery>;
export type PipelinesLazyQueryHookResult = ReturnType<typeof usePipelinesLazyQuery>;
export type PipelinesSuspenseQueryHookResult = ReturnType<typeof usePipelinesSuspenseQuery>;
export type PipelinesQueryResult = Apollo.QueryResult<PipelinesQuery, PipelinesQueryVariables>;
export const JobGateDocument = gql`
    query JobGate($id: ID!) {
  pipelineGate(id: $id) {
    ...PipelineGate
    job {
      ...PipelineGateJob
    }
  }
}
    ${PipelineGateFragmentDoc}
${PipelineGateJobFragmentDoc}`;

/**
 * __useJobGateQuery__
 *
 * To run a query within a React component, call `useJobGateQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobGateQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobGateQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useJobGateQuery(baseOptions: Apollo.QueryHookOptions<JobGateQuery, JobGateQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<JobGateQuery, JobGateQueryVariables>(JobGateDocument, options);
      }
export function useJobGateLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<JobGateQuery, JobGateQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<JobGateQuery, JobGateQueryVariables>(JobGateDocument, options);
        }
export function useJobGateSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<JobGateQuery, JobGateQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<JobGateQuery, JobGateQueryVariables>(JobGateDocument, options);
        }
export type JobGateQueryHookResult = ReturnType<typeof useJobGateQuery>;
export type JobGateLazyQueryHookResult = ReturnType<typeof useJobGateLazyQuery>;
export type JobGateSuspenseQueryHookResult = ReturnType<typeof useJobGateSuspenseQuery>;
export type JobGateQueryResult = Apollo.QueryResult<JobGateQuery, JobGateQueryVariables>;
export const JobGateLogsDocument = gql`
    query JobGateLogs($id: ID!, $container: String!, $sinceSeconds: Int!) {
  pipelineGate(id: $id) {
    job {
      logs(container: $container, sinceSeconds: $sinceSeconds)
    }
  }
}
    `;

/**
 * __useJobGateLogsQuery__
 *
 * To run a query within a React component, call `useJobGateLogsQuery` and pass it any options that fit your needs.
 * When your component renders, `useJobGateLogsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJobGateLogsQuery({
 *   variables: {
 *      id: // value for 'id'
 *      container: // value for 'container'
 *      sinceSeconds: // value for 'sinceSeconds'
 *   },
 * });
 */
export function useJobGateLogsQuery(baseOptions: Apollo.QueryHookOptions<JobGateLogsQuery, JobGateLogsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<JobGateLogsQuery, JobGateLogsQueryVariables>(JobGateLogsDocument, options);
      }
export function useJobGateLogsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<JobGateLogsQuery, JobGateLogsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<JobGateLogsQuery, JobGateLogsQueryVariables>(JobGateLogsDocument, options);
        }
export function useJobGateLogsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<JobGateLogsQuery, JobGateLogsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<JobGateLogsQuery, JobGateLogsQueryVariables>(JobGateLogsDocument, options);
        }
export type JobGateLogsQueryHookResult = ReturnType<typeof useJobGateLogsQuery>;
export type JobGateLogsLazyQueryHookResult = ReturnType<typeof useJobGateLogsLazyQuery>;
export type JobGateLogsSuspenseQueryHookResult = ReturnType<typeof useJobGateLogsSuspenseQuery>;
export type JobGateLogsQueryResult = Apollo.QueryResult<JobGateLogsQuery, JobGateLogsQueryVariables>;
export const PipelineDocument = gql`
    query Pipeline($id: ID!) {
  pipeline(id: $id) {
    ...Pipeline
  }
}
    ${PipelineFragmentDoc}`;

/**
 * __usePipelineQuery__
 *
 * To run a query within a React component, call `usePipelineQuery` and pass it any options that fit your needs.
 * When your component renders, `usePipelineQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePipelineQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function usePipelineQuery(baseOptions: Apollo.QueryHookOptions<PipelineQuery, PipelineQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PipelineQuery, PipelineQueryVariables>(PipelineDocument, options);
      }
export function usePipelineLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PipelineQuery, PipelineQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PipelineQuery, PipelineQueryVariables>(PipelineDocument, options);
        }
export function usePipelineSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PipelineQuery, PipelineQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PipelineQuery, PipelineQueryVariables>(PipelineDocument, options);
        }
export type PipelineQueryHookResult = ReturnType<typeof usePipelineQuery>;
export type PipelineLazyQueryHookResult = ReturnType<typeof usePipelineLazyQuery>;
export type PipelineSuspenseQueryHookResult = ReturnType<typeof usePipelineSuspenseQuery>;
export type PipelineQueryResult = Apollo.QueryResult<PipelineQuery, PipelineQueryVariables>;
export const DeletePipelineDocument = gql`
    mutation deletePipeline($id: ID!) {
  deletePipeline(id: $id) {
    ...Pipeline
  }
}
    ${PipelineFragmentDoc}`;
export type DeletePipelineMutationFn = Apollo.MutationFunction<DeletePipelineMutation, DeletePipelineMutationVariables>;

/**
 * __useDeletePipelineMutation__
 *
 * To run a mutation, you first call `useDeletePipelineMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeletePipelineMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deletePipelineMutation, { data, loading, error }] = useDeletePipelineMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeletePipelineMutation(baseOptions?: Apollo.MutationHookOptions<DeletePipelineMutation, DeletePipelineMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeletePipelineMutation, DeletePipelineMutationVariables>(DeletePipelineDocument, options);
      }
export type DeletePipelineMutationHookResult = ReturnType<typeof useDeletePipelineMutation>;
export type DeletePipelineMutationResult = Apollo.MutationResult<DeletePipelineMutation>;
export type DeletePipelineMutationOptions = Apollo.BaseMutationOptions<DeletePipelineMutation, DeletePipelineMutationVariables>;
export const ApproveGateDocument = gql`
    mutation ApproveGate($id: ID!) {
  approveGate(id: $id) {
    ...PipelineGate
  }
}
    ${PipelineGateFragmentDoc}`;
export type ApproveGateMutationFn = Apollo.MutationFunction<ApproveGateMutation, ApproveGateMutationVariables>;

/**
 * __useApproveGateMutation__
 *
 * To run a mutation, you first call `useApproveGateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useApproveGateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [approveGateMutation, { data, loading, error }] = useApproveGateMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useApproveGateMutation(baseOptions?: Apollo.MutationHookOptions<ApproveGateMutation, ApproveGateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ApproveGateMutation, ApproveGateMutationVariables>(ApproveGateDocument, options);
      }
export type ApproveGateMutationHookResult = ReturnType<typeof useApproveGateMutation>;
export type ApproveGateMutationResult = Apollo.MutationResult<ApproveGateMutation>;
export type ApproveGateMutationOptions = Apollo.BaseMutationOptions<ApproveGateMutation, ApproveGateMutationVariables>;
export const ClusterProvidersDocument = gql`
    query ClusterProviders {
  clusterProviders(first: 100) {
    edges {
      node {
        ...ClusterProvider
      }
    }
  }
}
    ${ClusterProviderFragmentDoc}`;

/**
 * __useClusterProvidersQuery__
 *
 * To run a query within a React component, call `useClusterProvidersQuery` and pass it any options that fit your needs.
 * When your component renders, `useClusterProvidersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClusterProvidersQuery({
 *   variables: {
 *   },
 * });
 */
export function useClusterProvidersQuery(baseOptions?: Apollo.QueryHookOptions<ClusterProvidersQuery, ClusterProvidersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClusterProvidersQuery, ClusterProvidersQueryVariables>(ClusterProvidersDocument, options);
      }
export function useClusterProvidersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClusterProvidersQuery, ClusterProvidersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClusterProvidersQuery, ClusterProvidersQueryVariables>(ClusterProvidersDocument, options);
        }
export function useClusterProvidersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ClusterProvidersQuery, ClusterProvidersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ClusterProvidersQuery, ClusterProvidersQueryVariables>(ClusterProvidersDocument, options);
        }
export type ClusterProvidersQueryHookResult = ReturnType<typeof useClusterProvidersQuery>;
export type ClusterProvidersLazyQueryHookResult = ReturnType<typeof useClusterProvidersLazyQuery>;
export type ClusterProvidersSuspenseQueryHookResult = ReturnType<typeof useClusterProvidersSuspenseQuery>;
export type ClusterProvidersQueryResult = Apollo.QueryResult<ClusterProvidersQuery, ClusterProvidersQueryVariables>;
export const CreateClusterProviderDocument = gql`
    mutation CreateClusterProvider($attributes: ClusterProviderAttributes!) {
  createClusterProvider(attributes: $attributes) {
    ...ClusterProvider
  }
}
    ${ClusterProviderFragmentDoc}`;
export type CreateClusterProviderMutationFn = Apollo.MutationFunction<CreateClusterProviderMutation, CreateClusterProviderMutationVariables>;

/**
 * __useCreateClusterProviderMutation__
 *
 * To run a mutation, you first call `useCreateClusterProviderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateClusterProviderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createClusterProviderMutation, { data, loading, error }] = useCreateClusterProviderMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useCreateClusterProviderMutation(baseOptions?: Apollo.MutationHookOptions<CreateClusterProviderMutation, CreateClusterProviderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateClusterProviderMutation, CreateClusterProviderMutationVariables>(CreateClusterProviderDocument, options);
      }
export type CreateClusterProviderMutationHookResult = ReturnType<typeof useCreateClusterProviderMutation>;
export type CreateClusterProviderMutationResult = Apollo.MutationResult<CreateClusterProviderMutation>;
export type CreateClusterProviderMutationOptions = Apollo.BaseMutationOptions<CreateClusterProviderMutation, CreateClusterProviderMutationVariables>;
export const UpdateClusterProviderDocument = gql`
    mutation UpdateClusterProvider($id: ID!, $attributes: ClusterProviderUpdateAttributes!) {
  updateClusterProvider(id: $id, attributes: $attributes) {
    ...ClusterProvider
  }
}
    ${ClusterProviderFragmentDoc}`;
export type UpdateClusterProviderMutationFn = Apollo.MutationFunction<UpdateClusterProviderMutation, UpdateClusterProviderMutationVariables>;

/**
 * __useUpdateClusterProviderMutation__
 *
 * To run a mutation, you first call `useUpdateClusterProviderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateClusterProviderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateClusterProviderMutation, { data, loading, error }] = useUpdateClusterProviderMutation({
 *   variables: {
 *      id: // value for 'id'
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useUpdateClusterProviderMutation(baseOptions?: Apollo.MutationHookOptions<UpdateClusterProviderMutation, UpdateClusterProviderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateClusterProviderMutation, UpdateClusterProviderMutationVariables>(UpdateClusterProviderDocument, options);
      }
export type UpdateClusterProviderMutationHookResult = ReturnType<typeof useUpdateClusterProviderMutation>;
export type UpdateClusterProviderMutationResult = Apollo.MutationResult<UpdateClusterProviderMutation>;
export type UpdateClusterProviderMutationOptions = Apollo.BaseMutationOptions<UpdateClusterProviderMutation, UpdateClusterProviderMutationVariables>;
export const DeleteClusterProviderDocument = gql`
    mutation DeleteClusterProvider($id: ID!) {
  deleteClusterProvider(id: $id) {
    ...ClusterProvider
  }
}
    ${ClusterProviderFragmentDoc}`;
export type DeleteClusterProviderMutationFn = Apollo.MutationFunction<DeleteClusterProviderMutation, DeleteClusterProviderMutationVariables>;

/**
 * __useDeleteClusterProviderMutation__
 *
 * To run a mutation, you first call `useDeleteClusterProviderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteClusterProviderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteClusterProviderMutation, { data, loading, error }] = useDeleteClusterProviderMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteClusterProviderMutation(baseOptions?: Apollo.MutationHookOptions<DeleteClusterProviderMutation, DeleteClusterProviderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteClusterProviderMutation, DeleteClusterProviderMutationVariables>(DeleteClusterProviderDocument, options);
      }
export type DeleteClusterProviderMutationHookResult = ReturnType<typeof useDeleteClusterProviderMutation>;
export type DeleteClusterProviderMutationResult = Apollo.MutationResult<DeleteClusterProviderMutation>;
export type DeleteClusterProviderMutationOptions = Apollo.BaseMutationOptions<DeleteClusterProviderMutation, DeleteClusterProviderMutationVariables>;
export const CreatePullRequestDocument = gql`
    mutation CreatePullRequest($id: ID!, $branch: String!, $context: Json!) {
  createPullRequest(id: $id, branch: $branch, context: $context) {
    ...PullRequest
  }
}
    ${PullRequestFragmentDoc}`;
export type CreatePullRequestMutationFn = Apollo.MutationFunction<CreatePullRequestMutation, CreatePullRequestMutationVariables>;

/**
 * __useCreatePullRequestMutation__
 *
 * To run a mutation, you first call `useCreatePullRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreatePullRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createPullRequestMutation, { data, loading, error }] = useCreatePullRequestMutation({
 *   variables: {
 *      id: // value for 'id'
 *      branch: // value for 'branch'
 *      context: // value for 'context'
 *   },
 * });
 */
export function useCreatePullRequestMutation(baseOptions?: Apollo.MutationHookOptions<CreatePullRequestMutation, CreatePullRequestMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreatePullRequestMutation, CreatePullRequestMutationVariables>(CreatePullRequestDocument, options);
      }
export type CreatePullRequestMutationHookResult = ReturnType<typeof useCreatePullRequestMutation>;
export type CreatePullRequestMutationResult = Apollo.MutationResult<CreatePullRequestMutation>;
export type CreatePullRequestMutationOptions = Apollo.BaseMutationOptions<CreatePullRequestMutation, CreatePullRequestMutationVariables>;
export const PullRequestsDocument = gql`
    query PullRequests($q: String, $first: Int = 100, $after: String, $clusterId: ID, $serviceId: ID) {
  pullRequests(
    q: $q
    first: $first
    after: $after
    clusterId: $clusterId
    serviceId: $serviceId
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...PullRequest
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${PullRequestFragmentDoc}`;

/**
 * __usePullRequestsQuery__
 *
 * To run a query within a React component, call `usePullRequestsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePullRequestsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePullRequestsQuery({
 *   variables: {
 *      q: // value for 'q'
 *      first: // value for 'first'
 *      after: // value for 'after'
 *      clusterId: // value for 'clusterId'
 *      serviceId: // value for 'serviceId'
 *   },
 * });
 */
export function usePullRequestsQuery(baseOptions?: Apollo.QueryHookOptions<PullRequestsQuery, PullRequestsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PullRequestsQuery, PullRequestsQueryVariables>(PullRequestsDocument, options);
      }
export function usePullRequestsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PullRequestsQuery, PullRequestsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PullRequestsQuery, PullRequestsQueryVariables>(PullRequestsDocument, options);
        }
export function usePullRequestsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PullRequestsQuery, PullRequestsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PullRequestsQuery, PullRequestsQueryVariables>(PullRequestsDocument, options);
        }
export type PullRequestsQueryHookResult = ReturnType<typeof usePullRequestsQuery>;
export type PullRequestsLazyQueryHookResult = ReturnType<typeof usePullRequestsLazyQuery>;
export type PullRequestsSuspenseQueryHookResult = ReturnType<typeof usePullRequestsSuspenseQuery>;
export type PullRequestsQueryResult = Apollo.QueryResult<PullRequestsQuery, PullRequestsQueryVariables>;
export const ServiceDeploymentsDocument = gql`
    query ServiceDeployments($first: Int = 100, $after: String, $q: String, $cluster: String, $clusterId: ID, $status: ServiceDeploymentStatus) {
  serviceDeployments(
    first: $first
    after: $after
    q: $q
    cluster: $cluster
    clusterId: $clusterId
    status: $status
  ) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...ServiceDeploymentsRow
      }
    }
  }
  serviceStatuses(clusterId: $clusterId) {
    ...ServiceStatusCount
  }
}
    ${PageInfoFragmentDoc}
${ServiceDeploymentsRowFragmentDoc}
${ServiceStatusCountFragmentDoc}`;

/**
 * __useServiceDeploymentsQuery__
 *
 * To run a query within a React component, call `useServiceDeploymentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceDeploymentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceDeploymentsQuery({
 *   variables: {
 *      first: // value for 'first'
 *      after: // value for 'after'
 *      q: // value for 'q'
 *      cluster: // value for 'cluster'
 *      clusterId: // value for 'clusterId'
 *      status: // value for 'status'
 *   },
 * });
 */
export function useServiceDeploymentsQuery(baseOptions?: Apollo.QueryHookOptions<ServiceDeploymentsQuery, ServiceDeploymentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceDeploymentsQuery, ServiceDeploymentsQueryVariables>(ServiceDeploymentsDocument, options);
      }
export function useServiceDeploymentsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceDeploymentsQuery, ServiceDeploymentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceDeploymentsQuery, ServiceDeploymentsQueryVariables>(ServiceDeploymentsDocument, options);
        }
export function useServiceDeploymentsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ServiceDeploymentsQuery, ServiceDeploymentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ServiceDeploymentsQuery, ServiceDeploymentsQueryVariables>(ServiceDeploymentsDocument, options);
        }
export type ServiceDeploymentsQueryHookResult = ReturnType<typeof useServiceDeploymentsQuery>;
export type ServiceDeploymentsLazyQueryHookResult = ReturnType<typeof useServiceDeploymentsLazyQuery>;
export type ServiceDeploymentsSuspenseQueryHookResult = ReturnType<typeof useServiceDeploymentsSuspenseQuery>;
export type ServiceDeploymentsQueryResult = Apollo.QueryResult<ServiceDeploymentsQuery, ServiceDeploymentsQueryVariables>;
export const ServiceDeploymentsTinyDocument = gql`
    query ServiceDeploymentsTiny {
  serviceDeployments(first: 100) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        id
        name
        cluster {
          id
          name
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}`;

/**
 * __useServiceDeploymentsTinyQuery__
 *
 * To run a query within a React component, call `useServiceDeploymentsTinyQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceDeploymentsTinyQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceDeploymentsTinyQuery({
 *   variables: {
 *   },
 * });
 */
export function useServiceDeploymentsTinyQuery(baseOptions?: Apollo.QueryHookOptions<ServiceDeploymentsTinyQuery, ServiceDeploymentsTinyQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceDeploymentsTinyQuery, ServiceDeploymentsTinyQueryVariables>(ServiceDeploymentsTinyDocument, options);
      }
export function useServiceDeploymentsTinyLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceDeploymentsTinyQuery, ServiceDeploymentsTinyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceDeploymentsTinyQuery, ServiceDeploymentsTinyQueryVariables>(ServiceDeploymentsTinyDocument, options);
        }
export function useServiceDeploymentsTinySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ServiceDeploymentsTinyQuery, ServiceDeploymentsTinyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ServiceDeploymentsTinyQuery, ServiceDeploymentsTinyQueryVariables>(ServiceDeploymentsTinyDocument, options);
        }
export type ServiceDeploymentsTinyQueryHookResult = ReturnType<typeof useServiceDeploymentsTinyQuery>;
export type ServiceDeploymentsTinyLazyQueryHookResult = ReturnType<typeof useServiceDeploymentsTinyLazyQuery>;
export type ServiceDeploymentsTinySuspenseQueryHookResult = ReturnType<typeof useServiceDeploymentsTinySuspenseQuery>;
export type ServiceDeploymentsTinyQueryResult = Apollo.QueryResult<ServiceDeploymentsTinyQuery, ServiceDeploymentsTinyQueryVariables>;
export const ServiceDeploymentDocument = gql`
    query ServiceDeployment($id: ID!) {
  serviceDeployment(id: $id) {
    ...ServiceDeploymentDetails
  }
}
    ${ServiceDeploymentDetailsFragmentDoc}`;

/**
 * __useServiceDeploymentQuery__
 *
 * To run a query within a React component, call `useServiceDeploymentQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceDeploymentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceDeploymentQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useServiceDeploymentQuery(baseOptions: Apollo.QueryHookOptions<ServiceDeploymentQuery, ServiceDeploymentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceDeploymentQuery, ServiceDeploymentQueryVariables>(ServiceDeploymentDocument, options);
      }
export function useServiceDeploymentLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceDeploymentQuery, ServiceDeploymentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceDeploymentQuery, ServiceDeploymentQueryVariables>(ServiceDeploymentDocument, options);
        }
export function useServiceDeploymentSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ServiceDeploymentQuery, ServiceDeploymentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ServiceDeploymentQuery, ServiceDeploymentQueryVariables>(ServiceDeploymentDocument, options);
        }
export type ServiceDeploymentQueryHookResult = ReturnType<typeof useServiceDeploymentQuery>;
export type ServiceDeploymentLazyQueryHookResult = ReturnType<typeof useServiceDeploymentLazyQuery>;
export type ServiceDeploymentSuspenseQueryHookResult = ReturnType<typeof useServiceDeploymentSuspenseQuery>;
export type ServiceDeploymentQueryResult = Apollo.QueryResult<ServiceDeploymentQuery, ServiceDeploymentQueryVariables>;
export const ServiceDeploymentComponentsDocument = gql`
    query ServiceDeploymentComponents($id: ID!) {
  serviceDeployment(id: $id) {
    id
    name
    cluster {
      id
      name
      handle
    }
    components {
      ...ServiceDeploymentComponent
    }
  }
}
    ${ServiceDeploymentComponentFragmentDoc}`;

/**
 * __useServiceDeploymentComponentsQuery__
 *
 * To run a query within a React component, call `useServiceDeploymentComponentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceDeploymentComponentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceDeploymentComponentsQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useServiceDeploymentComponentsQuery(baseOptions: Apollo.QueryHookOptions<ServiceDeploymentComponentsQuery, ServiceDeploymentComponentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceDeploymentComponentsQuery, ServiceDeploymentComponentsQueryVariables>(ServiceDeploymentComponentsDocument, options);
      }
export function useServiceDeploymentComponentsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceDeploymentComponentsQuery, ServiceDeploymentComponentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceDeploymentComponentsQuery, ServiceDeploymentComponentsQueryVariables>(ServiceDeploymentComponentsDocument, options);
        }
export function useServiceDeploymentComponentsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ServiceDeploymentComponentsQuery, ServiceDeploymentComponentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ServiceDeploymentComponentsQuery, ServiceDeploymentComponentsQueryVariables>(ServiceDeploymentComponentsDocument, options);
        }
export type ServiceDeploymentComponentsQueryHookResult = ReturnType<typeof useServiceDeploymentComponentsQuery>;
export type ServiceDeploymentComponentsLazyQueryHookResult = ReturnType<typeof useServiceDeploymentComponentsLazyQuery>;
export type ServiceDeploymentComponentsSuspenseQueryHookResult = ReturnType<typeof useServiceDeploymentComponentsSuspenseQuery>;
export type ServiceDeploymentComponentsQueryResult = Apollo.QueryResult<ServiceDeploymentComponentsQuery, ServiceDeploymentComponentsQueryVariables>;
export const ServiceDeploymentSecretsDocument = gql`
    query ServiceDeploymentSecrets($id: ID!) {
  serviceDeployment(id: $id) {
    configuration {
      name
      value
    }
    helm {
      values
    }
  }
}
    `;

/**
 * __useServiceDeploymentSecretsQuery__
 *
 * To run a query within a React component, call `useServiceDeploymentSecretsQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceDeploymentSecretsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceDeploymentSecretsQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useServiceDeploymentSecretsQuery(baseOptions: Apollo.QueryHookOptions<ServiceDeploymentSecretsQuery, ServiceDeploymentSecretsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceDeploymentSecretsQuery, ServiceDeploymentSecretsQueryVariables>(ServiceDeploymentSecretsDocument, options);
      }
export function useServiceDeploymentSecretsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceDeploymentSecretsQuery, ServiceDeploymentSecretsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceDeploymentSecretsQuery, ServiceDeploymentSecretsQueryVariables>(ServiceDeploymentSecretsDocument, options);
        }
export function useServiceDeploymentSecretsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ServiceDeploymentSecretsQuery, ServiceDeploymentSecretsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ServiceDeploymentSecretsQuery, ServiceDeploymentSecretsQueryVariables>(ServiceDeploymentSecretsDocument, options);
        }
export type ServiceDeploymentSecretsQueryHookResult = ReturnType<typeof useServiceDeploymentSecretsQuery>;
export type ServiceDeploymentSecretsLazyQueryHookResult = ReturnType<typeof useServiceDeploymentSecretsLazyQuery>;
export type ServiceDeploymentSecretsSuspenseQueryHookResult = ReturnType<typeof useServiceDeploymentSecretsSuspenseQuery>;
export type ServiceDeploymentSecretsQueryResult = Apollo.QueryResult<ServiceDeploymentSecretsQuery, ServiceDeploymentSecretsQueryVariables>;
export const ServiceDeploymentRevisionsDocument = gql`
    query ServiceDeploymentRevisions($id: ID!) {
  serviceDeployment(id: $id) {
    ...ServiceDeploymentRevisions
  }
}
    ${ServiceDeploymentRevisionsFragmentDoc}`;

/**
 * __useServiceDeploymentRevisionsQuery__
 *
 * To run a query within a React component, call `useServiceDeploymentRevisionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceDeploymentRevisionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceDeploymentRevisionsQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useServiceDeploymentRevisionsQuery(baseOptions: Apollo.QueryHookOptions<ServiceDeploymentRevisionsQuery, ServiceDeploymentRevisionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceDeploymentRevisionsQuery, ServiceDeploymentRevisionsQueryVariables>(ServiceDeploymentRevisionsDocument, options);
      }
export function useServiceDeploymentRevisionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceDeploymentRevisionsQuery, ServiceDeploymentRevisionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceDeploymentRevisionsQuery, ServiceDeploymentRevisionsQueryVariables>(ServiceDeploymentRevisionsDocument, options);
        }
export function useServiceDeploymentRevisionsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ServiceDeploymentRevisionsQuery, ServiceDeploymentRevisionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ServiceDeploymentRevisionsQuery, ServiceDeploymentRevisionsQueryVariables>(ServiceDeploymentRevisionsDocument, options);
        }
export type ServiceDeploymentRevisionsQueryHookResult = ReturnType<typeof useServiceDeploymentRevisionsQuery>;
export type ServiceDeploymentRevisionsLazyQueryHookResult = ReturnType<typeof useServiceDeploymentRevisionsLazyQuery>;
export type ServiceDeploymentRevisionsSuspenseQueryHookResult = ReturnType<typeof useServiceDeploymentRevisionsSuspenseQuery>;
export type ServiceDeploymentRevisionsQueryResult = Apollo.QueryResult<ServiceDeploymentRevisionsQuery, ServiceDeploymentRevisionsQueryVariables>;
export const CreateServiceDeploymentDocument = gql`
    mutation CreateServiceDeployment($attributes: ServiceDeploymentAttributes!, $cluster: String, $clusterId: ID) {
  createServiceDeployment(
    attributes: $attributes
    cluster: $cluster
    clusterId: $clusterId
  ) {
    ...ServiceDeploymentsRow
  }
}
    ${ServiceDeploymentsRowFragmentDoc}`;
export type CreateServiceDeploymentMutationFn = Apollo.MutationFunction<CreateServiceDeploymentMutation, CreateServiceDeploymentMutationVariables>;

/**
 * __useCreateServiceDeploymentMutation__
 *
 * To run a mutation, you first call `useCreateServiceDeploymentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateServiceDeploymentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createServiceDeploymentMutation, { data, loading, error }] = useCreateServiceDeploymentMutation({
 *   variables: {
 *      attributes: // value for 'attributes'
 *      cluster: // value for 'cluster'
 *      clusterId: // value for 'clusterId'
 *   },
 * });
 */
export function useCreateServiceDeploymentMutation(baseOptions?: Apollo.MutationHookOptions<CreateServiceDeploymentMutation, CreateServiceDeploymentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateServiceDeploymentMutation, CreateServiceDeploymentMutationVariables>(CreateServiceDeploymentDocument, options);
      }
export type CreateServiceDeploymentMutationHookResult = ReturnType<typeof useCreateServiceDeploymentMutation>;
export type CreateServiceDeploymentMutationResult = Apollo.MutationResult<CreateServiceDeploymentMutation>;
export type CreateServiceDeploymentMutationOptions = Apollo.BaseMutationOptions<CreateServiceDeploymentMutation, CreateServiceDeploymentMutationVariables>;
export const UpdateServiceDeploymentDocument = gql`
    mutation UpdateServiceDeployment($id: ID!, $attributes: ServiceUpdateAttributes!) {
  updateServiceDeployment(id: $id, attributes: $attributes) {
    ...ServiceDeploymentDetails
  }
}
    ${ServiceDeploymentDetailsFragmentDoc}`;
export type UpdateServiceDeploymentMutationFn = Apollo.MutationFunction<UpdateServiceDeploymentMutation, UpdateServiceDeploymentMutationVariables>;

/**
 * __useUpdateServiceDeploymentMutation__
 *
 * To run a mutation, you first call `useUpdateServiceDeploymentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateServiceDeploymentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateServiceDeploymentMutation, { data, loading, error }] = useUpdateServiceDeploymentMutation({
 *   variables: {
 *      id: // value for 'id'
 *      attributes: // value for 'attributes'
 *   },
 * });
 */
export function useUpdateServiceDeploymentMutation(baseOptions?: Apollo.MutationHookOptions<UpdateServiceDeploymentMutation, UpdateServiceDeploymentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateServiceDeploymentMutation, UpdateServiceDeploymentMutationVariables>(UpdateServiceDeploymentDocument, options);
      }
export type UpdateServiceDeploymentMutationHookResult = ReturnType<typeof useUpdateServiceDeploymentMutation>;
export type UpdateServiceDeploymentMutationResult = Apollo.MutationResult<UpdateServiceDeploymentMutation>;
export type UpdateServiceDeploymentMutationOptions = Apollo.BaseMutationOptions<UpdateServiceDeploymentMutation, UpdateServiceDeploymentMutationVariables>;
export const MergeServiceDocument = gql`
    mutation MergeService($id: ID!, $configuration: [ConfigAttributes]) {
  mergeService(id: $id, configuration: $configuration) {
    configuration {
      name
      value
    }
  }
}
    `;
export type MergeServiceMutationFn = Apollo.MutationFunction<MergeServiceMutation, MergeServiceMutationVariables>;

/**
 * __useMergeServiceMutation__
 *
 * To run a mutation, you first call `useMergeServiceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMergeServiceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [mergeServiceMutation, { data, loading, error }] = useMergeServiceMutation({
 *   variables: {
 *      id: // value for 'id'
 *      configuration: // value for 'configuration'
 *   },
 * });
 */
export function useMergeServiceMutation(baseOptions?: Apollo.MutationHookOptions<MergeServiceMutation, MergeServiceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<MergeServiceMutation, MergeServiceMutationVariables>(MergeServiceDocument, options);
      }
export type MergeServiceMutationHookResult = ReturnType<typeof useMergeServiceMutation>;
export type MergeServiceMutationResult = Apollo.MutationResult<MergeServiceMutation>;
export type MergeServiceMutationOptions = Apollo.BaseMutationOptions<MergeServiceMutation, MergeServiceMutationVariables>;
export const DeleteServiceDeploymentDocument = gql`
    mutation DeleteServiceDeployment($id: ID!) {
  deleteServiceDeployment(id: $id) {
    id
  }
}
    `;
export type DeleteServiceDeploymentMutationFn = Apollo.MutationFunction<DeleteServiceDeploymentMutation, DeleteServiceDeploymentMutationVariables>;

/**
 * __useDeleteServiceDeploymentMutation__
 *
 * To run a mutation, you first call `useDeleteServiceDeploymentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteServiceDeploymentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteServiceDeploymentMutation, { data, loading, error }] = useDeleteServiceDeploymentMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteServiceDeploymentMutation(baseOptions?: Apollo.MutationHookOptions<DeleteServiceDeploymentMutation, DeleteServiceDeploymentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteServiceDeploymentMutation, DeleteServiceDeploymentMutationVariables>(DeleteServiceDeploymentDocument, options);
      }
export type DeleteServiceDeploymentMutationHookResult = ReturnType<typeof useDeleteServiceDeploymentMutation>;
export type DeleteServiceDeploymentMutationResult = Apollo.MutationResult<DeleteServiceDeploymentMutation>;
export type DeleteServiceDeploymentMutationOptions = Apollo.BaseMutationOptions<DeleteServiceDeploymentMutation, DeleteServiceDeploymentMutationVariables>;
export const DetachServiceDeploymentDocument = gql`
    mutation DetachServiceDeployment($id: ID!) {
  detachServiceDeployment(id: $id) {
    id
  }
}
    `;
export type DetachServiceDeploymentMutationFn = Apollo.MutationFunction<DetachServiceDeploymentMutation, DetachServiceDeploymentMutationVariables>;

/**
 * __useDetachServiceDeploymentMutation__
 *
 * To run a mutation, you first call `useDetachServiceDeploymentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDetachServiceDeploymentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [detachServiceDeploymentMutation, { data, loading, error }] = useDetachServiceDeploymentMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetachServiceDeploymentMutation(baseOptions?: Apollo.MutationHookOptions<DetachServiceDeploymentMutation, DetachServiceDeploymentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DetachServiceDeploymentMutation, DetachServiceDeploymentMutationVariables>(DetachServiceDeploymentDocument, options);
      }
export type DetachServiceDeploymentMutationHookResult = ReturnType<typeof useDetachServiceDeploymentMutation>;
export type DetachServiceDeploymentMutationResult = Apollo.MutationResult<DetachServiceDeploymentMutation>;
export type DetachServiceDeploymentMutationOptions = Apollo.BaseMutationOptions<DetachServiceDeploymentMutation, DetachServiceDeploymentMutationVariables>;
export const RollbackServiceDocument = gql`
    mutation RollbackService($id: ID, $revisionId: ID!) {
  rollbackService(id: $id, revisionId: $revisionId) {
    ...ServiceDeploymentsRow
  }
}
    ${ServiceDeploymentsRowFragmentDoc}`;
export type RollbackServiceMutationFn = Apollo.MutationFunction<RollbackServiceMutation, RollbackServiceMutationVariables>;

/**
 * __useRollbackServiceMutation__
 *
 * To run a mutation, you first call `useRollbackServiceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRollbackServiceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [rollbackServiceMutation, { data, loading, error }] = useRollbackServiceMutation({
 *   variables: {
 *      id: // value for 'id'
 *      revisionId: // value for 'revisionId'
 *   },
 * });
 */
export function useRollbackServiceMutation(baseOptions?: Apollo.MutationHookOptions<RollbackServiceMutation, RollbackServiceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RollbackServiceMutation, RollbackServiceMutationVariables>(RollbackServiceDocument, options);
      }
export type RollbackServiceMutationHookResult = ReturnType<typeof useRollbackServiceMutation>;
export type RollbackServiceMutationResult = Apollo.MutationResult<RollbackServiceMutation>;
export type RollbackServiceMutationOptions = Apollo.BaseMutationOptions<RollbackServiceMutation, RollbackServiceMutationVariables>;
export const ProceedServiceDocument = gql`
    mutation ProceedService($id: ID!, $promotion: ServicePromotion) {
  proceed(id: $id, promotion: $promotion) {
    ...ServiceDeploymentDetails
  }
}
    ${ServiceDeploymentDetailsFragmentDoc}`;
export type ProceedServiceMutationFn = Apollo.MutationFunction<ProceedServiceMutation, ProceedServiceMutationVariables>;

/**
 * __useProceedServiceMutation__
 *
 * To run a mutation, you first call `useProceedServiceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useProceedServiceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [proceedServiceMutation, { data, loading, error }] = useProceedServiceMutation({
 *   variables: {
 *      id: // value for 'id'
 *      promotion: // value for 'promotion'
 *   },
 * });
 */
export function useProceedServiceMutation(baseOptions?: Apollo.MutationHookOptions<ProceedServiceMutation, ProceedServiceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ProceedServiceMutation, ProceedServiceMutationVariables>(ProceedServiceDocument, options);
      }
export type ProceedServiceMutationHookResult = ReturnType<typeof useProceedServiceMutation>;
export type ProceedServiceMutationResult = Apollo.MutationResult<ProceedServiceMutation>;
export type ProceedServiceMutationOptions = Apollo.BaseMutationOptions<ProceedServiceMutation, ProceedServiceMutationVariables>;
export const UpdateRbacDocument = gql`
    mutation UpdateRbac($serviceId: ID, $clusterId: ID, $rbac: RbacAttributes!) {
  updateRbac(serviceId: $serviceId, clusterId: $clusterId, rbac: $rbac)
}
    `;
export type UpdateRbacMutationFn = Apollo.MutationFunction<UpdateRbacMutation, UpdateRbacMutationVariables>;

/**
 * __useUpdateRbacMutation__
 *
 * To run a mutation, you first call `useUpdateRbacMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateRbacMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateRbacMutation, { data, loading, error }] = useUpdateRbacMutation({
 *   variables: {
 *      serviceId: // value for 'serviceId'
 *      clusterId: // value for 'clusterId'
 *      rbac: // value for 'rbac'
 *   },
 * });
 */
export function useUpdateRbacMutation(baseOptions?: Apollo.MutationHookOptions<UpdateRbacMutation, UpdateRbacMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateRbacMutation, UpdateRbacMutationVariables>(UpdateRbacDocument, options);
      }
export type UpdateRbacMutationHookResult = ReturnType<typeof useUpdateRbacMutation>;
export type UpdateRbacMutationResult = Apollo.MutationResult<UpdateRbacMutation>;
export type UpdateRbacMutationOptions = Apollo.BaseMutationOptions<UpdateRbacMutation, UpdateRbacMutationVariables>;
export const SelfManageDocument = gql`
    mutation SelfManage($values: String!) {
  selfManage(values: $values) {
    ...ServiceDeploymentsRow
  }
}
    ${ServiceDeploymentsRowFragmentDoc}`;
export type SelfManageMutationFn = Apollo.MutationFunction<SelfManageMutation, SelfManageMutationVariables>;

/**
 * __useSelfManageMutation__
 *
 * To run a mutation, you first call `useSelfManageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSelfManageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [selfManageMutation, { data, loading, error }] = useSelfManageMutation({
 *   variables: {
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSelfManageMutation(baseOptions?: Apollo.MutationHookOptions<SelfManageMutation, SelfManageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SelfManageMutation, SelfManageMutationVariables>(SelfManageDocument, options);
      }
export type SelfManageMutationHookResult = ReturnType<typeof useSelfManageMutation>;
export type SelfManageMutationResult = Apollo.MutationResult<SelfManageMutation>;
export type SelfManageMutationOptions = Apollo.BaseMutationOptions<SelfManageMutation, SelfManageMutationVariables>;
export const ServiceDeploymentBindingsDocument = gql`
    query ServiceDeploymentBindings($id: ID!) {
  serviceDeployment(id: $id) {
    id
    ...ServiceDeploymentBindings
  }
}
    ${ServiceDeploymentBindingsFragmentDoc}`;

/**
 * __useServiceDeploymentBindingsQuery__
 *
 * To run a query within a React component, call `useServiceDeploymentBindingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceDeploymentBindingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceDeploymentBindingsQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useServiceDeploymentBindingsQuery(baseOptions: Apollo.QueryHookOptions<ServiceDeploymentBindingsQuery, ServiceDeploymentBindingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceDeploymentBindingsQuery, ServiceDeploymentBindingsQueryVariables>(ServiceDeploymentBindingsDocument, options);
      }
export function useServiceDeploymentBindingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceDeploymentBindingsQuery, ServiceDeploymentBindingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceDeploymentBindingsQuery, ServiceDeploymentBindingsQueryVariables>(ServiceDeploymentBindingsDocument, options);
        }
export function useServiceDeploymentBindingsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ServiceDeploymentBindingsQuery, ServiceDeploymentBindingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ServiceDeploymentBindingsQuery, ServiceDeploymentBindingsQueryVariables>(ServiceDeploymentBindingsDocument, options);
        }
export type ServiceDeploymentBindingsQueryHookResult = ReturnType<typeof useServiceDeploymentBindingsQuery>;
export type ServiceDeploymentBindingsLazyQueryHookResult = ReturnType<typeof useServiceDeploymentBindingsLazyQuery>;
export type ServiceDeploymentBindingsSuspenseQueryHookResult = ReturnType<typeof useServiceDeploymentBindingsSuspenseQuery>;
export type ServiceDeploymentBindingsQueryResult = Apollo.QueryResult<ServiceDeploymentBindingsQuery, ServiceDeploymentBindingsQueryVariables>;
export const ServiceStatusesDocument = gql`
    query ServiceStatuses($clusterId: ID) {
  serviceStatuses(clusterId: $clusterId) {
    ...ServiceStatusCount
  }
}
    ${ServiceStatusCountFragmentDoc}`;

/**
 * __useServiceStatusesQuery__
 *
 * To run a query within a React component, call `useServiceStatusesQuery` and pass it any options that fit your needs.
 * When your component renders, `useServiceStatusesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useServiceStatusesQuery({
 *   variables: {
 *      clusterId: // value for 'clusterId'
 *   },
 * });
 */
export function useServiceStatusesQuery(baseOptions?: Apollo.QueryHookOptions<ServiceStatusesQuery, ServiceStatusesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServiceStatusesQuery, ServiceStatusesQueryVariables>(ServiceStatusesDocument, options);
      }
export function useServiceStatusesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServiceStatusesQuery, ServiceStatusesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServiceStatusesQuery, ServiceStatusesQueryVariables>(ServiceStatusesDocument, options);
        }
export function useServiceStatusesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ServiceStatusesQuery, ServiceStatusesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ServiceStatusesQuery, ServiceStatusesQueryVariables>(ServiceStatusesDocument, options);
        }
export type ServiceStatusesQueryHookResult = ReturnType<typeof useServiceStatusesQuery>;
export type ServiceStatusesLazyQueryHookResult = ReturnType<typeof useServiceStatusesLazyQuery>;
export type ServiceStatusesSuspenseQueryHookResult = ReturnType<typeof useServiceStatusesSuspenseQuery>;
export type ServiceStatusesQueryResult = Apollo.QueryResult<ServiceStatusesQuery, ServiceStatusesQueryVariables>;
export const ComponentTreeDocument = gql`
    query ComponentTree($id: ID!) {
  componentTree(id: $id) {
    ...ComponentTree
  }
}
    ${ComponentTreeFragmentDoc}`;

/**
 * __useComponentTreeQuery__
 *
 * To run a query within a React component, call `useComponentTreeQuery` and pass it any options that fit your needs.
 * When your component renders, `useComponentTreeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useComponentTreeQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useComponentTreeQuery(baseOptions: Apollo.QueryHookOptions<ComponentTreeQuery, ComponentTreeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ComponentTreeQuery, ComponentTreeQueryVariables>(ComponentTreeDocument, options);
      }
export function useComponentTreeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ComponentTreeQuery, ComponentTreeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ComponentTreeQuery, ComponentTreeQueryVariables>(ComponentTreeDocument, options);
        }
export function useComponentTreeSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ComponentTreeQuery, ComponentTreeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ComponentTreeQuery, ComponentTreeQueryVariables>(ComponentTreeDocument, options);
        }
export type ComponentTreeQueryHookResult = ReturnType<typeof useComponentTreeQuery>;
export type ComponentTreeLazyQueryHookResult = ReturnType<typeof useComponentTreeLazyQuery>;
export type ComponentTreeSuspenseQueryHookResult = ReturnType<typeof useComponentTreeSuspenseQuery>;
export type ComponentTreeQueryResult = Apollo.QueryResult<ComponentTreeQuery, ComponentTreeQueryVariables>;
export const RestorePostgresDocument = gql`
    mutation RestorePostgres($clone: CloneAttributes, $name: String!, $namespace: String!, $timestamp: DateTime!) {
  restorePostgres(
    clone: $clone
    name: $name
    namespace: $namespace
    timestamp: $timestamp
  ) {
    status {
      clusterStatus
    }
  }
}
    `;
export type RestorePostgresMutationFn = Apollo.MutationFunction<RestorePostgresMutation, RestorePostgresMutationVariables>;

/**
 * __useRestorePostgresMutation__
 *
 * To run a mutation, you first call `useRestorePostgresMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRestorePostgresMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [restorePostgresMutation, { data, loading, error }] = useRestorePostgresMutation({
 *   variables: {
 *      clone: // value for 'clone'
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      timestamp: // value for 'timestamp'
 *   },
 * });
 */
export function useRestorePostgresMutation(baseOptions?: Apollo.MutationHookOptions<RestorePostgresMutation, RestorePostgresMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RestorePostgresMutation, RestorePostgresMutationVariables>(RestorePostgresDocument, options);
      }
export type RestorePostgresMutationHookResult = ReturnType<typeof useRestorePostgresMutation>;
export type RestorePostgresMutationResult = Apollo.MutationResult<RestorePostgresMutation>;
export type RestorePostgresMutationOptions = Apollo.BaseMutationOptions<RestorePostgresMutation, RestorePostgresMutationVariables>;
export const PostgresDatabasesDocument = gql`
    query PostgresDatabases {
  postgresDatabases {
    ...DatabaseTableRow
  }
  applications {
    name
    spec {
      descriptor {
        icons
      }
    }
  }
}
    ${DatabaseTableRowFragmentDoc}`;

/**
 * __usePostgresDatabasesQuery__
 *
 * To run a query within a React component, call `usePostgresDatabasesQuery` and pass it any options that fit your needs.
 * When your component renders, `usePostgresDatabasesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePostgresDatabasesQuery({
 *   variables: {
 *   },
 * });
 */
export function usePostgresDatabasesQuery(baseOptions?: Apollo.QueryHookOptions<PostgresDatabasesQuery, PostgresDatabasesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PostgresDatabasesQuery, PostgresDatabasesQueryVariables>(PostgresDatabasesDocument, options);
      }
export function usePostgresDatabasesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PostgresDatabasesQuery, PostgresDatabasesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PostgresDatabasesQuery, PostgresDatabasesQueryVariables>(PostgresDatabasesDocument, options);
        }
export function usePostgresDatabasesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PostgresDatabasesQuery, PostgresDatabasesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PostgresDatabasesQuery, PostgresDatabasesQueryVariables>(PostgresDatabasesDocument, options);
        }
export type PostgresDatabasesQueryHookResult = ReturnType<typeof usePostgresDatabasesQuery>;
export type PostgresDatabasesLazyQueryHookResult = ReturnType<typeof usePostgresDatabasesLazyQuery>;
export type PostgresDatabasesSuspenseQueryHookResult = ReturnType<typeof usePostgresDatabasesSuspenseQuery>;
export type PostgresDatabasesQueryResult = Apollo.QueryResult<PostgresDatabasesQuery, PostgresDatabasesQueryVariables>;
export const PostgresDatabaseDocument = gql`
    query PostgresDatabase($name: String!, $namespace: String!) {
  postgresDatabase(name: $name, namespace: $namespace) {
    ...DatabaseTableRow
  }
}
    ${DatabaseTableRowFragmentDoc}`;

/**
 * __usePostgresDatabaseQuery__
 *
 * To run a query within a React component, call `usePostgresDatabaseQuery` and pass it any options that fit your needs.
 * When your component renders, `usePostgresDatabaseQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePostgresDatabaseQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *   },
 * });
 */
export function usePostgresDatabaseQuery(baseOptions: Apollo.QueryHookOptions<PostgresDatabaseQuery, PostgresDatabaseQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PostgresDatabaseQuery, PostgresDatabaseQueryVariables>(PostgresDatabaseDocument, options);
      }
export function usePostgresDatabaseLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PostgresDatabaseQuery, PostgresDatabaseQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PostgresDatabaseQuery, PostgresDatabaseQueryVariables>(PostgresDatabaseDocument, options);
        }
export function usePostgresDatabaseSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PostgresDatabaseQuery, PostgresDatabaseQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PostgresDatabaseQuery, PostgresDatabaseQueryVariables>(PostgresDatabaseDocument, options);
        }
export type PostgresDatabaseQueryHookResult = ReturnType<typeof usePostgresDatabaseQuery>;
export type PostgresDatabaseLazyQueryHookResult = ReturnType<typeof usePostgresDatabaseLazyQuery>;
export type PostgresDatabaseSuspenseQueryHookResult = ReturnType<typeof usePostgresDatabaseSuspenseQuery>;
export type PostgresDatabaseQueryResult = Apollo.QueryResult<PostgresDatabaseQuery, PostgresDatabaseQueryVariables>;
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
export function useGroupsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GroupsQuery, GroupsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GroupsQuery, GroupsQueryVariables>(GroupsDocument, options);
        }
export type GroupsQueryHookResult = ReturnType<typeof useGroupsQuery>;
export type GroupsLazyQueryHookResult = ReturnType<typeof useGroupsLazyQuery>;
export type GroupsSuspenseQueryHookResult = ReturnType<typeof useGroupsSuspenseQuery>;
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
export function useSearchGroupsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SearchGroupsQuery, SearchGroupsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SearchGroupsQuery, SearchGroupsQueryVariables>(SearchGroupsDocument, options);
        }
export type SearchGroupsQueryHookResult = ReturnType<typeof useSearchGroupsQuery>;
export type SearchGroupsLazyQueryHookResult = ReturnType<typeof useSearchGroupsLazyQuery>;
export type SearchGroupsSuspenseQueryHookResult = ReturnType<typeof useSearchGroupsSuspenseQuery>;
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
export function useGroupMembersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GroupMembersQuery, GroupMembersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GroupMembersQuery, GroupMembersQueryVariables>(GroupMembersDocument, options);
        }
export type GroupMembersQueryHookResult = ReturnType<typeof useGroupMembersQuery>;
export type GroupMembersLazyQueryHookResult = ReturnType<typeof useGroupMembersLazyQuery>;
export type GroupMembersSuspenseQueryHookResult = ReturnType<typeof useGroupMembersSuspenseQuery>;
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
export const DeleteGroupMemberDocument = gql`
    mutation DeleteGroupMember($groupId: ID!, $userId: ID!) {
  deleteGroupMember(groupId: $groupId, userId: $userId) {
    ...GroupMember
  }
}
    ${GroupMemberFragmentDoc}`;
export type DeleteGroupMemberMutationFn = Apollo.MutationFunction<DeleteGroupMemberMutation, DeleteGroupMemberMutationVariables>;

/**
 * __useDeleteGroupMemberMutation__
 *
 * To run a mutation, you first call `useDeleteGroupMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteGroupMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteGroupMemberMutation, { data, loading, error }] = useDeleteGroupMemberMutation({
 *   variables: {
 *      groupId: // value for 'groupId'
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useDeleteGroupMemberMutation(baseOptions?: Apollo.MutationHookOptions<DeleteGroupMemberMutation, DeleteGroupMemberMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteGroupMemberMutation, DeleteGroupMemberMutationVariables>(DeleteGroupMemberDocument, options);
      }
export type DeleteGroupMemberMutationHookResult = ReturnType<typeof useDeleteGroupMemberMutation>;
export type DeleteGroupMemberMutationResult = Apollo.MutationResult<DeleteGroupMemberMutation>;
export type DeleteGroupMemberMutationOptions = Apollo.BaseMutationOptions<DeleteGroupMemberMutation, DeleteGroupMemberMutationVariables>;
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
export const CanaryDocument = gql`
    query Canary($name: String!, $namespace: String!, $serviceId: ID) {
  canary(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...Canary
    canaryDeployment {
      ...Deployment
    }
    primaryDeployment {
      ...Deployment
    }
    ingress {
      ...Ingress
    }
    ingressCanary {
      ...Ingress
    }
    events {
      ...Event
    }
  }
}
    ${CanaryFragmentDoc}
${DeploymentFragmentDoc}
${IngressFragmentDoc}
${EventFragmentDoc}`;

/**
 * __useCanaryQuery__
 *
 * To run a query within a React component, call `useCanaryQuery` and pass it any options that fit your needs.
 * When your component renders, `useCanaryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCanaryQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      serviceId: // value for 'serviceId'
 *   },
 * });
 */
export function useCanaryQuery(baseOptions: Apollo.QueryHookOptions<CanaryQuery, CanaryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CanaryQuery, CanaryQueryVariables>(CanaryDocument, options);
      }
export function useCanaryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CanaryQuery, CanaryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CanaryQuery, CanaryQueryVariables>(CanaryDocument, options);
        }
export function useCanarySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CanaryQuery, CanaryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CanaryQuery, CanaryQueryVariables>(CanaryDocument, options);
        }
export type CanaryQueryHookResult = ReturnType<typeof useCanaryQuery>;
export type CanaryLazyQueryHookResult = ReturnType<typeof useCanaryLazyQuery>;
export type CanarySuspenseQueryHookResult = ReturnType<typeof useCanarySuspenseQuery>;
export type CanaryQueryResult = Apollo.QueryResult<CanaryQuery, CanaryQueryVariables>;
export const CertificateDocument = gql`
    query Certificate($name: String!, $namespace: String!, $serviceId: ID) {
  certificate(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...Certificate
    events {
      ...Event
    }
  }
}
    ${CertificateFragmentDoc}
${EventFragmentDoc}`;

/**
 * __useCertificateQuery__
 *
 * To run a query within a React component, call `useCertificateQuery` and pass it any options that fit your needs.
 * When your component renders, `useCertificateQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCertificateQuery({
 *   variables: {
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      serviceId: // value for 'serviceId'
 *   },
 * });
 */
export function useCertificateQuery(baseOptions: Apollo.QueryHookOptions<CertificateQuery, CertificateQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CertificateQuery, CertificateQueryVariables>(CertificateDocument, options);
      }
export function useCertificateLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CertificateQuery, CertificateQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CertificateQuery, CertificateQueryVariables>(CertificateDocument, options);
        }
export function useCertificateSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CertificateQuery, CertificateQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CertificateQuery, CertificateQueryVariables>(CertificateDocument, options);
        }
export type CertificateQueryHookResult = ReturnType<typeof useCertificateQuery>;
export type CertificateLazyQueryHookResult = ReturnType<typeof useCertificateLazyQuery>;
export type CertificateSuspenseQueryHookResult = ReturnType<typeof useCertificateSuspenseQuery>;
export type CertificateQueryResult = Apollo.QueryResult<CertificateQuery, CertificateQueryVariables>;
export const CronJobDocument = gql`
    query CronJob($name: String!, $namespace: String!, $serviceId: ID) {
  cronJob(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...CronJob
    events {
      ...Event
    }
    jobs {
      metadata {
        name
        namespace
      }
      status {
        ...JobStatus
      }
    }
  }
}
    ${CronJobFragmentDoc}
${EventFragmentDoc}
${JobStatusFragmentDoc}`;

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
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      serviceId: // value for 'serviceId'
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
export const DaemonSetDocument = gql`
    query DaemonSet($name: String!, $namespace: String!, $serviceId: ID) {
  daemonSet(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...DaemonSet
    events {
      ...Event
    }
  }
}
    ${DaemonSetFragmentDoc}
${EventFragmentDoc}`;

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
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      serviceId: // value for 'serviceId'
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
export const DeploymentDocument = gql`
    query Deployment($name: String!, $namespace: String!, $serviceId: ID) {
  deployment(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...Deployment
    pods {
      ...Pod
    }
    events {
      ...Event
    }
  }
}
    ${DeploymentFragmentDoc}
${PodFragmentDoc}
${EventFragmentDoc}`;

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
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      serviceId: // value for 'serviceId'
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
export const IngressDocument = gql`
    query Ingress($name: String!, $namespace: String!, $serviceId: ID) {
  ingress(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...Ingress
    events {
      ...Event
    }
  }
}
    ${IngressFragmentDoc}
${EventFragmentDoc}`;

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
 *      serviceId: // value for 'serviceId'
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
export const JobDocument = gql`
    query Job($name: String!, $namespace: String!, $serviceId: ID) {
  job(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...Job
    events {
      ...Event
    }
  }
}
    ${JobFragmentDoc}
${EventFragmentDoc}`;

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
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      serviceId: // value for 'serviceId'
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
export const NodeDocument = gql`
    query Node($name: String!, $clusterId: ID) {
  node(name: $name, clusterId: $clusterId) {
    ...Node
  }
}
    ${NodeFragmentDoc}`;

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
 *      clusterId: // value for 'clusterId'
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
export const NodeMetricDocument = gql`
    query NodeMetric($name: String!, $clusterId: ID) {
  nodeMetric(name: $name, clusterId: $clusterId) {
    ...NodeMetric
  }
}
    ${NodeMetricFragmentDoc}`;

/**
 * __useNodeMetricQuery__
 *
 * To run a query within a React component, call `useNodeMetricQuery` and pass it any options that fit your needs.
 * When your component renders, `useNodeMetricQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNodeMetricQuery({
 *   variables: {
 *      name: // value for 'name'
 *      clusterId: // value for 'clusterId'
 *   },
 * });
 */
export function useNodeMetricQuery(baseOptions: Apollo.QueryHookOptions<NodeMetricQuery, NodeMetricQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NodeMetricQuery, NodeMetricQueryVariables>(NodeMetricDocument, options);
      }
export function useNodeMetricLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NodeMetricQuery, NodeMetricQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NodeMetricQuery, NodeMetricQueryVariables>(NodeMetricDocument, options);
        }
export function useNodeMetricSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<NodeMetricQuery, NodeMetricQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<NodeMetricQuery, NodeMetricQueryVariables>(NodeMetricDocument, options);
        }
export type NodeMetricQueryHookResult = ReturnType<typeof useNodeMetricQuery>;
export type NodeMetricLazyQueryHookResult = ReturnType<typeof useNodeMetricLazyQuery>;
export type NodeMetricSuspenseQueryHookResult = ReturnType<typeof useNodeMetricSuspenseQuery>;
export type NodeMetricQueryResult = Apollo.QueryResult<NodeMetricQuery, NodeMetricQueryVariables>;
export const PodDocument = gql`
    query Pod($name: String!, $namespace: String!, $clusterId: ID) {
  pod(name: $name, namespace: $namespace, clusterId: $clusterId) {
    ...PodWithEvents
  }
}
    ${PodWithEventsFragmentDoc}`;

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
 *      clusterId: // value for 'clusterId'
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
export const PodLogsDocument = gql`
    query PodLogs($name: String!, $namespace: String!, $clusterId: ID, $container: String!, $sinceSeconds: Int!) {
  pod(name: $name, namespace: $namespace, clusterId: $clusterId) {
    logs(container: $container, sinceSeconds: $sinceSeconds)
  }
}
    `;

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
 *      clusterId: // value for 'clusterId'
 *      container: // value for 'container'
 *      sinceSeconds: // value for 'sinceSeconds'
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
export const ServiceDocument = gql`
    query Service($name: String!, $namespace: String!, $serviceId: ID) {
  service(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...Service
    pods {
      ...Pod
    }
    events {
      ...Event
    }
  }
}
    ${ServiceFragmentDoc}
${PodFragmentDoc}
${EventFragmentDoc}`;

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
 *      serviceId: // value for 'serviceId'
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
export const StatefulSetDocument = gql`
    query StatefulSet($name: String!, $namespace: String!, $serviceId: ID) {
  statefulSet(name: $name, namespace: $namespace, serviceId: $serviceId) {
    ...StatefulSet
    pods {
      ...Pod
    }
    events {
      ...Event
    }
  }
}
    ${StatefulSetFragmentDoc}
${PodFragmentDoc}
${EventFragmentDoc}`;

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
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      serviceId: // value for 'serviceId'
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
export const UnstructuredResourceDocument = gql`
    query UnstructuredResource($group: String, $kind: String!, $name: String!, $namespace: String, $serviceId: ID!, $version: String!) {
  unstructuredResource(
    group: $group
    kind: $kind
    name: $name
    namespace: $namespace
    serviceId: $serviceId
    version: $version
  ) {
    ...UnstructuredResource
  }
}
    ${UnstructuredResourceFragmentDoc}`;

/**
 * __useUnstructuredResourceQuery__
 *
 * To run a query within a React component, call `useUnstructuredResourceQuery` and pass it any options that fit your needs.
 * When your component renders, `useUnstructuredResourceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUnstructuredResourceQuery({
 *   variables: {
 *      group: // value for 'group'
 *      kind: // value for 'kind'
 *      name: // value for 'name'
 *      namespace: // value for 'namespace'
 *      serviceId: // value for 'serviceId'
 *      version: // value for 'version'
 *   },
 * });
 */
export function useUnstructuredResourceQuery(baseOptions: Apollo.QueryHookOptions<UnstructuredResourceQuery, UnstructuredResourceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UnstructuredResourceQuery, UnstructuredResourceQueryVariables>(UnstructuredResourceDocument, options);
      }
export function useUnstructuredResourceLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UnstructuredResourceQuery, UnstructuredResourceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UnstructuredResourceQuery, UnstructuredResourceQueryVariables>(UnstructuredResourceDocument, options);
        }
export function useUnstructuredResourceSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<UnstructuredResourceQuery, UnstructuredResourceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<UnstructuredResourceQuery, UnstructuredResourceQueryVariables>(UnstructuredResourceDocument, options);
        }
export type UnstructuredResourceQueryHookResult = ReturnType<typeof useUnstructuredResourceQuery>;
export type UnstructuredResourceLazyQueryHookResult = ReturnType<typeof useUnstructuredResourceLazyQuery>;
export type UnstructuredResourceSuspenseQueryHookResult = ReturnType<typeof useUnstructuredResourceSuspenseQuery>;
export type UnstructuredResourceQueryResult = Apollo.QueryResult<UnstructuredResourceQuery, UnstructuredResourceQueryVariables>;
export const AccessTokensDocument = gql`
    query AccessTokens {
  accessTokens(first: 500) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...AccessToken
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${AccessTokenFragmentDoc}`;

/**
 * __useAccessTokensQuery__
 *
 * To run a query within a React component, call `useAccessTokensQuery` and pass it any options that fit your needs.
 * When your component renders, `useAccessTokensQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAccessTokensQuery({
 *   variables: {
 *   },
 * });
 */
export function useAccessTokensQuery(baseOptions?: Apollo.QueryHookOptions<AccessTokensQuery, AccessTokensQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AccessTokensQuery, AccessTokensQueryVariables>(AccessTokensDocument, options);
      }
export function useAccessTokensLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AccessTokensQuery, AccessTokensQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AccessTokensQuery, AccessTokensQueryVariables>(AccessTokensDocument, options);
        }
export function useAccessTokensSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<AccessTokensQuery, AccessTokensQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AccessTokensQuery, AccessTokensQueryVariables>(AccessTokensDocument, options);
        }
export type AccessTokensQueryHookResult = ReturnType<typeof useAccessTokensQuery>;
export type AccessTokensLazyQueryHookResult = ReturnType<typeof useAccessTokensLazyQuery>;
export type AccessTokensSuspenseQueryHookResult = ReturnType<typeof useAccessTokensSuspenseQuery>;
export type AccessTokensQueryResult = Apollo.QueryResult<AccessTokensQuery, AccessTokensQueryVariables>;
export const TokenAuditsDocument = gql`
    query TokenAudits($id: ID!, $cursor: String) {
  accessToken(id: $id) {
    id
    audits(first: 500, after: $cursor) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...AccessTokenAudit
        }
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${AccessTokenAuditFragmentDoc}`;

/**
 * __useTokenAuditsQuery__
 *
 * To run a query within a React component, call `useTokenAuditsQuery` and pass it any options that fit your needs.
 * When your component renders, `useTokenAuditsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTokenAuditsQuery({
 *   variables: {
 *      id: // value for 'id'
 *      cursor: // value for 'cursor'
 *   },
 * });
 */
export function useTokenAuditsQuery(baseOptions: Apollo.QueryHookOptions<TokenAuditsQuery, TokenAuditsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TokenAuditsQuery, TokenAuditsQueryVariables>(TokenAuditsDocument, options);
      }
export function useTokenAuditsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TokenAuditsQuery, TokenAuditsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TokenAuditsQuery, TokenAuditsQueryVariables>(TokenAuditsDocument, options);
        }
export function useTokenAuditsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TokenAuditsQuery, TokenAuditsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TokenAuditsQuery, TokenAuditsQueryVariables>(TokenAuditsDocument, options);
        }
export type TokenAuditsQueryHookResult = ReturnType<typeof useTokenAuditsQuery>;
export type TokenAuditsLazyQueryHookResult = ReturnType<typeof useTokenAuditsLazyQuery>;
export type TokenAuditsSuspenseQueryHookResult = ReturnType<typeof useTokenAuditsSuspenseQuery>;
export type TokenAuditsQueryResult = Apollo.QueryResult<TokenAuditsQuery, TokenAuditsQueryVariables>;
export const CreateAccessTokenDocument = gql`
    mutation CreateAccessToken($scopes: [ScopeAttributes]) {
  createAccessToken(scopes: $scopes) {
    ...AccessToken
  }
}
    ${AccessTokenFragmentDoc}`;
export type CreateAccessTokenMutationFn = Apollo.MutationFunction<CreateAccessTokenMutation, CreateAccessTokenMutationVariables>;

/**
 * __useCreateAccessTokenMutation__
 *
 * To run a mutation, you first call `useCreateAccessTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateAccessTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createAccessTokenMutation, { data, loading, error }] = useCreateAccessTokenMutation({
 *   variables: {
 *      scopes: // value for 'scopes'
 *   },
 * });
 */
export function useCreateAccessTokenMutation(baseOptions?: Apollo.MutationHookOptions<CreateAccessTokenMutation, CreateAccessTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateAccessTokenMutation, CreateAccessTokenMutationVariables>(CreateAccessTokenDocument, options);
      }
export type CreateAccessTokenMutationHookResult = ReturnType<typeof useCreateAccessTokenMutation>;
export type CreateAccessTokenMutationResult = Apollo.MutationResult<CreateAccessTokenMutation>;
export type CreateAccessTokenMutationOptions = Apollo.BaseMutationOptions<CreateAccessTokenMutation, CreateAccessTokenMutationVariables>;
export const DeleteAccessTokenDocument = gql`
    mutation DeleteAccessToken($token: String!) {
  deleteAccessToken(token: $token) {
    ...AccessToken
  }
}
    ${AccessTokenFragmentDoc}`;
export type DeleteAccessTokenMutationFn = Apollo.MutationFunction<DeleteAccessTokenMutation, DeleteAccessTokenMutationVariables>;

/**
 * __useDeleteAccessTokenMutation__
 *
 * To run a mutation, you first call `useDeleteAccessTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteAccessTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteAccessTokenMutation, { data, loading, error }] = useDeleteAccessTokenMutation({
 *   variables: {
 *      token: // value for 'token'
 *   },
 * });
 */
export function useDeleteAccessTokenMutation(baseOptions?: Apollo.MutationHookOptions<DeleteAccessTokenMutation, DeleteAccessTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteAccessTokenMutation, DeleteAccessTokenMutationVariables>(DeleteAccessTokenDocument, options);
      }
export type DeleteAccessTokenMutationHookResult = ReturnType<typeof useDeleteAccessTokenMutation>;
export type DeleteAccessTokenMutationResult = Apollo.MutationResult<DeleteAccessTokenMutation>;
export type DeleteAccessTokenMutationOptions = Apollo.BaseMutationOptions<DeleteAccessTokenMutation, DeleteAccessTokenMutationVariables>;
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
    vpnEnabled
    gitCommit
    isDemoProject
    isSandbox
    pluralLogin
    byok
    manifest {
      ...Manifest
    }
    gitStatus {
      cloned
      output
    }
    features {
      ...AvailableFeatures
    }
  }
}
    ${UserFragmentDoc}
${RoleFragmentDoc}
${ManifestFragmentDoc}
${AvailableFeaturesFragmentDoc}`;

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
export function useMeSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeSuspenseQueryHookResult = ReturnType<typeof useMeSuspenseQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;
export const UsersDocument = gql`
    query Users($q: String, $cursor: String) {
  users(q: $q, first: 20, after: $cursor) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...User
      }
    }
  }
}
    ${PageInfoFragmentDoc}
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
 *      q: // value for 'q'
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
export function useUsersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<UsersQuery, UsersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<UsersQuery, UsersQueryVariables>(UsersDocument, options);
        }
export type UsersQueryHookResult = ReturnType<typeof useUsersQuery>;
export type UsersLazyQueryHookResult = ReturnType<typeof useUsersLazyQuery>;
export type UsersSuspenseQueryHookResult = ReturnType<typeof useUsersSuspenseQuery>;
export type UsersQueryResult = Apollo.QueryResult<UsersQuery, UsersQueryVariables>;
export const SearchUsersDocument = gql`
    query SearchUsers($q: String, $cursor: String) {
  users(q: $q, after: $cursor, first: 5) {
    pageInfo {
      ...PageInfo
    }
    edges {
      node {
        ...User
      }
    }
  }
}
    ${PageInfoFragmentDoc}
${UserFragmentDoc}`;

/**
 * __useSearchUsersQuery__
 *
 * To run a query within a React component, call `useSearchUsersQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchUsersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchUsersQuery({
 *   variables: {
 *      q: // value for 'q'
 *      cursor: // value for 'cursor'
 *   },
 * });
 */
export function useSearchUsersQuery(baseOptions?: Apollo.QueryHookOptions<SearchUsersQuery, SearchUsersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchUsersQuery, SearchUsersQueryVariables>(SearchUsersDocument, options);
      }
export function useSearchUsersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchUsersQuery, SearchUsersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchUsersQuery, SearchUsersQueryVariables>(SearchUsersDocument, options);
        }
export function useSearchUsersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SearchUsersQuery, SearchUsersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SearchUsersQuery, SearchUsersQueryVariables>(SearchUsersDocument, options);
        }
export type SearchUsersQueryHookResult = ReturnType<typeof useSearchUsersQuery>;
export type SearchUsersLazyQueryHookResult = ReturnType<typeof useSearchUsersLazyQuery>;
export type SearchUsersSuspenseQueryHookResult = ReturnType<typeof useSearchUsersSuspenseQuery>;
export type SearchUsersQueryResult = Apollo.QueryResult<SearchUsersQuery, SearchUsersQueryVariables>;
export const namedOperations = {
  Query: {
    App: 'App',
    AppInfo: 'AppInfo',
    Repository: 'Repository',
    PrAutomations: 'PrAutomations',
    ScmConnections: 'ScmConnections',
    PluralContext: 'PluralContext',
    ClusterAddOns: 'ClusterAddOns',
    Clusters: 'Clusters',
    ClustersTiny: 'ClustersTiny',
    ClusterSelector: 'ClusterSelector',
    Cluster: 'Cluster',
    ClusterPods: 'ClusterPods',
    ClusterNamespaces: 'ClusterNamespaces',
    ClusterBindings: 'ClusterBindings',
    RuntimeServices: 'RuntimeServices',
    AddonReleaseURL: 'AddonReleaseURL',
    ClusterStatuses: 'ClusterStatuses',
    TagPairs: 'TagPairs',
    Usage: 'Usage',
    GitRepositories: 'GitRepositories',
    HelmRepositories: 'HelmRepositories',
    HelmRepository: 'HelmRepository',
    GitRepository: 'GitRepository',
    DeploymentSettings: 'DeploymentSettings',
    Pipelines: 'Pipelines',
    JobGate: 'JobGate',
    JobGateLogs: 'JobGateLogs',
    Pipeline: 'Pipeline',
    ClusterProviders: 'ClusterProviders',
    PullRequests: 'PullRequests',
    ServiceDeployments: 'ServiceDeployments',
    ServiceDeploymentsTiny: 'ServiceDeploymentsTiny',
    ServiceDeployment: 'ServiceDeployment',
    ServiceDeploymentComponents: 'ServiceDeploymentComponents',
    ServiceDeploymentSecrets: 'ServiceDeploymentSecrets',
    ServiceDeploymentRevisions: 'ServiceDeploymentRevisions',
    ServiceDeploymentBindings: 'ServiceDeploymentBindings',
    ServiceStatuses: 'ServiceStatuses',
    ComponentTree: 'ComponentTree',
    PostgresDatabases: 'PostgresDatabases',
    PostgresDatabase: 'PostgresDatabase',
    Groups: 'Groups',
    SearchGroups: 'SearchGroups',
    GroupMembers: 'GroupMembers',
    Canary: 'Canary',
    Certificate: 'Certificate',
    CronJob: 'CronJob',
    DaemonSet: 'DaemonSet',
    Deployment: 'Deployment',
    Ingress: 'Ingress',
    Job: 'Job',
    Node: 'Node',
    NodeMetric: 'NodeMetric',
    Pod: 'Pod',
    PodLogs: 'PodLogs',
    Service: 'Service',
    StatefulSet: 'StatefulSet',
    UnstructuredResource: 'UnstructuredResource',
    AccessTokens: 'AccessTokens',
    TokenAudits: 'TokenAudits',
    Me: 'Me',
    Users: 'Users',
    SearchUsers: 'SearchUsers'
  },
  Mutation: {
    CreatePrAutomation: 'CreatePrAutomation',
    UpdatePrAutomation: 'UpdatePrAutomation',
    DeletePrAutomation: 'DeletePrAutomation',
    CreateScmConnection: 'CreateScmConnection',
    UpdateScmConnection: 'UpdateScmConnection',
    DeleteScmConnection: 'DeleteScmConnection',
    SetupRenovate: 'SetupRenovate',
    CreateBuild: 'CreateBuild',
    InstallAddOn: 'InstallAddOn',
    UpdateClusterBindings: 'UpdateClusterBindings',
    UpdateCluster: 'UpdateCluster',
    CreateCluster: 'CreateCluster',
    DeleteCluster: 'DeleteCluster',
    DetachCluster: 'DetachCluster',
    CreateGitRepository: 'CreateGitRepository',
    DeleteGitRepository: 'DeleteGitRepository',
    UpdateGitRepository: 'UpdateGitRepository',
    CreateGlobalService: 'CreateGlobalService',
    DeleteGlobalService: 'DeleteGlobalService',
    UpdateDeploymentSettings: 'UpdateDeploymentSettings',
    deletePipeline: 'deletePipeline',
    ApproveGate: 'ApproveGate',
    CreateClusterProvider: 'CreateClusterProvider',
    UpdateClusterProvider: 'UpdateClusterProvider',
    DeleteClusterProvider: 'DeleteClusterProvider',
    CreatePullRequest: 'CreatePullRequest',
    CreateServiceDeployment: 'CreateServiceDeployment',
    UpdateServiceDeployment: 'UpdateServiceDeployment',
    MergeService: 'MergeService',
    DeleteServiceDeployment: 'DeleteServiceDeployment',
    DetachServiceDeployment: 'DetachServiceDeployment',
    RollbackService: 'RollbackService',
    ProceedService: 'ProceedService',
    UpdateRbac: 'UpdateRbac',
    SelfManage: 'SelfManage',
    RestorePostgres: 'RestorePostgres',
    CreateGroupMember: 'CreateGroupMember',
    DeleteGroupMember: 'DeleteGroupMember',
    CreateGroup: 'CreateGroup',
    UpdateGroup: 'UpdateGroup',
    DeleteGroup: 'DeleteGroup',
    CreateAccessToken: 'CreateAccessToken',
    DeleteAccessToken: 'DeleteAccessToken'
  },
  Fragment: {
    CostAnalysis: 'CostAnalysis',
    FileContent: 'FileContent',
    Configuration: 'Configuration',
    ApplicationSpec: 'ApplicationSpec',
    ApplicationStatus: 'ApplicationStatus',
    Application: 'Application',
    ConfigurationOverlay: 'ConfigurationOverlay',
    Repository: 'Repository',
    PrAutomation: 'PrAutomation',
    ScmConnection: 'ScmConnection',
    PageInfo: 'PageInfo',
    AddOnConfigCondition: 'AddOnConfigCondition',
    AddOnConfiguration: 'AddOnConfiguration',
    ClusterAddOn: 'ClusterAddOn',
    ClusterNode: 'ClusterNode',
    ClusterCondition: 'ClusterCondition',
    Taint: 'Taint',
    NodePool: 'NodePool',
    ApiDeprecation: 'ApiDeprecation',
    RuntimeService: 'RuntimeService',
    AddonVersion: 'AddonVersion',
    AddonVersionBlocking: 'AddonVersionBlocking',
    ClustersRow: 'ClustersRow',
    Cluster: 'Cluster',
    ClusterTiny: 'ClusterTiny',
    ClusterBasic: 'ClusterBasic',
    PolicyBinding: 'PolicyBinding',
    ClusterBindings: 'ClusterBindings',
    ClusterStatusInfo: 'ClusterStatusInfo',
    MetricResponse: 'MetricResponse',
    GitRepository: 'GitRepository',
    HelmRepository: 'HelmRepository',
    HelmChartVersion: 'HelmChartVersion',
    GlobalService: 'GlobalService',
    HttpConnection: 'HttpConnection',
    DeploymentSettings: 'DeploymentSettings',
    PipelineServiceDeployment: 'PipelineServiceDeployment',
    ContainerSpec: 'ContainerSpec',
    JobGateSpec: 'JobGateSpec',
    PipelineGate: 'PipelineGate',
    Revision: 'Revision',
    PromotionService: 'PromotionService',
    PipelinePromotion: 'PipelinePromotion',
    PromotionCriteria: 'PromotionCriteria',
    StageService: 'StageService',
    PipelineStage: 'PipelineStage',
    PipelineStageEdge: 'PipelineStageEdge',
    PipelineStatus: 'PipelineStatus',
    Pipeline: 'Pipeline',
    PipelineGateJob: 'PipelineGateJob',
    ProviderCredential: 'ProviderCredential',
    ClusterProvider: 'ClusterProvider',
    PullRequest: 'PullRequest',
    ServiceDeploymentRevision: 'ServiceDeploymentRevision',
    ServiceDeploymentsRow: 'ServiceDeploymentsRow',
    ServiceDeploymentDetails: 'ServiceDeploymentDetails',
    ServiceDeploymentComponent: 'ServiceDeploymentComponent',
    ServiceDeploymentRevisions: 'ServiceDeploymentRevisions',
    ServiceDeploymentBindings: 'ServiceDeploymentBindings',
    ServiceStatusCount: 'ServiceStatusCount',
    ComponentTree: 'ComponentTree',
    DatabaseTableRow: 'DatabaseTableRow',
    GroupMember: 'GroupMember',
    Group: 'Group',
    CanaryStatus: 'CanaryStatus',
    CanarySpec: 'CanarySpec',
    Canary: 'Canary',
    StatusCondition: 'StatusCondition',
    CertificateStatus: 'CertificateStatus',
    CertificateSpec: 'CertificateSpec',
    Certificate: 'Certificate',
    CronJob: 'CronJob',
    DaemonSetStatus: 'DaemonSetStatus',
    DaemonSetSpec: 'DaemonSetSpec',
    DaemonSet: 'DaemonSet',
    Deployment: 'Deployment',
    Ingress: 'Ingress',
    Job: 'Job',
    Metadata: 'Metadata',
    Event: 'Event',
    ResourceSpec: 'ResourceSpec',
    Resources: 'Resources',
    Container: 'Container',
    ContainerStatus: 'ContainerStatus',
    Pod: 'Pod',
    JobStatus: 'JobStatus',
    Node: 'Node',
    NodeMetric: 'NodeMetric',
    PodWithEvents: 'PodWithEvents',
    Service: 'Service',
    StatefulSet: 'StatefulSet',
    UnstructuredResource: 'UnstructuredResource',
    AccessToken: 'AccessToken',
    AccessTokenAudit: 'AccessTokenAudit',
    User: 'User',
    Invite: 'Invite',
    RoleBinding: 'RoleBinding',
    Role: 'Role',
    AvailableFeatures: 'AvailableFeatures',
    Manifest: 'Manifest'
  }
}