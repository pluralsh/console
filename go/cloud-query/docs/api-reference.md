# Cloud-Query API Reference

This document provides a detailed reference for the gRPC API exposed by the Cloud-Query service.

Note: the CloudQuery service requires PostgreSQL-backed features to be enabled. If you start the server with `--database-enabled=false`, the CloudQuery service will not be registered.

## Service Definition

Cloud-Query exposes a gRPC service with three main endpoints for querying, schema retrieval, and data extraction across different cloud providers.

```protobuf
service CloudQuery {
  rpc Query(QueryInput) returns (stream QueryOutput) {}
  rpc Schema(SchemaInput) returns (stream SchemaOutput) {}
  rpc Extract(ExtractInput) returns (stream ExtractOutput) {}
}
```

## Supported Cloud Providers

The service supports the following cloud providers:
- AWS
- Azure
- GCP

## Data Models

### Common Models

#### Connection

The `Connection` message represents a connection to a cloud provider with appropriate credentials.

```protobuf
message Connection {
  string provider = 1;
  oneof credentials {
    AwsCredentials aws = 2;
    AzureCredentials azure = 3;
    GcpCredentials gcp = 4;
  }
}
```

### Provider-specific Credentials

#### AWS Credentials

```protobuf
message AwsCredentials {
  string access_key_id = 1;
  string secret_access_key = 2;
}
```

#### Azure Credentials

```protobuf
message AzureCredentials {
  string subscription_id = 1;
  string tenant_id = 2;
  string client_id = 3;
  string client_secret = 4;
}
```

#### GCP Credentials

```protobuf
message GcpCredentials {
  string impersonation_token = 1;
}
```

## API Endpoints

### Query

The Query method allows you to execute SQL queries against cloud resources.

#### Request: QueryInput

```protobuf
message QueryInput {
  Connection connection = 1;
  string query = 2;
}
```

#### Response: QueryOutput (Streamed)

```protobuf
message QueryOutput {
  repeated string columns = 1;
  map<string, string> result = 2;
}
```

#### Example Usage

Using curl to make a gRPC request (with [grpcurl](https://github.com/fullstorydev/grpcurl)):

```bash
# Using grpcurl to make a Query request
grpcurl -d '{
  "connection": {
    "provider": "aws",
    "aws": {
      "access_key_id": "YOUR_ACCESS_KEY",
      "secret_access_key": "YOUR_SECRET_KEY"
    }
  },
  "query": "SELECT * FROM aws_ec2_instances"
}' -plaintext localhost:9192 cloudquery.CloudQuery/Query
```

Using Postman:

1. Create a new gRPC request
2. Set the server URL to `localhost:9192`
3. Set the service to `cloudquery.CloudQuery`
4. Select the `Query` method
5. Set the request body:

```json
{
  "connection": {
    "provider": "aws",
    "aws": {
      "access_key_id": "YOUR_ACCESS_KEY",
      "secret_access_key": "YOUR_SECRET_KEY"
    }
  },
  "query": "SELECT * FROM aws_ec2_instances"
}
```

### Schema

The Schema method retrieves the schema information for cloud resources.

#### Request: SchemaInput

```protobuf
message SchemaInput {
  Connection connection = 1;
  optional string query = 2;
}
```

#### Response: SchemaOutput (Streamed)

```protobuf
message SchemaColumn {
  string column = 1;
  string type = 2;
}

message SchemaOutput {
  string table = 1;
  repeated SchemaColumn columns = 2;
}
```

#### Example Usage

Using curl (with grpcurl):

```bash
# Using grpcurl to make a Schema request
grpcurl -d '{
  "connection": {
    "provider": "aws",
    "aws": {
      "access_key_id": "YOUR_ACCESS_KEY",
      "secret_access_key": "YOUR_SECRET_KEY"
    }
  },
  "query": "aws_ec2_%"
}' -plaintext localhost:9192 cloudquery.CloudQuery/Schema
```

Using Postman:

1. Create a new gRPC request
2. Set the server URL to `localhost:9192`
3. Set the service to `cloudquery.CloudQuery`
4. Select the `Schema` method
5. Set the request body:

```json
{
  "connection": {
    "provider": "aws",
    "aws": {
      "access_key_id": "YOUR_ACCESS_KEY",
      "secret_access_key": "YOUR_SECRET_KEY"
    }
  },
  "query": "aws_ec2_%"
}
```

### Extract

The Extract method extracts raw data from cloud resources.

#### Request: ExtractInput

```protobuf
message ExtractInput {
  Connection connection = 1;
}
```

#### Response: ExtractOutput (Streamed)

```protobuf
message ExtractOutput {
  string type = 1;
  map<string, string> result = 2;
  string id = 3;
  repeated string links = 4;
}
```

#### Example Usage

Using curl (with grpcurl):

```bash
# Using grpcurl to make an Extract request
grpcurl -d '{
  "connection": {
    "provider": "aws",
    "aws": {
      "access_key_id": "YOUR_ACCESS_KEY",
      "secret_access_key": "YOUR_SECRET_KEY"
    }
  }
}' -plaintext localhost:9192 cloudquery.CloudQuery/Extract
```

Using Postman:

1. Create a new gRPC request
2. Set the server URL to `localhost:9192`
3. Set the service to `cloudquery.CloudQuery`
4. Select the `Extract` method
5. Set the request body:

```json
{
  "connection": {
    "provider": "aws",
    "aws": {
      "access_key_id": "YOUR_ACCESS_KEY",
      "secret_access_key": "YOUR_SECRET_KEY"
    }
  }
}
```

## Error Handling

The Cloud-Query API uses standard gRPC error codes. Based on the server implementation, the following error codes may be returned:

- `INVALID_ARGUMENT`: Returned when the request contains invalid parameters, such as:
  - Invalid or missing provider information
  - Invalid connection configuration
  - Unsupported provider specified

- `INTERNAL`: Returned when there's an internal server error, such as:
  - Failure to connect to the specified provider
  - Database connection issues
  - Execution errors during query processing

- `UNAVAILABLE`: The service is temporarily unavailable (e.g., during server startup or shutdown)

Each error response includes a descriptive message explaining the specific issue encountered.

---

# ToolQuery API Reference

ToolQuery exposes a gRPC service for querying external observability tools (metrics, logs, traces).

## Compatibility Matrix

ToolQuery support varies by operation:

| Tool | Metrics | Logs | Traces | Notes |
|------|---------|------|--------|-------|
| Prometheus | Yes | No | No | Prometheus HTTP API range queries |
| Datadog | Yes | Yes | Yes | Datadog Metrics (v1), Logs (v2), Spans (v2) APIs |
| Elasticsearch | No | Yes | No | Elasticsearch typed Search API with query string |
| Loki | No | Yes | No | Loki HTTP `query_range` API |
| Tempo | No | No | Yes | Tempo HTTP search + trace fetch |

## Client and Endpoint Details

ToolQuery uses the following clients/SDKs and endpoints for each integration:

- Prometheus: `prometheus/client_golang` HTTP API client, `QueryRange` (Prometheus `/api/v1/query_range`). Supports bearer token or basic auth.
- Datadog: `datadog-api-client-go` v2 SDK.
  - Metrics: v1 `QueryMetrics`.
  - Logs: v2 `ListLogs`.
  - Traces: v2 `ListSpans`.
- Elasticsearch: `elastic/go-elasticsearch` v9 typed client, `Search` (Elasticsearch `/_search`) with a `query_string` query and `@timestamp` range filter. Requires API key.
- Loki: REST client to `/loki/api/v1/query_range`, bearer token auth, optional `X-Scope-OrgID` header for tenancy.
- Tempo: REST client to `/api/search` and `/api/traces/{traceID}`, bearer token auth, optional `X-Scope-OrgID` header for tenancy.

## Service Definition

```protobuf
service ToolQuery {
  rpc Metrics(MetricsQueryInput) returns (MetricsQueryOutput) {}
  rpc Logs(LogsQueryInput) returns (LogsQueryOutput) {}
  rpc Traces(TracesQueryInput) returns (TracesQueryOutput) {}
}
```

## Connection Models

```protobuf
message ElasticConnection {
  string url = 1;
  string apiKey = 2;
}

message DatadogConnection {
  optional string site = 1;
  string apiKey = 2;
  string appKey = 3;
}

message PrometheusConnection {
  string url = 1;
  optional string token = 2;
  optional string username = 3;
  optional string password = 4;
}

message LokiConnection {
  string url = 1;
  string token = 3;
  optional string tenant_id = 4;
}

message TempoConnection {
  string url = 1;
  string token = 2;
  optional string tenant_id = 3;
}
```

Implementation notes:

- Datadog requires both `apiKey` and `appKey`. `site` is optional.
- Elasticsearch validates that `apiKey` is set.
- Prometheus requires `url`; bearer token or basic auth are optional.
- Loki and Tempo pass the token as a bearer token when set, and include `tenant_id` as `X-Scope-OrgID` when provided.

## Common Models

```protobuf
message ToolConnection {
  oneof connection {
    ElasticConnection elastic = 1;
    DatadogConnection datadog = 2;
    PrometheusConnection prometheus = 3;
    LokiConnection loki = 4;
    TempoConnection tempo = 5;
  }
}

message TimeRange {
  google.protobuf.Timestamp start = 1;
  google.protobuf.Timestamp end = 2;
}
```

## Metrics

#### Request

```protobuf
message MetricsQueryInput {
  ToolConnection connection = 1;
  string query = 2;
  TimeRange range = 3;
  optional string step = 4;
}
```

#### Response

```protobuf
message MetricPoint {
  google.protobuf.Timestamp timestamp = 1;
  string name = 2;
  double value = 3;
  map<string, string> labels = 4;
}

message MetricsQueryOutput {
  repeated MetricPoint metrics = 1;
}
```

### Prometheus

Request:

```bash
grpcurl -d '{
  "connection": {
    "prometheus": {
      "url": "http://vmauth-vm-auth.monitoring:8427/select/0/prometheus",
      "username": "<USERNAME>",
      "password": "<PASSWORD>"
    }
  },
  "query": "container_memory_working_set_bytes{pod=\"deployment-operator-5f4c46cb48-mfpdv\", container=\"deployment-operator\"}",
  "range": {
    "start": "2026-02-20T11:00:00.000Z",
    "end": "2026-02-20T11:30:00.000Z"
  },
  "step": "10m"
}' -plaintext localhost:9192 toolquery.ToolQuery/Metrics
```

Output:

```json
{
  "metrics": [
    {
      "labels": {
        "metrics_path": "/metrics/cadvisor",
        "node": "ip-10-0-21-32.eu-central-1.compute.internal",
        "eks_amazonaws_com_nodegroup_image": "ami-07491243730c925bb",
        "instance": "ip-10-0-21-32.eu-central-1.compute.internal",
        "topology_kubernetes_io_region": "eu-central-1",
        "job": "kubelet",
        "beta_kubernetes_io_arch": "amd64",
        "node_kubernetes_io_instance_type": "t3.xlarge",
        "prometheus": "monitoring/vmetrics-agent-victoria-metrics-k8s-stack",
        ...
      },
      "timestamp": "2026-02-20T11:00:00.000Z",
      "name": "container_memory_working_set_bytes",
      "value": 267456512
    },
    {
      "labels": {
        "metrics_path": "/metrics/cadvisor",
        "node": "ip-10-0-21-32.eu-central-1.compute.internal",
        "eks_amazonaws_com_nodegroup_image": "ami-07491243730c925bb",
        "instance": "ip-10-0-21-32.eu-central-1.compute.internal",
        "topology_kubernetes_io_region": "eu-central-1",
        "job": "kubelet",
        "beta_kubernetes_io_arch": "amd64",
        "node_kubernetes_io_instance_type": "t3.xlarge",
        "prometheus": "monitoring/vmetrics-agent-victoria-metrics-k8s-stack",
        ...
      },
      "timestamp": "2026-02-20T11:10:00.000Z",
      "name": "container_memory_working_set_bytes",
      "value": 224718848
    },
    {
      "labels": {
        "metrics_path": "/metrics/cadvisor",
        "node": "ip-10-0-21-32.eu-central-1.compute.internal",
        "eks_amazonaws_com_nodegroup_image": "ami-07491243730c925bb",
        "instance": "ip-10-0-21-32.eu-central-1.compute.internal",
        "topology_kubernetes_io_region": "eu-central-1",
        "job": "kubelet",
        "beta_kubernetes_io_arch": "amd64",
        "node_kubernetes_io_instance_type": "t3.xlarge",
        "prometheus": "monitoring/vmetrics-agent-victoria-metrics-k8s-stack",
        ...
      },
      "timestamp": "2026-02-20T11:20:00.000Z",
      "name": "container_memory_working_set_bytes",
      "value": 241414144
    },
    {
      "labels": {
        "metrics_path": "/metrics/cadvisor",
        "node": "ip-10-0-21-32.eu-central-1.compute.internal",
        "eks_amazonaws_com_nodegroup_image": "ami-07491243730c925bb",
        "instance": "ip-10-0-21-32.eu-central-1.compute.internal",
        "topology_kubernetes_io_region": "eu-central-1",
        "job": "kubelet",
        "beta_kubernetes_io_arch": "amd64",
        "node_kubernetes_io_instance_type": "t3.xlarge",
        "prometheus": "monitoring/vmetrics-agent-victoria-metrics-k8s-stack",
        ...
      },
      "timestamp": "2026-02-20T11:30:00.000Z",
      "name": "container_memory_working_set_bytes",
      "value": 296030208
    }
  ]
}
```

### Datadog

Datadog's metrics API does not accept a `step` parameter. Any `step` value provided to ToolQuery is ignored for Datadog requests.

#### Example request

```bash
grpcurl -d '{
  "connection": {
    "datadog": {
      "apiKey": "<API_KEY>",
      "appKey": "<APP_KEY>"
    }
  },
  "query": "system.cpu.idle{*}",
  "range": {
    "start": "2026-02-18T12:07:29.892Z",
    "end": "2026-02-19T12:07:29.892Z"
  }
}' -plaintext localhost:9192 toolquery.ToolQuery/Metrics
```

#### Output

```json
{
  "metrics": [
    {
      "labels": {
        "*": ""
      },
      "timestamp": "2026-02-18T12:10:00.000Z",
      "name": "system.cpu.idle",
      "value": 90.63973502591523
    },
    {
      "labels": {
        "*": ""
      },
      "timestamp": "2026-02-18T12:15:00.000Z",
      "name": "system.cpu.idle",
      "value": 90.97757912691068
    },
    {
      "labels": {
        "*": ""
      },
      "timestamp": "2026-02-18T12:20:00.000Z",
      "name": "system.cpu.idle",
      "value": 90.36301732455806
    },
    {
      "labels": {
        "*": ""
      },
      "timestamp": "2026-02-18T12:25:00.000Z",
      "name": "system.cpu.idle",
      "value": 90.98991169580084
    },
    {
      "labels": {
        "*": ""
      },
      "timestamp": "2026-02-18T12:30:00.000Z",
      "name": "system.cpu.idle",
      "value": 90.1358372557344
    }
  ]
}
```

## Logs

#### Request

```protobuf
message LogsQueryInput {
  ToolConnection connection = 1;
  string query = 2;
  TimeRange range = 3;
  optional int32 limit = 4;
}
```

#### Response

```protobuf
message LogEntry {
  google.protobuf.Timestamp timestamp = 1;
  string message = 2;
  map<string, string> labels = 3;
}

message LogsQueryOutput {
  repeated LogEntry logs = 1;
}
```

### Loki

#### Example request

```bash
grpcurl -d '{
  "connection": {
    "loki": {
      "url": "http://loki.loki:3100",
      "tenant_id": "default"
    }
  },
  "query": "{namespace=\"plrl-deploy-operator\"}",
  "range": {
    "start": "2026-02-20T00:00:00Z",
    "end": "2026-02-20T21:00:00Z"
  },
  "limit": 1
}' -plaintext localhost:9192 toolquery.ToolQuery/Logs
```

#### Output

```json
{
  "logs": [
    {
      "labels": {
        "app_kubernetes_io_name": "deployment-operator",
        "container": "deployment-operator",
        "filename": "/var/log/pods/plrl-deploy-operator_deployment-operator-ddb48bd67-88flh_be6de3a3-bd7a-4009-9df0-bee2a4ee8557/deployment-operator/0.log",
        "namespace": "plrl-deploy-operator",
        "node": "ip-10-0-21-32.eu-central-1.compute.internal",
        "stream": "stderr",
        "app_kubernetes_io_instance": "deploy-operator",
        "detected_level": "unknown",
        "pod": "deployment-operator-ddb48bd67-88flh",
        "pod_template_hash": "ddb48bd67",
        "service_name": "deployment-operator"
      },
      "timestamp": "2026-02-20T15:43:53.007Z",
      "message": "I0220 15:43:53.007458       1 synchronizer.go:319] \"resync complete\" gvr=\"policy/v1, Resource=poddisruptionbudgets\" duration=\"10.02607ms\""
    }
  ]
}
```

### Elasticsearch

#### Example request

```bash
grpcurl -d '{
  "connection": {
    "elastic": {
      "apiKey": "<API_KEY>",
      "url": "http://elasticsearch-es-http.elastic:9200"
    }
  },
  "query": "kubernetes.pod.name:deployment-operator-5f4c46cb48-mfpdv AND (error OR exception)",
  "range": {
    "start": "2026-02-20T10:00:00Z",
    "end": "2026-02-20T12:30:00Z"
  },
  "limit": 100
}' -plaintext localhost:9192 toolquery.ToolQuery/Logs
```

#### Output

```json
{
  "logs": [
    {
      "labels": {
        "agent.name": "ip-10-0-21-32.eu-central-1.compute.internal",
        "agent.version": "8.16.0",
        "kubernetes.pod.name": "deployment-operator-5f4c46cb48-mfpdv",
        "cluster.name": "plrl-dev-aws",
        "agent.type": "filebeat",
        "kubernetes.namespace": "plrl-deploy-operator",
        "kubernetes.container.name": "deployment-operator-agentk",
        "kubernetes.node.name": "ip-10-0-21-32.eu-central-1.compute.internal",
        "host.name": "ip-10-0-21-32.eu-central-1.compute.internal",
        "host.hostname": "ip-10-0-21-32.eu-central-1.compute.internal",
        "host.architecture": "x86_64",
        "cluster.handle": "mgmt"
      },
      "timestamp": "2026-02-20T11:00:32.941Z",
      "message": "{\"level\":\"error\",\"time\":\"2026-02-20T11:00:32.940Z\",\"msg\":\"Error handling a connection\",\"mod_name\":\"reverse_tunnel\",\"error\":\"rpc error: code = Unavailable desc = error reading from server: failed to get reader: failed to read frame header: EOF\"}"
    }
  ]
}
```

### Datadog

#### Example request

```bash
grpcurl -d '{
  "connection": {
    "datadog": {
      "apiKey": "<API_KEY>",
      "appKey": "<APP_KEY>"
    }
  },
  "query": "service:plrl-deploy-operator",
  "range": {
    "start": "2026-02-19T12:07:29.892Z",
    "end": "2026-02-19T19:07:29.892Z"
  },
  "limit": 1
}' -plaintext localhost:9192 toolquery.ToolQuery/Logs
```

#### Output

```json
{
  "logs": [
    {
      "labels": {
        "datadog.submission_auth": "api_key",
        "image_tag": "sha-c152379",
        "kube_distribution": "eks",
        "filename": "0.log",
        "kube_container_name": "deployment-operator",
        "kube_deployment": "deployment-operator",
        "kube_ownerref_name": "deployment-operator-7c8c589d48",
        "git.repository_url": "https://github.com/pluralsh/deployment-operator",
        "kube_app_instance": "deploy-operator",
        "pod_name": "deployment-operator-7c8c589d48-vr4dj",
        "pod_phase": "running",
        "image_id": "ghcr.io/pluralsh/deployment-operator@sha256:5b4a3e92e07d8703367218364d5ffd8718440ae2994ecb1c49af4921f30cd98a",
        "image_name": "ghcr.io/pluralsh/deployment-operator",
        "kube_namespace": "plrl-deploy-operator",
        "kube_ownerref_kind": "replicaset",
        "kube_replica_set": "deployment-operator-7c8c589d48",
        "service": "plrl-deploy-operator",
        "short_image": "deployment-operator",
        "display_container_name": "deployment-operator_deployment-operator-7c8c589d48-vr4dj",
        "env": "plrl-dev-aws",
        "kube_qos": "burstable",
        "status": "error",
        "cluster_name": "plrl-dev-aws",
        "container_name": "deployment-operator",
        "dirname": "/var/log/pods/plrl-deploy-operator_deployment-operator-7c8c589d48-vr4dj_d302f6da-02ed-4d1f-8eea-4494b14558c6/deployment-operator",
        "kube_app_name": "deployment-operator",
        "kube_cluster_name": "plrl-dev-aws",
        "source": "go"
      },
      "timestamp": "2026-02-19T19:07:28.388Z",
      "message": "I0219 19:07:27.934241       1 synchronizer.go:319] \"resync complete\" gvr=\"platform.plural.sh/v1alpha1, Resource=licenses\" duration=\"7.451927ms\""
    }
  ]
}
```

## Traces

#### Request

```protobuf
message TracesQueryInput {
  ToolConnection connection = 1;
  string query = 2;
  TimeRange range = 3;
  optional int32 limit = 4;
}
```

#### Response

```protobuf
message TraceSpan {
  string trace_id = 1;
  string span_id = 2;
  string parent_id = 3;
  string name = 4;
  string service = 5;
  google.protobuf.Timestamp start = 6;
  google.protobuf.Timestamp end = 7;
  map<string, string> tags = 8;
}

message TracesQueryOutput {
  repeated TraceSpan spans = 1;
}
```

### Tempo

#### Limit Semantics

- `limit` applies to the Tempo search results (number of trace IDs returned), not to the number of spans.
- Cloud-Query fetches each trace by ID and returns **all** spans for each trace, so a single trace can produce many spans even when `limit=1`.
- There is no minimum enforced beyond `limit > 0`.

#### Example request

```bash
grpcurl -d '{
  "connection": {
    "tempo": {
      "url": "http://tempo.tempo:3200",
      "token": "<OPTIONAL_TOKEN>",
      "tenant_id": "<OPTIONAL_TENANT_ID>"
    }
  },
  "query": "{resource.service.name=\"frontend\"}",
  "range": {
      "start": "2026-02-20T00:00:00Z",
      "end": "2026-02-20T21:00:00Z"
  },
  "limit": 20
}' -plaintext localhost:9192 toolquery.ToolQuery/Traces
```

#### Output

```json
{
  "spans": [
    {
      "tags": {
        "rpc.method": "GetProduct",
        "rpc.service": "oteldemo.ProductCatalogService",
        "net.peer.name": "product-catalog",
        "net.peer.port": "8080",
        "rpc.grpc.status_code": "0",
        "rpc.system": "grpc"
      },
      "trace_id": "ABai2V4/Y9GC2/kagvFfow==",
      "span_id": "xMZYf8yrA1o=",
      "parent_id": "XkHiraV2nDk=",
      "name": "grpc.oteldemo.ProductCatalogService/GetProduct",
      "service": "frontend",
      "start": "2026-02-20T14:43:28.095Z",
      "end": "2026-02-20T14:43:28.099Z"
    }
  ]
}
```

### Datadog

#### Example request

```bash
grpcurl -d '{
  "connection": {
    "datadog": {
      "apiKey": "<API_KEY>",
      "appKey": "<APP_KEY>"
    }
  },
  "query": "*",
  "range": {
    "start": "2026-02-18T12:07:29.892Z",
    "end": "2026-02-19T12:07:29.892Z"
  },
  "limit": 1
}' -plaintext localhost:9192 toolquery.ToolQuery/Traces
```

#### Output

```json
{
  "spans": [
    {
      "tags": {
        "kube_namespace": "plrl-deploy-operator",
        "kube_ownerref_name": "deployment-operator-d8cbc89b5",
        "ingestion_reason": "auto",
        "pod_name": "deployment-operator-d8cbc89b5-lfd25",
        "kube_container_name": "deployment-operator",
        "kube_app_instance": "deploy-operator",
        "cluster_name": "plrl-dev-aws",
        "kube_node": "ip-10-0-21-32.eu-central-1.compute.internal",
        "kube_replica_set": "deployment-operator-d8cbc89b5",
        "kube_qos": "burstable",
        "kube_distribution": "eks",
        "container_name": "deployment-operator",
        "kube_deployment": "deployment-operator",
        "pod_phase": "running",
        "kube_app_name": "deployment-operator",
        "short_image": "deployment-operator",
        "env": "plrl-dev-aws",
        "kube_cluster_name": "plrl-dev-aws",
        "display_container_name": "deployment-operator_deployment-operator-d8cbc89b5-lfd25",
        "image_tag": "sha-b50f5db",
        "container_id": "0d3ea8788d1797977a8d916607084aebdae3b3c149819fcf969016b557be9a79",
        "resource": "ExpireOlderThan",
        "git.repository_url": "https://github.com/pluralsh/deployment-operator",
        "source": "apm",
        "image_name": "ghcr.io/pluralsh/deployment-operator",
        "git.commit.sha": "b50f5db02ca728311d5786d10d708fdd9440f313",
        "kube_ownerref_kind": "replicaset",
        "image_id": "ghcr.io/pluralsh/deployment-operator@sha256:f6c360c6e92a222f6491b0c2ef12ea73ba2c5cfa052435b512c028f6998116f6",
        "orch_cluster_id": "82218f51-ac4f-40cf-9de0-7d93abad98b7"
      },
      "trace_id": "6995ab82000000005195073c70013f33",
      "span_id": "5878612844760612659",
      "parent_id": "0",
      "name": "ExpireOlderThan",
      "service": "deployment-operator",
      "start": "2026-02-18T12:07:30.533Z",
      "end": "2026-02-18T12:07:30.533Z"
    }
  ]
}
```
