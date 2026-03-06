# Protocol Documentation
<a name="top"></a>

## Table of Contents

- [pkg/plural/api/api.proto](#pkg_plural_api_api-proto)
    - [AccessAsAgentAuthorization](#plural-agent-plural-api-AccessAsAgentAuthorization)
    - [AccessAsProxyAuthorization](#plural-agent-plural-api-AccessAsProxyAuthorization)
    - [AccessAsUserAuthorization](#plural-agent-plural-api-AccessAsUserAuthorization)
    - [AgentConfigurationRequest](#plural-agent-plural-api-AgentConfigurationRequest)
    - [AllowedAgent](#plural-agent-plural-api-AllowedAgent)
    - [AllowedAgentsForJob](#plural-agent-plural-api-AllowedAgentsForJob)
    - [AuthorizeProxyUserRequest](#plural-agent-plural-api-AuthorizeProxyUserRequest)
    - [AuthorizeProxyUserResponse](#plural-agent-plural-api-AuthorizeProxyUserResponse)
    - [AuthorizedAgentForUser](#plural-agent-plural-api-AuthorizedAgentForUser)
    - [ConfigProject](#plural-agent-plural-api-ConfigProject)
    - [Configuration](#plural-agent-plural-api-Configuration)
    - [Environment](#plural-agent-plural-api-Environment)
    - [GetAgentInfoResponse](#plural-agent-plural-api-GetAgentInfoResponse)
    - [GetProjectInfoResponse](#plural-agent-plural-api-GetProjectInfoResponse)
    - [Group](#plural-agent-plural-api-Group)
    - [Job](#plural-agent-plural-api-Job)
    - [Pipeline](#plural-agent-plural-api-Pipeline)
    - [Project](#plural-agent-plural-api-Project)
    - [User](#plural-agent-plural-api-User)
  
- [Scalar Value Types](#scalar-value-types)



<a name="pkg_plural_api_api-proto"></a>
<p align="right"><a href="#top">Top</a></p>

## pkg/plural/api/api.proto



<a name="plural-agent-plural-api-AccessAsAgentAuthorization"></a>

### AccessAsAgentAuthorization







<a name="plural-agent-plural-api-AccessAsProxyAuthorization"></a>

### AccessAsProxyAuthorization



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| agent | [AccessAsAgentAuthorization](#plural-agent-plural-api-AccessAsAgentAuthorization) |  |  |
| user | [AccessAsUserAuthorization](#plural-agent-plural-api-AccessAsUserAuthorization) |  |  |






<a name="plural-agent-plural-api-AccessAsUserAuthorization"></a>

### AccessAsUserAuthorization



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| roles | [string](#string) | repeated |  |
| groups | [string](#string) | repeated |  |






<a name="plural-agent-plural-api-AgentConfigurationRequest"></a>

### AgentConfigurationRequest



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| agent_id | [int64](#int64) |  |  |
| agent_config | [plural.agent.agentcfg.ConfigurationFile](#plural-agent-agentcfg-ConfigurationFile) |  |  |






<a name="plural-agent-plural-api-AllowedAgent"></a>

### AllowedAgent



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| id | [int64](#int64) |  |  |
| config_project | [ConfigProject](#plural-agent-plural-api-ConfigProject) |  |  |
| configuration | [Configuration](#plural-agent-plural-api-Configuration) |  |  |






<a name="plural-agent-plural-api-AllowedAgentsForJob"></a>

### AllowedAgentsForJob



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| allowed_agents | [AllowedAgent](#plural-agent-plural-api-AllowedAgent) | repeated |  |
| job | [Job](#plural-agent-plural-api-Job) |  |  |
| pipeline | [Pipeline](#plural-agent-plural-api-Pipeline) |  |  |
| project | [Project](#plural-agent-plural-api-Project) |  |  |
| user | [User](#plural-agent-plural-api-User) |  |  |
| environment | [Environment](#plural-agent-plural-api-Environment) |  | optional |






<a name="plural-agent-plural-api-AuthorizeProxyUserRequest"></a>

### AuthorizeProxyUserRequest



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| agent_id | [int64](#int64) |  |  |
| access_type | [string](#string) |  |  |
| access_key | [string](#string) |  |  |
| csrf_token | [string](#string) |  |  |






<a name="plural-agent-plural-api-AuthorizeProxyUserResponse"></a>

### AuthorizeProxyUserResponse



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| agent | [AuthorizedAgentForUser](#plural-agent-plural-api-AuthorizedAgentForUser) |  |  |
| user | [User](#plural-agent-plural-api-User) |  |  |
| access_as | [AccessAsProxyAuthorization](#plural-agent-plural-api-AccessAsProxyAuthorization) |  |  |






<a name="plural-agent-plural-api-AuthorizedAgentForUser"></a>

### AuthorizedAgentForUser



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| id | [int64](#int64) |  |  |
| config_project | [ConfigProject](#plural-agent-plural-api-ConfigProject) |  |  |






<a name="plural-agent-plural-api-ConfigProject"></a>

### ConfigProject



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| id | [int64](#int64) |  |  |






<a name="plural-agent-plural-api-Configuration"></a>

### Configuration
Configuration contains shared fields from agentcfg.CiAccessProjectCF and agentcfg.CiAccessGroupCF.
It is used to parse response from the allowed_agents API endpoint.
See https://gitlab.com/gitlab-org/cluster-integration/gitlab-agent/-/blob/master/doc/kubernetes_ci_access.md#apiv4joballowed_agents-api.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| default_namespace | [string](#string) |  |  |
| access_as | [plural.agent.agentcfg.CiAccessAsCF](#plural-agent-agentcfg-CiAccessAsCF) |  |  |






<a name="plural-agent-plural-api-Environment"></a>

### Environment



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| slug | [string](#string) |  |  |
| tier | [string](#string) |  |  |






<a name="plural-agent-plural-api-GetAgentInfoResponse"></a>

### GetAgentInfoResponse



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| project_id | [int64](#int64) |  |  |
| agent_id | [int64](#int64) |  |  |
| agent_name | [string](#string) |  |  |
| default_branch | [string](#string) |  |  |






<a name="plural-agent-plural-api-GetProjectInfoResponse"></a>

### GetProjectInfoResponse



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| project_id | [int64](#int64) |  |  |
| default_branch | [string](#string) |  |  |






<a name="plural-agent-plural-api-Group"></a>

### Group



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| id | [int64](#int64) |  |  |






<a name="plural-agent-plural-api-Job"></a>

### Job



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| id | [int64](#int64) |  |  |






<a name="plural-agent-plural-api-Pipeline"></a>

### Pipeline



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| id | [int64](#int64) |  |  |






<a name="plural-agent-plural-api-Project"></a>

### Project



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| id | [int64](#int64) |  |  |
| groups | [Group](#plural-agent-plural-api-Group) | repeated |  |






<a name="plural-agent-plural-api-User"></a>

### User



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| id | [string](#string) |  |  |
| username | [string](#string) |  |  |
| email | [string](#string) |  |  |





 

 

 

 



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

