#!/bin/bash

set -e

# Use a predefined database provider and version
DB_PROVIDER="postgres"
DB_VERSION="pg15"

ARCH="$(go env GOARCH)"
OS="$(go env GOOS)"

# Usage function
usage() {
  echo "Usage: $0 -d <destination_directory> [-p aws,gcp,azure] [-v version]"
  echo "  -d  Destination directory where ${DB_PROVIDER} extensions will be unpacked"
  echo "  -p  Provider to download (aws,gcp,azure)"
  echo "  -v  Specific version to download for the provider"
  echo "  -h  Display this help message"
  exit 1
}

# Parse command line arguments
while getopts "d:p:v:h" opt; do
  case ${opt} in
    d)
      DEST_DIR=${OPTARG}
      ;;
    p)
      PROVIDER=${OPTARG}
      ;;
    v)
      VERSION=${OPTARG}
      ;;
    h)
      usage
      ;;
    \?)
      echo "Invalid option: -${OPTARG}" 1>&2
      usage
      ;;
    :)
      echo "Option -${OPTARG} requires an argument" 1>&2
      usage
      ;;
  esac
done

# Check if destination directory is provided
if [ -z "${DEST_DIR}" ]; then
  echo "ERROR: Destination directory (-d) is required"
  usage
fi

# Create destination directory if it doesn't exist
mkdir -p "${DEST_DIR}"

# Default to all providers if not specified
if [ -z "${PROVIDER}" ]; then
  echo "ERROR: Provider (-p) is required. Supported providers are: aws, gcp, azure."
  usage
fi

if [ -z "${VERSION}" ]; then
  echo "ERROR: Version (-v) is required. Please specify a ${PROVIDER} version to download."
  usage
fi

# Function to download and unpack a plugin
download_plugin() {
  local provider=$1
  local version=$2
  local base_url="https://github.com/turbot/steampipe-plugin-${provider}"
  local temp_dir=$(mktemp -d)
  local download_url

  echo "Processing ${provider} ${DB_PROVIDER} extension..."

  download_url="${base_url}/releases/download/v${version}/steampipe_${DB_PROVIDER}_${provider}.${DB_VERSION}.${OS}_${ARCH}.tar.gz"

  echo "Downloading ${DB_PROVIDER} extension from: ${download_url}"

  # Download the plugin
  if ! curl -s -L -o "${temp_dir}/plugin.tar.gz" "${download_url}"; then
    echo "ERROR: Failed to download ${DB_PROVIDER} extension for ${provider}"
    rm -rf "${temp_dir}"
    return 1
  fi

  # Extract the plugin
  echo "Extracting ${provider} ${DB_PROVIDER} extension..."
  tar -xzf "${temp_dir}/plugin.tar.gz" -C "${DEST_DIR}" --strip-components=1

  rm "${DEST_DIR}/install.sh"
  rm "${DEST_DIR}/README.md"

  echo "Successfully installed ${provider} ${DB_PROVIDER} extension to ${DEST_DIR}"

  # Clean up
  rm -rf "${temp_dir}"
}

download_plugin "${PROVIDER}" "${VERSION}"