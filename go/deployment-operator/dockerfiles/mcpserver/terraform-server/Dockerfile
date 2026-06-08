FROM golang:1.26.4-alpine AS builder

WORKDIR /workspace

# Copy required local modules referenced by go.mod replace directives
COPY /client /workspace/client
COPY /polly /workspace/polly

WORKDIR /workspace/deployment-operator

# Copy go mod and sum files
COPY deployment-operator/go.mod deployment-operator/go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY deployment-operator/ ./

# Build the MCP server binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o terraform-mcpserver cmd/mcpserver/terraform-server/main.go

# Use a minimal base image
FROM alpine:3.22.1

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from the builder stage
COPY --from=builder /workspace/deployment-operator/terraform-mcpserver .

# Expose stdio for MCP communication
# The MCP server uses stdio transport, so no network ports needed

# Run the MCP server
CMD ["./terraform-mcpserver"]
