# Helm Chart Tests

This directory contains tests for the Helm charts in the deployment-operator project.

## Running the Chart Installation Test

The `test-chart-install.sh` script verifies that the deployment-operator Helm chart can be successfully installed in a Kubernetes cluster.

### Prerequisites

The script requires the following tools to be installed:

- [Helm](https://helm.sh/docs/intro/install/) (v3.x)
- [Kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation) 
- [kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl)

### Usage

From the root of the repository, run:

```bash
./test/helm/test-chart-install.sh
```

The script will:

1. Create a temporary Kind cluster with a unique name
2. Validate the chart using `helm lint`
3. Verify template rendering with `helm template`
4. Perform a dry-run installation with `helm install --dry-run`
5. Automatically clean up the cluster when the test completes

### CI/CD Integration

This test is also integrated into GitHub Actions workflows to catch Helm chart issues in PRs and pushes to the main branch.

## Test Chart Directories

- `deployment-operator/`: Test chart for the deployment-operator
- `yet-another-cloudwatch-exporter/`: Test chart for YACE integration 