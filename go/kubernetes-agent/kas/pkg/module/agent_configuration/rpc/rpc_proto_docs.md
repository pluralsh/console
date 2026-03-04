# Protocol Documentation
<a name="top"></a>

## Table of Contents

- [pkg/module/agent_configuration/rpc/rpc.proto](#pkg_module_agent_configuration_rpc_rpc-proto)
    - [ConfigurationRequest](#plural-agent-agent_configuration-rpc-ConfigurationRequest)
    - [ConfigurationResponse](#plural-agent-agent_configuration-rpc-ConfigurationResponse)
  
    - [AgentConfiguration](#plural-agent-agent_configuration-rpc-AgentConfiguration)
  
- [Scalar Value Types](#scalar-value-types)



<a name="pkg_module_agent_configuration_rpc_rpc-proto"></a>
<p align="right"><a href="#top">Top</a></p>

## pkg/module/agent_configuration/rpc/rpc.proto



<a name="plural-agent-agent_configuration-rpc-ConfigurationRequest"></a>

### ConfigurationRequest



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| commit_id | [string](#string) |  | Last processed commit id. Optional. Server will only send configuration if the last commit on the branch is a different one. If a connection breaks, this allows to resume the stream without sending the same data again. |
| agent_meta | [plural.agent.entity.AgentMeta](#plural-agent-entity-AgentMeta) |  | Information about the agent. |
| skip_register | [bool](#bool) |  | Flag to skip agent registration. |






<a name="plural-agent-agent_configuration-rpc-ConfigurationResponse"></a>

### ConfigurationResponse



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| configuration | [plural.agent.agentcfg.AgentConfiguration](#plural-agent-agentcfg-AgentConfiguration) |  |  |
| commit_id | [string](#string) |  | Commit id of the configuration repository. Can be used to resume connection from where it dropped. |





 

 

 


<a name="plural-agent-agent_configuration-rpc-AgentConfiguration"></a>

### AgentConfiguration


| Method Name | Request Type | Response Type | Description |
| ----------- | ------------ | ------------- | ------------|
| GetConfiguration | [ConfigurationRequest](#plural-agent-agent_configuration-rpc-ConfigurationRequest) | [ConfigurationResponse](#plural-agent-agent_configuration-rpc-ConfigurationResponse) stream | Get agentk configuration. |

 



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

