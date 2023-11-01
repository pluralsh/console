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
  Map: { input: Map<string, unknown>; output: Map<string, unknown>; }
  UploadOrUrl: { input: string; output: string; }
  Yaml: { input: unknown; output: unknown; }
};

export type Account = {
  __typename?: 'Account';
  availableFeatures?: Maybe<PlanFeatures>;
  backgroundColor?: Maybe<Scalars['String']['output']>;
  billingAddress?: Maybe<Address>;
  billingCustomerId?: Maybe<Scalars['String']['output']>;
  clusterCount?: Maybe<Scalars['String']['output']>;
  delinquentAt?: Maybe<Scalars['DateTime']['output']>;
  domainMappings?: Maybe<Array<Maybe<DomainMapping>>>;
  grandfatheredUntil?: Maybe<Scalars['DateTime']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  paymentMethods?: Maybe<PaymentMethodConnection>;
  rootUser?: Maybe<User>;
  subscription?: Maybe<PlatformSubscription>;
  trialed?: Maybe<Scalars['Boolean']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  userCount?: Maybe<Scalars['String']['output']>;
  workosConnectionId?: Maybe<Scalars['String']['output']>;
};


export type AccountPaymentMethodsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type AccountAttributes = {
  billingAddress?: InputMaybe<AddressAttributes>;
  domainMappings?: InputMaybe<Array<InputMaybe<DomainMappingInput>>>;
  icon?: InputMaybe<Scalars['UploadOrUrl']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type ActionItem = {
  __typename?: 'ActionItem';
  link: Scalars['String']['output'];
  type: ActionItemType;
};

export type ActionItemAttributes = {
  link: Scalars['String']['input'];
  type: ActionItemType;
};

export enum ActionItemType {
  Blog = 'BLOG',
  Issue = 'ISSUE',
  Pull = 'PULL'
}

export type Address = {
  __typename?: 'Address';
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  line1?: Maybe<Scalars['String']['output']>;
  line2?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  state?: Maybe<Scalars['String']['output']>;
  zip?: Maybe<Scalars['String']['output']>;
};

export type AddressAttributes = {
  city: Scalars['String']['input'];
  country: Scalars['String']['input'];
  line1: Scalars['String']['input'];
  line2?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  state?: InputMaybe<Scalars['String']['input']>;
  zip: Scalars['String']['input'];
};

export type AppLink = {
  __typename?: 'AppLink';
  description?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

export type ApplicationComponent = {
  __typename?: 'ApplicationComponent';
  group?: Maybe<Scalars['String']['output']>;
  kind?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
};

export type ApplicationInformation = {
  __typename?: 'ApplicationInformation';
  components?: Maybe<Array<Maybe<ApplicationComponent>>>;
  componentsReady?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  ready?: Maybe<Scalars['Boolean']['output']>;
  spec?: Maybe<ApplicationSpec>;
};

export type ApplicationSpec = {
  __typename?: 'ApplicationSpec';
  description?: Maybe<Scalars['String']['output']>;
  links?: Maybe<Array<Maybe<AppLink>>>;
  version?: Maybe<Scalars['String']['output']>;
};

export type ApplyLock = {
  __typename?: 'ApplyLock';
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  lock?: Maybe<Scalars['String']['output']>;
  owner?: Maybe<User>;
  repository?: Maybe<Repository>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type Artifact = {
  __typename?: 'Artifact';
  arch?: Maybe<Scalars['String']['output']>;
  blob?: Maybe<Scalars['String']['output']>;
  filesize?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  platform?: Maybe<ArtifactPlatform>;
  readme?: Maybe<Scalars['String']['output']>;
  sha?: Maybe<Scalars['String']['output']>;
  type?: Maybe<ArtifactType>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type ArtifactAttributes = {
  arch?: InputMaybe<Scalars['String']['input']>;
  blob?: InputMaybe<Scalars['UploadOrUrl']['input']>;
  name: Scalars['String']['input'];
  platform: Scalars['String']['input'];
  readme: Scalars['String']['input'];
  type: Scalars['String']['input'];
};

export enum ArtifactPlatform {
  Android = 'ANDROID',
  Freebsd = 'FREEBSD',
  Linux = 'LINUX',
  Mac = 'MAC',
  Openbsd = 'OPENBSD',
  Solaris = 'SOLARIS',
  Windows = 'WINDOWS'
}

export enum ArtifactType {
  Cli = 'CLI',
  Desktop = 'DESKTOP',
  Mobile = 'MOBILE'
}

export type Audit = {
  __typename?: 'Audit';
  action: Scalars['String']['output'];
  actor?: Maybe<User>;
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  group?: Maybe<Group>;
  id: Scalars['ID']['output'];
  image?: Maybe<DockerImage>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  integrationWebhook?: Maybe<IntegrationWebhook>;
  ip?: Maybe<Scalars['String']['output']>;
  latitude?: Maybe<Scalars['String']['output']>;
  longitude?: Maybe<Scalars['String']['output']>;
  repository?: Maybe<Repository>;
  role?: Maybe<Role>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
  version?: Maybe<Version>;
};

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

export type AuthorizationUrl = {
  __typename?: 'AuthorizationUrl';
  provider: ScmProvider;
  url: Scalars['String']['output'];
};

export type AwsShellCredentialsAttributes = {
  accessKeyId: Scalars['String']['input'];
  secretAccessKey: Scalars['String']['input'];
};

export type AzureShellCredentialsAttributes = {
  clientId: Scalars['String']['input'];
  clientSecret: Scalars['String']['input'];
  storageAccount: Scalars['String']['input'];
  subscriptionId: Scalars['String']['input'];
  tenantId: Scalars['String']['input'];
};

export type BindingAttributes = {
  groupId?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type Card = {
  __typename?: 'Card';
  brand: Scalars['String']['output'];
  expMonth: Scalars['Int']['output'];
  expYear: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  last4: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
};

export type CardConnection = {
  __typename?: 'CardConnection';
  edges?: Maybe<Array<Maybe<CardEdge>>>;
  pageInfo: PageInfo;
};

export type CardEdge = {
  __typename?: 'CardEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Card>;
};

/** Application categories. */
export enum Category {
  Data = 'DATA',
  Database = 'DATABASE',
  Devops = 'DEVOPS',
  Messaging = 'MESSAGING',
  Network = 'NETWORK',
  Productivity = 'PRODUCTIVITY',
  Security = 'SECURITY',
  Storage = 'STORAGE'
}

export type CategoryInfo = {
  __typename?: 'CategoryInfo';
  category?: Maybe<Category>;
  count?: Maybe<Scalars['Int']['output']>;
  tags?: Maybe<GroupedTagConnection>;
};


export type CategoryInfoTagsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
};

export type ChangeInstructions = {
  __typename?: 'ChangeInstructions';
  instructions?: Maybe<Scalars['String']['output']>;
  script?: Maybe<Scalars['String']['output']>;
};

export type Chart = {
  __typename?: 'Chart';
  dependencies?: Maybe<Dependencies>;
  description?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  installation?: Maybe<ChartInstallation>;
  latestVersion?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  repository?: Maybe<Repository>;
  tags?: Maybe<Array<Maybe<VersionTag>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type ChartAttributes = {
  tags?: InputMaybe<Array<InputMaybe<VersionTagAttributes>>>;
};

export type ChartConnection = {
  __typename?: 'ChartConnection';
  edges?: Maybe<Array<Maybe<ChartEdge>>>;
  pageInfo: PageInfo;
};

export type ChartEdge = {
  __typename?: 'ChartEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Chart>;
};

export type ChartInstallation = {
  __typename?: 'ChartInstallation';
  chart?: Maybe<Chart>;
  id?: Maybe<Scalars['ID']['output']>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  installation?: Maybe<Installation>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  version?: Maybe<Version>;
};

export type ChartInstallationAttributes = {
  chartId?: InputMaybe<Scalars['ID']['input']>;
  versionId?: InputMaybe<Scalars['ID']['input']>;
};

export type ChartInstallationConnection = {
  __typename?: 'ChartInstallationConnection';
  edges?: Maybe<Array<Maybe<ChartInstallationEdge>>>;
  pageInfo: PageInfo;
};

export type ChartInstallationEdge = {
  __typename?: 'ChartInstallationEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<ChartInstallation>;
};

export type ChartName = {
  chart?: InputMaybe<Scalars['String']['input']>;
  repo?: InputMaybe<Scalars['String']['input']>;
};

export type ChatMessage = {
  __typename?: 'ChatMessage';
  content: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  role: Scalars['String']['output'];
};

export type ChatMessageAttributes = {
  content: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  role: Scalars['String']['input'];
};

export type ClosureItem = {
  __typename?: 'ClosureItem';
  dep?: Maybe<Dependency>;
  helm?: Maybe<Chart>;
  terraform?: Maybe<Terraform>;
};

export type CloudShell = {
  __typename?: 'CloudShell';
  aesKey: Scalars['String']['output'];
  alive: Scalars['Boolean']['output'];
  cluster: Scalars['String']['output'];
  gitUrl: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  missing?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  provider: Provider;
  region: Scalars['String']['output'];
  status?: Maybe<ShellStatus>;
  subdomain: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type CloudShellAttributes = {
  credentials: ShellCredentialsAttributes;
  demoId?: InputMaybe<Scalars['ID']['input']>;
  provider?: InputMaybe<Provider>;
  scm?: InputMaybe<ScmAttributes>;
  workspace: WorkspaceAttributes;
};

/** A Kubernetes cluster that can be used to deploy applications on with Plural. */
export type Cluster = {
  __typename?: 'Cluster';
  /** The account that the cluster belongs to. */
  account?: Maybe<Account>;
  /** The URL of the console running on the cluster. */
  consoleUrl?: Maybe<Scalars['String']['output']>;
  /** the dependencies a cluster has */
  dependency?: Maybe<ClusterDependency>;
  /** The domain name used for applications deployed on the cluster. */
  domain?: Maybe<Scalars['String']['output']>;
  /** The git repository URL for the cluster. */
  gitUrl?: Maybe<Scalars['String']['output']>;
  /** The ID of the cluster. */
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** whether any installation in the cluster has been locked */
  locked?: Maybe<Scalars['Boolean']['output']>;
  /** The name of the cluster. */
  name: Scalars['String']['output'];
  /** The user that owns the cluster. */
  owner?: Maybe<User>;
  /** The last time the cluster was pinged. */
  pingedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The cluster's cloud provider. */
  provider: Provider;
  /** The upgrade queue for applications running on the cluster. */
  queue?: Maybe<UpgradeQueue>;
  /** The source of the cluster. */
  source?: Maybe<Source>;
  /** whether all installations in the cluster have been synced */
  synced?: Maybe<Scalars['Boolean']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** pending upgrades for each installed app */
  upgradeInfo?: Maybe<Array<Maybe<UpgradeInfo>>>;
  /** CPU/Memory history for this cluster */
  usageHistory?: Maybe<Array<Maybe<ClusterUsageHistory>>>;
};


/** A Kubernetes cluster that can be used to deploy applications on with Plural. */
export type ClusterUsageHistoryArgs = {
  begin: Scalars['DateTime']['input'];
};

/** Input for creating or updating a cluster. */
export type ClusterAttributes = {
  /** The URL of the console running on the cluster. */
  consoleUrl?: InputMaybe<Scalars['String']['input']>;
  /** The domain name used for applications deployed on the cluster. */
  domain?: InputMaybe<Scalars['String']['input']>;
  /** The git repository URL for the cluster. */
  gitUrl?: InputMaybe<Scalars['String']['input']>;
  /** The name of the cluster. */
  name: Scalars['String']['input'];
  /** The cluster's cloud provider. */
  provider: Provider;
  /** The source of the cluster. */
  source?: InputMaybe<Source>;
};

export type ClusterConnection = {
  __typename?: 'ClusterConnection';
  edges?: Maybe<Array<Maybe<ClusterEdge>>>;
  pageInfo: PageInfo;
};

/** A dependncy reference between clusters */
export type ClusterDependency = {
  __typename?: 'ClusterDependency';
  /** the cluster holding this dependency */
  cluster?: Maybe<Cluster>;
  /** the source cluster of this dependency */
  dependency?: Maybe<Cluster>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type ClusterEdge = {
  __typename?: 'ClusterEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Cluster>;
};

export type ClusterInformation = {
  __typename?: 'ClusterInformation';
  gitCommit?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  platform?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  version?: Maybe<Scalars['String']['output']>;
};

export type ClusterInformationAttributes = {
  gitCommit?: InputMaybe<Scalars['String']['input']>;
  platform?: InputMaybe<Scalars['String']['input']>;
  version?: InputMaybe<Scalars['String']['input']>;
};

/** A record of the utilization in a given cluster */
export type ClusterUsageHistory = {
  __typename?: 'ClusterUsageHistory';
  account?: Maybe<Account>;
  cluster?: Maybe<Cluster>;
  cpu?: Maybe<Scalars['Int']['output']>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  memory?: Maybe<Scalars['Int']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type Community = {
  __typename?: 'Community';
  discord?: Maybe<Scalars['String']['output']>;
  gitUrl?: Maybe<Scalars['String']['output']>;
  homepage?: Maybe<Scalars['String']['output']>;
  slack?: Maybe<Scalars['String']['output']>;
  twitter?: Maybe<Scalars['String']['output']>;
  videos?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

/** Input for creating or updating the community links of an application. */
export type CommunityAttributes = {
  /** The application's Discord server. */
  discord?: InputMaybe<Scalars['String']['input']>;
  /** The application's git URL. */
  gitUrl?: InputMaybe<Scalars['String']['input']>;
  /** The application's homepage. */
  homepage?: InputMaybe<Scalars['String']['input']>;
  /** The application's Slack channel. */
  slack?: InputMaybe<Scalars['String']['input']>;
  /** The application's Twitter account. */
  twitter?: InputMaybe<Scalars['String']['input']>;
  /** The videos of the application. */
  videos?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type ConsentRequest = {
  __typename?: 'ConsentRequest';
  requestedScope?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  skip?: Maybe<Scalars['Boolean']['output']>;
};

export type ContextAttributes = {
  buckets?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  configuration: Scalars['Map']['input'];
  domains?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

/** An external repository contributor */
export type Contributor = {
  __typename?: 'Contributor';
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
};

export type Crd = {
  __typename?: 'Crd';
  blob?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type CrdAttributes = {
  blob?: InputMaybe<Scalars['UploadOrUrl']['input']>;
  name: Scalars['String']['input'];
};

export type Cvss = {
  __typename?: 'Cvss';
  attackComplexity?: Maybe<VulnGrade>;
  attackVector?: Maybe<VulnVector>;
  availability?: Maybe<VulnGrade>;
  confidentiality?: Maybe<VulnGrade>;
  integrity?: Maybe<VulnGrade>;
  privilegesRequired?: Maybe<VulnGrade>;
  userInteraction?: Maybe<VulnRequirement>;
};

export enum Datatype {
  Bool = 'BOOL',
  Bucket = 'BUCKET',
  Domain = 'DOMAIN',
  File = 'FILE',
  Function = 'FUNCTION',
  Int = 'INT',
  Password = 'PASSWORD',
  String = 'STRING'
}

export type DeferredReason = {
  __typename?: 'DeferredReason';
  message?: Maybe<Scalars['String']['output']>;
  package?: Maybe<Scalars['String']['output']>;
  repository?: Maybe<Scalars['String']['output']>;
};

export type DeferredUpdate = {
  __typename?: 'DeferredUpdate';
  attempts?: Maybe<Scalars['Int']['output']>;
  chartInstallation?: Maybe<ChartInstallation>;
  dequeueAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  messages?: Maybe<Array<Maybe<DeferredReason>>>;
  pending?: Maybe<Scalars['Boolean']['output']>;
  terraformInstallation?: Maybe<TerraformInstallation>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  version?: Maybe<Version>;
};

export type DeferredUpdateConnection = {
  __typename?: 'DeferredUpdateConnection';
  edges?: Maybe<Array<Maybe<DeferredUpdateEdge>>>;
  pageInfo: PageInfo;
};

export type DeferredUpdateEdge = {
  __typename?: 'DeferredUpdateEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<DeferredUpdate>;
};

export enum Delta {
  Create = 'CREATE',
  Delete = 'DELETE',
  Update = 'UPDATE'
}

export type DemoProject = {
  __typename?: 'DemoProject';
  credentials?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  projectId: Scalars['String']['output'];
  ready?: Maybe<Scalars['Boolean']['output']>;
  state?: Maybe<DemoProjectState>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export enum DemoProjectState {
  Created = 'CREATED',
  Enabled = 'ENABLED',
  Ready = 'READY'
}

export type Dependencies = {
  __typename?: 'Dependencies';
  application?: Maybe<Scalars['Boolean']['output']>;
  breaking?: Maybe<Scalars['Boolean']['output']>;
  cliVsn?: Maybe<Scalars['String']['output']>;
  dependencies?: Maybe<Array<Maybe<Dependency>>>;
  instructions?: Maybe<ChangeInstructions>;
  outputs?: Maybe<Scalars['Map']['output']>;
  providerVsn?: Maybe<Scalars['String']['output']>;
  providerWirings?: Maybe<Scalars['Map']['output']>;
  providers?: Maybe<Array<Maybe<Provider>>>;
  secrets?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  wait?: Maybe<Scalars['Boolean']['output']>;
  wirings?: Maybe<Wirings>;
};

export type Dependency = {
  __typename?: 'Dependency';
  name?: Maybe<Scalars['String']['output']>;
  optional?: Maybe<Scalars['Boolean']['output']>;
  repo?: Maybe<Scalars['String']['output']>;
  type?: Maybe<DependencyType>;
  version?: Maybe<Scalars['String']['output']>;
};

export enum DependencyType {
  Helm = 'HELM',
  Terraform = 'TERRAFORM'
}

export type DeviceLogin = {
  __typename?: 'DeviceLogin';
  deviceToken: Scalars['String']['output'];
  loginUrl: Scalars['String']['output'];
};

export type DnsAccessPolicy = {
  __typename?: 'DnsAccessPolicy';
  bindings?: Maybe<Array<Maybe<PolicyBinding>>>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type DnsAccessPolicyAttributes = {
  bindings?: InputMaybe<Array<InputMaybe<BindingAttributes>>>;
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type DnsDomain = {
  __typename?: 'DnsDomain';
  accessPolicy?: Maybe<DnsAccessPolicy>;
  account?: Maybe<Account>;
  creator?: Maybe<User>;
  dnsRecords?: Maybe<DnsRecordConnection>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};


export type DnsDomainDnsRecordsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type DnsDomainAttributes = {
  accessPolicy?: InputMaybe<DnsAccessPolicyAttributes>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type DnsDomainConnection = {
  __typename?: 'DnsDomainConnection';
  edges?: Maybe<Array<Maybe<DnsDomainEdge>>>;
  pageInfo: PageInfo;
};

export type DnsDomainEdge = {
  __typename?: 'DnsDomainEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<DnsDomain>;
};

export type DnsRecord = {
  __typename?: 'DnsRecord';
  cluster: Scalars['String']['output'];
  creator?: Maybe<User>;
  domain?: Maybe<DnsDomain>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  provider: Provider;
  records?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  type: DnsRecordType;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type DnsRecordAttributes = {
  name: Scalars['String']['input'];
  records?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  type: DnsRecordType;
};

export type DnsRecordConnection = {
  __typename?: 'DnsRecordConnection';
  edges?: Maybe<Array<Maybe<DnsRecordEdge>>>;
  pageInfo: PageInfo;
};

export type DnsRecordEdge = {
  __typename?: 'DnsRecordEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<DnsRecord>;
};

export enum DnsRecordType {
  A = 'A',
  Aaaa = 'AAAA',
  Cname = 'CNAME',
  Txt = 'TXT'
}

export type DockerImage = {
  __typename?: 'DockerImage';
  digest: Scalars['String']['output'];
  dockerRepository?: Maybe<DockerRepository>;
  grade?: Maybe<ImageGrade>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  scanCompletedAt?: Maybe<Scalars['DateTime']['output']>;
  scannedAt?: Maybe<Scalars['DateTime']['output']>;
  tag?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  vulnerabilities?: Maybe<Array<Maybe<Vulnerability>>>;
};

export type DockerImageConnection = {
  __typename?: 'DockerImageConnection';
  edges?: Maybe<Array<Maybe<DockerImageEdge>>>;
  pageInfo: PageInfo;
};

export type DockerImageEdge = {
  __typename?: 'DockerImageEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<DockerImage>;
};

export type DockerRepository = {
  __typename?: 'DockerRepository';
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  metrics?: Maybe<Array<Maybe<Metric>>>;
  name: Scalars['String']['output'];
  public?: Maybe<Scalars['Boolean']['output']>;
  repository?: Maybe<Repository>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};


export type DockerRepositoryMetricsArgs = {
  offset?: InputMaybe<Scalars['String']['input']>;
  precision?: InputMaybe<Scalars['String']['input']>;
  tag?: InputMaybe<Scalars['String']['input']>;
};

export type DockerRepositoryAttributes = {
  public: Scalars['Boolean']['input'];
};

export type DockerRepositoryConnection = {
  __typename?: 'DockerRepositoryConnection';
  edges?: Maybe<Array<Maybe<DockerRepositoryEdge>>>;
  pageInfo: PageInfo;
};

export type DockerRepositoryEdge = {
  __typename?: 'DockerRepositoryEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<DockerRepository>;
};

export type DomainMapping = {
  __typename?: 'DomainMapping';
  account?: Maybe<Account>;
  domain: Scalars['String']['output'];
  enableSso?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type DomainMappingInput = {
  domain?: InputMaybe<Scalars['String']['input']>;
  enableSso?: InputMaybe<Scalars['Boolean']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type EabCredential = {
  __typename?: 'EabCredential';
  cluster: Scalars['String']['output'];
  hmacKey: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  keyId: Scalars['String']['output'];
  provider: Provider;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type EntityAttributes = {
  endIndex?: InputMaybe<Scalars['Int']['input']>;
  startIndex?: InputMaybe<Scalars['Int']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  type: MessageEntityType;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export enum ExternalOidcProvider {
  GithubActions = 'GITHUB_ACTIONS'
}

export type File = {
  __typename?: 'File';
  blob: Scalars['String']['output'];
  contentType?: Maybe<Scalars['String']['output']>;
  filename?: Maybe<Scalars['String']['output']>;
  filesize?: Maybe<Scalars['Int']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  mediaType?: Maybe<MediaType>;
  message: IncidentMessage;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
};

export type FileAttributes = {
  blob?: InputMaybe<Scalars['UploadOrUrl']['input']>;
};

export type FileConnection = {
  __typename?: 'FileConnection';
  edges?: Maybe<Array<Maybe<FileEdge>>>;
  pageInfo: PageInfo;
};

export type FileContent = {
  __typename?: 'FileContent';
  content: Scalars['String']['output'];
  path: Scalars['String']['output'];
};

export type FileEdge = {
  __typename?: 'FileEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<File>;
};

export type Follower = {
  __typename?: 'Follower';
  id: Scalars['ID']['output'];
  incident?: Maybe<Incident>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  preferences?: Maybe<NotificationPreferences>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user: User;
};

export type FollowerAttributes = {
  preferences?: InputMaybe<NotificationPreferencesAttributes>;
};

export type FollowerConnection = {
  __typename?: 'FollowerConnection';
  edges?: Maybe<Array<Maybe<FollowerEdge>>>;
  pageInfo: PageInfo;
};

export type FollowerEdge = {
  __typename?: 'FollowerEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Follower>;
};

export type GcpShellCredentialsAttributes = {
  applicationCredentials: Scalars['String']['input'];
};

export type GeoMetric = {
  __typename?: 'GeoMetric';
  count?: Maybe<Scalars['Int']['output']>;
  country?: Maybe<Scalars['String']['output']>;
};

export type GitConfiguration = {
  __typename?: 'GitConfiguration';
  branch?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  root?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

export type Group = {
  __typename?: 'Group';
  description?: Maybe<Scalars['String']['output']>;
  global?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type GroupAttributes = {
  description?: InputMaybe<Scalars['String']['input']>;
  global?: InputMaybe<Scalars['Boolean']['input']>;
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

export type GroupedTag = {
  __typename?: 'GroupedTag';
  count: Scalars['Int']['output'];
  tag: Scalars['String']['output'];
};

export type GroupedTagConnection = {
  __typename?: 'GroupedTagConnection';
  edges?: Maybe<Array<Maybe<GroupedTagEdge>>>;
  pageInfo: PageInfo;
};

export type GroupedTagEdge = {
  __typename?: 'GroupedTagEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<GroupedTag>;
};

export type ImageDependency = {
  __typename?: 'ImageDependency';
  id: Scalars['ID']['output'];
  image: DockerImage;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  version: Version;
};

export enum ImageGrade {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F'
}

export type ImageLayer = {
  __typename?: 'ImageLayer';
  diffId?: Maybe<Scalars['String']['output']>;
  digest?: Maybe<Scalars['String']['output']>;
};

export type ImpersonationPolicy = {
  __typename?: 'ImpersonationPolicy';
  bindings?: Maybe<Array<Maybe<ImpersonationPolicyBinding>>>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type ImpersonationPolicyAttributes = {
  bindings?: InputMaybe<Array<InputMaybe<ImpersonationPolicyBindingAttributes>>>;
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type ImpersonationPolicyBinding = {
  __typename?: 'ImpersonationPolicyBinding';
  group?: Maybe<Group>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
};

export type ImpersonationPolicyBindingAttributes = {
  groupId?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type Incident = {
  __typename?: 'Incident';
  clusterInformation?: Maybe<ClusterInformation>;
  creator: User;
  description?: Maybe<Scalars['String']['output']>;
  files?: Maybe<FileConnection>;
  follower?: Maybe<Follower>;
  followers?: Maybe<FollowerConnection>;
  history?: Maybe<IncidentHistoryConnection>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  messages?: Maybe<IncidentMessageConnection>;
  nextResponseAt?: Maybe<Scalars['DateTime']['output']>;
  notificationCount?: Maybe<Scalars['Int']['output']>;
  owner?: Maybe<User>;
  postmortem?: Maybe<Postmortem>;
  repository: Repository;
  severity: Scalars['Int']['output'];
  status: IncidentStatus;
  subscription?: Maybe<SlimSubscription>;
  tags?: Maybe<Array<Maybe<Tag>>>;
  title: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};


export type IncidentFilesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type IncidentFollowersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type IncidentHistoryArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type IncidentMessagesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export enum IncidentAction {
  Accept = 'ACCEPT',
  Complete = 'COMPLETE',
  Create = 'CREATE',
  Edit = 'EDIT',
  Severity = 'SEVERITY',
  Status = 'STATUS'
}

export type IncidentAttributes = {
  clusterInformation?: InputMaybe<ClusterInformationAttributes>;
  description?: InputMaybe<Scalars['String']['input']>;
  severity?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<IncidentStatus>;
  tags?: InputMaybe<Array<InputMaybe<TagAttributes>>>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type IncidentChange = {
  __typename?: 'IncidentChange';
  key: Scalars['String']['output'];
  next?: Maybe<Scalars['String']['output']>;
  prev?: Maybe<Scalars['String']['output']>;
};

export type IncidentConnection = {
  __typename?: 'IncidentConnection';
  edges?: Maybe<Array<Maybe<IncidentEdge>>>;
  pageInfo: PageInfo;
};

export type IncidentDelta = {
  __typename?: 'IncidentDelta';
  delta?: Maybe<Delta>;
  payload?: Maybe<Incident>;
};

export type IncidentEdge = {
  __typename?: 'IncidentEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Incident>;
};

export type IncidentFilter = {
  statuses?: InputMaybe<Array<InputMaybe<IncidentStatus>>>;
  type: IncidentFilterType;
  value?: InputMaybe<Scalars['String']['input']>;
};

export enum IncidentFilterType {
  Following = 'FOLLOWING',
  Notifications = 'NOTIFICATIONS',
  Status = 'STATUS',
  Tag = 'TAG'
}

export type IncidentHistory = {
  __typename?: 'IncidentHistory';
  action: IncidentAction;
  actor: User;
  changes?: Maybe<Array<Maybe<IncidentChange>>>;
  id: Scalars['ID']['output'];
  incident: Incident;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type IncidentHistoryConnection = {
  __typename?: 'IncidentHistoryConnection';
  edges?: Maybe<Array<Maybe<IncidentHistoryEdge>>>;
  pageInfo: PageInfo;
};

export type IncidentHistoryEdge = {
  __typename?: 'IncidentHistoryEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<IncidentHistory>;
};

export type IncidentMessage = {
  __typename?: 'IncidentMessage';
  creator: User;
  entities?: Maybe<Array<Maybe<MessageEntity>>>;
  file?: Maybe<File>;
  id: Scalars['ID']['output'];
  incident: Incident;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  reactions?: Maybe<Array<Maybe<Reaction>>>;
  text: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type IncidentMessageAttributes = {
  entities?: InputMaybe<Array<InputMaybe<EntityAttributes>>>;
  file?: InputMaybe<FileAttributes>;
  text: Scalars['String']['input'];
};

export type IncidentMessageConnection = {
  __typename?: 'IncidentMessageConnection';
  edges?: Maybe<Array<Maybe<IncidentMessageEdge>>>;
  pageInfo: PageInfo;
};

export type IncidentMessageDelta = {
  __typename?: 'IncidentMessageDelta';
  delta?: Maybe<Delta>;
  payload?: Maybe<IncidentMessage>;
};

export type IncidentMessageEdge = {
  __typename?: 'IncidentMessageEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<IncidentMessage>;
};

export enum IncidentSort {
  InsertedAt = 'INSERTED_AT',
  Severity = 'SEVERITY',
  Status = 'STATUS',
  Title = 'TITLE'
}

export enum IncidentStatus {
  Complete = 'COMPLETE',
  InProgress = 'IN_PROGRESS',
  Open = 'OPEN',
  Resolved = 'RESOLVED'
}

/** An installation of an application. */
export type Installation = {
  __typename?: 'Installation';
  acmeKeyId?: Maybe<Scalars['String']['output']>;
  acmeSecret?: Maybe<Scalars['String']['output']>;
  /** Whether the application should auto upgrade. */
  autoUpgrade?: Maybe<Scalars['Boolean']['output']>;
  /** A YAML object of context. */
  context?: Maybe<Scalars['Map']['output']>;
  /** The installation's ID. */
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  license?: Maybe<Scalars['String']['output']>;
  /** The license key for the application. */
  licenseKey?: Maybe<Scalars['String']['output']>;
  locked?: Maybe<Scalars['Boolean']['output']>;
  /** The OIDC provider for the application. */
  oidcProvider?: Maybe<OidcProvider>;
  /** The last ping time of an installed application. */
  pingedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The application that was installed. */
  repository?: Maybe<Repository>;
  /** The subscription for the application. */
  subscription?: Maybe<RepositorySubscription>;
  synced?: Maybe<Scalars['Boolean']['output']>;
  /** The tag to track for auto upgrades. */
  trackTag: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The user that installed the application. */
  user?: Maybe<User>;
};

/** Input for creating or updating the tag attributes of an application installation. */
export type InstallationAttributes = {
  /** Whether the application should auto upgrade. */
  autoUpgrade?: InputMaybe<Scalars['Boolean']['input']>;
  /** A YAML object of context. */
  context?: InputMaybe<Scalars['Yaml']['input']>;
  /** The tag to track for auto upgrades. */
  trackTag?: InputMaybe<Scalars['String']['input']>;
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

export type Integration = {
  __typename?: 'Integration';
  description?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  publisher?: Maybe<Publisher>;
  repository?: Maybe<Repository>;
  sourceUrl?: Maybe<Scalars['String']['output']>;
  spec?: Maybe<Scalars['Map']['output']>;
  tags?: Maybe<Array<Maybe<Tag>>>;
  type?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type IntegrationAttributes = {
  description?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['UploadOrUrl']['input']>;
  name: Scalars['String']['input'];
  sourceUrl?: InputMaybe<Scalars['String']['input']>;
  spec?: InputMaybe<Scalars['Yaml']['input']>;
  tags?: InputMaybe<Array<InputMaybe<TagAttributes>>>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type IntegrationConnection = {
  __typename?: 'IntegrationConnection';
  edges?: Maybe<Array<Maybe<IntegrationEdge>>>;
  pageInfo: PageInfo;
};

export type IntegrationEdge = {
  __typename?: 'IntegrationEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Integration>;
};

export type IntegrationWebhook = {
  __typename?: 'IntegrationWebhook';
  account?: Maybe<Account>;
  actions?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  logs?: Maybe<WebhookLogConnection>;
  name: Scalars['String']['output'];
  secret: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  url: Scalars['String']['output'];
};


export type IntegrationWebhookLogsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type IntegrationWebhookAttributes = {
  actions?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  name: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type IntegrationWebhookConnection = {
  __typename?: 'IntegrationWebhookConnection';
  edges?: Maybe<Array<Maybe<IntegrationWebhookEdge>>>;
  pageInfo: PageInfo;
};

export type IntegrationWebhookEdge = {
  __typename?: 'IntegrationWebhookEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<IntegrationWebhook>;
};

export type Invite = {
  __typename?: 'Invite';
  account?: Maybe<Account>;
  admin?: Maybe<Scalars['Boolean']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  existing: Scalars['Boolean']['output'];
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  groups?: Maybe<Array<Maybe<Group>>>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  secureId?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
};

export type InviteAttributes = {
  admin?: InputMaybe<Scalars['Boolean']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  inviteGroups?: InputMaybe<Array<InputMaybe<BindingAttributes>>>;
  oidcProviderId?: InputMaybe<Scalars['ID']['input']>;
  serviceAccountId?: InputMaybe<Scalars['ID']['input']>;
};

export type InviteConnection = {
  __typename?: 'InviteConnection';
  edges?: Maybe<Array<Maybe<InviteEdge>>>;
  pageInfo: PageInfo;
};

export type InviteEdge = {
  __typename?: 'InviteEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Invite>;
};

export type Invoice = {
  __typename?: 'Invoice';
  amountDue: Scalars['Int']['output'];
  amountPaid: Scalars['Int']['output'];
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  currency: Scalars['String']['output'];
  hostedInvoiceUrl?: Maybe<Scalars['String']['output']>;
  lines?: Maybe<Array<Maybe<InvoiceItem>>>;
  number: Scalars['String']['output'];
  paymentIntent?: Maybe<PaymentIntent>;
  status?: Maybe<Scalars['String']['output']>;
};

export type InvoiceConnection = {
  __typename?: 'InvoiceConnection';
  edges?: Maybe<Array<Maybe<InvoiceEdge>>>;
  pageInfo: PageInfo;
};

export type InvoiceEdge = {
  __typename?: 'InvoiceEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Invoice>;
};

export type InvoiceItem = {
  __typename?: 'InvoiceItem';
  amount: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
};

export type KeyBackup = {
  __typename?: 'KeyBackup';
  digest: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  repositories?: Maybe<Array<Scalars['String']['output']>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user: User;
  value: Scalars['String']['output'];
};

export type KeyBackupAttributes = {
  key: Scalars['String']['input'];
  name: Scalars['String']['input'];
  repositories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type KeyBackupConnection = {
  __typename?: 'KeyBackupConnection';
  edges?: Maybe<Array<Maybe<KeyBackupEdge>>>;
  pageInfo: PageInfo;
};

export type KeyBackupEdge = {
  __typename?: 'KeyBackupEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<KeyBackup>;
};

export type License = {
  __typename?: 'License';
  name?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

export type Limit = {
  __typename?: 'Limit';
  dimension: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
};

export type LimitAttributes = {
  dimension: Scalars['String']['input'];
  quantity: Scalars['Int']['input'];
};

export type LineItem = {
  __typename?: 'LineItem';
  cost: Scalars['Int']['output'];
  dimension: Scalars['String']['output'];
  name: Scalars['String']['output'];
  period?: Maybe<Scalars['String']['output']>;
  type?: Maybe<PlanType>;
};

export type LineItemAttributes = {
  cost: Scalars['Int']['input'];
  dimension: Scalars['String']['input'];
  name: Scalars['String']['input'];
  period: Scalars['String']['input'];
  type?: InputMaybe<PlanType>;
};

export enum LineItemDimension {
  Cluster = 'CLUSTER',
  User = 'USER'
}

export type LockAttributes = {
  lock: Scalars['String']['input'];
};

export enum LoginMethod {
  Github = 'GITHUB',
  Google = 'GOOGLE',
  Password = 'PASSWORD',
  Passwordless = 'PASSWORDLESS',
  Sso = 'SSO'
}

export type LoginMethodResponse = {
  __typename?: 'LoginMethodResponse';
  authorizeUrl?: Maybe<Scalars['String']['output']>;
  loginMethod: LoginMethod;
  token?: Maybe<Scalars['String']['output']>;
};

export type LoginRequest = {
  __typename?: 'LoginRequest';
  requestedScope?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  subject?: Maybe<Scalars['String']['output']>;
};

export enum MediaType {
  Audio = 'AUDIO',
  Image = 'IMAGE',
  Other = 'OTHER',
  Pdf = 'PDF',
  Video = 'VIDEO'
}

export type MeetingAttributes = {
  incidentId?: InputMaybe<Scalars['ID']['input']>;
  topic: Scalars['String']['input'];
};

export type MessageEntity = {
  __typename?: 'MessageEntity';
  endIndex?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  startIndex?: Maybe<Scalars['Int']['output']>;
  text?: Maybe<Scalars['String']['output']>;
  type: MessageEntityType;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
};

export enum MessageEntityType {
  Emoji = 'EMOJI',
  Mention = 'MENTION'
}

export type Metric = {
  __typename?: 'Metric';
  name: Scalars['String']['output'];
  tags?: Maybe<Array<Maybe<MetricTag>>>;
  values?: Maybe<Array<Maybe<MetricValue>>>;
};

export type MetricTag = {
  __typename?: 'MetricTag';
  name: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type MetricValue = {
  __typename?: 'MetricValue';
  time?: Maybe<Scalars['DateTime']['output']>;
  value?: Maybe<Scalars['Int']['output']>;
};

export type NetworkConfiguration = {
  __typename?: 'NetworkConfiguration';
  pluralDns?: Maybe<Scalars['Boolean']['output']>;
  subdomain?: Maybe<Scalars['String']['output']>;
};

export type NextAction = {
  __typename?: 'NextAction';
  redirectToUrl?: Maybe<RedirectToUrl>;
  type?: Maybe<Scalars['String']['output']>;
};

export type Notification = {
  __typename?: 'Notification';
  actor: User;
  id: Scalars['ID']['output'];
  incident?: Maybe<Incident>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  message?: Maybe<IncidentMessage>;
  msg?: Maybe<Scalars['String']['output']>;
  repository?: Maybe<Repository>;
  type: NotificationType;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user: User;
};

export type NotificationConnection = {
  __typename?: 'NotificationConnection';
  edges?: Maybe<Array<Maybe<NotificationEdge>>>;
  pageInfo: PageInfo;
};

export type NotificationEdge = {
  __typename?: 'NotificationEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Notification>;
};

export type NotificationPreferences = {
  __typename?: 'NotificationPreferences';
  incidentUpdate?: Maybe<Scalars['Boolean']['output']>;
  mention?: Maybe<Scalars['Boolean']['output']>;
  message?: Maybe<Scalars['Boolean']['output']>;
};

export type NotificationPreferencesAttributes = {
  incidentUpdate: Scalars['Boolean']['input'];
  mention: Scalars['Boolean']['input'];
  message: Scalars['Boolean']['input'];
};

export enum NotificationType {
  IncidentUpdate = 'INCIDENT_UPDATE',
  Locked = 'LOCKED',
  Mention = 'MENTION',
  Message = 'MESSAGE',
  Pending = 'PENDING'
}

export type OauthAttributes = {
  code?: InputMaybe<Scalars['String']['input']>;
  redirectUri?: InputMaybe<Scalars['String']['input']>;
  service?: InputMaybe<OauthService>;
};

export type OauthInfo = {
  __typename?: 'OauthInfo';
  authorizeUrl: Scalars['String']['output'];
  provider: OauthProvider;
};

export type OauthIntegration = {
  __typename?: 'OauthIntegration';
  account?: Maybe<Account>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  service: OauthService;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export enum OauthProvider {
  Github = 'GITHUB',
  Gitlab = 'GITLAB',
  Google = 'GOOGLE'
}

export type OauthResponse = {
  __typename?: 'OauthResponse';
  redirectTo: Scalars['String']['output'];
};

export enum OauthService {
  Zoom = 'ZOOM'
}

export type OauthSettings = {
  __typename?: 'OauthSettings';
  authMethod: OidcAuthMethod;
  uriFormat: Scalars['String']['output'];
};

/** Input for the application's OAuth settings. */
export type OauthSettingsAttributes = {
  /** The authentication method for the OAuth provider. */
  authMethod: OidcAuthMethod;
  /** The URI format for the OAuth provider. */
  uriFormat: Scalars['String']['input'];
};

/** Input for creating or updating the OIDC attributes of an application installation. */
export type OidcAttributes = {
  /** The authentication method for the OIDC provider. */
  authMethod: OidcAuthMethod;
  /** The users or groups that can login through the OIDC provider. */
  bindings?: InputMaybe<Array<InputMaybe<BindingAttributes>>>;
  /** The redirect URIs for the OIDC provider. */
  redirectUris?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

/** Supported OIDC authentication methods. */
export enum OidcAuthMethod {
  Basic = 'BASIC',
  Post = 'POST'
}

export type OidcLogin = {
  __typename?: 'OidcLogin';
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  ip?: Maybe<Scalars['String']['output']>;
  latitude?: Maybe<Scalars['String']['output']>;
  longitude?: Maybe<Scalars['String']['output']>;
  owner?: Maybe<User>;
  repository?: Maybe<Repository>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
};

export type OidcLoginConnection = {
  __typename?: 'OidcLoginConnection';
  edges?: Maybe<Array<Maybe<OidcLoginEdge>>>;
  pageInfo: PageInfo;
};

export type OidcLoginEdge = {
  __typename?: 'OidcLoginEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<OidcLogin>;
};

export type OidcProvider = {
  __typename?: 'OidcProvider';
  authMethod: OidcAuthMethod;
  bindings?: Maybe<Array<Maybe<OidcProviderBinding>>>;
  clientId: Scalars['String']['output'];
  clientSecret: Scalars['String']['output'];
  configuration?: Maybe<OuathConfiguration>;
  consent?: Maybe<ConsentRequest>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  invites?: Maybe<Array<Maybe<Invite>>>;
  redirectUris?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type OidcProviderBinding = {
  __typename?: 'OidcProviderBinding';
  group?: Maybe<Group>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
};

export type OidcSettings = {
  __typename?: 'OidcSettings';
  authMethod: OidcAuthMethod;
  domainKey?: Maybe<Scalars['String']['output']>;
  subdomain?: Maybe<Scalars['Boolean']['output']>;
  uriFormat?: Maybe<Scalars['String']['output']>;
  uriFormats?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type OidcSettingsAttributes = {
  authMethod: OidcAuthMethod;
  domainKey?: InputMaybe<Scalars['String']['input']>;
  subdomain?: InputMaybe<Scalars['Boolean']['input']>;
  uriFormat?: InputMaybe<Scalars['String']['input']>;
  uriFormats?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type OidcStepResponse = {
  __typename?: 'OidcStepResponse';
  consent?: Maybe<ConsentRequest>;
  login?: Maybe<LoginRequest>;
  repository?: Maybe<Repository>;
};

export type OidcTrustRelationship = {
  __typename?: 'OidcTrustRelationship';
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  issuer: Scalars['String']['output'];
  scopes?: Maybe<Array<Scalars['String']['output']>>;
  trust: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type OnboardingChecklist = {
  __typename?: 'OnboardingChecklist';
  dismissed?: Maybe<Scalars['Boolean']['output']>;
  status?: Maybe<OnboardingChecklistState>;
};

export type OnboardingChecklistAttributes = {
  dismissed?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<OnboardingChecklistState>;
};

export enum OnboardingChecklistState {
  Configured = 'CONFIGURED',
  ConsoleInstalled = 'CONSOLE_INSTALLED',
  Finished = 'FINISHED',
  New = 'NEW'
}

export enum OnboardingState {
  Active = 'ACTIVE',
  Installed = 'INSTALLED',
  New = 'NEW',
  Onboarded = 'ONBOARDED'
}

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

export enum Order {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type OuathConfiguration = {
  __typename?: 'OuathConfiguration';
  authorizationEndpoint?: Maybe<Scalars['String']['output']>;
  issuer?: Maybe<Scalars['String']['output']>;
  jwksUri?: Maybe<Scalars['String']['output']>;
  tokenEndpoint?: Maybe<Scalars['String']['output']>;
  userinfoEndpoint?: Maybe<Scalars['String']['output']>;
};

export type PackageScan = {
  __typename?: 'PackageScan';
  errors?: Maybe<Array<Maybe<ScanError>>>;
  grade?: Maybe<ImageGrade>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  violations?: Maybe<Array<Maybe<ScanViolation>>>;
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

export type PaymentIntent = {
  __typename?: 'PaymentIntent';
  amount?: Maybe<Scalars['Int']['output']>;
  captureMethod?: Maybe<Scalars['String']['output']>;
  clientSecret?: Maybe<Scalars['String']['output']>;
  currency?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  nextAction?: Maybe<NextAction>;
  status?: Maybe<Scalars['String']['output']>;
};

export type PaymentMethod = {
  __typename?: 'PaymentMethod';
  card?: Maybe<Card>;
  id?: Maybe<Scalars['String']['output']>;
  isDefault?: Maybe<Scalars['Boolean']['output']>;
  type?: Maybe<Scalars['String']['output']>;
};

export type PaymentMethodConnection = {
  __typename?: 'PaymentMethodConnection';
  edges?: Maybe<Array<Maybe<PaymentMethodEdge>>>;
  pageInfo: PageInfo;
};

export type PaymentMethodEdge = {
  __typename?: 'PaymentMethodEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<PaymentMethod>;
};

export enum PaymentPeriod {
  Monthly = 'MONTHLY',
  Yearly = 'YEARLY'
}

export enum Permission {
  Billing = 'BILLING',
  Install = 'INSTALL',
  Integrations = 'INTEGRATIONS',
  Publish = 'PUBLISH',
  Support = 'SUPPORT',
  Users = 'USERS'
}

export type PersistedToken = {
  __typename?: 'PersistedToken';
  audits?: Maybe<PersistedTokenAuditConnection>;
  id?: Maybe<Scalars['ID']['output']>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  metrics?: Maybe<Array<Maybe<GeoMetric>>>;
  token?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};


export type PersistedTokenAuditsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type PersistedTokenAudit = {
  __typename?: 'PersistedTokenAudit';
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

export type PersistedTokenAuditConnection = {
  __typename?: 'PersistedTokenAuditConnection';
  edges?: Maybe<Array<Maybe<PersistedTokenAuditEdge>>>;
  pageInfo: PageInfo;
};

export type PersistedTokenAuditEdge = {
  __typename?: 'PersistedTokenAuditEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<PersistedTokenAudit>;
};

export type PersistedTokenConnection = {
  __typename?: 'PersistedTokenConnection';
  edges?: Maybe<Array<Maybe<PersistedTokenEdge>>>;
  pageInfo: PageInfo;
};

export type PersistedTokenEdge = {
  __typename?: 'PersistedTokenEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<PersistedToken>;
};

export type Plan = {
  __typename?: 'Plan';
  cost: Scalars['Int']['output'];
  default?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  lineItems?: Maybe<PlanLineItems>;
  metadata?: Maybe<PlanMetadata>;
  name: Scalars['String']['output'];
  period?: Maybe<Scalars['String']['output']>;
  serviceLevels?: Maybe<Array<Maybe<ServiceLevel>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  visible: Scalars['Boolean']['output'];
};

export type PlanAttributes = {
  cost: Scalars['Int']['input'];
  default?: InputMaybe<Scalars['Boolean']['input']>;
  lineItems?: InputMaybe<PlanLineItemAttributes>;
  metadata?: InputMaybe<PlanMetadataAttributes>;
  name: Scalars['String']['input'];
  period: Scalars['String']['input'];
  serviceLevels?: InputMaybe<Array<InputMaybe<ServiceLevelAttributes>>>;
};

export type PlanFeature = {
  __typename?: 'PlanFeature';
  description: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type PlanFeatureAttributes = {
  description: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type PlanFeatures = {
  __typename?: 'PlanFeatures';
  audit?: Maybe<Scalars['Boolean']['output']>;
  cd?: Maybe<Scalars['Boolean']['output']>;
  databaseManagement?: Maybe<Scalars['Boolean']['output']>;
  userManagement?: Maybe<Scalars['Boolean']['output']>;
  vpn?: Maybe<Scalars['Boolean']['output']>;
};

export type PlanLineItemAttributes = {
  included?: InputMaybe<Array<InputMaybe<LimitAttributes>>>;
  items?: InputMaybe<Array<InputMaybe<LineItemAttributes>>>;
};

export type PlanLineItems = {
  __typename?: 'PlanLineItems';
  included?: Maybe<Array<Maybe<Limit>>>;
  items?: Maybe<Array<Maybe<LineItem>>>;
};

export type PlanMetadata = {
  __typename?: 'PlanMetadata';
  features?: Maybe<Array<Maybe<PlanFeature>>>;
  freeform?: Maybe<Scalars['Map']['output']>;
};

export type PlanMetadataAttributes = {
  features?: InputMaybe<Array<InputMaybe<PlanFeatureAttributes>>>;
  freeform?: InputMaybe<Scalars['Yaml']['input']>;
};

export enum PlanType {
  Licensed = 'LICENSED',
  Metered = 'METERED'
}

export type PlatformMetrics = {
  __typename?: 'PlatformMetrics';
  clusters?: Maybe<Scalars['Int']['output']>;
  publishers?: Maybe<Scalars['Int']['output']>;
  repositories?: Maybe<Scalars['Int']['output']>;
  rollouts?: Maybe<Scalars['Int']['output']>;
};

export type PlatformPlan = {
  __typename?: 'PlatformPlan';
  cost: Scalars['Int']['output'];
  enterprise?: Maybe<Scalars['Boolean']['output']>;
  features?: Maybe<PlanFeatures>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  lineItems?: Maybe<Array<Maybe<PlatformPlanItem>>>;
  name: Scalars['String']['output'];
  period: PaymentPeriod;
  trial?: Maybe<Scalars['Boolean']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  visible: Scalars['Boolean']['output'];
};

export type PlatformPlanItem = {
  __typename?: 'PlatformPlanItem';
  cost: Scalars['Int']['output'];
  dimension: LineItemDimension;
  externalId?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  period: PaymentPeriod;
};

export type PlatformSubscription = {
  __typename?: 'PlatformSubscription';
  externalId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  latestInvoice?: Maybe<Invoice>;
  lineItems?: Maybe<Array<Maybe<PlatformSubscriptionLineItems>>>;
  plan?: Maybe<PlatformPlan>;
  trialUntil?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type PlatformSubscriptionLineItems = {
  __typename?: 'PlatformSubscriptionLineItems';
  dimension: LineItemDimension;
  externalId?: Maybe<Scalars['String']['output']>;
  quantity: Scalars['Int']['output'];
};

export type PluralConfiguration = {
  __typename?: 'PluralConfiguration';
  gitCommit?: Maybe<Scalars['String']['output']>;
  registry?: Maybe<Scalars['String']['output']>;
  stripeConnectId?: Maybe<Scalars['String']['output']>;
  stripePublishableKey?: Maybe<Scalars['String']['output']>;
};

export type PolicyBinding = {
  __typename?: 'PolicyBinding';
  group?: Maybe<Group>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
};

export type Postmortem = {
  __typename?: 'Postmortem';
  actionItems?: Maybe<Array<Maybe<ActionItem>>>;
  content: Scalars['String']['output'];
  creator: User;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type PostmortemAttributes = {
  actionItems?: InputMaybe<Array<InputMaybe<ActionItemAttributes>>>;
  content: Scalars['String']['input'];
};

export enum Provider {
  Aws = 'AWS',
  Azure = 'AZURE',
  Custom = 'CUSTOM',
  Equinix = 'EQUINIX',
  Gcp = 'GCP',
  Generic = 'GENERIC',
  Kind = 'KIND',
  Kubernetes = 'KUBERNETES'
}

export type PublicKey = {
  __typename?: 'PublicKey';
  content: Scalars['String']['output'];
  digest: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user: User;
};

export type PublicKeyAttributes = {
  content: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type PublicKeyConnection = {
  __typename?: 'PublicKeyConnection';
  edges?: Maybe<Array<Maybe<PublicKeyEdge>>>;
  pageInfo: PageInfo;
};

export type PublicKeyEdge = {
  __typename?: 'PublicKeyEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<PublicKey>;
};

export type Publisher = {
  __typename?: 'Publisher';
  address?: Maybe<Address>;
  avatar?: Maybe<Scalars['String']['output']>;
  backgroundColor?: Maybe<Scalars['String']['output']>;
  billingAccountId?: Maybe<Scalars['String']['output']>;
  community?: Maybe<Community>;
  description?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  owner?: Maybe<User>;
  phone?: Maybe<Scalars['String']['output']>;
  repositories?: Maybe<Array<Maybe<Repository>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type PublisherAttributes = {
  address?: InputMaybe<AddressAttributes>;
  avatar?: InputMaybe<Scalars['UploadOrUrl']['input']>;
  community?: InputMaybe<CommunityAttributes>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
};

export type PublisherConnection = {
  __typename?: 'PublisherConnection';
  edges?: Maybe<Array<Maybe<PublisherEdge>>>;
  pageInfo: PageInfo;
};

export type PublisherEdge = {
  __typename?: 'PublisherEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Publisher>;
};

export type Reaction = {
  __typename?: 'Reaction';
  creator: User;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  message: IncidentMessage;
  name: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type Recipe = {
  __typename?: 'Recipe';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  oidcEnabled?: Maybe<Scalars['Boolean']['output']>;
  oidcSettings?: Maybe<OidcSettings>;
  primary?: Maybe<Scalars['Boolean']['output']>;
  private?: Maybe<Scalars['Boolean']['output']>;
  provider?: Maybe<Provider>;
  recipeDependencies?: Maybe<Array<Maybe<Recipe>>>;
  recipeSections?: Maybe<Array<Maybe<RecipeSection>>>;
  repository?: Maybe<Repository>;
  restricted?: Maybe<Scalars['Boolean']['output']>;
  tests?: Maybe<Array<Maybe<RecipeTest>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type RecipeAttributes = {
  dependencies?: InputMaybe<Array<InputMaybe<RecipeReference>>>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  oidcSettings?: InputMaybe<OidcSettingsAttributes>;
  primary?: InputMaybe<Scalars['Boolean']['input']>;
  private?: InputMaybe<Scalars['Boolean']['input']>;
  provider?: InputMaybe<Provider>;
  restricted?: InputMaybe<Scalars['Boolean']['input']>;
  sections?: InputMaybe<Array<InputMaybe<RecipeSectionAttributes>>>;
  tests?: InputMaybe<Array<InputMaybe<RecipeTestAttributes>>>;
};

export type RecipeCondition = {
  __typename?: 'RecipeCondition';
  field: Scalars['String']['output'];
  operation: Operation;
  value?: Maybe<Scalars['String']['output']>;
};

export type RecipeConditionAttributes = {
  field: Scalars['String']['input'];
  operation: Operation;
  value?: InputMaybe<Scalars['String']['input']>;
};

export type RecipeConfiguration = {
  __typename?: 'RecipeConfiguration';
  args?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  condition?: Maybe<RecipeCondition>;
  default?: Maybe<Scalars['String']['output']>;
  documentation?: Maybe<Scalars['String']['output']>;
  functionName?: Maybe<Scalars['String']['output']>;
  longform?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  optional?: Maybe<Scalars['Boolean']['output']>;
  placeholder?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Datatype>;
  validation?: Maybe<RecipeValidation>;
};

export type RecipeConfigurationAttributes = {
  condition?: InputMaybe<RecipeConditionAttributes>;
  default?: InputMaybe<Scalars['String']['input']>;
  documentation?: InputMaybe<Scalars['String']['input']>;
  functionName?: InputMaybe<Scalars['String']['input']>;
  longform?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  optional?: InputMaybe<Scalars['Boolean']['input']>;
  placeholder?: InputMaybe<Scalars['String']['input']>;
  type: Datatype;
  validation?: InputMaybe<RecipeValidationAttributes>;
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
  chart?: Maybe<Chart>;
  configuration?: Maybe<Array<Maybe<RecipeConfiguration>>>;
  id?: Maybe<Scalars['ID']['output']>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  recipeSection?: Maybe<RecipeSection>;
  terraform?: Maybe<Terraform>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type RecipeItemAttributes = {
  configuration?: InputMaybe<Array<InputMaybe<RecipeConfigurationAttributes>>>;
  name: Scalars['String']['input'];
  type: RecipeItemType;
};

export enum RecipeItemType {
  Helm = 'HELM',
  Terraform = 'TERRAFORM'
}

export type RecipeReference = {
  name: Scalars['String']['input'];
  repo: Scalars['String']['input'];
};

export type RecipeSection = {
  __typename?: 'RecipeSection';
  configuration?: Maybe<Array<Maybe<RecipeConfiguration>>>;
  id?: Maybe<Scalars['ID']['output']>;
  index?: Maybe<Scalars['Int']['output']>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  recipe?: Maybe<Recipe>;
  recipeItems?: Maybe<Array<Maybe<RecipeItem>>>;
  repository?: Maybe<Repository>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type RecipeSectionAttributes = {
  configuration?: InputMaybe<Array<InputMaybe<RecipeConfigurationAttributes>>>;
  items?: InputMaybe<Array<InputMaybe<RecipeItemAttributes>>>;
  name: Scalars['String']['input'];
};

export type RecipeTest = {
  __typename?: 'RecipeTest';
  args?: Maybe<Array<Maybe<TestArgument>>>;
  message?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  type: TestType;
};

export type RecipeTestAttributes = {
  args?: InputMaybe<Array<InputMaybe<TestArgumentAttributes>>>;
  message?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  type: TestType;
};

export type RecipeValidation = {
  __typename?: 'RecipeValidation';
  message: Scalars['String']['output'];
  regex?: Maybe<Scalars['String']['output']>;
  type: ValidationType;
};

export type RecipeValidationAttributes = {
  message: Scalars['String']['input'];
  regex?: InputMaybe<Scalars['String']['input']>;
  type: ValidationType;
};

export type RedirectToUrl = {
  __typename?: 'RedirectToUrl';
  returnUrl?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

/** The release status of a repository, defaults to ALPHA, GA if it is ready for general consumption */
export enum ReleaseStatus {
  Alpha = 'ALPHA',
  Beta = 'BETA',
  Ga = 'GA'
}

/** Container for all resources to create an application. */
export type Repository = {
  __typename?: 'Repository';
  /** The artifacts of the application. */
  artifacts?: Maybe<Array<Maybe<Artifact>>>;
  /** The category of the application. */
  category?: Maybe<Category>;
  /** The community links of the application. */
  community?: Maybe<Community>;
  /** The external contributors to this repository */
  contributors?: Maybe<Array<Maybe<Contributor>>>;
  darkIcon?: Maybe<Scalars['String']['output']>;
  /** The default tag to deploy. */
  defaultTag?: Maybe<Scalars['String']['output']>;
  /** The description of the application. */
  description?: Maybe<Scalars['String']['output']>;
  /** The documentation of the application. */
  docs?: Maybe<Array<Maybe<FileContent>>>;
  /** The documentation of the application. */
  documentation?: Maybe<Scalars['String']['output']>;
  /** If the application can be edited by the current user. */
  editable?: Maybe<Scalars['Boolean']['output']>;
  /** The git URL of the application. */
  gitUrl?: Maybe<Scalars['String']['output']>;
  /** The homepage of the application. */
  homepage?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  /** The application's ID. */
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The installation of the application by a user. */
  installation?: Maybe<Installation>;
  /** The license of the application. */
  license?: Maybe<License>;
  /** The main branch of the application. */
  mainBranch?: Maybe<Scalars['String']['output']>;
  /** The name of the application. */
  name: Scalars['String']['output'];
  /** Notes about the application rendered after deploying and displayed to the user. */
  notes?: Maybe<Scalars['String']['output']>;
  /** The OAuth settings for the application. */
  oauthSettings?: Maybe<OauthSettings>;
  /** The available plans for the application. */
  plans?: Maybe<Array<Maybe<Plan>>>;
  /** Whether the application is private. */
  private?: Maybe<Scalars['Boolean']['output']>;
  /** The application's public key. */
  publicKey?: Maybe<Scalars['String']['output']>;
  /** The application publisher. */
  publisher?: Maybe<Publisher>;
  /** The README of the application. */
  readme?: Maybe<Scalars['String']['output']>;
  /** The recipes used to install the application. */
  recipes?: Maybe<Array<Maybe<Recipe>>>;
  /** release status of the repository */
  releaseStatus?: Maybe<ReleaseStatus>;
  /** A map of secrets of the application. */
  secrets?: Maybe<Scalars['Map']['output']>;
  /** The tags of the application. */
  tags?: Maybe<Array<Maybe<Tag>>>;
  /** Whether the application is trending. */
  trending?: Maybe<Scalars['Boolean']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** version tags that can be followed to control upgrade flow */
  upgradeChannels?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** Whether the application is verified. */
  verified?: Maybe<Scalars['Boolean']['output']>;
};

/** Input for creating or updating an application's attributes. */
export type RepositoryAttributes = {
  /** The category of the application. */
  category?: InputMaybe<Category>;
  /** The application's community links. */
  community?: InputMaybe<CommunityAttributes>;
  /** List of emails of external users contributing to this repository and who will be granted access */
  contributors?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  /** The application's dark icon. */
  darkIcon?: InputMaybe<Scalars['UploadOrUrl']['input']>;
  /** The default tag to use when deploying the application. */
  defaultTag?: InputMaybe<Scalars['String']['input']>;
  /** A short description of the application. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The application's documentation. */
  docs?: InputMaybe<Scalars['UploadOrUrl']['input']>;
  /** A link to the application's documentation. */
  documentation?: InputMaybe<Scalars['String']['input']>;
  /** The application's git URL. */
  gitUrl?: InputMaybe<Scalars['String']['input']>;
  /** The application's homepage. */
  homepage?: InputMaybe<Scalars['String']['input']>;
  /** The application's icon. */
  icon?: InputMaybe<Scalars['UploadOrUrl']['input']>;
  /** The application's integration resource definition. */
  integrationResourceDefinition?: InputMaybe<ResourceDefinitionAttributes>;
  /** The name of the application. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Notes about the application rendered after deploying and displayed to the user. */
  notes?: InputMaybe<Scalars['String']['input']>;
  /** The application's OAuth settings. */
  oauthSettings?: InputMaybe<OauthSettingsAttributes>;
  /** Whether the application is private. */
  private?: InputMaybe<Scalars['Boolean']['input']>;
  /** The application's README. */
  readme?: InputMaybe<Scalars['String']['input']>;
  /** release status of the repository */
  releaseStatus?: InputMaybe<ReleaseStatus>;
  /** A YAML object of secrets. */
  secrets?: InputMaybe<Scalars['Yaml']['input']>;
  /** The application's tags. */
  tags?: InputMaybe<Array<InputMaybe<TagAttributes>>>;
  /** Whether the application is trending. */
  trending?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether the application is verified. */
  verified?: InputMaybe<Scalars['Boolean']['input']>;
};

export type RepositoryConnection = {
  __typename?: 'RepositoryConnection';
  edges?: Maybe<Array<Maybe<RepositoryEdge>>>;
  pageInfo: PageInfo;
};

export type RepositoryEdge = {
  __typename?: 'RepositoryEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Repository>;
};

export type RepositorySubscription = {
  __typename?: 'RepositorySubscription';
  customerId?: Maybe<Scalars['String']['output']>;
  externalId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  installation?: Maybe<Installation>;
  invoices?: Maybe<InvoiceConnection>;
  lineItems?: Maybe<SubscriptionLineItems>;
  plan?: Maybe<Plan>;
};


export type RepositorySubscriptionInvoicesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type RepositorySubscriptionConnection = {
  __typename?: 'RepositorySubscriptionConnection';
  edges?: Maybe<Array<Maybe<RepositorySubscriptionEdge>>>;
  pageInfo: PageInfo;
};

export type RepositorySubscriptionEdge = {
  __typename?: 'RepositorySubscriptionEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<RepositorySubscription>;
};

export type ResetToken = {
  __typename?: 'ResetToken';
  email: Scalars['String']['output'];
  externalId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  type: ResetTokenType;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user: User;
};

export type ResetTokenAttributes = {
  email?: InputMaybe<Scalars['String']['input']>;
  type: ResetTokenType;
};

export type ResetTokenRealization = {
  password?: InputMaybe<Scalars['String']['input']>;
};

export enum ResetTokenType {
  Email = 'EMAIL',
  Password = 'PASSWORD'
}

export type ResourceDefinitionAttributes = {
  name: Scalars['String']['input'];
  spec?: InputMaybe<Array<InputMaybe<SpecificationAttributes>>>;
};

export type Role = {
  __typename?: 'Role';
  account?: Maybe<Account>;
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

export type Roles = {
  __typename?: 'Roles';
  admin?: Maybe<Scalars['Boolean']['output']>;
};

export type RolesAttributes = {
  admin?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Rollout = {
  __typename?: 'Rollout';
  count?: Maybe<Scalars['Int']['output']>;
  cursor?: Maybe<Scalars['ID']['output']>;
  event?: Maybe<Scalars['String']['output']>;
  heartbeat?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  repository?: Maybe<Repository>;
  status: RolloutStatus;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type RolloutConnection = {
  __typename?: 'RolloutConnection';
  edges?: Maybe<Array<Maybe<RolloutEdge>>>;
  pageInfo: PageInfo;
};

export type RolloutDelta = {
  __typename?: 'RolloutDelta';
  delta?: Maybe<Delta>;
  payload?: Maybe<Rollout>;
};

export type RolloutEdge = {
  __typename?: 'RolloutEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Rollout>;
};

export enum RolloutStatus {
  Finished = 'FINISHED',
  Queued = 'QUEUED',
  Running = 'RUNNING'
}

export type RootMutationType = {
  __typename?: 'RootMutationType';
  acceptIncident?: Maybe<Incident>;
  acceptLogin?: Maybe<OauthResponse>;
  acquireLock?: Maybe<ApplyLock>;
  beginTrial?: Maybe<PlatformSubscription>;
  cancelPlatformSubscription?: Maybe<PlatformSubscription>;
  completeIncident?: Maybe<Incident>;
  createArtifact?: Maybe<Artifact>;
  createCard?: Maybe<Account>;
  /** Create a new cluster. */
  createCluster?: Maybe<Cluster>;
  /** adds a dependency for this cluster to gate future upgrades */
  createClusterDependency?: Maybe<ClusterDependency>;
  createCrd?: Maybe<Crd>;
  createDemoProject?: Maybe<DemoProject>;
  createDnsRecord?: Maybe<DnsRecord>;
  createDomain?: Maybe<DnsDomain>;
  createGroup?: Maybe<Group>;
  createGroupMember?: Maybe<GroupMember>;
  createIncident?: Maybe<Incident>;
  createInstallation?: Maybe<Installation>;
  createIntegration?: Maybe<Integration>;
  createIntegrationWebhook?: Maybe<IntegrationWebhook>;
  createInvite?: Maybe<Invite>;
  createKeyBackup?: Maybe<KeyBackup>;
  createMessage?: Maybe<IncidentMessage>;
  createOauthIntegration?: Maybe<OauthIntegration>;
  createOidcProvider?: Maybe<OidcProvider>;
  createPlan?: Maybe<Plan>;
  createPlatformSubscription?: Maybe<PlatformSubscription>;
  createPublicKey?: Maybe<PublicKey>;
  createPublisher?: Maybe<Publisher>;
  createQueue?: Maybe<UpgradeQueue>;
  createReaction?: Maybe<IncidentMessage>;
  createRecipe?: Maybe<Recipe>;
  createRepository?: Maybe<Repository>;
  createResetToken?: Maybe<Scalars['Boolean']['output']>;
  createRole?: Maybe<Role>;
  createServiceAccount?: Maybe<User>;
  createShell?: Maybe<CloudShell>;
  createStack?: Maybe<Stack>;
  createSubscription?: Maybe<RepositorySubscription>;
  createTerraform?: Maybe<Terraform>;
  createTest?: Maybe<Test>;
  createToken?: Maybe<PersistedToken>;
  createTrustRelationship?: Maybe<OidcTrustRelationship>;
  createUpgrade?: Maybe<Upgrade>;
  createUserEvent?: Maybe<Scalars['Boolean']['output']>;
  createWebhook?: Maybe<Webhook>;
  createZoom?: Maybe<ZoomMeeting>;
  defaultPaymentMethod?: Maybe<Scalars['Boolean']['output']>;
  deleteCard?: Maybe<Account>;
  deleteChartInstallation?: Maybe<ChartInstallation>;
  /** Delete a cluster. */
  deleteCluster?: Maybe<Cluster>;
  /** deletes a dependency for this cluster and potentially disables promotions entirely */
  deleteClusterDependency?: Maybe<ClusterDependency>;
  deleteDemoProject?: Maybe<DemoProject>;
  deleteDnsRecord?: Maybe<DnsRecord>;
  deleteDomain?: Maybe<DnsDomain>;
  deleteEabKey?: Maybe<EabCredential>;
  deleteGroup?: Maybe<Group>;
  deleteGroupMember?: Maybe<GroupMember>;
  deleteIncident?: Maybe<Incident>;
  deleteInstallation?: Maybe<Installation>;
  deleteIntegrationWebhook?: Maybe<IntegrationWebhook>;
  deleteInvite?: Maybe<Invite>;
  deleteKeyBackup?: Maybe<KeyBackup>;
  deleteMessage?: Maybe<IncidentMessage>;
  deletePaymentMethod?: Maybe<PaymentMethod>;
  deletePlatformSubscription?: Maybe<Account>;
  deletePublicKey?: Maybe<PublicKey>;
  deleteReaction?: Maybe<IncidentMessage>;
  deleteRecipe?: Maybe<Recipe>;
  deleteRepository?: Maybe<Repository>;
  deleteRole?: Maybe<Role>;
  deleteShell?: Maybe<CloudShell>;
  deleteStack?: Maybe<Stack>;
  deleteTerraform?: Maybe<Terraform>;
  deleteToken?: Maybe<PersistedToken>;
  deleteTrustRelationship?: Maybe<OidcTrustRelationship>;
  deleteUser?: Maybe<User>;
  destroyCluster?: Maybe<Scalars['Boolean']['output']>;
  deviceLogin?: Maybe<DeviceLogin>;
  externalToken?: Maybe<Scalars['String']['output']>;
  followIncident?: Maybe<Follower>;
  impersonateServiceAccount?: Maybe<User>;
  installBundle?: Maybe<Array<Maybe<Installation>>>;
  installChart?: Maybe<ChartInstallation>;
  installRecipe?: Maybe<Array<Maybe<Installation>>>;
  installStack?: Maybe<Array<Maybe<Recipe>>>;
  installStackShell?: Maybe<Array<Maybe<Recipe>>>;
  installTerraform?: Maybe<TerraformInstallation>;
  installVersion?: Maybe<Scalars['Boolean']['output']>;
  linkPublisher?: Maybe<Publisher>;
  login?: Maybe<User>;
  loginToken?: Maybe<User>;
  oauthCallback?: Maybe<User>;
  oauthConsent?: Maybe<OauthResponse>;
  passwordlessLogin?: Maybe<User>;
  pingWebhook?: Maybe<WebhookResponse>;
  /** moves up the upgrade waterline for a user */
  promote?: Maybe<User>;
  provisionDomain?: Maybe<DnsDomain>;
  publishLogs?: Maybe<TestStep>;
  quickStack?: Maybe<Stack>;
  readNotifications?: Maybe<Scalars['Int']['output']>;
  realizeInvite?: Maybe<User>;
  realizeResetToken?: Maybe<Scalars['Boolean']['output']>;
  rebootShell?: Maybe<CloudShell>;
  release?: Maybe<Scalars['Boolean']['output']>;
  releaseLock?: Maybe<ApplyLock>;
  resetInstallations?: Maybe<Scalars['Int']['output']>;
  restartShell?: Maybe<Scalars['Boolean']['output']>;
  setupIntent?: Maybe<SetupIntent>;
  setupShell?: Maybe<CloudShell>;
  signup?: Maybe<User>;
  ssoCallback?: Maybe<User>;
  stopShell?: Maybe<Scalars['Boolean']['output']>;
  synced?: Maybe<Scalars['Boolean']['output']>;
  transferDemoProject?: Maybe<DemoProject>;
  /** transfers ownership of a cluster to a service account */
  transferOwnership?: Maybe<Cluster>;
  unfollowIncident?: Maybe<Follower>;
  uninstallTerraform?: Maybe<TerraformInstallation>;
  unlockRepository?: Maybe<Scalars['Int']['output']>;
  updateAccount?: Maybe<Account>;
  updateChart?: Maybe<Chart>;
  updateChartInstallation?: Maybe<ChartInstallation>;
  updateDockerRepository?: Maybe<DockerRepository>;
  updateDomain?: Maybe<DnsDomain>;
  updateGroup?: Maybe<Group>;
  updateIncident?: Maybe<Incident>;
  updateInstallation?: Maybe<Installation>;
  updateIntegrationWebhook?: Maybe<IntegrationWebhook>;
  updateLineItem?: Maybe<RepositorySubscription>;
  updateMessage?: Maybe<IncidentMessage>;
  updateOidcProvider?: Maybe<OidcProvider>;
  updatePlan?: Maybe<RepositorySubscription>;
  updatePlanAttributes?: Maybe<Plan>;
  updatePlatformPlan?: Maybe<PlatformSubscription>;
  updatePublisher?: Maybe<Publisher>;
  updateRepository?: Maybe<Repository>;
  updateRole?: Maybe<Role>;
  updateServiceAccount?: Maybe<User>;
  updateShell?: Maybe<CloudShell>;
  updateShellConfiguration?: Maybe<Scalars['Boolean']['output']>;
  updateStep?: Maybe<TestStep>;
  updateTerraform?: Maybe<Terraform>;
  updateTest?: Maybe<Test>;
  updateUser?: Maybe<User>;
  updateVersion?: Maybe<Version>;
  uploadTerraform?: Maybe<Terraform>;
  upsertOidcProvider?: Maybe<OidcProvider>;
  upsertRepository?: Maybe<Repository>;
};


export type RootMutationTypeAcceptIncidentArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeAcceptLoginArgs = {
  challenge: Scalars['String']['input'];
};


export type RootMutationTypeAcquireLockArgs = {
  repository: Scalars['String']['input'];
};


export type RootMutationTypeCompleteIncidentArgs = {
  id: Scalars['ID']['input'];
  postmortem: PostmortemAttributes;
};


export type RootMutationTypeCreateArtifactArgs = {
  attributes: ArtifactAttributes;
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
  repositoryName?: InputMaybe<Scalars['String']['input']>;
};


export type RootMutationTypeCreateCardArgs = {
  address?: InputMaybe<AddressAttributes>;
  source: Scalars['String']['input'];
};


export type RootMutationTypeCreateClusterArgs = {
  attributes: ClusterAttributes;
};


export type RootMutationTypeCreateClusterDependencyArgs = {
  destId: Scalars['ID']['input'];
  sourceId: Scalars['ID']['input'];
};


export type RootMutationTypeCreateCrdArgs = {
  attributes: CrdAttributes;
  chartId?: InputMaybe<Scalars['ID']['input']>;
  chartName?: InputMaybe<ChartName>;
};


export type RootMutationTypeCreateDnsRecordArgs = {
  attributes: DnsRecordAttributes;
  cluster: Scalars['String']['input'];
  provider: Provider;
};


export type RootMutationTypeCreateDomainArgs = {
  attributes: DnsDomainAttributes;
};


export type RootMutationTypeCreateGroupArgs = {
  attributes: GroupAttributes;
};


export type RootMutationTypeCreateGroupMemberArgs = {
  groupId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type RootMutationTypeCreateIncidentArgs = {
  attributes: IncidentAttributes;
  repository?: InputMaybe<Scalars['String']['input']>;
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeCreateInstallationArgs = {
  repositoryId: Scalars['ID']['input'];
};


export type RootMutationTypeCreateIntegrationArgs = {
  attributes: IntegrationAttributes;
  repositoryName: Scalars['String']['input'];
};


export type RootMutationTypeCreateIntegrationWebhookArgs = {
  attributes: IntegrationWebhookAttributes;
};


export type RootMutationTypeCreateInviteArgs = {
  attributes: InviteAttributes;
};


export type RootMutationTypeCreateKeyBackupArgs = {
  attributes: KeyBackupAttributes;
};


export type RootMutationTypeCreateMessageArgs = {
  attributes: IncidentMessageAttributes;
  incidentId: Scalars['ID']['input'];
};


export type RootMutationTypeCreateOauthIntegrationArgs = {
  attributes: OauthAttributes;
};


export type RootMutationTypeCreateOidcProviderArgs = {
  attributes: OidcAttributes;
  installationId: Scalars['ID']['input'];
};


export type RootMutationTypeCreatePlanArgs = {
  attributes: PlanAttributes;
  repositoryId: Scalars['ID']['input'];
};


export type RootMutationTypeCreatePlatformSubscriptionArgs = {
  billingAddress?: InputMaybe<AddressAttributes>;
  paymentMethod?: InputMaybe<Scalars['String']['input']>;
  planId: Scalars['ID']['input'];
};


export type RootMutationTypeCreatePublicKeyArgs = {
  attributes: PublicKeyAttributes;
};


export type RootMutationTypeCreatePublisherArgs = {
  attributes: PublisherAttributes;
};


export type RootMutationTypeCreateQueueArgs = {
  attributes: UpgradeQueueAttributes;
};


export type RootMutationTypeCreateReactionArgs = {
  messageId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};


export type RootMutationTypeCreateRecipeArgs = {
  attributes: RecipeAttributes;
  repositoryId?: InputMaybe<Scalars['String']['input']>;
  repositoryName?: InputMaybe<Scalars['String']['input']>;
};


export type RootMutationTypeCreateRepositoryArgs = {
  attributes: RepositoryAttributes;
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeCreateResetTokenArgs = {
  attributes: ResetTokenAttributes;
};


export type RootMutationTypeCreateRoleArgs = {
  attributes: RoleAttributes;
};


export type RootMutationTypeCreateServiceAccountArgs = {
  attributes: ServiceAccountAttributes;
};


export type RootMutationTypeCreateShellArgs = {
  attributes: CloudShellAttributes;
};


export type RootMutationTypeCreateStackArgs = {
  attributes: StackAttributes;
};


export type RootMutationTypeCreateSubscriptionArgs = {
  attributes?: InputMaybe<SubscriptionAttributes>;
  installationId: Scalars['ID']['input'];
  planId: Scalars['ID']['input'];
};


export type RootMutationTypeCreateTerraformArgs = {
  attributes: TerraformAttributes;
  repositoryId: Scalars['ID']['input'];
};


export type RootMutationTypeCreateTestArgs = {
  attributes: TestAttributes;
  name?: InputMaybe<Scalars['String']['input']>;
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeCreateTrustRelationshipArgs = {
  attributes: TrustRelationshipAttributes;
};


export type RootMutationTypeCreateUpgradeArgs = {
  attributes: UpgradeAttributes;
  queue: Scalars['String']['input'];
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
  repositoryName?: InputMaybe<Scalars['String']['input']>;
};


export type RootMutationTypeCreateUserEventArgs = {
  attributes: UserEventAttributes;
};


export type RootMutationTypeCreateWebhookArgs = {
  attributes: WebhookAttributes;
};


export type RootMutationTypeCreateZoomArgs = {
  attributes: MeetingAttributes;
};


export type RootMutationTypeDefaultPaymentMethodArgs = {
  id: Scalars['String']['input'];
};


export type RootMutationTypeDeleteCardArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteChartInstallationArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteClusterArgs = {
  name: Scalars['String']['input'];
  provider: Provider;
};


export type RootMutationTypeDeleteClusterDependencyArgs = {
  destId: Scalars['ID']['input'];
  sourceId: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteDnsRecordArgs = {
  name: Scalars['String']['input'];
  type: DnsRecordType;
};


export type RootMutationTypeDeleteDomainArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteEabKeyArgs = {
  cluster?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  provider?: InputMaybe<Provider>;
};


export type RootMutationTypeDeleteGroupArgs = {
  groupId: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteGroupMemberArgs = {
  groupId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteIncidentArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteInstallationArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteIntegrationWebhookArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteInviteArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  secureId?: InputMaybe<Scalars['String']['input']>;
};


export type RootMutationTypeDeleteKeyBackupArgs = {
  name: Scalars['String']['input'];
};


export type RootMutationTypeDeleteMessageArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeletePaymentMethodArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeletePublicKeyArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteReactionArgs = {
  messageId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};


export type RootMutationTypeDeleteRecipeArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteRepositoryArgs = {
  repositoryId: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteRoleArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteStackArgs = {
  name: Scalars['String']['input'];
};


export type RootMutationTypeDeleteTerraformArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteTokenArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteTrustRelationshipArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeDestroyClusterArgs = {
  domain: Scalars['String']['input'];
  name: Scalars['String']['input'];
  provider: Provider;
};


export type RootMutationTypeFollowIncidentArgs = {
  attributes: FollowerAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeImpersonateServiceAccountArgs = {
  email?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeInstallBundleArgs = {
  context: ContextAttributes;
  name: Scalars['String']['input'];
  oidc: Scalars['Boolean']['input'];
  repo: Scalars['String']['input'];
};


export type RootMutationTypeInstallChartArgs = {
  attributes: ChartInstallationAttributes;
  installationId: Scalars['ID']['input'];
};


export type RootMutationTypeInstallRecipeArgs = {
  context: Scalars['Map']['input'];
  recipeId: Scalars['ID']['input'];
};


export type RootMutationTypeInstallStackArgs = {
  name: Scalars['String']['input'];
  provider: Provider;
};


export type RootMutationTypeInstallStackShellArgs = {
  context: ContextAttributes;
  name: Scalars['String']['input'];
  oidc: Scalars['Boolean']['input'];
};


export type RootMutationTypeInstallTerraformArgs = {
  attributes: TerraformInstallationAttributes;
  installationId: Scalars['ID']['input'];
};


export type RootMutationTypeInstallVersionArgs = {
  package: Scalars['String']['input'];
  repository: Scalars['String']['input'];
  type: DependencyType;
  vsn: Scalars['String']['input'];
};


export type RootMutationTypeLinkPublisherArgs = {
  token: Scalars['String']['input'];
};


export type RootMutationTypeLoginArgs = {
  deviceToken?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type RootMutationTypeLoginTokenArgs = {
  deviceToken?: InputMaybe<Scalars['String']['input']>;
  token: Scalars['String']['input'];
};


export type RootMutationTypeOauthCallbackArgs = {
  code: Scalars['String']['input'];
  deviceToken?: InputMaybe<Scalars['String']['input']>;
  host?: InputMaybe<Scalars['String']['input']>;
  provider: OauthProvider;
};


export type RootMutationTypeOauthConsentArgs = {
  challenge: Scalars['String']['input'];
  scopes?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type RootMutationTypePasswordlessLoginArgs = {
  token: Scalars['String']['input'];
};


export type RootMutationTypePingWebhookArgs = {
  id: Scalars['ID']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  repo: Scalars['String']['input'];
};


export type RootMutationTypeProvisionDomainArgs = {
  name: Scalars['String']['input'];
};


export type RootMutationTypePublishLogsArgs = {
  id: Scalars['ID']['input'];
  logs: Scalars['String']['input'];
};


export type RootMutationTypeQuickStackArgs = {
  provider: Provider;
  repositoryIds?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>;
};


export type RootMutationTypeReadNotificationsArgs = {
  incidentId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeRealizeInviteArgs = {
  id: Scalars['String']['input'];
};


export type RootMutationTypeRealizeResetTokenArgs = {
  attributes: ResetTokenRealization;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeReleaseArgs = {
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
  repositoryName?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type RootMutationTypeReleaseLockArgs = {
  attributes: LockAttributes;
  repository: Scalars['String']['input'];
};


export type RootMutationTypeSetupIntentArgs = {
  address?: InputMaybe<AddressAttributes>;
};


export type RootMutationTypeSignupArgs = {
  account?: InputMaybe<AccountAttributes>;
  attributes: UserAttributes;
  deviceToken?: InputMaybe<Scalars['String']['input']>;
  inviteId?: InputMaybe<Scalars['String']['input']>;
};


export type RootMutationTypeSsoCallbackArgs = {
  code: Scalars['String']['input'];
  deviceToken?: InputMaybe<Scalars['String']['input']>;
};


export type RootMutationTypeSyncedArgs = {
  repository: Scalars['String']['input'];
};


export type RootMutationTypeTransferDemoProjectArgs = {
  organizationId: Scalars['String']['input'];
};


export type RootMutationTypeTransferOwnershipArgs = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
};


export type RootMutationTypeUnfollowIncidentArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUninstallTerraformArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUnlockRepositoryArgs = {
  name: Scalars['String']['input'];
};


export type RootMutationTypeUpdateAccountArgs = {
  attributes: AccountAttributes;
};


export type RootMutationTypeUpdateChartArgs = {
  attributes: ChartAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateChartInstallationArgs = {
  attributes: ChartInstallationAttributes;
  chartInstallationId: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateDockerRepositoryArgs = {
  attributes: DockerRepositoryAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateDomainArgs = {
  attributes: DnsDomainAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateGroupArgs = {
  attributes: GroupAttributes;
  groupId: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateIncidentArgs = {
  attributes: IncidentAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateInstallationArgs = {
  attributes: InstallationAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateIntegrationWebhookArgs = {
  attributes: IntegrationWebhookAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateLineItemArgs = {
  attributes: LimitAttributes;
  subscriptionId: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateMessageArgs = {
  attributes: IncidentMessageAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateOidcProviderArgs = {
  attributes: OidcAttributes;
  installationId: Scalars['ID']['input'];
};


export type RootMutationTypeUpdatePlanArgs = {
  planId: Scalars['ID']['input'];
  subscriptionId: Scalars['ID']['input'];
};


export type RootMutationTypeUpdatePlanAttributesArgs = {
  attributes: UpdatablePlanAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdatePlatformPlanArgs = {
  planId: Scalars['ID']['input'];
};


export type RootMutationTypeUpdatePublisherArgs = {
  attributes: PublisherAttributes;
};


export type RootMutationTypeUpdateRepositoryArgs = {
  attributes: RepositoryAttributes;
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
  repositoryName?: InputMaybe<Scalars['String']['input']>;
};


export type RootMutationTypeUpdateRoleArgs = {
  attributes: RoleAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateServiceAccountArgs = {
  attributes: ServiceAccountAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateShellArgs = {
  attributes: CloudShellAttributes;
};


export type RootMutationTypeUpdateShellConfigurationArgs = {
  context: Scalars['Map']['input'];
};


export type RootMutationTypeUpdateStepArgs = {
  attributes: TestStepAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateTerraformArgs = {
  attributes: TerraformAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateTestArgs = {
  attributes: TestAttributes;
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdateUserArgs = {
  attributes: UserAttributes;
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type RootMutationTypeUpdateVersionArgs = {
  attributes: VersionAttributes;
  id?: InputMaybe<Scalars['ID']['input']>;
  spec?: InputMaybe<VersionSpec>;
};


export type RootMutationTypeUploadTerraformArgs = {
  attributes: TerraformAttributes;
  name: Scalars['String']['input'];
  repositoryName: Scalars['String']['input'];
};


export type RootMutationTypeUpsertOidcProviderArgs = {
  attributes: OidcAttributes;
  installationId: Scalars['ID']['input'];
};


export type RootMutationTypeUpsertRepositoryArgs = {
  attributes: RepositoryAttributes;
  name: Scalars['String']['input'];
  publisher: Scalars['String']['input'];
};

export type RootQueryType = {
  __typename?: 'RootQueryType';
  account?: Maybe<Account>;
  auditMetrics?: Maybe<Array<Maybe<GeoMetric>>>;
  audits?: Maybe<AuditConnection>;
  categories?: Maybe<Array<Maybe<CategoryInfo>>>;
  category?: Maybe<CategoryInfo>;
  chart?: Maybe<Chart>;
  chartInstallations?: Maybe<ChartInstallationConnection>;
  charts?: Maybe<ChartConnection>;
  chat?: Maybe<ChatMessage>;
  closure?: Maybe<Array<Maybe<ClosureItem>>>;
  /** Get a cluster by its ID. */
  cluster?: Maybe<Cluster>;
  /** Get a list of clusters owned by the current account. */
  clusters?: Maybe<ClusterConnection>;
  configuration?: Maybe<PluralConfiguration>;
  deferredUpdates?: Maybe<DeferredUpdateConnection>;
  demoProject?: Maybe<DemoProject>;
  dnsDomain?: Maybe<DnsDomain>;
  dnsDomains?: Maybe<DnsDomainConnection>;
  dnsRecords?: Maybe<DnsRecordConnection>;
  dockerImage?: Maybe<DockerImage>;
  dockerImages?: Maybe<DockerImageConnection>;
  dockerRepositories?: Maybe<DockerRepositoryConnection>;
  eabCredential?: Maybe<EabCredential>;
  eabCredentials?: Maybe<Array<Maybe<EabCredential>>>;
  groupMembers?: Maybe<GroupMemberConnection>;
  groups?: Maybe<GroupConnection>;
  helpQuestion?: Maybe<Scalars['String']['output']>;
  incident?: Maybe<Incident>;
  incidents?: Maybe<IncidentConnection>;
  installation?: Maybe<Installation>;
  installations?: Maybe<InstallationConnection>;
  integrationWebhook?: Maybe<IntegrationWebhook>;
  integrationWebhooks?: Maybe<IntegrationWebhookConnection>;
  integrations?: Maybe<IntegrationConnection>;
  invite?: Maybe<Invite>;
  invites?: Maybe<InviteConnection>;
  invoices?: Maybe<InvoiceConnection>;
  keyBackup?: Maybe<KeyBackup>;
  keyBackups?: Maybe<KeyBackupConnection>;
  loginMethod?: Maybe<LoginMethodResponse>;
  loginMetrics?: Maybe<Array<Maybe<GeoMetric>>>;
  me?: Maybe<User>;
  notifications?: Maybe<NotificationConnection>;
  oauthConsent?: Maybe<Repository>;
  oauthIntegrations?: Maybe<Array<Maybe<OauthIntegration>>>;
  oauthLogin?: Maybe<Repository>;
  oauthUrls?: Maybe<Array<Maybe<OauthInfo>>>;
  oidcConsent?: Maybe<OidcStepResponse>;
  oidcLogin?: Maybe<OidcStepResponse>;
  oidcLogins?: Maybe<OidcLoginConnection>;
  oidcToken?: Maybe<Scalars['String']['output']>;
  platformMetrics?: Maybe<PlatformMetrics>;
  platformPlans?: Maybe<Array<Maybe<PlatformPlan>>>;
  platformSubscription?: Maybe<PlatformSubscription>;
  publicKeys?: Maybe<PublicKeyConnection>;
  publisher?: Maybe<Publisher>;
  publishers?: Maybe<PublisherConnection>;
  recipe?: Maybe<Recipe>;
  recipes?: Maybe<RecipeConnection>;
  repositories?: Maybe<RepositoryConnection>;
  /** Get an application by its ID or name. */
  repository?: Maybe<Repository>;
  repositorySubscription?: Maybe<RepositorySubscription>;
  resetToken?: Maybe<ResetToken>;
  role?: Maybe<Role>;
  roles?: Maybe<RoleConnection>;
  rollouts?: Maybe<RolloutConnection>;
  scaffold?: Maybe<Array<Maybe<ScaffoldFile>>>;
  scmAuthorization?: Maybe<Array<Maybe<AuthorizationUrl>>>;
  scmToken?: Maybe<Scalars['String']['output']>;
  searchRepositories?: Maybe<RepositoryConnection>;
  searchUsers?: Maybe<UserConnection>;
  shell?: Maybe<CloudShell>;
  shellApplications?: Maybe<Array<Maybe<ApplicationInformation>>>;
  shellConfiguration?: Maybe<ShellConfiguration>;
  stack?: Maybe<Stack>;
  stacks?: Maybe<StackConnection>;
  subscriptions?: Maybe<RepositorySubscriptionConnection>;
  tags?: Maybe<GroupedTagConnection>;
  terraform?: Maybe<TerraformConnection>;
  terraformInstallations?: Maybe<TerraformInstallationConnection>;
  terraformModule?: Maybe<Terraform>;
  terraformProvider?: Maybe<TerraformProvider>;
  terraformProviders?: Maybe<Array<Maybe<Provider>>>;
  test?: Maybe<Test>;
  testLogs?: Maybe<Scalars['String']['output']>;
  tests?: Maybe<TestConnection>;
  token?: Maybe<PersistedToken>;
  tokens?: Maybe<PersistedTokenConnection>;
  upgradeQueue?: Maybe<UpgradeQueue>;
  upgradeQueues?: Maybe<Array<Maybe<UpgradeQueue>>>;
  user?: Maybe<User>;
  users?: Maybe<UserConnection>;
  versions?: Maybe<VersionConnection>;
  webhooks?: Maybe<WebhookConnection>;
};


export type RootQueryTypeAuditsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeCategoryArgs = {
  name: Category;
};


export type RootQueryTypeChartArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeChartInstallationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  repositoryId: Scalars['ID']['input'];
};


export type RootQueryTypeChartsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  repositoryId: Scalars['ID']['input'];
};


export type RootQueryTypeChatArgs = {
  history?: InputMaybe<Array<InputMaybe<ChatMessageAttributes>>>;
};


export type RootQueryTypeClosureArgs = {
  id: Scalars['ID']['input'];
  type: DependencyType;
};


export type RootQueryTypeClusterArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeClustersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeDeferredUpdatesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  chartInstallationId?: InputMaybe<Scalars['ID']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  terraformInstallationId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeDemoProjectArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeDnsDomainArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeDnsDomainsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeDnsRecordsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  cluster?: InputMaybe<Scalars['String']['input']>;
  domainId?: InputMaybe<Scalars['ID']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  provider?: InputMaybe<Provider>;
};


export type RootQueryTypeDockerImageArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeDockerImagesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  dockerRepositoryId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeDockerRepositoriesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  repositoryId: Scalars['ID']['input'];
};


export type RootQueryTypeEabCredentialArgs = {
  cluster: Scalars['String']['input'];
  provider: Provider;
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


export type RootQueryTypeHelpQuestionArgs = {
  prompt: Scalars['String']['input'];
};


export type RootQueryTypeIncidentArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeIncidentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filters?: InputMaybe<Array<InputMaybe<IncidentFilter>>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  q?: InputMaybe<Scalars['String']['input']>;
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
  sort?: InputMaybe<IncidentSort>;
  supports?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryTypeInstallationArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeInstallationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeIntegrationWebhookArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeIntegrationWebhooksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeIntegrationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
  repositoryName?: InputMaybe<Scalars['String']['input']>;
  tag?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeInviteArgs = {
  id: Scalars['String']['input'];
};


export type RootQueryTypeInvitesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeInvoicesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeKeyBackupArgs = {
  name: Scalars['String']['input'];
};


export type RootQueryTypeKeyBackupsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeLoginMethodArgs = {
  email: Scalars['String']['input'];
  host?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeNotificationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  cli?: InputMaybe<Scalars['Boolean']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  incidentId?: InputMaybe<Scalars['ID']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeOauthConsentArgs = {
  challenge: Scalars['String']['input'];
};


export type RootQueryTypeOauthLoginArgs = {
  challenge: Scalars['String']['input'];
};


export type RootQueryTypeOauthUrlsArgs = {
  host?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeOidcConsentArgs = {
  challenge: Scalars['String']['input'];
};


export type RootQueryTypeOidcLoginArgs = {
  challenge: Scalars['String']['input'];
};


export type RootQueryTypeOidcLoginsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeOidcTokenArgs = {
  email: Scalars['String']['input'];
  idToken: Scalars['String']['input'];
  provider: ExternalOidcProvider;
};


export type RootQueryTypePublicKeysArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  emails?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypePublisherArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypePublishersArgs = {
  accountId?: InputMaybe<Scalars['ID']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  publishable?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryTypeRecipeArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  repo?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeRecipesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  provider?: InputMaybe<Provider>;
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
  repositoryName?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeRepositoriesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  categories?: InputMaybe<Array<InputMaybe<Category>>>;
  category?: InputMaybe<Category>;
  first?: InputMaybe<Scalars['Int']['input']>;
  installed?: InputMaybe<Scalars['Boolean']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  provider?: InputMaybe<Provider>;
  publisherId?: InputMaybe<Scalars['ID']['input']>;
  publishers?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>;
  q?: InputMaybe<Scalars['String']['input']>;
  supports?: InputMaybe<Scalars['Boolean']['input']>;
  tag?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


export type RootQueryTypeRepositoryArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeRepositorySubscriptionArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeResetTokenArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeRoleArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeRolesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeRolloutsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  repositoryId: Scalars['ID']['input'];
};


export type RootQueryTypeScaffoldArgs = {
  application: Scalars['String']['input'];
  category: Category;
  ingress?: InputMaybe<Scalars['Boolean']['input']>;
  postgres?: InputMaybe<Scalars['Boolean']['input']>;
  publisher: Scalars['String']['input'];
};


export type RootQueryTypeScmTokenArgs = {
  code: Scalars['String']['input'];
  provider: ScmProvider;
};


export type RootQueryTypeSearchRepositoriesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type RootQueryTypeSearchUsersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  incidentId: Scalars['ID']['input'];
  last?: InputMaybe<Scalars['Int']['input']>;
  q: Scalars['String']['input'];
};


export type RootQueryTypeStackArgs = {
  name: Scalars['String']['input'];
  provider: Provider;
};


export type RootQueryTypeStacksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  featured?: InputMaybe<Scalars['Boolean']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeSubscriptionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeTagsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
  type: TagGroup;
};


export type RootQueryTypeTerraformArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  repositoryId: Scalars['ID']['input'];
};


export type RootQueryTypeTerraformInstallationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  repositoryId: Scalars['ID']['input'];
};


export type RootQueryTypeTerraformModuleArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeTerraformProviderArgs = {
  name: Provider;
  vsn?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypeTestArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeTestLogsArgs = {
  id: Scalars['ID']['input'];
  step: Scalars['ID']['input'];
};


export type RootQueryTypeTestsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
  versionId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeTokenArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeTokensArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeUpgradeQueueArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeUserArgs = {
  id: Scalars['ID']['input'];
};


export type RootQueryTypeUsersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  all?: InputMaybe<Scalars['Boolean']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
  serviceAccount?: InputMaybe<Scalars['Boolean']['input']>;
};


export type RootQueryTypeVersionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  chartId?: InputMaybe<Scalars['ID']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  terraformId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootQueryTypeWebhooksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type RootSubscriptionType = {
  __typename?: 'RootSubscriptionType';
  incidentDelta?: Maybe<IncidentDelta>;
  incidentMessageDelta?: Maybe<IncidentMessageDelta>;
  notification?: Maybe<Notification>;
  rolloutDelta?: Maybe<RolloutDelta>;
  testDelta?: Maybe<TestDelta>;
  testLogs?: Maybe<StepLogs>;
  upgrade?: Maybe<Upgrade>;
  upgradeQueueDelta?: Maybe<UpgradeQueueDelta>;
};


export type RootSubscriptionTypeIncidentDeltaArgs = {
  incidentId?: InputMaybe<Scalars['ID']['input']>;
  repositoryId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootSubscriptionTypeIncidentMessageDeltaArgs = {
  incidentId?: InputMaybe<Scalars['ID']['input']>;
};


export type RootSubscriptionTypeRolloutDeltaArgs = {
  repositoryId: Scalars['ID']['input'];
};


export type RootSubscriptionTypeTestDeltaArgs = {
  repositoryId: Scalars['ID']['input'];
};


export type RootSubscriptionTypeTestLogsArgs = {
  testId: Scalars['ID']['input'];
};


export type RootSubscriptionTypeUpgradeArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type ScaffoldFile = {
  __typename?: 'ScaffoldFile';
  content?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
};

export type ScanError = {
  __typename?: 'ScanError';
  message?: Maybe<Scalars['String']['output']>;
};

export type ScanViolation = {
  __typename?: 'ScanViolation';
  category?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  file?: Maybe<Scalars['String']['output']>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  line?: Maybe<Scalars['Int']['output']>;
  resourceName?: Maybe<Scalars['String']['output']>;
  resourceType?: Maybe<Scalars['String']['output']>;
  ruleId?: Maybe<Scalars['String']['output']>;
  ruleName?: Maybe<Scalars['String']['output']>;
  severity?: Maybe<VulnGrade>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type ScmAttributes = {
  gitUrl?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  org?: InputMaybe<Scalars['String']['input']>;
  privateKey?: InputMaybe<Scalars['String']['input']>;
  provider?: InputMaybe<ScmProvider>;
  publicKey?: InputMaybe<Scalars['String']['input']>;
  token?: InputMaybe<Scalars['String']['input']>;
};

export enum ScmProvider {
  Demo = 'DEMO',
  Github = 'GITHUB',
  Gitlab = 'GITLAB',
  Manual = 'MANUAL'
}

export type ServiceAccountAttributes = {
  email?: InputMaybe<Scalars['String']['input']>;
  impersonationPolicy?: InputMaybe<ImpersonationPolicyAttributes>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type ServiceLevel = {
  __typename?: 'ServiceLevel';
  maxSeverity?: Maybe<Scalars['Int']['output']>;
  minSeverity?: Maybe<Scalars['Int']['output']>;
  responseTime?: Maybe<Scalars['Int']['output']>;
};

export type ServiceLevelAttributes = {
  maxSeverity?: InputMaybe<Scalars['Int']['input']>;
  minSeverity?: InputMaybe<Scalars['Int']['input']>;
  responseTime?: InputMaybe<Scalars['Int']['input']>;
};

export type SetupIntent = {
  __typename?: 'SetupIntent';
  clientSecret?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  nextAction?: Maybe<NextAction>;
  paymentMethodTypes?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  status?: Maybe<Scalars['String']['output']>;
};

export type ShellConfiguration = {
  __typename?: 'ShellConfiguration';
  buckets?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  contextConfiguration?: Maybe<Scalars['Map']['output']>;
  domains?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  git?: Maybe<GitConfiguration>;
  workspace?: Maybe<ShellWorkspace>;
};

export type ShellCredentialsAttributes = {
  aws?: InputMaybe<AwsShellCredentialsAttributes>;
  azure?: InputMaybe<AzureShellCredentialsAttributes>;
  gcp?: InputMaybe<GcpShellCredentialsAttributes>;
};

export type ShellStatus = {
  __typename?: 'ShellStatus';
  containersReady?: Maybe<Scalars['Boolean']['output']>;
  initialized?: Maybe<Scalars['Boolean']['output']>;
  podScheduled?: Maybe<Scalars['Boolean']['output']>;
  ready?: Maybe<Scalars['Boolean']['output']>;
};

export type ShellWorkspace = {
  __typename?: 'ShellWorkspace';
  bucketPrefix?: Maybe<Scalars['String']['output']>;
  cluster?: Maybe<Scalars['String']['output']>;
  network?: Maybe<NetworkConfiguration>;
  region?: Maybe<Scalars['String']['output']>;
};

export type SlimSubscription = {
  __typename?: 'SlimSubscription';
  id: Scalars['ID']['output'];
  lineItems?: Maybe<SubscriptionLineItems>;
  plan?: Maybe<Plan>;
};

/** Possible cluster sources. */
export enum Source {
  Default = 'DEFAULT',
  Demo = 'DEMO',
  Shell = 'SHELL'
}

export enum SpecDatatype {
  Bool = 'BOOL',
  Float = 'FLOAT',
  Int = 'INT',
  List = 'LIST',
  Object = 'OBJECT',
  String = 'STRING'
}

export type SpecificationAttributes = {
  inner?: InputMaybe<SpecDatatype>;
  name: Scalars['String']['input'];
  required?: InputMaybe<Scalars['Boolean']['input']>;
  spec?: InputMaybe<Array<InputMaybe<SpecificationAttributes>>>;
  type: SpecDatatype;
};

export type Stack = {
  __typename?: 'Stack';
  bundles?: Maybe<Array<Maybe<Recipe>>>;
  collections?: Maybe<Array<Maybe<StackCollection>>>;
  community?: Maybe<Community>;
  creator?: Maybe<User>;
  description?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  featured?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  sections?: Maybe<Array<Maybe<RecipeSection>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type StackAttributes = {
  collections?: InputMaybe<Array<InputMaybe<StackCollectionAttributes>>>;
  community?: InputMaybe<CommunityAttributes>;
  description?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  featured?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
};

export type StackCollection = {
  __typename?: 'StackCollection';
  bundles?: Maybe<Array<Maybe<StackRecipe>>>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  provider: Provider;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type StackCollectionAttributes = {
  bundles?: InputMaybe<Array<InputMaybe<RecipeReference>>>;
  provider: Provider;
};

export type StackConnection = {
  __typename?: 'StackConnection';
  edges?: Maybe<Array<Maybe<StackEdge>>>;
  pageInfo: PageInfo;
};

export type StackEdge = {
  __typename?: 'StackEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Stack>;
};

export type StackRecipe = {
  __typename?: 'StackRecipe';
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  recipe: Recipe;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type StepLogs = {
  __typename?: 'StepLogs';
  logs?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  step?: Maybe<TestStep>;
};

export type SubscriptionAttributes = {
  lineItems?: InputMaybe<SubscriptionLineItemAttributes>;
};

export type SubscriptionLineItemAttributes = {
  items?: InputMaybe<Array<InputMaybe<LimitAttributes>>>;
};

export type SubscriptionLineItems = {
  __typename?: 'SubscriptionLineItems';
  items?: Maybe<Array<Maybe<Limit>>>;
};

export type Tag = {
  __typename?: 'Tag';
  id: Scalars['ID']['output'];
  tag: Scalars['String']['output'];
};

export type TagAttributes = {
  tag: Scalars['String']['input'];
};

export enum TagGroup {
  Integrations = 'INTEGRATIONS',
  Repositories = 'REPOSITORIES'
}

/** Template engines that can be used at build time. */
export enum TemplateType {
  Gotemplate = 'GOTEMPLATE',
  Javascript = 'JAVASCRIPT',
  Lua = 'LUA'
}

export type Terraform = {
  __typename?: 'Terraform';
  dependencies?: Maybe<Dependencies>;
  description?: Maybe<Scalars['String']['output']>;
  editable?: Maybe<Scalars['Boolean']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  installation?: Maybe<TerraformInstallation>;
  latestVersion?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  package?: Maybe<Scalars['String']['output']>;
  readme?: Maybe<Scalars['String']['output']>;
  repository?: Maybe<Repository>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  valuesTemplate?: Maybe<Scalars['String']['output']>;
};

export type TerraformAttributes = {
  dependencies?: InputMaybe<Scalars['Yaml']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  package?: InputMaybe<Scalars['UploadOrUrl']['input']>;
  version?: InputMaybe<Scalars['String']['input']>;
};

export type TerraformConnection = {
  __typename?: 'TerraformConnection';
  edges?: Maybe<Array<Maybe<TerraformEdge>>>;
  pageInfo: PageInfo;
};

export type TerraformEdge = {
  __typename?: 'TerraformEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Terraform>;
};

export type TerraformInstallation = {
  __typename?: 'TerraformInstallation';
  id?: Maybe<Scalars['ID']['output']>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  installation?: Maybe<Installation>;
  terraform?: Maybe<Terraform>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  version?: Maybe<Version>;
};

export type TerraformInstallationAttributes = {
  terraformId?: InputMaybe<Scalars['ID']['input']>;
  versionId?: InputMaybe<Scalars['ID']['input']>;
};

export type TerraformInstallationConnection = {
  __typename?: 'TerraformInstallationConnection';
  edges?: Maybe<Array<Maybe<TerraformInstallationEdge>>>;
  pageInfo: PageInfo;
};

export type TerraformInstallationEdge = {
  __typename?: 'TerraformInstallationEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<TerraformInstallation>;
};

export type TerraformProvider = {
  __typename?: 'TerraformProvider';
  content?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Provider>;
};

export type Test = {
  __typename?: 'Test';
  creator?: Maybe<User>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  promoteTag: Scalars['String']['output'];
  repository?: Maybe<Repository>;
  sourceTag: Scalars['String']['output'];
  status: TestStatus;
  steps?: Maybe<Array<Maybe<TestStep>>>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type TestArgument = {
  __typename?: 'TestArgument';
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
  repo: Scalars['String']['output'];
};

export type TestArgumentAttributes = {
  key: Scalars['String']['input'];
  name: Scalars['String']['input'];
  repo: Scalars['String']['input'];
};

export type TestAttributes = {
  name?: InputMaybe<Scalars['String']['input']>;
  promoteTag?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<TestStatus>;
  steps?: InputMaybe<Array<InputMaybe<TestStepAttributes>>>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type TestConnection = {
  __typename?: 'TestConnection';
  edges?: Maybe<Array<Maybe<TestEdge>>>;
  pageInfo: PageInfo;
};

export type TestDelta = {
  __typename?: 'TestDelta';
  delta?: Maybe<Delta>;
  payload?: Maybe<Test>;
};

export type TestEdge = {
  __typename?: 'TestEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Test>;
};

export enum TestStatus {
  Failed = 'FAILED',
  Queued = 'QUEUED',
  Running = 'RUNNING',
  Succeeded = 'SUCCEEDED'
}

export type TestStep = {
  __typename?: 'TestStep';
  description: Scalars['String']['output'];
  hasLogs?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  status: TestStatus;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type TestStepAttributes = {
  description?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  logs?: InputMaybe<Scalars['UploadOrUrl']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<TestStatus>;
};

export enum TestType {
  Git = 'GIT'
}

export type TrustRelationshipAttributes = {
  issuer: Scalars['String']['input'];
  scopes?: InputMaybe<Array<Scalars['String']['input']>>;
  trust: Scalars['String']['input'];
};

export type UpdatablePlanAttributes = {
  default?: InputMaybe<Scalars['Boolean']['input']>;
  serviceLevels?: InputMaybe<Array<InputMaybe<ServiceLevelAttributes>>>;
};

export type Upgrade = {
  __typename?: 'Upgrade';
  config?: Maybe<UpgradeConfig>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  repository?: Maybe<Repository>;
  type?: Maybe<UpgradeType>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** The information for this upgrade */
export type UpgradeAttributes = {
  /** information for a config upgrade */
  config?: InputMaybe<UpgradeConfigAttributes>;
  /** a simple message to explain this upgrade */
  message: Scalars['String']['input'];
  /** the type of upgrade */
  type: UpgradeType;
};

export type UpgradeConfig = {
  __typename?: 'UpgradeConfig';
  paths?: Maybe<Array<Maybe<UpgradePath>>>;
};

/** the attributes of the config upgrade */
export type UpgradeConfigAttributes = {
  /** paths for a configuration change */
  paths?: InputMaybe<Array<InputMaybe<UpgradePathAttributes>>>;
};

export type UpgradeConnection = {
  __typename?: 'UpgradeConnection';
  edges?: Maybe<Array<Maybe<UpgradeEdge>>>;
  pageInfo: PageInfo;
};

export type UpgradeEdge = {
  __typename?: 'UpgradeEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Upgrade>;
};

/** The pending upgrades for a repository */
export type UpgradeInfo = {
  __typename?: 'UpgradeInfo';
  count?: Maybe<Scalars['Int']['output']>;
  installation?: Maybe<Installation>;
};

export type UpgradePath = {
  __typename?: 'UpgradePath';
  path: Scalars['String']['output'];
  type: ValueType;
  value: Scalars['String']['output'];
};

/** attributes of a path update */
export type UpgradePathAttributes = {
  /** path the upgrade will occur on, formatted like .some.key[0].here */
  path: Scalars['String']['input'];
  /** the ultimate type of the value */
  type: ValueType;
  /** the stringified value that will be applied on this path */
  value: Scalars['String']['input'];
};

export type UpgradeQueue = {
  __typename?: 'UpgradeQueue';
  acked?: Maybe<Scalars['ID']['output']>;
  domain?: Maybe<Scalars['String']['output']>;
  git?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  pingedAt?: Maybe<Scalars['DateTime']['output']>;
  provider?: Maybe<Provider>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  upgrades?: Maybe<UpgradeConnection>;
  user: User;
};


export type UpgradeQueueUpgradesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type UpgradeQueueAttributes = {
  domain?: InputMaybe<Scalars['String']['input']>;
  git?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  provider?: InputMaybe<Provider>;
};

export type UpgradeQueueDelta = {
  __typename?: 'UpgradeQueueDelta';
  delta?: Maybe<Delta>;
  payload?: Maybe<UpgradeQueue>;
};

export enum UpgradeType {
  Approval = 'APPROVAL',
  Bounce = 'BOUNCE',
  Config = 'CONFIG',
  Dedicated = 'DEDICATED',
  Deploy = 'DEPLOY'
}

export type User = {
  __typename?: 'User';
  account: Account;
  address?: Maybe<Address>;
  avatar?: Maybe<Scalars['String']['output']>;
  backgroundColor?: Maybe<Scalars['String']['output']>;
  /** the roles attached to this user, only fetch this when querying an individual user */
  boundRoles?: Maybe<Array<Maybe<Role>>>;
  cards?: Maybe<CardConnection>;
  defaultQueueId?: Maybe<Scalars['ID']['output']>;
  /** If a user has reached the demo project usage limit. */
  demoed?: Maybe<Scalars['Boolean']['output']>;
  demoing?: Maybe<Scalars['Boolean']['output']>;
  email: Scalars['String']['output'];
  emailConfirmBy?: Maybe<Scalars['DateTime']['output']>;
  emailConfirmed?: Maybe<Scalars['Boolean']['output']>;
  /** the groups attached to this user, only fetch this when querying an individual user */
  groups?: Maybe<Array<Maybe<Group>>>;
  hasInstallations?: Maybe<Scalars['Boolean']['output']>;
  hasShell?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  impersonationPolicy?: Maybe<ImpersonationPolicy>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  invites?: Maybe<Array<Maybe<Invite>>>;
  jwt?: Maybe<Scalars['String']['output']>;
  loginMethod?: Maybe<LoginMethod>;
  name: Scalars['String']['output'];
  onboarding?: Maybe<OnboardingState>;
  onboardingChecklist?: Maybe<OnboardingChecklist>;
  phone?: Maybe<Scalars['String']['output']>;
  provider?: Maybe<Provider>;
  publisher?: Maybe<Publisher>;
  roles?: Maybe<Roles>;
  serviceAccount?: Maybe<Scalars['Boolean']['output']>;
  trustRelationships?: Maybe<Array<Maybe<OidcTrustRelationship>>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};


export type UserCardsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type UserAttributes = {
  avatar?: InputMaybe<Scalars['UploadOrUrl']['input']>;
  confirm?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  groupIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  loginMethod?: InputMaybe<LoginMethod>;
  name?: InputMaybe<Scalars['String']['input']>;
  onboarding?: InputMaybe<OnboardingState>;
  onboardingChecklist?: InputMaybe<OnboardingChecklistAttributes>;
  password?: InputMaybe<Scalars['String']['input']>;
  roles?: InputMaybe<RolesAttributes>;
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

export type UserEventAttributes = {
  data?: InputMaybe<Scalars['String']['input']>;
  event: Scalars['String']['input'];
  status?: InputMaybe<UserEventStatus>;
};

export enum UserEventStatus {
  Error = 'ERROR',
  Ok = 'OK'
}

export enum ValidationType {
  Regex = 'REGEX'
}

export enum ValueType {
  Float = 'FLOAT',
  Int = 'INT',
  String = 'STRING'
}

/** The version of a package. */
export type Version = {
  __typename?: 'Version';
  chart?: Maybe<Chart>;
  crds?: Maybe<Array<Maybe<Crd>>>;
  dependencies?: Maybe<Dependencies>;
  helm?: Maybe<Scalars['Map']['output']>;
  id: Scalars['ID']['output'];
  imageDependencies?: Maybe<Array<Maybe<ImageDependency>>>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  package?: Maybe<Scalars['String']['output']>;
  readme?: Maybe<Scalars['String']['output']>;
  scan?: Maybe<PackageScan>;
  tags?: Maybe<Array<Maybe<VersionTag>>>;
  /** The template engine used to render the valuesTemplate. */
  templateType?: Maybe<TemplateType>;
  terraform?: Maybe<Terraform>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  valuesTemplate?: Maybe<Scalars['String']['output']>;
  version: Scalars['String']['output'];
};

export type VersionAttributes = {
  tags?: InputMaybe<Array<InputMaybe<VersionTagAttributes>>>;
};

export type VersionConnection = {
  __typename?: 'VersionConnection';
  edges?: Maybe<Array<Maybe<VersionEdge>>>;
  pageInfo: PageInfo;
};

export type VersionEdge = {
  __typename?: 'VersionEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<Version>;
};

export type VersionSpec = {
  chart?: InputMaybe<Scalars['String']['input']>;
  repository?: InputMaybe<Scalars['String']['input']>;
  terraform?: InputMaybe<Scalars['String']['input']>;
  version?: InputMaybe<Scalars['String']['input']>;
};

export type VersionTag = {
  __typename?: 'VersionTag';
  chart?: Maybe<Chart>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  tag: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  version?: Maybe<Version>;
};

export type VersionTagAttributes = {
  tag: Scalars['String']['input'];
  versionId?: InputMaybe<Scalars['ID']['input']>;
};

export enum VulnGrade {
  Critical = 'CRITICAL',
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM',
  None = 'NONE'
}

export enum VulnRequirement {
  None = 'NONE',
  Required = 'REQUIRED'
}

export enum VulnVector {
  Adjacent = 'ADJACENT',
  Local = 'LOCAL',
  Network = 'NETWORK',
  Physical = 'PHYSICAL'
}

export type Vulnerability = {
  __typename?: 'Vulnerability';
  cvss?: Maybe<Cvss>;
  description?: Maybe<Scalars['String']['output']>;
  fixedVersion?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  installedVersion?: Maybe<Scalars['String']['output']>;
  layer?: Maybe<ImageLayer>;
  package?: Maybe<Scalars['String']['output']>;
  score?: Maybe<Scalars['Float']['output']>;
  severity?: Maybe<VulnGrade>;
  source?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  url?: Maybe<Scalars['String']['output']>;
  vulnerabilityId?: Maybe<Scalars['String']['output']>;
};

export type Webhook = {
  __typename?: 'Webhook';
  id?: Maybe<Scalars['ID']['output']>;
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  secret?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  url?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
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

export type WebhookLog = {
  __typename?: 'WebhookLog';
  id: Scalars['ID']['output'];
  insertedAt?: Maybe<Scalars['DateTime']['output']>;
  payload?: Maybe<Scalars['Map']['output']>;
  response?: Maybe<Scalars['String']['output']>;
  state: WebhookLogState;
  status?: Maybe<Scalars['Int']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  webhook?: Maybe<IntegrationWebhook>;
};

export type WebhookLogConnection = {
  __typename?: 'WebhookLogConnection';
  edges?: Maybe<Array<Maybe<WebhookLogEdge>>>;
  pageInfo: PageInfo;
};

export type WebhookLogEdge = {
  __typename?: 'WebhookLogEdge';
  cursor?: Maybe<Scalars['String']['output']>;
  node?: Maybe<WebhookLog>;
};

export enum WebhookLogState {
  Delivered = 'DELIVERED',
  Failed = 'FAILED',
  Sending = 'SENDING'
}

export type WebhookResponse = {
  __typename?: 'WebhookResponse';
  body?: Maybe<Scalars['String']['output']>;
  headers?: Maybe<Scalars['Map']['output']>;
  statusCode: Scalars['Int']['output'];
};

export type Wirings = {
  __typename?: 'Wirings';
  helm?: Maybe<Scalars['Map']['output']>;
  terraform?: Maybe<Scalars['Map']['output']>;
};

export type WorkspaceAttributes = {
  bucketPrefix: Scalars['String']['input'];
  cluster: Scalars['String']['input'];
  project?: InputMaybe<Scalars['String']['input']>;
  region: Scalars['String']['input'];
  subdomain: Scalars['String']['input'];
};

export type ZoomMeeting = {
  __typename?: 'ZoomMeeting';
  joinUrl: Scalars['String']['output'];
  password?: Maybe<Scalars['String']['output']>;
};

export type ChatMessageFragment = { __typename?: 'ChatMessage', content: string, name?: string | null, role: string };

export type ChatQueryVariables = Exact<{
  history?: InputMaybe<Array<InputMaybe<ChatMessageAttributes>> | InputMaybe<ChatMessageAttributes>>;
}>;


export type ChatQuery = { __typename?: 'RootQueryType', chat?: { __typename?: 'ChatMessage', content: string, name?: string | null, role: string } | null };

export const ChatMessageFragmentDoc = gql`
    fragment ChatMessage on ChatMessage {
  content
  name
  role
}
    `;
export const ChatDocument = gql`
    query Chat($history: [ChatMessageAttributes]) {
  chat(history: $history) {
    ...ChatMessage
  }
}
    ${ChatMessageFragmentDoc}`;

/**
 * __useChatQuery__
 *
 * To run a query within a React component, call `useChatQuery` and pass it any options that fit your needs.
 * When your component renders, `useChatQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChatQuery({
 *   variables: {
 *      history: // value for 'history'
 *   },
 * });
 */
export function useChatQuery(baseOptions?: Apollo.QueryHookOptions<ChatQuery, ChatQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ChatQuery, ChatQueryVariables>(ChatDocument, options);
      }
export function useChatLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ChatQuery, ChatQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ChatQuery, ChatQueryVariables>(ChatDocument, options);
        }
export function useChatSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ChatQuery, ChatQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ChatQuery, ChatQueryVariables>(ChatDocument, options);
        }
export type ChatQueryHookResult = ReturnType<typeof useChatQuery>;
export type ChatLazyQueryHookResult = ReturnType<typeof useChatLazyQuery>;
export type ChatSuspenseQueryHookResult = ReturnType<typeof useChatSuspenseQuery>;
export type ChatQueryResult = Apollo.QueryResult<ChatQuery, ChatQueryVariables>;
export const namedOperations = {
  Query: {
    Chat: 'Chat'
  },
  Fragment: {
    ChatMessage: 'ChatMessage'
  }
}