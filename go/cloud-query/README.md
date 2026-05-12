# Cloud Query

Cloud Query is a service part of the Plural Console ecosystem that provides cloud resource querying capabilities. It uses an embedded PostgreSQL database to cache and process data about cloud resources.

## Features

- Query cloud resources across multiple providers
- Embedded PostgreSQL database for data storage and retrieval through PostgreSQL FDW steampipe extension
- gRPC API for integration with other services
- Containerized deployment for easy scaling

## Prerequisites

- Go 1.24.2 or higher
- Docker (for containerized deployment)
- Make

## Getting Started

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/pluralsh/console.git
cd console/go/cloud-query
```

2. Build the binary:
```bash
make build
```

This will create the binary in the `bin` directory.

3. Run the server locally:
```bash
./bin/cloud-query
```

### Docker Deployment

1. Build the Docker image:
```bash
make image
```

2. Run the container:
```bash
make run
```

Or manually:
```bash
docker run --rm -p 9192:9192 cloud-query:latest
```

## Configuration

The service can be configured using command-line flags or environment variables.

For a comprehensive list of all available command-line arguments, their default values, and usage examples, see the [Command-Line Arguments Reference](docs/command-line-args.md).

## API Reference

Cloud-Query exposes a gRPC API for querying cloud resources. Client implementations can use this API to retrieve information about cloud resources across different providers.

For detailed information about the API endpoints, request/response schemas, and usage examples, see the [API Reference Documentation](docs/api-reference.md).

## Tool Integrations (ToolQuery)

Cloud-Query also exposes ToolQuery gRPC endpoints for observability tools (metrics, logs, traces). Compatibility is per operation:

| Tool | Metrics | Logs | Traces | Notes                                                                                                |
|------|---------|------|--------|------------------------------------------------------------------------------------------------------|
| Prometheus | Yes | No | No | Prometheus HTTP API via `prometheus/client_golang` with optional bearer token or basic auth          |
| Datadog | Yes | Yes | Yes | Datadog API v1/v2 via `datadog-api-client-go` (requires API key + app key; site optional)            |
| Elasticsearch | No | Yes | No | Elasticsearch typed client v9 Search API (API key required)                                          |
| Loki | No | Yes | No | REST client to `/loki/api/v1/query_range` (bearer token; optional `X-Scope-OrgID`)                   |
| Splunk | No | Yes | No | Splunk export search API (token or basic auth)                                                       |
| Tempo | No | No | Yes | REST client to `/api/search` and `/api/traces/{traceID}` (bearer token; optional `X-Scope-OrgID`)    |
| Jaeger | No | No | Yes | Jaeger Query v3 REST API (`GET /api/v3/traces`) with structured trace filters                        |
| Dynatrace | Yes | Yes | Yes | Dynatrace Grail Query API (DQL via `/platform/storage/query/v1/query:*`, bearer token required)      |
| CloudWatch | Yes | Yes | No | AWS SDK v2 (`GetMetricData`, Logs Insights `StartQuery`/`GetQueryResults`) with optional assume-role |
| Azure | Yes | Yes | No | Azure Monitor Go SDK with Azure AD client credentials                                                |

### Tool Provider Credentials and Permissions

- `Dynatrace`:
  - Use a Dynatrace Platform token (`platformToken`).
  - Required scopes:
    - `storage:logs:read`
    - `storage:metrics:read`
    - `storage:spans:read`
    - `storage:entities:read`
    - `storage:buckets:read`
- `Datadog`:
  - Requires `apiKey` and `appKey` for ToolQuery operations.
- `Elasticsearch`:
  - Requires URL + username/password + index.
- `Prometheus` / `Loki` / `Tempo`:
  - Use bearer token and/or basic auth credentials when required by your backend.
  - If multi-tenant, also configure `tenant_id` (`X-Scope-OrgID`).
- `Jaeger`:
  - Uses Jaeger stable v3 Query API (`GET /api/v3/traces`).
  - `Traces.query` is interpreted as Jaeger `service_name`.
  - Additional structured filters are provided via `Traces.options.jaeger` (`operation_name`, `duration_min`, `duration_max`, `attributes`).
  - Handles both `application/json` and `text/plain` Content-Type responses with automatic fallback parsing.
  - Supports bearer token and basic authentication.
- `Splunk`:
  - Use bearer token or username/password.
- `CloudWatch`:
  - `region` is required.
  - Supports optional static AWS credentials, optional `assume role` (`role_arn`), and default AWS credential chain fallback (including pod identity).
  - For logs queries, configure `log_group_names` or use `SOURCE` in the query string.
  - `log_group_names` applies to `Logs` only (not `Metrics` / `MetricsSearch`).
  - Examples:
    - Logs with provider log groups: set `"log_group_names": ["/aws/eks/prod/app"]` and use query like `"fields @timestamp, @message | sort @timestamp desc"`.
    - Logs without provider log groups: omit `log_group_names` and use query like `"SOURCE logGroups(namePrefix: [\"/aws/eks/prod/app\"]) | fields @timestamp, @message | sort @timestamp desc"`.
    - Metrics: use CloudWatch metric math expression, for example `SEARCH("{AWS/EC2,InstanceId} MetricName=\"CPUUtilization\"", "Average", 300)`.
- `Azure`:
  - Connection requires `subscription_id`, `tenant_id`, `client_id`, and `client_secret`.
  - Metrics use `azmetrics.QueryResources`:
    - `query` is a comma-separated metric name list (for example `"Percentage CPU,Network In Total"`).
    - `options.azure.resource_id` and `options.azure.metrics_namespace` are required.
    - Optional Azure metrics options: `aggregation`, `filter`, `order_by`, `roll_up_by`, `metrics_endpoint`.
    - `options.azure.metrics_endpoint` overrides the metrics endpoint per request. If omitted, Cloud Query falls back to `https://global.metrics.monitor.azure.com`.
  - Logs use `azlogs.QueryResource`:
    - `query` is Azure Log Analytics query syntax (KQL).
    - `options.azure.resource_id` is required and used as the target resource.
  - Metrics search uses Azure Monitor metric definitions for `options.azure.resource_id`; `MetricsSearchInput.query` is used as a name filter.
  - For Azure metrics, `step` is required and must be an ISO 8601 duration (for example `PT5M` or `PT1H`).

For provider-specific request payloads, query formats, and examples, see the [API Reference Documentation](docs/api-reference.md).

## Documentation

The project includes detailed documentation:

- [API Reference](docs/api-reference.md) - Comprehensive guide to the gRPC API
- [Command-Line Arguments](docs/command-line-args.md) - All available command-line options

## Project Structure

- `/api` - API proto definitions for gRPC services
- `/cmd` - Command-line entry points
- `/docs` - Project documentation
- `/internal` - Internal packages
  - `/connection` - Database connection management
  - `/extension` - Database extensions management
  - `/pool` - Connection pooling
  - `/server` - gRPC server implementation
- `/hack` - Scripts and tools for development

## Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
