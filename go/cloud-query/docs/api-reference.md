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
  string site = 1;
  string apiKey = 2;
  optional string appKey = 3;
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

#### Example (Prometheus)

```bash
grpcurl -d '{
  "connection": {
    "prometheus": {
      "url": "http://prometheus:9090",
      "token": "YOUR_TOKEN"
    }
  },
  "query": "rate(http_requests_total[5m])",
  "range": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-01T01:00:00Z"
  },
  "step": "30s"
}' -plaintext localhost:9192 toolquery.ToolQuery/Metrics
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

#### Example (Loki)

```bash
grpcurl -d '{
  "connection": {
    "loki": {
      "url": "http://loki:3100",
      "token": "YOUR_TOKEN",
      "tenant_id": "tenant-a"
    }
  },
  "query": "{app=\"api\"} |= \"error\"",
  "range": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-01T01:00:00Z"
  },
  "limit": 100
}' -plaintext localhost:9192 toolquery.ToolQuery/Logs
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

#### Example (Tempo)

```bash
grpcurl -d '{
  "connection": {
    "tempo": {
      "url": "http://tempo:3200",
      "token": "YOUR_TOKEN",
      "tenant_id": "tenant-a"
    }
  },
  "query": "{service.name=\"api\"}",
  "range": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-01T01:00:00Z"
  },
  "limit": 20
}' -plaintext localhost:9192 toolquery.ToolQuery/Traces
```
