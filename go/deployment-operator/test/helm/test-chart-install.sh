#!/bin/bash
set -e

# This script tests the deployment-operator Helm chart installation
# It verifies that the chart can be installed without errors
# Usage: ./test/helm/test-chart-install.sh

CHART_DIR="charts/deployment-operator"
RELEASE_NAME="deployment-operator-test"
NAMESPACE="default"
KIND_CLUSTER_NAME="chart-test-$(date +%s)"

echo "Testing Helm chart installation for deployment-operator..."

# Check if Helm is installed
if ! command -v helm &> /dev/null; then
    echo "Error: Helm is not installed. Please install Helm first."
    exit 1
fi

# Check if Kind is installed
if ! command -v kind &> /dev/null; then
    echo "Error: Kind is not installed. Please install Kind first."
    echo "On macOS, you can use: brew install kind"
    echo "Other platforms: https://kind.sigs.k8s.io/docs/user/quick-start/#installation"
    exit 1
fi

# Check if the chart directory exists
if [ ! -d "$CHART_DIR" ]; then
    echo "Error: Chart directory $CHART_DIR not found."
    exit 1
fi

# Setup cleanup function for graceful exit
cleanup() {
    echo "Cleaning up..."
    if kind get clusters | grep -q "$KIND_CLUSTER_NAME"; then
        echo "Deleting Kind cluster $KIND_CLUSTER_NAME..."
        kind delete cluster --name "$KIND_CLUSTER_NAME"
    fi
    echo "Cleanup complete."
}

# Register cleanup function to run on script exit
trap cleanup EXIT

# Create a temporary Kind cluster for testing
echo "Creating a temporary Kind cluster for testing..."
kind create cluster --name "$KIND_CLUSTER_NAME" --wait 60s

# Check cluster access
if ! kubectl cluster-info &> /dev/null; then
    echo "Error: Cannot access Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

echo "Kubernetes cluster is ready for testing."

# Validate the chart
echo "Validating Helm chart..."
helm lint "$CHART_DIR"

# Verify template rendering
echo "Verifying template rendering..."
helm template "$RELEASE_NAME" "$CHART_DIR" \
  --set secrets.deployToken=test-token \
  --set fullnameOverride="$RELEASE_NAME" > /dev/null

# Install the chart with dry-run first
echo "Performing dry-run installation..."
helm install "$RELEASE_NAME" "$CHART_DIR" \
  --dry-run \
  --set secrets.deployToken=test-token \
  --set fullnameOverride="$RELEASE_NAME" \
  --namespace "$NAMESPACE" \
  --create-namespace

echo "All tests passed! The deployment-operator Helm chart is installable."
# Cleanup happens automatically via the trap 