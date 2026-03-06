# Protocol Documentation
<a name="top"></a>

## Table of Contents

- [pkg/tool/prototool/prototool.proto](#pkg_tool_prototool_prototool-proto)
    - [HttpRequest](#plural-agent-prototool-HttpRequest)
    - [HttpRequest.HeaderEntry](#plural-agent-prototool-HttpRequest-HeaderEntry)
    - [HttpRequest.QueryEntry](#plural-agent-prototool-HttpRequest-QueryEntry)
    - [HttpResponse](#plural-agent-prototool-HttpResponse)
    - [HttpResponse.HeaderEntry](#plural-agent-prototool-HttpResponse-HeaderEntry)
    - [Values](#plural-agent-prototool-Values)
  
- [Scalar Value Types](#scalar-value-types)



<a name="pkg_tool_prototool_prototool-proto"></a>
<p align="right"><a href="#top">Top</a></p>

## pkg/tool/prototool/prototool.proto



<a name="plural-agent-prototool-HttpRequest"></a>

### HttpRequest



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| method | [string](#string) |  | HTTP method. |
| header | [HttpRequest.HeaderEntry](#plural-agent-prototool-HttpRequest-HeaderEntry) | repeated | HTTP header. |
| url_path | [string](#string) |  | URL path. Should start with a slash. |
| query | [HttpRequest.QueryEntry](#plural-agent-prototool-HttpRequest-QueryEntry) | repeated | query is the URL query part without the leading question mark. |






<a name="plural-agent-prototool-HttpRequest-HeaderEntry"></a>

### HttpRequest.HeaderEntry



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| key | [string](#string) |  |  |
| value | [Values](#plural-agent-prototool-Values) |  |  |






<a name="plural-agent-prototool-HttpRequest-QueryEntry"></a>

### HttpRequest.QueryEntry



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| key | [string](#string) |  |  |
| value | [Values](#plural-agent-prototool-Values) |  |  |






<a name="plural-agent-prototool-HttpResponse"></a>

### HttpResponse



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| status_code | [int32](#int32) |  | HTTP status code. |
| status | [string](#string) |  | HTTP status message. |
| header | [HttpResponse.HeaderEntry](#plural-agent-prototool-HttpResponse-HeaderEntry) | repeated | HTTP header. |






<a name="plural-agent-prototool-HttpResponse-HeaderEntry"></a>

### HttpResponse.HeaderEntry



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| key | [string](#string) |  |  |
| value | [Values](#plural-agent-prototool-Values) |  |  |






<a name="plural-agent-prototool-Values"></a>

### Values



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| value | [string](#string) | repeated |  |





 

 

 

 



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

