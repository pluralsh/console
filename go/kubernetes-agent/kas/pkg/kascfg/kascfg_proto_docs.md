# Protocol Documentation
<a name="top"></a>

## Table of Contents

- [pkg/kascfg/kascfg.proto](#pkg_kascfg_kascfg-proto)
    - [AgentCF](#plural-agent-kascfg-AgentCF)
    - [AgentConfigurationCF](#plural-agent-kascfg-AgentConfigurationCF)
    - [ApiCF](#plural-agent-kascfg-ApiCF)
    - [ConfigurationFile](#plural-agent-kascfg-ConfigurationFile)
    - [GoogleProfilerCF](#plural-agent-kascfg-GoogleProfilerCF)
    - [KubernetesApiCF](#plural-agent-kascfg-KubernetesApiCF)
    - [ListenAgentCF](#plural-agent-kascfg-ListenAgentCF)
    - [ListenApiCF](#plural-agent-kascfg-ListenApiCF)
    - [ListenKubernetesApiCF](#plural-agent-kascfg-ListenKubernetesApiCF)
    - [ListenPrivateApiCF](#plural-agent-kascfg-ListenPrivateApiCF)
    - [LivenessProbeCF](#plural-agent-kascfg-LivenessProbeCF)
    - [LoggingCF](#plural-agent-kascfg-LoggingCF)
    - [ObservabilityCF](#plural-agent-kascfg-ObservabilityCF)
    - [ObservabilityListenCF](#plural-agent-kascfg-ObservabilityListenCF)
    - [PrivateApiCF](#plural-agent-kascfg-PrivateApiCF)
    - [PrometheusCF](#plural-agent-kascfg-PrometheusCF)
    - [ReadinessProbeCF](#plural-agent-kascfg-ReadinessProbeCF)
    - [RedisCF](#plural-agent-kascfg-RedisCF)
    - [RedisSentinelCF](#plural-agent-kascfg-RedisSentinelCF)
    - [RedisServerCF](#plural-agent-kascfg-RedisServerCF)
    - [RedisTLSCF](#plural-agent-kascfg-RedisTLSCF)
    - [SentryCF](#plural-agent-kascfg-SentryCF)
    - [TokenBucketRateLimitCF](#plural-agent-kascfg-TokenBucketRateLimitCF)
    - [TracingCF](#plural-agent-kascfg-TracingCF)
  
    - [log_level_enum](#plural-agent-kascfg-log_level_enum)
  
- [Scalar Value Types](#scalar-value-types)



<a name="pkg_kascfg_kascfg-proto"></a>
<p align="right"><a href="#top">Top</a></p>

## pkg/kascfg/kascfg.proto



<a name="plural-agent-kascfg-AgentCF"></a>

### AgentCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| listen | [ListenAgentCF](#plural-agent-kascfg-ListenAgentCF) |  | RPC listener configuration for agentk connections. |
| configuration | [AgentConfigurationCF](#plural-agent-kascfg-AgentConfigurationCF) |  | Configuration for agent&#39;s configuration repository. |
| info_cache_ttl | [google.protobuf.Duration](#google-protobuf-Duration) |  | TTL for successful agent info lookups. /api/v4/internal/kubernetes/agent_info Set to zero to disable. |
| info_cache_error_ttl | [google.protobuf.Duration](#google-protobuf-Duration) |  | TTL for failed agent info lookups. /api/v4/internal/kubernetes/agent_info |
| redis_conn_info_ttl | [google.protobuf.Duration](#google-protobuf-Duration) |  | TTL for information about connected agents, stored in Redis. |
| redis_conn_info_refresh | [google.protobuf.Duration](#google-protobuf-Duration) |  | Refresh period for information about connected agents, stored in Redis. |
| redis_conn_info_gc | [google.protobuf.Duration](#google-protobuf-Duration) |  | Garbage collection period for information about connected agents, stored in Redis. If gitlab-kas crashes, another gitlab-kas instance will clean up stale data. This is how often this cleanup runs. |
| kubernetes_api | [KubernetesApiCF](#plural-agent-kascfg-KubernetesApiCF) |  | Configuration for exposing Kubernetes API. |






<a name="plural-agent-kascfg-AgentConfigurationCF"></a>

### AgentConfigurationCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| poll_period | [google.protobuf.Duration](#google-protobuf-Duration) |  | How often to poll agent&#39;s configuration repository for changes. |
| max_configuration_file_size | [uint32](#uint32) |  | Maximum file size of the agent configuration file. |






<a name="plural-agent-kascfg-ApiCF"></a>

### ApiCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| listen | [ListenApiCF](#plural-agent-kascfg-ListenApiCF) |  | RPC listener configuration for API connections. |






<a name="plural-agent-kascfg-ConfigurationFile"></a>

### ConfigurationFile
ConfigurationFile represents kas configuration file.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| agent | [AgentCF](#plural-agent-kascfg-AgentCF) |  | Configuration related to the agent. Generally all configuration for user-facing features should be here. |
| observability | [ObservabilityCF](#plural-agent-kascfg-ObservabilityCF) |  | Configuration related to all things observability: metrics, tracing, monitoring, logging, usage metrics, profiling. |
| redis | [RedisCF](#plural-agent-kascfg-RedisCF) |  | Redis configurations available to kas. |
| api | [ApiCF](#plural-agent-kascfg-ApiCF) |  | Public API. |
| private_api | [PrivateApiCF](#plural-agent-kascfg-PrivateApiCF) |  | Private API for kas-&gt;kas communication. |
| plural_url | [string](#string) |  | Plural URL address |






<a name="plural-agent-kascfg-GoogleProfilerCF"></a>

### GoogleProfilerCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| enabled | [bool](#bool) |  |  |
| project_id | [string](#string) |  |  |
| credentials_file | [string](#string) |  |  |
| debug_logging | [bool](#bool) |  |  |






<a name="plural-agent-kascfg-KubernetesApiCF"></a>

### KubernetesApiCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| listen | [ListenKubernetesApiCF](#plural-agent-kascfg-ListenKubernetesApiCF) |  | HTTP listener configuration for Kubernetes API connections. |
| url_path_prefix | [string](#string) |  | URL path prefix to remove from the incoming request URL. Should be `/` if no prefix trimming is needed. |
| allowed_agent_cache_ttl | [google.protobuf.Duration](#google-protobuf-Duration) |  | TTL for successful allowed agent lookups. /api/v4/job/allowed_agents Set to zero to disable. |
| allowed_agent_cache_error_ttl | [google.protobuf.Duration](#google-protobuf-Duration) |  | TTL for failed allowed agent lookups. /api/v4/job/allowed_agents |






<a name="plural-agent-kascfg-ListenAgentCF"></a>

### ListenAgentCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| network | [string](#string) | optional | Network type to listen on. Supported values: tcp, tcp4, tcp6, unix. |
| address | [string](#string) |  | Address to listen on. |
| websocket | [bool](#bool) |  | Enable &#34;gRPC through WebSocket&#34; listening mode. Rather than expecting gRPC directly, expect a WebSocket connection, from which a gRPC stream is then unpacked. |
| certificate_file | [string](#string) |  | X.509 certificate for TLS in PEM format. TLS is enabled iff both certificate_file and key_file are provided. |
| key_file | [string](#string) |  | X.509 key file for TLS in PEM format. TLS is enabled iff both certificate_file and key_file are provided. |
| connections_per_token_per_minute | [uint32](#uint32) |  | Maximum number of connections to allow per agent token per minute. |
| max_connection_age | [google.protobuf.Duration](#google-protobuf-Duration) |  | Max age of a connection. Connection is closed gracefully once it&#39;s too old and there is no streaming happening. |
| listen_grace_period | [google.protobuf.Duration](#google-protobuf-Duration) |  | How much time to wait before stopping accepting new connections on shutdown. |






<a name="plural-agent-kascfg-ListenApiCF"></a>

### ListenApiCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| network | [string](#string) | optional | Network type to listen on. Supported values: tcp, tcp4, tcp6, unix. |
| address | [string](#string) |  | Address to listen on. |
| authentication_secret_file | [string](#string) |  | Secret to verify JWT tokens. |
| certificate_file | [string](#string) |  | X.509 certificate for TLS in PEM format. TLS is enabled iff both certificate_file and key_file are provided. |
| key_file | [string](#string) |  | X.509 key file for TLS in PEM format. TLS is enabled iff both certificate_file and key_file are provided. |
| max_connection_age | [google.protobuf.Duration](#google-protobuf-Duration) |  | Max age of a connection. Connection is closed gracefully once it&#39;s too old and there is no streaming happening. |
| listen_grace_period | [google.protobuf.Duration](#google-protobuf-Duration) |  | How much time to wait before stopping accepting new connections on shutdown. |






<a name="plural-agent-kascfg-ListenKubernetesApiCF"></a>

### ListenKubernetesApiCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| network | [string](#string) | optional | Network type to listen on. Supported values: tcp, tcp4, tcp6, unix. |
| address | [string](#string) |  | Address to listen on. |
| certificate_file | [string](#string) |  | X.509 certificate for TLS in PEM format. TLS is enabled iff both certificate_file and key_file are provided. |
| key_file | [string](#string) |  | X.509 key file for TLS in PEM format. TLS is enabled iff both certificate_file and key_file are provided. |
| listen_grace_period | [google.protobuf.Duration](#google-protobuf-Duration) |  | How much time to wait before stopping accepting new connections on shutdown. |
| shutdown_grace_period | [google.protobuf.Duration](#google-protobuf-Duration) |  | How much time to wait before closing connections with in-flight requests. |






<a name="plural-agent-kascfg-ListenPrivateApiCF"></a>

### ListenPrivateApiCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| network | [string](#string) | optional | Network type to listen on. Supported values: tcp, tcp4, tcp6, unix. |
| address | [string](#string) |  | Address to listen on. |
| authentication_secret_file | [string](#string) |  | Secret to verify JWT tokens. |
| certificate_file | [string](#string) |  | X.509 certificate for TLS in PEM format. TLS is enabled iff both certificate_file and key_file are provided. |
| key_file | [string](#string) |  | X.509 key file for TLS in PEM format. TLS is enabled iff both certificate_file and key_file are provided. |
| max_connection_age | [google.protobuf.Duration](#google-protobuf-Duration) |  | Max age of a connection. Connection is closed gracefully once it&#39;s too old and there is no streaming happening. |
| ca_certificate_file | [string](#string) |  | Optional X.509 CA certificate for TLS in PEM format. Should be set for self-signed certificates. |
| listen_grace_period | [google.protobuf.Duration](#google-protobuf-Duration) |  | How much time to wait before stopping accepting new connections on shutdown. |






<a name="plural-agent-kascfg-LivenessProbeCF"></a>

### LivenessProbeCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| url_path | [string](#string) |  | Expected URL path for requests. |






<a name="plural-agent-kascfg-LoggingCF"></a>

### LoggingCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| level | [log_level_enum](#plural-agent-kascfg-log_level_enum) |  |  |
| grpc_level | [log_level_enum](#plural-agent-kascfg-log_level_enum) | optional | optional to be able to tell when not set and use a different default value. |






<a name="plural-agent-kascfg-ObservabilityCF"></a>

### ObservabilityCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| usage_reporting_period | [google.protobuf.Duration](#google-protobuf-Duration) |  | How often to send usage metrics to the main application. /api/v4/internal/kubernetes/usage_ping Set to zero to disable. |
| listen | [ObservabilityListenCF](#plural-agent-kascfg-ObservabilityListenCF) |  | Listener configuration for HTTP endpoint that exposes Prometheus, pprof, liveness and readiness probes. |
| prometheus | [PrometheusCF](#plural-agent-kascfg-PrometheusCF) |  |  |
| tracing | [TracingCF](#plural-agent-kascfg-TracingCF) |  |  |
| sentry | [SentryCF](#plural-agent-kascfg-SentryCF) |  |  |
| logging | [LoggingCF](#plural-agent-kascfg-LoggingCF) |  |  |
| google_profiler | [GoogleProfilerCF](#plural-agent-kascfg-GoogleProfilerCF) |  | Configuration for the Google Cloud Profiler. See https://pkg.go.dev/cloud.google.com/go/profiler. |
| liveness_probe | [LivenessProbeCF](#plural-agent-kascfg-LivenessProbeCF) |  |  |
| readiness_probe | [ReadinessProbeCF](#plural-agent-kascfg-ReadinessProbeCF) |  |  |






<a name="plural-agent-kascfg-ObservabilityListenCF"></a>

### ObservabilityListenCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| network | [string](#string) | optional | Network type to listen on. Supported values: tcp, tcp4, tcp6, unix. |
| address | [string](#string) |  | Address to listen on. |
| certificate_file | [string](#string) | optional | X.509 certificate for TLS in PEM format. TLS is enabled iff both certificate_file and key_file are provided. |
| key_file | [string](#string) | optional | X.509 key file for TLS in PEM format. TLS is enabled iff both certificate_file and key_file are provided. |






<a name="plural-agent-kascfg-PrivateApiCF"></a>

### PrivateApiCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| listen | [ListenPrivateApiCF](#plural-agent-kascfg-ListenPrivateApiCF) |  | RPC listener configuration for API connections. |






<a name="plural-agent-kascfg-PrometheusCF"></a>

### PrometheusCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| url_path | [string](#string) |  | Expected URL path for requests. |






<a name="plural-agent-kascfg-ReadinessProbeCF"></a>

### ReadinessProbeCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| url_path | [string](#string) |  | Expected URL path for requests. |






<a name="plural-agent-kascfg-RedisCF"></a>

### RedisCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| server | [RedisServerCF](#plural-agent-kascfg-RedisServerCF) |  | Single-server Redis. |
| sentinel | [RedisSentinelCF](#plural-agent-kascfg-RedisSentinelCF) |  | Redis with Sentinel setup. See http://redis.io/topics/sentinel. |
| pool_size | [uint32](#uint32) |  | The max number of connections. DEPRECATED, unused. |
| dial_timeout | [google.protobuf.Duration](#google-protobuf-Duration) |  | Dial timeout. |
| read_timeout | [google.protobuf.Duration](#google-protobuf-Duration) |  | Read timeout. DEPRECATED, unused. |
| write_timeout | [google.protobuf.Duration](#google-protobuf-Duration) |  | Write timeout. |
| idle_timeout | [google.protobuf.Duration](#google-protobuf-Duration) |  | How long to keep TCP connections alive before closing. DEPRECATED, unused. |
| key_prefix | [string](#string) |  | Key prefix for everything gitlab-kas stores in Redis. |
| username | [string](#string) |  | Use the specified Username to authenticate the current connection with one of the connections defined in the ACL list when connecting to a Redis 6.0 instance, or greater, that is using the Redis ACL system. |
| password_file | [string](#string) |  | Optional password. Must match the password specified in the requirepass server configuration option (if connecting to a Redis 5.0 instance, or lower), or the User Password when connecting to a Redis 6.0 instance, or greater, that is using the Redis ACL system. |
| network | [string](#string) |  | The network type, either tcp or unix. Default is tcp. |
| tls | [RedisTLSCF](#plural-agent-kascfg-RedisTLSCF) |  |  |
| database_index | [int32](#int32) |  | The logical zero-based numeric database index. |






<a name="plural-agent-kascfg-RedisSentinelCF"></a>

### RedisSentinelCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| master_name | [string](#string) |  | The name of the sentinel master. |
| addresses | [string](#string) | repeated | The host:port addresses of the sentinels. |
| sentinel_password_file | [string](#string) |  | Sentinel password from &#34;requirepass &lt;password&gt;&#34; (if enabled) in Sentinel configuration |






<a name="plural-agent-kascfg-RedisServerCF"></a>

### RedisServerCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| address | [string](#string) |  | The host:port address of the node. |






<a name="plural-agent-kascfg-RedisTLSCF"></a>

### RedisTLSCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| enabled | [bool](#bool) |  | If true, uses TLS for the redis connection (only available if network is &#34;tcp&#34;) |
| certificate_file | [string](#string) |  | For mutual TLS, specify both certificate_file and key_file; otherwise, specify neither Optional custom X.509 certificate file for TLS in PEM format |
| key_file | [string](#string) |  | Optional custom X.509 key file for TLS in PEM format |
| ca_certificate_file | [string](#string) |  | Optional custom X.509 root CA file in PEM format, used to validate the Redis server&#39;s certificate (e.g. if the server has a self-signed certificate) |






<a name="plural-agent-kascfg-SentryCF"></a>

### SentryCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| dsn | [string](#string) |  | Sentry DSN https://docs.sentry.io/platforms/go/#configure |
| environment | [string](#string) |  | Sentry environment https://docs.sentry.io/product/sentry-basics/environments/ |






<a name="plural-agent-kascfg-TokenBucketRateLimitCF"></a>

### TokenBucketRateLimitCF
See https://pkg.go.dev/golang.org/x/time/rate#Limiter.


| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| refill_rate_per_second | [double](#double) |  | Number of events per second. A zero allows no events. How fast the &#34;token bucket&#34; is refilled. |
| bucket_size | [uint32](#uint32) |  | Maximum number of events that are allowed to happen in succession. Size of the &#34;token bucket&#34;. |






<a name="plural-agent-kascfg-TracingCF"></a>

### TracingCF



| Field | Type | Label | Description |
| ----- | ---- | ----- | ----------- |
| otlp_endpoint | [string](#string) |  | URL to send traces to. Supported protocols are: http, https. Traces are protobuf encoded. Example: https://localhost:4317/traces/foo/bar |
| otlp_token_secret_file | [string](#string) | optional | API token to set for authentication. |
| otlp_ca_certificate_file | [string](#string) | optional | Custom CA certificate to use in order to verify the connection to OTLP collector |





 


<a name="plural-agent-kascfg-log_level_enum"></a>

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

