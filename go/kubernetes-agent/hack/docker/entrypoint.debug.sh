#!/bin/sh

# Multi-binary debug entrypoint script
# Determines which binary to run based on APP_BINARY environment variable
# Defaults to 'kas' if not specified

# Default to kas if APP_BINARY is not set
APP_BINARY=${APP_BINARY:-kas}

# Determine which binary to run
case "$APP_BINARY" in
  api)
    BINARY_PATH="/api"
    ;;
  kas)
    BINARY_PATH="/kas"
    ;;
  agentk)
    BINARY_PATH="/agentk"
    ;;
  *)
    echo "Error: Unknown APP_BINARY value: $APP_BINARY"
    echo "Valid values: api, kas, agentk"
    exit 1
    ;;
esac

# Run the selected binary with delve
# --listen=:40000         - Listen on port 40000 for debugger connections
# --headless=true         - Run without a terminal UI
# --api-version=2         - Use Delve API version 2
# --accept-multiclient    - Allow multiple debugger clients to connect
# --continue              - Continue execution after attach
exec /dlv --listen=:40000 --headless=true --api-version=2 --accept-multiclient exec --continue "$BINARY_PATH" -- ${APP_FLAGS}

