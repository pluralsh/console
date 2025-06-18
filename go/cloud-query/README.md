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
