# Protocol Documentation
<a name="top"></a>

## Table of Contents

- [pkg/module/reverse_tunnel/rpc/rpc.proto](#pkg_module_reverse_tunnel_rpc_rpc-proto)
    - [CloseSend](#plural-agent-reverse_tunnel-rpc-CloseSend)
    - [ConnectRequest](#plural-agent-reverse_tunnel-rpc-ConnectRequest)
    - [ConnectResponse](#plural-agent-reverse_tunnel-rpc-ConnectResponse)
    - [Descriptor](#plural-agent-reverse_tunnel-rpc-Descriptor)
    - [Error](#plural-agent-reverse_tunnel-rpc-Error)
    - [Header](#plural-agent-reverse_tunnel-rpc-Header)
    - [Header.MetaEntry](#plural-agent-reverse_tunnel-rpc-Header-MetaEntry)
    - [Message](#plural-agent-reverse_tunnel-rpc-Message)
    - [RequestInfo](#plural-agent-reverse_tunnel-rpc-RequestInfo)
    - [RequestInfo.MetaEntry](#plural-agent-reverse_tunnel-rpc-RequestInfo-MetaEntry)
    - [Trailer](#plural-agent-reverse_tunnel-rpc-Trailer)
    - [Trailer.MetaEntry](#plural-agent-reverse_tunnel-rpc-Trailer-MetaEntry)
  
    - [ReverseTunnel](#plural-agent-reverse_tunnel-rpc-ReverseTunnel)
  
- [Scalar Value Types](#scalar-value-types)



<a name="pkg_module_reverse_tunnel_rpc_rpc-proto"></a>
<p align="right"><a href="#top">Top</a></p>

## pkg/module/reverse_tunnel/rpc/rpc.proto



<a name="plural-agent-reverse_tunnel-rpc-CloseSend"></a>

### CloseSend







<a name="plural-agent-reverse_tunnel-rpc-ConnectRequest"></a>

### ConnectRequest



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| descriptor | [Descriptor](#plural-agent-reverse_tunnel-rpc-Descriptor) |  |  |
| header | [Header](#plural-agent-reverse_tunnel-rpc-Header) |  |  |
| message | [Message](#plural-agent-reverse_tunnel-rpc-Message) |  |  |
| trailer | [Trailer](#plural-agent-reverse_tunnel-rpc-Trailer) |  |  |
| error | [Error](#plural-agent-reverse_tunnel-rpc-Error) |  |  |






<a name="plural-agent-reverse_tunnel-rpc-ConnectResponse"></a>

### ConnectResponse



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| request_info | [RequestInfo](#plural-agent-reverse_tunnel-rpc-RequestInfo) |  |  |
| message | [Message](#plural-agent-reverse_tunnel-rpc-Message) |  |  |
| close_send | [CloseSend](#plural-agent-reverse_tunnel-rpc-CloseSend) |  |  |






<a name="plural-agent-reverse_tunnel-rpc-Descriptor"></a>

### Descriptor



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| agent_descriptor | [plural.agent.reverse_tunnel.info.AgentDescriptor](#plural-agent-reverse_tunnel-info-AgentDescriptor) |  |  |






<a name="plural-agent-reverse_tunnel-rpc-Error"></a>

### Error
Error represents a gRPC error that should be returned.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| status | [google.rpc.Status](#google-rpc-Status) |  | Error status as returned by gRPC. See https://cloud.google.com/apis/design/errors. |






<a name="plural-agent-reverse_tunnel-rpc-Header"></a>

### Header
Header is a gRPC metadata.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| meta | [Header.MetaEntry](#plural-agent-reverse_tunnel-rpc-Header-MetaEntry) | repeated |  |






<a name="plural-agent-reverse_tunnel-rpc-Header-MetaEntry"></a>

### Header.MetaEntry



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| key | [string](#string) |  |  |
| value | [plural.agent.prototool.Values](#plural-agent-prototool-Values) |  |  |






<a name="plural-agent-reverse_tunnel-rpc-Message"></a>

### Message
Message is a gRPC message data.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| data | [bytes](#bytes) |  |  |






<a name="plural-agent-reverse_tunnel-rpc-RequestInfo"></a>

### RequestInfo



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| method_name | [string](#string) |  |  |
| meta | [RequestInfo.MetaEntry](#plural-agent-reverse_tunnel-rpc-RequestInfo-MetaEntry) | repeated |  |






<a name="plural-agent-reverse_tunnel-rpc-RequestInfo-MetaEntry"></a>

### RequestInfo.MetaEntry



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| key | [string](#string) |  |  |
| value | [plural.agent.prototool.Values](#plural-agent-prototool-Values) |  |  |






<a name="plural-agent-reverse_tunnel-rpc-Trailer"></a>

### Trailer
Trailer is a gRPC trailer metadata.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| meta | [Trailer.MetaEntry](#plural-agent-reverse_tunnel-rpc-Trailer-MetaEntry) | repeated |  |






<a name="plural-agent-reverse_tunnel-rpc-Trailer-MetaEntry"></a>

### Trailer.MetaEntry



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| key | [string](#string) |  |  |
| value | [plural.agent.prototool.Values](#plural-agent-prototool-Values) |  |  |





 

 

 


<a name="plural-agent-reverse_tunnel-rpc-ReverseTunnel"></a>

### ReverseTunnel


| Method Name | Request Type | Response Type | Description |
| ----------- | ------------ | ------------- | ------------|
| Connect | [ConnectRequest](#plural-agent-reverse_tunnel-rpc-ConnectRequest) stream | [ConnectResponse](#plural-agent-reverse_tunnel-rpc-ConnectResponse) stream | Connect to server to establish a reverse tunnel. |

 



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

