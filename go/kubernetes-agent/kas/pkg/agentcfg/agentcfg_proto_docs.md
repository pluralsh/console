# Protocol Documentation
<a name="top"></a>

## Table of Contents

- [pkg/agentcfg/agentcfg.proto](#pkg_agentcfg_agentcfg-proto)
    - [AgentConfiguration](#plural-agent-agentcfg-AgentConfiguration)
    - [CiAccessAsAgentCF](#plural-agent-agentcfg-CiAccessAsAgentCF)
    - [CiAccessAsCF](#plural-agent-agentcfg-CiAccessAsCF)
    - [CiAccessAsCiJobCF](#plural-agent-agentcfg-CiAccessAsCiJobCF)
    - [CiAccessAsImpersonateCF](#plural-agent-agentcfg-CiAccessAsImpersonateCF)
    - [CiAccessCF](#plural-agent-agentcfg-CiAccessCF)
    - [CiAccessGroupCF](#plural-agent-agentcfg-CiAccessGroupCF)
    - [CiAccessProjectCF](#plural-agent-agentcfg-CiAccessProjectCF)
    - [ConfigurationFile](#plural-agent-agentcfg-ConfigurationFile)
    - [ContainerScanningCF](#plural-agent-agentcfg-ContainerScanningCF)
    - [ContainerScanningFilter](#plural-agent-agentcfg-ContainerScanningFilter)
    - [ExtraKeyValCF](#plural-agent-agentcfg-ExtraKeyValCF)
    - [FluxCF](#plural-agent-agentcfg-FluxCF)
    - [GitLabWorkspacesProxy](#plural-agent-agentcfg-GitLabWorkspacesProxy)
    - [GitRefCF](#plural-agent-agentcfg-GitRefCF)
    - [GitopsCF](#plural-agent-agentcfg-GitopsCF)
    - [GoogleProfilerCF](#plural-agent-agentcfg-GoogleProfilerCF)
    - [LoggingCF](#plural-agent-agentcfg-LoggingCF)
    - [ManifestProjectCF](#plural-agent-agentcfg-ManifestProjectCF)
    - [ObservabilityCF](#plural-agent-agentcfg-ObservabilityCF)
    - [PathCF](#plural-agent-agentcfg-PathCF)
    - [RemoteDevelopmentCF](#plural-agent-agentcfg-RemoteDevelopmentCF)
    - [Resource](#plural-agent-agentcfg-Resource)
    - [ResourceRequirements](#plural-agent-agentcfg-ResourceRequirements)
    - [UserAccessAsAgentCF](#plural-agent-agentcfg-UserAccessAsAgentCF)
    - [UserAccessAsCF](#plural-agent-agentcfg-UserAccessAsCF)
    - [UserAccessAsUserCF](#plural-agent-agentcfg-UserAccessAsUserCF)
    - [UserAccessCF](#plural-agent-agentcfg-UserAccessCF)
    - [UserAccessGroupCF](#plural-agent-agentcfg-UserAccessGroupCF)
    - [UserAccessProjectCF](#plural-agent-agentcfg-UserAccessProjectCF)
    - [VulnerabilityReport](#plural-agent-agentcfg-VulnerabilityReport)
    - [WorkspaceNetworkPolicy](#plural-agent-agentcfg-WorkspaceNetworkPolicy)
  
    - [log_level_enum](#plural-agent-agentcfg-log_level_enum)
  
- [Scalar Value Types](#scalar-value-types)



<a name="pkg_agentcfg_agentcfg-proto"></a>
<p align="right"><a href="#top">Top</a></p>

## pkg/agentcfg/agentcfg.proto



<a name="plural-agent-agentcfg-AgentConfiguration"></a>

### AgentConfiguration
AgentConfiguration represents configuration for agentk.
Note that agentk configuration is not exactly the whole file as the file
may contain bits that are not relevant for the agent. For example, some
additional config for kas.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| gitops | [GitopsCF](#plural-agent-agentcfg-GitopsCF) |  |  |
| observability | [ObservabilityCF](#plural-agent-agentcfg-ObservabilityCF) |  |  |
| agent_id | [int64](#int64) |  | GitLab-wide unique id of the agent. |
| project_id | [int64](#int64) |  | Id of the configuration project. |
| ci_access | [CiAccessCF](#plural-agent-agentcfg-CiAccessCF) |  |  |
| container_scanning | [ContainerScanningCF](#plural-agent-agentcfg-ContainerScanningCF) |  |  |
| project_path | [string](#string) |  | Path of the configuration project |
| remote_development | [RemoteDevelopmentCF](#plural-agent-agentcfg-RemoteDevelopmentCF) |  |  |
| flux | [FluxCF](#plural-agent-agentcfg-FluxCF) |  |  |
| gitlab_external_url | [string](#string) |  |  |






<a name="plural-agent-agentcfg-CiAccessAsAgentCF"></a>

### CiAccessAsAgentCF







<a name="plural-agent-agentcfg-CiAccessAsCF"></a>

### CiAccessAsCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| agent | [CiAccessAsAgentCF](#plural-agent-agentcfg-CiAccessAsAgentCF) |  |  |
| impersonate | [CiAccessAsImpersonateCF](#plural-agent-agentcfg-CiAccessAsImpersonateCF) |  |  |
| ci_job | [CiAccessAsCiJobCF](#plural-agent-agentcfg-CiAccessAsCiJobCF) |  | CiAccessAsCiUserCF ci_user = 4 [json_name = &#34;ci_user&#34;, (validate.rules).message.required = true]; |






<a name="plural-agent-agentcfg-CiAccessAsCiJobCF"></a>

### CiAccessAsCiJobCF







<a name="plural-agent-agentcfg-CiAccessAsImpersonateCF"></a>

### CiAccessAsImpersonateCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| username | [string](#string) |  |  |
| groups | [string](#string) | repeated |  |
| uid | [string](#string) |  |  |
| extra | [ExtraKeyValCF](#plural-agent-agentcfg-ExtraKeyValCF) | repeated |  |






<a name="plural-agent-agentcfg-CiAccessCF"></a>

### CiAccessCF
https://gitlab.com/gitlab-org/cluster-integration/gitlab-agent/-/blob/master/doc/kubernetes_ci_access.md


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| projects | [CiAccessProjectCF](#plural-agent-agentcfg-CiAccessProjectCF) | repeated |  |
| groups | [CiAccessGroupCF](#plural-agent-agentcfg-CiAccessGroupCF) | repeated |  |






<a name="plural-agent-agentcfg-CiAccessGroupCF"></a>

### CiAccessGroupCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| id | [string](#string) |  |  |
| default_namespace | [string](#string) |  |  |
| access_as | [CiAccessAsCF](#plural-agent-agentcfg-CiAccessAsCF) |  |  |
| environments | [string](#string) | repeated |  |






<a name="plural-agent-agentcfg-CiAccessProjectCF"></a>

### CiAccessProjectCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| id | [string](#string) |  |  |
| default_namespace | [string](#string) |  |  |
| access_as | [CiAccessAsCF](#plural-agent-agentcfg-CiAccessAsCF) |  |  |
| environments | [string](#string) | repeated |  |






<a name="plural-agent-agentcfg-ConfigurationFile"></a>

### ConfigurationFile
ConfigurationFile represents user-facing configuration file.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| gitops | [GitopsCF](#plural-agent-agentcfg-GitopsCF) |  |  |
| observability | [ObservabilityCF](#plural-agent-agentcfg-ObservabilityCF) |  | Configuration related to all things observability. This is about the agent itself, not any observability-related features. |
| ci_access | [CiAccessCF](#plural-agent-agentcfg-CiAccessCF) |  |  |
| container_scanning | [ContainerScanningCF](#plural-agent-agentcfg-ContainerScanningCF) |  |  |
| user_access | [UserAccessCF](#plural-agent-agentcfg-UserAccessCF) |  |  |
| remote_development | [RemoteDevelopmentCF](#plural-agent-agentcfg-RemoteDevelopmentCF) |  |  |
| flux | [FluxCF](#plural-agent-agentcfg-FluxCF) |  |  |






<a name="plural-agent-agentcfg-ContainerScanningCF"></a>

### ContainerScanningCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| vulnerability_report | [VulnerabilityReport](#plural-agent-agentcfg-VulnerabilityReport) |  |  |
| cadence | [string](#string) |  |  |
| resource_requirements | [ResourceRequirements](#plural-agent-agentcfg-ResourceRequirements) |  |  |






<a name="plural-agent-agentcfg-ContainerScanningFilter"></a>

### ContainerScanningFilter



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| namespaces | [string](#string) | repeated |  |
| resources | [string](#string) | repeated |  |
| containers | [string](#string) | repeated |  |
| kinds | [string](#string) | repeated |  |






<a name="plural-agent-agentcfg-ExtraKeyValCF"></a>

### ExtraKeyValCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| key | [string](#string) |  |  |
| val | [string](#string) | repeated | Empty elements are allowed by Kubernetes. |






<a name="plural-agent-agentcfg-FluxCF"></a>

### FluxCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| webhook_receiver_url | [string](#string) |  |  |






<a name="plural-agent-agentcfg-GitLabWorkspacesProxy"></a>

### GitLabWorkspacesProxy
GitLabWorkspacesProxy represents the gitlab workspaces proxy configuration for the remote development module


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| namespace | [string](#string) |  |  |






<a name="plural-agent-agentcfg-GitRefCF"></a>

### GitRefCF
GitRef in the repository to fetch manifests from.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| tag | [string](#string) |  | A Git tag name, without `refs/tags/` |
| branch | [string](#string) |  | A Git branch name, without `refs/heads/` |
| commit | [string](#string) |  | A Git commit SHA |






<a name="plural-agent-agentcfg-GitopsCF"></a>

### GitopsCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| manifest_projects | [ManifestProjectCF](#plural-agent-agentcfg-ManifestProjectCF) | repeated |  |






<a name="plural-agent-agentcfg-GoogleProfilerCF"></a>

### GoogleProfilerCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| enabled | [bool](#bool) |  |  |
| project_id | [string](#string) |  |  |
| credentials_file | [string](#string) |  |  |
| debug_logging | [bool](#bool) |  |  |






<a name="plural-agent-agentcfg-LoggingCF"></a>

### LoggingCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| level | [log_level_enum](#plural-agent-agentcfg-log_level_enum) |  |  |
| grpc_level | [log_level_enum](#plural-agent-agentcfg-log_level_enum) | optional | optional to be able to tell when not set and use a different default value. |






<a name="plural-agent-agentcfg-ManifestProjectCF"></a>

### ManifestProjectCF
Project with Kubernetes object manifests.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| id | [string](#string) | optional | Project id. e.g. gitlab-org/cluster-integration/gitlab-agent |
| default_namespace | [string](#string) |  | Namespace to use if not set explicitly in object manifest. |
| paths | [PathCF](#plural-agent-agentcfg-PathCF) | repeated | A list of paths inside of the project to scan for .yaml/.yml/.json manifest files. |
| reconcile_timeout | [google.protobuf.Duration](#google-protobuf-Duration) |  | Reconcile timeout defines whether the applier should wait until all applied resources have been reconciled, and if so, how long to wait. |
| dry_run_strategy | [string](#string) |  | Dry run strategy defines whether changes should actually be performed, or if it is just talk and no action. https://github.com/kubernetes-sigs/cli-utils/blob/d6968048dcd80b1c7b55d9e4f31fc25f71c9b490/pkg/common/common.go#L68-L89 |
| prune | [bool](#bool) |  | Prune defines whether pruning of previously applied objects should happen after apply. |
| prune_timeout | [google.protobuf.Duration](#google-protobuf-Duration) |  | Prune timeout defines whether we should wait for all resources to be fully deleted after pruning, and if so, how long we should wait. |
| prune_propagation_policy | [string](#string) |  | Prune propagation policy defines the deletion propagation policy that should be used for pruning. https://github.com/kubernetes/apimachinery/blob/44113beed5d39f1b261a12ec398a356e02358307/pkg/apis/meta/v1/types.go#L456-L470 |
| inventory_policy | [string](#string) |  | InventoryPolicy defines if an inventory object can take over objects that belong to another inventory object or don&#39;t belong to any inventory object. This is done by determining if the apply/prune operation can go through for a resource based on the comparison the inventory-id value in the package and the owning-inventory annotation in the live object. https://github.com/kubernetes-sigs/cli-utils/blob/d6968048dcd80b1c7b55d9e4f31fc25f71c9b490/pkg/inventory/policy.go#L12-L66 |
| ref | [GitRefCF](#plural-agent-agentcfg-GitRefCF) |  | Ref in the GitOps repository to fetch manifests from. |






<a name="plural-agent-agentcfg-ObservabilityCF"></a>

### ObservabilityCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| logging | [LoggingCF](#plural-agent-agentcfg-LoggingCF) |  |  |
| google_profiler | [GoogleProfilerCF](#plural-agent-agentcfg-GoogleProfilerCF) |  |  |






<a name="plural-agent-agentcfg-PathCF"></a>

### PathCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| glob | [string](#string) |  | Glob to use to scan for files in the repository. Directories with names starting with a dot are ignored. See https://github.com/bmatcuk/doublestar#about and https://pkg.go.dev/github.com/bmatcuk/doublestar/v2#Match for globbing rules. |






<a name="plural-agent-agentcfg-RemoteDevelopmentCF"></a>

### RemoteDevelopmentCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| enabled | [bool](#bool) |  |  |
| dns_zone | [string](#string) |  |  |
| partial_sync_interval | [google.protobuf.Duration](#google-protobuf-Duration) |  |  |
| full_sync_interval | [google.protobuf.Duration](#google-protobuf-Duration) |  |  |
| gitlab_workspaces_proxy | [GitLabWorkspacesProxy](#plural-agent-agentcfg-GitLabWorkspacesProxy) |  |  |
| network_policy | [WorkspaceNetworkPolicy](#plural-agent-agentcfg-WorkspaceNetworkPolicy) |  |  |






<a name="plural-agent-agentcfg-Resource"></a>

### Resource



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| cpu | [string](#string) |  |  |
| memory | [string](#string) |  |  |






<a name="plural-agent-agentcfg-ResourceRequirements"></a>

### ResourceRequirements



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| limits | [Resource](#plural-agent-agentcfg-Resource) |  |  |
| requests | [Resource](#plural-agent-agentcfg-Resource) |  |  |






<a name="plural-agent-agentcfg-UserAccessAsAgentCF"></a>

### UserAccessAsAgentCF







<a name="plural-agent-agentcfg-UserAccessAsCF"></a>

### UserAccessAsCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| agent | [UserAccessAsAgentCF](#plural-agent-agentcfg-UserAccessAsAgentCF) |  |  |
| user | [UserAccessAsUserCF](#plural-agent-agentcfg-UserAccessAsUserCF) |  |  |






<a name="plural-agent-agentcfg-UserAccessAsUserCF"></a>

### UserAccessAsUserCF







<a name="plural-agent-agentcfg-UserAccessCF"></a>

### UserAccessCF
https://gitlab.com/gitlab-org/cluster-integration/gitlab-agent/-/blob/master/doc/kubernetes_user_access.md


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| access_as | [UserAccessAsCF](#plural-agent-agentcfg-UserAccessAsCF) |  |  |
| projects | [UserAccessProjectCF](#plural-agent-agentcfg-UserAccessProjectCF) | repeated |  |
| groups | [UserAccessGroupCF](#plural-agent-agentcfg-UserAccessGroupCF) | repeated |  |






<a name="plural-agent-agentcfg-UserAccessGroupCF"></a>

### UserAccessGroupCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| id | [string](#string) |  |  |






<a name="plural-agent-agentcfg-UserAccessProjectCF"></a>

### UserAccessProjectCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| id | [string](#string) |  |  |






<a name="plural-agent-agentcfg-VulnerabilityReport"></a>

### VulnerabilityReport



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| namespaces | [string](#string) | repeated |  |
| filters | [ContainerScanningFilter](#plural-agent-agentcfg-ContainerScanningFilter) | repeated |  |






<a name="plural-agent-agentcfg-WorkspaceNetworkPolicy"></a>

### WorkspaceNetworkPolicy
WorkspaceNetworkPolicy represents the firewall configuration for the remote development workspaces


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| enabled | [bool](#bool) | optional |  |





 


<a name="plural-agent-agentcfg-log_level_enum"></a>

### log_level_enum


| Name | Number | Description |
| ---- | ------ | ----------- |
| info | 0 | default value must be 0 |
| debug | 1 |  |
| warn | 2 |  |
| error | 3 |  |


 

 

 



## Scalar Value Types

| .proto Type | Notes | C++ | Java | Python | Go | C# | PHP | Ruby |
| ----------- | ----- | --- | ---- | ------ | -- | -- | --- | ---- |
| <a name="double" /> double |  | double | double | float | float64 | double | float | Float |
| <a name="float" /> float |  | float | float | float | float32 | float | float | Float |
| <a name="int32" /> int32 | Uses variable-length encoding. Inefficient for encoding negative numbers – if your field is likely to have negative values, use sint32 instead. | int32 | int | int | int32 | int | integer | Bignum or Fixnum (as required) |
| <a name="int64" /> int64 | Uses variable-length encoding. Inefficient for encoding negative numbers – if your field is likely to have negative values, use sint64 instead. | int64 | long | int/long | int64 | long | integer/string | Bignum |
| <a name="uint32" /> uint32 | Uses variable-length encoding. | uint32 | int | int/long | uint32 | uint | integer | Bignum or Fixnum (as required) |
| <a name="uint64" /> uint64 | Uses variable-length encoding. | uint64 | long | int/long | uint64 | ulong | integer/string | Bignum or Fixnum (as required) |
| <a name="sint32" /> sint32 | Uses variable-length encoding. Signed int value. These more efficiently encode negative numbers than regular int32s. | int32 | int | int | int32 | int | integer | Bignum or Fixnum (as required) |
| <a name="sint64" /> sint64 | Uses variable-length encoding. Signed int value. These more efficiently encode negative numbers than regular int64s. | int64 | long | int/long | int64 | long | integer/string | Bignum |
| <a name="fixed32" /> fixed32 | Always four bytes. More efficient than uint32 if values are often greater than 2^28. | uint32 | int | int | uint32 | uint | integer | Bignum or Fixnum (as required) |
| <a name="fixed64" /> fixed64 | Always eight bytes. More efficient than uint64 if values are often greater than 2^56. | uint64 | long | int/long | uint64 | ulong | integer/string | Bignum |
| <a name="sfixed32" /> sfixed32 | Always four bytes. | int32 | int | int | int32 | int | integer | Bignum or Fixnum (as required) |
| <a name="sfixed64" /> sfixed64 | Always eight bytes. | int64 | long | int/long | int64 | long | integer/string | Bignum |
| <a name="bool" /> bool |  | bool | boolean | boolean | bool | bool | boolean | TrueClass/FalseClass |
| <a name="string" /> string | A string must always contain UTF-8 encoded or 7-bit ASCII text. | string | String | str/unicode | string | string | string | String (UTF-8) |
| <a name="bytes" /> bytes | May contain any arbitrary sequence of bytes. | string | ByteString | str | []byte | ByteString | string | String (ASCII-8BIT) |

