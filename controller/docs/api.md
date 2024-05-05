# API Reference

## Packages
- [deployments.plural.sh/v1alpha1](#deploymentspluralshv1alpha1)


## deployments.plural.sh/v1alpha1

Package v1alpha1 contains API Schema definitions for the deployments v1alpha1 API group

### Resource Types
- [Cluster](#cluster)
- [ClusterRestore](#clusterrestore)
- [ClusterRestoreTrigger](#clusterrestoretrigger)
- [GitRepository](#gitrepository)
- [GlobalService](#globalservice)
- [InfrastructureStack](#infrastructurestack)
- [ManagedNamespace](#managednamespace)
- [NotificationRouter](#notificationrouter)
- [NotificationSink](#notificationsink)
- [Pipeline](#pipeline)
- [PipelineContext](#pipelinecontext)
- [PrAutomation](#prautomation)
- [PrAutomationTrigger](#prautomationtrigger)
- [Provider](#provider)
- [ScmConnection](#scmconnection)
- [ServiceDeployment](#servicedeployment)



#### Binding



Binding ...



_Appears in:_
- [Bindings](#bindings)
- [PrAutomationBindings](#prautomationbindings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `id` _string_ |  |  | Optional: {} <br /> |
| `UserID` _string_ |  |  | Optional: {} <br /> |
| `userEmail` _string_ |  |  | Optional: {} <br /> |
| `groupID` _string_ |  |  | Optional: {} <br /> |
| `groupName` _string_ |  |  | Optional: {} <br /> |


#### Bindings



Bindings ...



_Appears in:_
- [ClusterSpec](#clusterspec)
- [InfrastructureStackSpec](#infrastructurestackspec)
- [ServiceSpec](#servicespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `read` _[Binding](#binding) array_ | Read bindings. |  | Optional: {} <br /> |
| `write` _[Binding](#binding) array_ | Write bindings. |  | Optional: {} <br /> |


#### Cascade



Cascade is a specification for deletion behavior of owned resources



_Appears in:_
- [GlobalServiceSpec](#globalservicespec)
- [ManagedNamespaceSpec](#managednamespacespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `detach` _boolean_ | Whether you want to delete owned resources in Plural but leave kubernetes objects in-place |  | Optional: {} <br /> |
| `delete` _boolean_ | Whether you want to delete owned resources in Plural and in the targeted k8s cluster |  | Optional: {} <br /> |


#### CloudProvider

_Underlying type:_ _string_





_Appears in:_
- [ProviderSpec](#providerspec)



#### CloudProviderSettings



CloudProviderSettings ...



_Appears in:_
- [ProviderSpec](#providerspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `aws` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ |  |  | Optional: {} <br /> |
| `azure` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ |  |  | Optional: {} <br /> |
| `gcp` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ |  |  | Optional: {} <br /> |




#### Cluster



Cluster ...





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `Cluster` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ClusterSpec](#clusterspec)_ |  |  |  |


#### ClusterAWSCloudSettings







_Appears in:_
- [ClusterCloudSettings](#clustercloudsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `region` _string_ | Region in AWS to deploy this cluster to. |  | Required: {} <br />Type: string <br /> |


#### ClusterAzureCloudSettings







_Appears in:_
- [ClusterCloudSettings](#clustercloudsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `resourceGroup` _string_ | ResourceGroup is a name for the Azure resource group for this cluster. |  | Required: {} <br />Type: string <br /> |
| `network` _string_ | Network is a name for the Azure virtual network for this cluster. |  | Required: {} <br />Type: string <br /> |
| `subscriptionId` _string_ | SubscriptionId is GUID of the Azure subscription to hold this cluster. |  | Required: {} <br />Type: string <br /> |
| `location` _string_ | Location in Azure to deploy this cluster to. |  | Required: {} <br />Type: string <br /> |


#### ClusterCloudSettings







_Appears in:_
- [ClusterSpec](#clusterspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `aws` _[ClusterAWSCloudSettings](#clusterawscloudsettings)_ | AWS cluster customizations. |  | Optional: {} <br /> |
| `azure` _[ClusterAzureCloudSettings](#clusterazurecloudsettings)_ | Azure cluster customizations. |  | Optional: {} <br /> |
| `gcp` _[ClusterGCPCloudSettings](#clustergcpcloudsettings)_ | GCP cluster customizations. |  | Optional: {} <br /> |


#### ClusterGCPCloudSettings







_Appears in:_
- [ClusterCloudSettings](#clustercloudsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `project` _string_ | Project in GCP to deploy cluster to. |  | Required: {} <br />Type: string <br /> |
| `network` _string_ | Network in GCP to use when creating the cluster. |  | Required: {} <br />Type: string <br /> |
| `region` _string_ | Region in GCP to deploy cluster to. |  | Required: {} <br />Type: string <br /> |


#### ClusterNodePool







_Appears in:_
- [ClusterSpec](#clusterspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of the node pool. Must be unique. |  | Required: {} <br />Type: string <br /> |
| `instanceType` _string_ | InstanceType contains the type of node to use. Usually cloud-specific. |  | Required: {} <br />Type: string <br /> |
| `minSize` _integer_ | MinSize is minimum number of instances in this node pool. |  | Minimum: 1 <br />Required: {} <br /> |
| `maxSize` _integer_ | MaxSize is maximum number of instances in this node pool. |  | Minimum: 1 <br />Required: {} <br /> |
| `labels` _object (keys:string, values:string)_ | Labels to apply to the nodes in this pool. Useful for node selectors. |  | Optional: {} <br /> |
| `taints` _[Taint](#taint) array_ | Taints you'd want to apply to a node, i.e. for preventing scheduling on spot instances. |  | Optional: {} <br /> |
| `cloudSettings` _[ClusterNodePoolCloudSettings](#clusternodepoolcloudsettings)_ | CloudSettings contains cloud-specific settings for this node pool. |  | Optional: {} <br /> |


#### ClusterNodePoolAWSCloudSettings







_Appears in:_
- [ClusterNodePoolCloudSettings](#clusternodepoolcloudsettings)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `launchTemplateId` _string_ | LaunchTemplateId is an ID of custom launch template for your nodes. Useful for Golden AMI setups. |  | Optional: {} <br />Type: string <br /> |


#### ClusterNodePoolCloudSettings







_Appears in:_
- [ClusterNodePool](#clusternodepool)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `aws` _[ClusterNodePoolAWSCloudSettings](#clusternodepoolawscloudsettings)_ | AWS node pool customizations. |  | Optional: {} <br /> |


#### ClusterRestore



ClusterRestore is the Schema for the clusterrestores API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ClusterRestore` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ClusterRestoreSpec](#clusterrestorespec)_ |  |  |  |


#### ClusterRestoreSpec



ClusterRestoreSpec defines the desired state of ClusterRestore



_Appears in:_
- [ClusterRestore](#clusterrestore)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `backupID` _string_ | BackupID is an ID of the backup to restore.<br />If BackupID is specified, then BackupName, BackupNamespace and BackupClusterRef are not needed. |  | Optional: {} <br />Type: string <br /> |
| `backupName` _string_ | BackupName is a name of the backup to restore.<br />BackupNamespace and BackupClusterRef have to be specified as well with it.<br />If BackupName, BackupNamespace and BackupCluster are specified, then BackupID is not needed. |  | Optional: {} <br />Type: string <br /> |
| `backupNamespace` _string_ | BackupNamespace is a namespace of the backup to restore.<br />BackupName and BackupClusterRef have to be specified as well with it.<br />If BackupName, BackupNamespace and BackupCluster are specified, then BackupID is not needed. |  | Optional: {} <br />Type: string <br /> |
| `backupClusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | BackupClusterID is an ID of a cluster where the backup to restore is located.<br />BackupName and BackupNamespace have to be specified as well with it.<br />If BackupName, BackupNamespace and BackupClusterRef are specified, then BackupID is not needed. |  | Optional: {} <br /> |




#### ClusterRestoreTrigger



ClusterRestoreTrigger is the Schema for the clusterrestoretriggers API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ClusterRestoreTrigger` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ClusterRestoreTriggerSpec](#clusterrestoretriggerspec)_ |  |  |  |


#### ClusterRestoreTriggerSpec



ClusterRestoreTriggerSpec defines the desired state of ClusterRestoreTrigger



_Appears in:_
- [ClusterRestoreTrigger](#clusterrestoretrigger)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `clusterRestoreRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ClusterRestoreRef pointing to source ClusterRestore. |  | Optional: {} <br /> |




#### ClusterSpec







_Appears in:_
- [Cluster](#cluster)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `handle` _string_ | Handle is a short, unique human-readable name used to identify this cluster.<br />Does not necessarily map to the cloud resource name.<br />This has to be specified in order to adopt existing cluster. |  | Optional: {} <br />Type: string <br /> |
| `version` _string_ | Version of Kubernetes to use for this cluster. Can be skipped only for BYOK. |  | Optional: {} <br />Type: string <br /> |
| `providerRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProviderRef references provider to use for this cluster. Can be skipped only for BYOK. |  | Optional: {} <br /> |
| `cloud` _string_ | Cloud provider to use for this cluster. |  | Enum: [aws azure gcp byok] <br />Optional: {} <br />Type: string <br /> |
| `protect` _boolean_ | Protect cluster from being deleted. |  | Optional: {} <br /> |
| `tags` _object (keys:string, values:string)_ | Tags used to filter clusters. |  | Optional: {} <br /> |
| `metadata` _[RawExtension](https://pkg.go.dev/k8s.io/apimachinery/pkg/runtime#RawExtension)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  | Optional: {} <br /> |
| `bindings` _[Bindings](#bindings)_ | Bindings contain read and write policies of this cluster |  | Optional: {} <br /> |
| `cloudSettings` _[ClusterCloudSettings](#clustercloudsettings)_ | CloudSettings contains cloud-specific settings for this cluster. |  | Optional: {} <br /> |
| `nodePools` _[ClusterNodePool](#clusternodepool) array_ | NodePools contains specs of node pools managed by this cluster. |  | Optional: {} <br /> |




#### ClusterTarget



A spec for targeting clusters



_Appears in:_
- [ManagedNamespaceSpec](#managednamespacespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `tags` _object (keys:string, values:string)_ | Tags the cluster tags to target |  | Optional: {} <br /> |
| `distro` _[ClusterDistro](#clusterdistro)_ | Distro kubernetes distribution to target |  | Optional: {} <br /> |
| `clusterRefs` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core) array_ |  |  |  |


#### ComponentState

_Underlying type:_ _string_





_Appears in:_
- [ServiceComponent](#servicecomponent)



#### Condition



Condition ...



_Appears in:_
- [PrAutomationConfiguration](#prautomationconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `field` _string_ |  |  | Required: {} <br /> |
| `operation` _[Operation](#operation)_ |  |  | Required: {} <br /> |
| `value` _string_ |  |  | Optional: {} <br /> |










#### Env







_Appears in:_
- [Container](#container)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  | Required: {} <br />Type: string <br /> |
| `value` _string_ |  |  | Required: {} <br />Type: string <br /> |


#### EnvFrom







_Appears in:_
- [Container](#container)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `secret` _string_ |  |  | Type: string <br /> |
| `configMap` _string_ |  |  | Type: string <br /> |


#### GateJob



GateJob is a spec for a job gate.



_Appears in:_
- [GateSpec](#gatespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `namespace` _string_ |  |  | Required: {} <br />Type: string <br /> |
| `containers` _[Container](#container) array_ |  |  | Optional: {} <br /> |
| `labels` _object (keys:string, values:string)_ |  |  | Optional: {} <br /> |
| `annotations` _object (keys:string, values:string)_ |  |  | Optional: {} <br /> |
| `serviceAccount` _string_ |  |  | Optional: {} <br />Type: string <br /> |
| `raw` _string_ | Raw can be used if you'd rather define the job spec via straight Kubernetes manifest file. |  | Optional: {} <br />Type: string <br /> |


#### GateSpec



GateSpec is a more refined spec for parameters needed for complex gates.



_Appears in:_
- [PipelineGate](#pipelinegate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `job` _[GateJob](#gatejob)_ |  |  | Optional: {} <br /> |


#### GitHealth

_Underlying type:_ _string_





_Appears in:_
- [GitRepositoryStatus](#gitrepositorystatus)



#### GitRef



GitRef ...



_Appears in:_
- [InfrastructureStackSpec](#infrastructurestackspec)
- [PrAutomationCreateConfiguration](#prautomationcreateconfiguration)
- [ServiceSpec](#servicespec)
- [ServiceTemplate](#servicetemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `folder` _string_ | Folder ... |  | Required: {} <br /> |
| `ref` _string_ | Ref ... |  | Required: {} <br /> |
| `files` _string array_ | Optional files to add to the manifests for this service |  | Optional: {} <br /> |


#### GitRepository









| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `GitRepository` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[GitRepositorySpec](#gitrepositoryspec)_ |  |  |  |


#### GitRepositorySpec







_Appears in:_
- [GitRepository](#gitrepository)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ |  |  |  |
| `credentialsRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | CredentialsRef is a secret reference which should contain privateKey, passphrase, username and password. |  | Optional: {} <br /> |




#### GlobalService



GlobalService is the Schema for the globalservices API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `GlobalService` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[GlobalServiceSpec](#globalservicespec)_ |  |  |  |


#### GlobalServiceSpec



GlobalServiceSpec defines the desired state of GlobalService



_Appears in:_
- [GlobalService](#globalservice)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `tags` _object (keys:string, values:string)_ | Tags a set of tags to select clusters for this global service |  | Optional: {} <br /> |
| `reparent` _boolean_ | Whether you'd want this global service to take ownership of existing Plural services |  | Optional: {} <br /> |
| `cascade` _[Cascade](#cascade)_ | Cascade deletion options for this global service |  | Optional: {} <br /> |
| `distro` _[ClusterDistro](#clusterdistro)_ | Distro of kubernetes this cluster is running |  | Enum: [GENERIC EKS AKS GKE RKE K3S] <br />Optional: {} <br /> |
| `serviceRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ServiceRef to replicate across clusters |  | Optional: {} <br /> |
| `providerRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ProviderRef apply to clusters with this provider |  | Optional: {} <br /> |
| `template` _[ServiceTemplate](#servicetemplate)_ |  |  | Optional: {} <br /> |




#### InfrastructureStack



InfrastructureStack is the Schema for the infrastructurestacks API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `InfrastructureStack` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[InfrastructureStackSpec](#infrastructurestackspec)_ |  |  |  |


#### InfrastructureStackSpec



InfrastructureStackSpec defines the desired state of InfrastructureStack



_Appears in:_
- [InfrastructureStack](#infrastructurestack)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this Stack. If not provided InfrastructureStack's own name from InfrastructureStack.ObjectMeta will be used. |  | Optional: {} <br /> |
| `type` _[StackType](#stacktype)_ | Type specifies the tool to use to apply it |  | Enum: [TERRAFORM ANSIBLE] <br /> |
| `repositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | RepositoryRef to source IaC from |  |  |
| `clusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  | Required: {} <br /> |
| `git` _[GitRef](#gitref)_ | Git reference w/in the repository where the IaC lives |  |  |
| `jobSpec` _[JobSpec](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#jobspec-v1-batch)_ | JobSpec optional k8s job configuration for the job that will apply this stack |  | Optional: {} <br /> |
| `configuration` _[StackConfiguration](#stackconfiguration)_ | Configuration version/image config for the tool you're using |  |  |
| `approval` _boolean_ | Approval whether to require approval |  | Optional: {} <br /> |
| `bindings` _[Bindings](#bindings)_ | Bindings contain read and write policies of this cluster |  | Optional: {} <br /> |
| `environment` _[StackEnvironment](#stackenvironment) array_ |  |  | Optional: {} <br /> |
| `files` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ | Files reference to ConfigMap with a key as a path and value as a content |  | Optional: {} <br /> |
| `detach` _boolean_ | Detach determined if user want to delete or detach stack |  |  |


#### ManagedNamespace



ManagedNamespace is the Schema for the managednamespaces API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ManagedNamespace` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ManagedNamespaceSpec](#managednamespacespec)_ |  |  |  |


#### ManagedNamespaceSpec



ManagedNamespaceSpec defines the desired state of ManagedNamespace



_Appears in:_
- [ManagedNamespace](#managednamespace)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this namespace once its placed on a cluster. If not provided ManagedNamespace's own name from ManagedNamespace.ObjectMeta will be used. |  | Optional: {} <br /> |
| `description` _string_ | Description a short description of the purpose of this namespace |  | Optional: {} <br /> |
| `cascade` _[Cascade](#cascade)_ | Cascade specifies how owned resources are deleted |  |  |
| `labels` _object (keys:string, values:string)_ | Labels for this namespace |  | Optional: {} <br /> |
| `annotations` _object (keys:string, values:string)_ | Annotations for this namespace |  | Optional: {} <br /> |
| `pullSecrets` _string array_ | PullSecrets a list of pull secrets to attach to this namespace |  | Optional: {} <br /> |
| `service` _[ServiceTemplate](#servicetemplate)_ |  |  | Optional: {} <br /> |
| `target` _[ClusterTarget](#clustertarget)_ |  |  | Optional: {} <br /> |


#### NamespacedName



NamespacedName is the same as types.NamespacedName
with the addition of kubebuilder/json annotations for better schema support.



_Appears in:_
- [ServiceHelm](#servicehelm)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name is a resource name. |  | Required: {} <br /> |
| `namespace` _string_ | Namespace is a resource namespace. |  | Required: {} <br /> |




#### NotificationRouter



NotificationRouter is the Schema for the notificationrouters API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `NotificationRouter` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[NotificationRouterSpec](#notificationrouterspec)_ |  |  |  |


#### NotificationRouterSpec



NotificationRouterSpec defines the desired state of NotificationRouter



_Appears in:_
- [NotificationRouter](#notificationrouter)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name the name of this router, if not provided NotificationRouter's own name from NotificationRouter.ObjectMeta will be used. |  | Optional: {} <br /> |
| `events` _string array_ | Events the events to trigger, or use * for any |  |  |
| `filters` _[RouterFilters](#routerfilters) array_ | Filters filters by object type |  | Optional: {} <br /> |
| `sinks` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core) array_ | Sinks notification sinks to deliver notifications to |  | Optional: {} <br /> |


#### NotificationSink



NotificationSink is the Schema for the notificationsinks API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `NotificationSink` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[NotificationSinkSpec](#notificationsinkspec)_ |  |  |  |


#### NotificationSinkSpec



NotificationSinkSpec defines the desired state of NotificationSink



_Appears in:_
- [NotificationSink](#notificationsink)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name the name of this service, if not provided NotificationSink's own name from NotificationSink.ObjectMeta will be used. |  | Optional: {} <br /> |
| `type` _[SinkType](#sinktype)_ | Type the channel type of this sink. |  | Enum: [SLACK TEAMS] <br />Optional: {} <br /> |
| `configuration` _[SinkConfiguration](#sinkconfiguration)_ | Configuration for the specific type |  | Optional: {} <br /> |


#### Pipeline



Pipeline is the Schema for the pipelines API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `Pipeline` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PipelineSpec](#pipelinespec)_ |  |  |  |


#### PipelineContext



PipelineContext is the Schema for the pipelinecontexts API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `PipelineContext` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PipelineContextSpec](#pipelinecontextspec)_ |  |  |  |


#### PipelineContextSpec



PipelineContextSpec defines the desired state of PipelineContext



_Appears in:_
- [PipelineContext](#pipelinecontext)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `pipelineRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | PipelineRef pointing to source Pipeline. |  | Optional: {} <br /> |
| `context` _[RawExtension](https://pkg.go.dev/k8s.io/apimachinery/pkg/runtime#RawExtension)_ | Context is a Pipeline context |  |  |


#### PipelineEdge



PipelineEdge is a specification of an edge between two pipeline stages.



_Appears in:_
- [PipelineSpec](#pipelinespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `fromId` _string_ | FromID is stage ID the edge is from, can also be specified by name. |  | Optional: {} <br />Type: string <br /> |
| `toId` _string_ | ToID is stage ID the edge is to, can also be specified by name. |  | Optional: {} <br />Type: string <br /> |
| `from` _string_ | From is the name of the pipeline stage this edge emits from. |  | Optional: {} <br />Type: string <br /> |
| `to` _string_ | To is the name of the pipeline stage this edge points to. |  | Optional: {} <br />Type: string <br /> |
| `gates` _[PipelineGate](#pipelinegate) array_ | Gates are any optional promotion gates you wish to configure. |  | Optional: {} <br /> |


#### PipelineGate



PipelineGate will configure a promotion gate for a pipeline.



_Appears in:_
- [PipelineEdge](#pipelineedge)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this gate. |  | Required: {} <br />Type: string <br /> |
| `type` _[GateType](#gatetype)_ | Type of gate this is. |  | Enum: [APPROVAL WINDOW JOB] <br />Required: {} <br /> |
| `clusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ClusterRef of a Cluster this gate will execute on. |  | Optional: {} <br /> |
| `spec` _[GateSpec](#gatespec)_ | Spec contains specification for more complex gate types. |  | Optional: {} <br /> |


#### PipelineSpec



PipelineSpec defines the desired state of Pipeline.



_Appears in:_
- [Pipeline](#pipeline)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `stages` _[PipelineStage](#pipelinestage) array_ | Stages of a pipeline. |  |  |
| `edges` _[PipelineEdge](#pipelineedge) array_ | Edges of a pipeline. |  |  |


#### PipelineStage



PipelineStage defines the Pipeline stage.



_Appears in:_
- [PipelineSpec](#pipelinespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name of this stage. |  | Required: {} <br />Type: string <br /> |
| `services` _[PipelineStageService](#pipelinestageservice) array_ | Services including optional promotion criteria. |  |  |


#### PipelineStageService



PipelineStageService is the configuration of a service within a pipeline stage,
including optional promotion criteria.



_Appears in:_
- [PipelineStage](#pipelinestage)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `serviceRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  |  |
| `criteria` _[PipelineStageServicePromotionCriteria](#pipelinestageservicepromotioncriteria)_ |  |  | Optional: {} <br /> |


#### PipelineStageServicePromotionCriteria



PipelineStageServicePromotionCriteria represents actions to perform if this stage service were promoted.



_Appears in:_
- [PipelineStageService](#pipelinestageservice)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `serviceRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ServiceRef pointing to source service to promote from. |  | Optional: {} <br /> |
| `prAutomationRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | PrAutomationRef pointing to source PR automation to promote from. |  | Optional: {} <br /> |
| `secrets` _string array_ | Secrets to copy over in a promotion. |  | Optional: {} <br /> |




#### PrAutomation



PrAutomation ...





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `PrAutomation` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PrAutomationSpec](#prautomationspec)_ | Spec ... |  | Required: {} <br /> |


#### PrAutomationBindings



PrAutomationBindings ...



_Appears in:_
- [PrAutomationSpec](#prautomationspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `create` _[Binding](#binding) array_ | Create bindings. |  | Optional: {} <br /> |
| `write` _[Binding](#binding) array_ | Write bindings. |  | Optional: {} <br /> |


#### PrAutomationConfiguration



PrAutomationConfiguration ...



_Appears in:_
- [PrAutomationSpec](#prautomationspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  | Required: {} <br /> |
| `type` _[ConfigurationType](#configurationtype)_ |  |  | Required: {} <br /> |
| `condition` _[Condition](#condition)_ |  |  | Optional: {} <br /> |
| `default` _string_ |  |  | Optional: {} <br /> |
| `documentation` _string_ |  |  | Optional: {} <br /> |
| `longform` _string_ |  |  | Optional: {} <br /> |
| `optional` _boolean_ |  |  | Optional: {} <br /> |
| `placeholder` _string_ |  |  | Optional: {} <br /> |


#### PrAutomationCreateConfiguration



PrAutomationCreateConfiguration ...



_Appears in:_
- [PrAutomationSpec](#prautomationspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `git` _[GitRef](#gitref)_ | Git ... |  | Optional: {} <br /> |
| `templates` _[PrAutomationTemplate](#prautomationtemplate) array_ | Templates ... |  | Optional: {} <br /> |


#### PrAutomationSpec



PrAutomationSpec ...



_Appears in:_
- [PrAutomation](#prautomation)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `addon` _string_ | Addon is a link to an addon name |  | Optional: {} <br /> |
| `branch` _string_ | Branch ... |  | Optional: {} <br /> |
| `documentation` _string_ | Documentation ... |  | Optional: {} <br /> |
| `identifier` _string_ | Identifier is a string referencing the repository, i.e. for GitHub it would be "<organization>/<repositoryName>" |  | Optional: {} <br /> |
| `message` _string_ | Message ... |  | Optional: {} <br /> |
| `name` _string_ | Name ... |  | Optional: {} <br /> |
| `title` _string_ | Title... |  | Optional: {} <br /> |
| `clusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ClusterRef ... |  | Optional: {} <br /> |
| `scmConnectionRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ScmConnectionRef ... |  | Required: {} <br /> |
| `repositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | RepositoryRef ... |  | Optional: {} <br /> |
| `serviceRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ServiceRef ... |  | Optional: {} <br /> |
| `bindings` _[PrAutomationBindings](#prautomationbindings)_ | Bindings contain read and write policies of pr automation |  | Optional: {} <br /> |
| `configuration` _[PrAutomationConfiguration](#prautomationconfiguration) array_ | Configuration ... |  | Optional: {} <br /> |
| `creates` _[PrAutomationCreateConfiguration](#prautomationcreateconfiguration)_ | Creates ... |  | Optional: {} <br /> |
| `updates` _[PrAutomationUpdateConfiguration](#prautomationupdateconfiguration)_ | Updates ... |  | Optional: {} <br /> |


#### PrAutomationTemplate



PrAutomationTemplate ...



_Appears in:_
- [PrAutomationCreateConfiguration](#prautomationcreateconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `destination` _string_ | Destination ... |  | Required: {} <br /> |
| `external` _boolean_ | External ... |  | Required: {} <br /> |
| `source` _string_ | Source ... |  | Optional: {} <br /> |


#### PrAutomationTrigger



PrAutomationTrigger is the Schema for the prautomationtriggers API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `PrAutomationTrigger` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[PrAutomationTriggerSpec](#prautomationtriggerspec)_ |  |  |  |


#### PrAutomationTriggerSpec



PrAutomationTriggerSpec defines the desired state of PrAutomationTrigger



_Appears in:_
- [PrAutomationTrigger](#prautomationtrigger)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `prAutomationRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | PrAutomationRef pointing to source PrAutomation. |  | Optional: {} <br /> |
| `context` _[RawExtension](https://pkg.go.dev/k8s.io/apimachinery/pkg/runtime#RawExtension)_ | Context is a PrAutomation context |  |  |


#### PrAutomationUpdateConfiguration



PrAutomationUpdateConfiguration ...



_Appears in:_
- [PrAutomationSpec](#prautomationspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `files` _string array_ | Files ... |  | Optional: {} <br /> |
| `matchStrategy` _[MatchStrategy](#matchstrategy)_ | MatchStrategy ... |  | Optional: {} <br /> |
| `regexReplacements` _[RegexReplacement](#regexreplacement) array_ | RegexReplacements ... |  | Optional: {} <br /> |
| `regexes` _string array_ | Regexes ... |  | Optional: {} <br /> |
| `replaceTemplate` _string_ | ReplaceTemplate ... |  | Optional: {} <br /> |
| `yq` _string_ | Yq ... |  | Optional: {} <br /> |


#### Provider



Provider ...





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `Provider` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ProviderSpec](#providerspec)_ |  |  | Required: {} <br /> |


#### ProviderSpec



ProviderSpec ...



_Appears in:_
- [Provider](#provider)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `cloud` _[CloudProvider](#cloudprovider)_ | Cloud is the name of the cloud service for the Provider.<br />One of (CloudProvider): [gcp, aws, azure] |  | Enum: [gcp aws azure] <br />Required: {} <br />Type: string <br /> |
| `cloudSettings` _[CloudProviderSettings](#cloudprovidersettings)_ | CloudSettings reference cloud provider credentials secrets used for provisioning the Cluster.<br />Not required when Cloud is set to CloudProvider(BYOK). |  | Optional: {} <br />Type: object <br /> |
| `name` _string_ | Name is a human-readable name of the Provider. |  | Optional: {} <br /> |
| `namespace` _string_ | Namespace is the namespace ClusterAPI resources are deployed into. |  | Optional: {} <br /> |


#### RegexReplacement



RegexReplacement ...



_Appears in:_
- [PrAutomationUpdateConfiguration](#prautomationupdateconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `regex` _string_ | Regex ... |  | Required: {} <br /> |
| `file` _string_ | The file this replacement will work on |  | Required: {} <br /> |
| `replacement` _string_ | Replacement to be substituted for the match in the regex |  | Required: {} <br /> |
| `templated` _boolean_ | Whether you want to apply templating to the regex before compiling |  | Optional: {} <br /> |


#### RouterFilters







_Appears in:_
- [NotificationRouterSpec](#notificationrouterspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `regex` _string_ | Regex a regex for filtering by things like pr url |  | Optional: {} <br /> |
| `serviceRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ServiceRef whether to enable delivery for events associated with this service |  | Optional: {} <br /> |
| `clusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | ClusterRef whether to enable delivery for events associated with this cluster |  | Optional: {} <br /> |
| `pipelineRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | PipelineRef whether to enable delivery for events associated with this pipeline |  | Optional: {} <br /> |


#### ScmConnection



ScmConnection ...





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ScmConnection` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ScmConnectionSpec](#scmconnectionspec)_ |  |  | Required: {} <br /> |


#### ScmConnectionSpec







_Appears in:_
- [ScmConnection](#scmconnection)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name is a human-readable name of the ScmConnection. |  | Required: {} <br /> |
| `type` _[ScmType](#scmtype)_ | Type is the name of the scm service for the ScmConnection.<br />One of (ScmType): [github, gitlab] |  | Enum: [GITHUB GITLAB] <br />Required: {} <br />Type: string <br /> |
| `tokenSecretRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | Token ... |  | Optional: {} <br /> |
| `username` _string_ | Username ... |  | Optional: {} <br /> |
| `baseUrl` _string_ | BaseUrl is a base URL for Git clones for self-hosted versions. |  | Optional: {} <br /> |
| `apiUrl` _string_ | APIUrl is a base URL for HTTP apis for shel-hosted versions if different from BaseUrl. |  | Optional: {} <br /> |


#### ServiceComponent







_Appears in:_
- [ServiceStatus](#servicestatus)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `id` _string_ |  |  |  |
| `name` _string_ |  |  |  |
| `group` _string_ |  |  | Optional: {} <br /> |
| `kind` _string_ |  |  |  |
| `namespace` _string_ |  |  | Optional: {} <br /> |
| `state` _[ComponentState](#componentstate)_ | State specifies the component state |  | Enum: [RUNNING PENDING FAILED] <br />Optional: {} <br /> |
| `synced` _boolean_ |  |  |  |
| `version` _string_ |  |  | Optional: {} <br /> |


#### ServiceDeployment









| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `deployments.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ServiceDeployment` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ServiceSpec](#servicespec)_ |  |  | Required: {} <br /> |


#### ServiceError







_Appears in:_
- [ServiceStatus](#servicestatus)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `source` _string_ |  |  |  |
| `message` _string_ |  |  |  |


#### ServiceHelm







_Appears in:_
- [ServiceSpec](#servicespec)
- [ServiceTemplate](#servicetemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `valuesFrom` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | Fetches the helm values from a secret in this cluster, will consider any key with yaml data a values file and merge them iteratively |  | Optional: {} <br /> |
| `valuesConfigMapRef` _[ConfigMapKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#configmapkeyselector-v1-core)_ |  |  | Optional: {} <br /> |
| `release` _string_ | name of the helm release to use when applying |  | Optional: {} <br /> |
| `repositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ | reference to a GitRepository to source the helm chart from (useful if you're using a multi-source configuration for values files) |  | Optional: {} <br /> |
| `values` _[RawExtension](https://pkg.go.dev/k8s.io/apimachinery/pkg/runtime#RawExtension)_ | arbitrary yaml values to overlay |  | Optional: {} <br /> |
| `valuesFiles` _string array_ | individual values files to overlay |  | Optional: {} <br /> |
| `chart` _string_ | chart to use |  | Optional: {} <br /> |
| `version` _string_ | chart version to use |  | Optional: {} <br /> |
| `repository` _[NamespacedName](#namespacedname)_ | pointer to the FluxCD helm repository to use |  | Optional: {} <br /> |


#### ServiceKustomize







_Appears in:_
- [ServiceSpec](#servicespec)
- [ServiceTemplate](#servicetemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `path` _string_ |  |  |  |


#### ServiceSpec







_Appears in:_
- [ServiceDeployment](#servicedeployment)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | the name of this service, if not provided ServiceDeployment's own name from ServiceDeployment.ObjectMeta will be used. |  | Optional: {} <br /> |
| `namespace` _string_ | the namespace this service will be deployed into, if not provided deploys to the ServiceDeployment's own namespace |  | Optional: {} <br /> |
| `docsPath` _string_ |  |  | Optional: {} <br /> |
| `version` _string_ |  |  | Optional: {} <br /> |
| `protect` _boolean_ |  |  | Optional: {} <br /> |
| `kustomize` _[ServiceKustomize](#servicekustomize)_ |  |  | Optional: {} <br /> |
| `git` _[GitRef](#gitref)_ |  |  | Optional: {} <br /> |
| `helm` _[ServiceHelm](#servicehelm)_ |  |  | Optional: {} <br /> |
| `syncConfig` _[SyncConfigAttributes](#syncconfigattributes)_ |  |  | Optional: {} <br /> |
| `repositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  | Optional: {} <br /> |
| `clusterRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  | Required: {} <br /> |
| `configurationRef` _[SecretReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretreference-v1-core)_ | ConfigurationRef is a secret reference which should contain service configuration. |  | Optional: {} <br /> |
| `bindings` _[Bindings](#bindings)_ | Bindings contain read and write policies of this cluster |  | Optional: {} <br /> |
| `dependencies` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core) array_ | Dependencies contain dependent services |  | Optional: {} <br /> |
| `contexts` _string array_ | Contexts contain dependent service context names |  | Optional: {} <br /> |
| `templated` _boolean_ | Templated should apply liquid templating to raw yaml files, defaults to true |  | Optional: {} <br /> |




#### ServiceTemplate



Attributes for configuring a service in something like a managed namespace



_Appears in:_
- [GlobalServiceSpec](#globalservicespec)
- [ManagedNamespaceSpec](#managednamespacespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ | Name the name for this service (optional for managed namespaces) |  | Optional: {} <br /> |
| `namespace` _string_ | Namespace the namespace for this service (optional for managed namespaces) |  | Optional: {} <br /> |
| `templated` _boolean_ |  |  | Optional: {} <br /> |
| `repositoryRef` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core)_ |  |  | Optional: {} <br /> |
| `contexts` _string array_ | a list of context ids to add to this service |  | Optional: {} <br /> |
| `git` _[GitRef](#gitref)_ | Git settings to configure git for a service |  | Optional: {} <br /> |
| `helm` _[ServiceHelm](#servicehelm)_ | Helm settings to configure helm for a service |  | Optional: {} <br /> |
| `kustomize` _[ServiceKustomize](#servicekustomize)_ | Kustomize settings for service kustomization |  | Optional: {} <br /> |
| `syncConfig` _[SyncConfigAttributes](#syncconfigattributes)_ | SyncConfig attributes to configure sync settings for this service |  | Optional: {} <br /> |
| `dependencies` _[ObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectreference-v1-core) array_ | Dependencies contain dependent services |  | Optional: {} <br /> |


#### SinkConfiguration







_Appears in:_
- [NotificationSinkSpec](#notificationsinkspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `slack` _[SinkURL](#sinkurl)_ | Slack url |  | Optional: {} <br /> |
| `teams` _[SinkURL](#sinkurl)_ | Teams url |  | Optional: {} <br /> |


#### SinkURL







_Appears in:_
- [SinkConfiguration](#sinkconfiguration)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `url` _string_ |  |  |  |


#### StackConfiguration







_Appears in:_
- [InfrastructureStackSpec](#infrastructurestackspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `image` _string_ | Image optional custom image you might want to use |  | Optional: {} <br /> |
| `version` _string_ | Version the semver of the tool you wish to use |  |  |


#### StackEnvironment







_Appears in:_
- [InfrastructureStackSpec](#infrastructurestackspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  |  |
| `value` _string_ |  |  |  |
| `secret` _boolean_ |  |  | Optional: {} <br /> |




#### Status







_Appears in:_
- [ClusterStatus](#clusterstatus)
- [GitRepositoryStatus](#gitrepositorystatus)
- [ServiceStatus](#servicestatus)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `id` _string_ | ID of the resource in the Console API. |  | Optional: {} <br />Type: string <br /> |
| `sha` _string_ | SHA of last applied configuration. |  | Optional: {} <br />Type: string <br /> |
| `conditions` _[Condition](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#condition-v1-meta) array_ | Represents the observations of a PrAutomation's current state. |  |  |


#### SyncConfigAttributes







_Appears in:_
- [ServiceSpec](#servicespec)
- [ServiceTemplate](#servicetemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `createNamespace` _boolean_ |  |  | Optional: {} <br /> |
| `labels` _object (keys:string, values:string)_ |  |  | Optional: {} <br /> |
| `annotations` _object (keys:string, values:string)_ |  |  | Optional: {} <br /> |


#### Taint



Taint represents a Kubernetes taint.



_Appears in:_
- [ClusterNodePool](#clusternodepool)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `effect` _[TaintEffect](#tainteffect)_ | Effect specifies the effect for the taint. |  | Enum: [NoSchedule NoExecute PreferNoSchedule] <br /> |
| `key` _string_ | Key is the key of the taint. |  |  |
| `value` _string_ | Value is the value of the taint. |  |  |


#### TaintEffect

_Underlying type:_ _string_

TaintEffect is the effect for a Kubernetes taint.



_Appears in:_
- [Taint](#taint)



