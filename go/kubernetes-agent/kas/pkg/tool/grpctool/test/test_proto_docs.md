# Protocol Documentation
<a name="top"></a>

## Table of Contents

- [pkg/tool/grpctool/test/test.proto](#pkg_tool_grpctool_test_test-proto)
    - [NoOneofs](#plural-agent-grpctool-test-NoOneofs)
    - [NotAllReachable](#plural-agent-grpctool-test-NotAllReachable)
    - [OutOfOneof](#plural-agent-grpctool-test-OutOfOneof)
    - [Request](#plural-agent-grpctool-test-Request)
    - [Response](#plural-agent-grpctool-test-Response)
    - [Response.Data](#plural-agent-grpctool-test-Response-Data)
    - [Response.Last](#plural-agent-grpctool-test-Response-Last)
    - [TwoOneofs](#plural-agent-grpctool-test-TwoOneofs)
    - [TwoValidOneofs](#plural-agent-grpctool-test-TwoValidOneofs)
  
    - [enum1](#plural-agent-grpctool-test-enum1)
  
    - [Testing](#plural-agent-grpctool-test-Testing)
  
- [Scalar Value Types](#scalar-value-types)



<a name="pkg_tool_grpctool_test_test-proto"></a>
<p align="right"><a href="#top">Top</a></p>

## pkg/tool/grpctool/test/test.proto



<a name="plural-agent-grpctool-test-NoOneofs"></a>

### NoOneofs







<a name="plural-agent-grpctool-test-NotAllReachable"></a>

### NotAllReachable



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| m1 | [int32](#int32) |  |  |
| m2 | [int32](#int32) |  |  |
| m3 | [int32](#int32) |  |  |






<a name="plural-agent-grpctool-test-OutOfOneof"></a>

### OutOfOneof



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| x | [int32](#int32) |  |  |
| m1 | [int32](#int32) |  |  |
| m2 | [int32](#int32) |  |  |






<a name="plural-agent-grpctool-test-Request"></a>

### Request



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| s1 | [string](#string) |  |  |






<a name="plural-agent-grpctool-test-Response"></a>

### Response



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| scalar | [int64](#int64) |  |  |
| x1 | [enum1](#plural-agent-grpctool-test-enum1) |  |  |
| data | [Response.Data](#plural-agent-grpctool-test-Response-Data) |  |  |
| last | [Response.Last](#plural-agent-grpctool-test-Response-Last) |  |  |






<a name="plural-agent-grpctool-test-Response-Data"></a>

### Response.Data
Subsequent messages of the stream.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| data | [bytes](#bytes) |  |  |






<a name="plural-agent-grpctool-test-Response-Last"></a>

### Response.Last
Last message of the stream.






<a name="plural-agent-grpctool-test-TwoOneofs"></a>

### TwoOneofs



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| m11 | [int32](#int32) |  |  |
| m12 | [int32](#int32) |  |  |
| m21 | [int32](#int32) |  |  |
| m22 | [int32](#int32) |  |  |






<a name="plural-agent-grpctool-test-TwoValidOneofs"></a>

### TwoValidOneofs



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| m11 | [int32](#int32) |  |  |
| m12 | [int32](#int32) |  |  |
| m21 | [int32](#int32) |  |  |
| m22 | [int32](#int32) |  |  |





 


<a name="plural-agent-grpctool-test-enum1"></a>

### enum1


| Name | Number | Description |
| ---- | ------ | ----------- |
| v1 | 0 |  |
| v2 | 1 |  |


 

 


<a name="plural-agent-grpctool-test-Testing"></a>

### Testing


| Method Name | Request Type | Response Type | Description |
| ----------- | ------------ | ------------- | ------------|
| RequestResponse | [Request](#plural-agent-grpctool-test-Request) | [Response](#plural-agent-grpctool-test-Response) |  |
| StreamingRequestResponse | [Request](#plural-agent-grpctool-test-Request) stream | [Response](#plural-agent-grpctool-test-Response) stream |  |

 



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

