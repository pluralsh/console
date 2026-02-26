# Protocol Documentation
<a name="top"></a>

## Table of Contents

- [pkg/tool/grpctool/grpctool.proto](#pkg_tool_grpctool_grpctool-proto)
    - [HttpRequest](#plural-agent-grpctool-HttpRequest)
    - [HttpRequest.Data](#plural-agent-grpctool-HttpRequest-Data)
    - [HttpRequest.Header](#plural-agent-grpctool-HttpRequest-Header)
    - [HttpRequest.Trailer](#plural-agent-grpctool-HttpRequest-Trailer)
    - [HttpRequest.UpgradeData](#plural-agent-grpctool-HttpRequest-UpgradeData)
    - [HttpResponse](#plural-agent-grpctool-HttpResponse)
    - [HttpResponse.Data](#plural-agent-grpctool-HttpResponse-Data)
    - [HttpResponse.Header](#plural-agent-grpctool-HttpResponse-Header)
    - [HttpResponse.Trailer](#plural-agent-grpctool-HttpResponse-Trailer)
    - [HttpResponse.UpgradeData](#plural-agent-grpctool-HttpResponse-UpgradeData)
  
- [Scalar Value Types](#scalar-value-types)



<a name="pkg_tool_grpctool_grpctool-proto"></a>
<p align="right"><a href="#top">Top</a></p>

## pkg/tool/grpctool/grpctool.proto



<a name="plural-agent-grpctool-HttpRequest"></a>

### HttpRequest



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [HttpRequest.Header](#plural-agent-grpctool-HttpRequest-Header) |  |  |
| data | [HttpRequest.Data](#plural-agent-grpctool-HttpRequest-Data) |  |  |
| trailer | [HttpRequest.Trailer](#plural-agent-grpctool-HttpRequest-Trailer) |  |  |
| upgradeData | [HttpRequest.UpgradeData](#plural-agent-grpctool-HttpRequest-UpgradeData) |  |  |






<a name="plural-agent-grpctool-HttpRequest-Data"></a>

### HttpRequest.Data
Subsequent messages of the stream.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| data | [bytes](#bytes) |  | A chunk of request body. |






<a name="plural-agent-grpctool-HttpRequest-Header"></a>

### HttpRequest.Header
First message of the stream.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| request | [plural.agent.prototool.HttpRequest](#plural-agent-prototool-HttpRequest) |  |  |
| extra | [google.protobuf.Any](#google-protobuf-Any) |  | Optional extra information about the HTTP request. |
| content_length | [int64](#int64) | optional | content_length contains the size of the expected body (if any) in the request. Possible values are: * -1: if the body size cannot be determined, but there is a body (e.g. chunked) * 0: there is no body in the request * &gt; 0: the actual size of the body in bytes |






<a name="plural-agent-grpctool-HttpRequest-Trailer"></a>

### HttpRequest.Trailer
Last message of the stream if no UpgradeData is sent.






<a name="plural-agent-grpctool-HttpRequest-UpgradeData"></a>

### HttpRequest.UpgradeData
Last message of the stream.
This is to support streaming requests that send an &#34;Upgrade: ...&#34; header.
https://datatracker.ietf.org/doc/html/rfc7230#section-6.7


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| data | [bytes](#bytes) |  | A chunk of upgraded connection data. |






<a name="plural-agent-grpctool-HttpResponse"></a>

### HttpResponse



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| header | [HttpResponse.Header](#plural-agent-grpctool-HttpResponse-Header) |  |  |
| data | [HttpResponse.Data](#plural-agent-grpctool-HttpResponse-Data) |  |  |
| trailer | [HttpResponse.Trailer](#plural-agent-grpctool-HttpResponse-Trailer) |  |  |
| upgradeData | [HttpResponse.UpgradeData](#plural-agent-grpctool-HttpResponse-UpgradeData) |  |  |






<a name="plural-agent-grpctool-HttpResponse-Data"></a>

### HttpResponse.Data
Subsequent messages of the stream.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| data | [bytes](#bytes) |  | A chunk of response body. |






<a name="plural-agent-grpctool-HttpResponse-Header"></a>

### HttpResponse.Header
First message of the stream.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| response | [plural.agent.prototool.HttpResponse](#plural-agent-prototool-HttpResponse) |  |  |






<a name="plural-agent-grpctool-HttpResponse-Trailer"></a>

### HttpResponse.Trailer
Last message of the stream if no UpgradeData is received.






<a name="plural-agent-grpctool-HttpResponse-UpgradeData"></a>

### HttpResponse.UpgradeData
Last message of the stream.
This is to support streaming requests that send an &#34;Upgrade: ...&#34; header.
https://datatracker.ietf.org/doc/html/rfc7230#section-6.7


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| data | [bytes](#bytes) |  | A chunk of upgraded connection data. |





 

 

 

 



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

