# Controller Reconciliation Logic

This document describes the reconciliation patterns used by our controllers to synchronize Kubernetes Custom Resources (CRDs) with the Console API.

## Reconciliation Modes

Controllers operate in one of three primary modes depending on the initial state of the resource and the configuration provided.

### 1. Creation Mode (Standard)
This is the standard lifecycle for a resource managed entirely by the controller.

*   **Trigger**: A new CRD is created, and no matching resource exists in the Console API.
*   **Action**: The controller creates the resource in the Console API using the attributes defined in the CRD `Spec`.
*   **Result**: The `Status.ID` is populated with the new Console ID. The controller manages updates to the resource and ensures it is deleted from the Console API when the CRD is removed (via finalizers).

### 2. Read-Only Mode
This mode is used when a resource already exists in the Console API, and the operator is configured to observe rather than manage it.

*   **Trigger**: A matching resource is found in the Console API, but the controller determines it should not take ownership (e.g., `driftDetection` is disabled).
*   **Action**: The controller reads the existing ID from the Console API and populates `Status.ID`.
*   **Result**: The resource state in the Console API is **not** modified by the controller, even if the CRD `Spec` differs. Deleting the CRD will **not** delete the resource from the Console API.

### 3. Adoption Mode
Adoption allows the controller to take ownership of a resource that was originally created outside of the current Kubernetes context (e.g., via the UI or a different cluster).

*   **Trigger**: A matching resource is found, and the controller is configured to manage it (see "Ownership and Drift Detection" below).
*   **Action**: The controller "links" to the existing resource by ID and immediately synchronizes the Console API state to match the CRD `Spec`.
*   **Result**: Once adopted, the resource behaves exactly like one in **Creation Mode**. The controller assumes full responsibility for its lifecycle, updates, and deletion.

---

## Ownership and Drift Detection

The `reconciliation` block in the CRD `Spec` controls how the controller handles existing resources and ongoing synchronization.

### Adoption Logic for Specific Resources
For the following 7 resource types, the controller follows a specific adoption logic based on the `reconciliation.driftDetection` setting:

*   **Project**
*   **Catalog**
*   **GitRepository**
*   **NotificationSink**
*   **ServiceAccount**
*   **PRAutomation**
*   **ServiceContext**

#### Behavior:
*   **If `driftDetection: true` (Default)**: If a resource with the same name already exists in the Console API, the controller **will not** enter Read-Only mode. Instead, it will **take ownership** (Adoption Mode), synchronize the attributes, and handle future deletions.
*   **If `driftDetection: false`**: The controller will enter **Read-Only Mode**. It will fetch the ID for dependency resolution but will not attempt to correct drift or manage the external resource's lifecycle.

### Requeue and Jitter
To maintain system stability and prevent API rate-limiting, the controllers use a jittered requeue mechanism for drift detection.

*   **Interval**: Configured via `reconciliation.interval` (defaults to 30 minutes).
*   **Jitter**: The actual requeue time is randomized between 50% and 150% of the configured interval.

| Parameter | Default | Description |
| :--- | :--- | :--- |
| `driftDetection` | `true` | Whether to sync changes from CRD to API periodically and adopt existing resources. |
| `interval` | `30m` | The base frequency for drift detection runs. |


## Resource Reconciliation Modes Table

The following table categorizes resources based on their supported reconciliation behavior.

| Resource                         | Standard Creation | Read-Only Support |        Adoption Mode Support         |
|:---------------------------------|:-----------------:|:-----------------:|:------------------------------------:|
| **Project**                      |         ✅         |         ✅         | **Yes** (via `driftDetection: true`) |
| **Catalog**                      |         ✅         |         ✅         | **Yes** (via `driftDetection: true`) |
| **GitRepository**                |         ✅         |         ✅         | **Yes** (via `driftDetection: true`) |
| **NotificationSink**             |         ✅         |         ✅         | **Yes** (via `driftDetection: true`) |
| **ServiceAccount**               |         ✅         |         ✅         | **Yes** (via `driftDetection: true`) |
| **PRAutomation**                 |         ✅         |         ✅         | **Yes** (via `driftDetection: true`) |
| **ServiceContext**               |         ✅         |         ✅         | **Yes** (via `driftDetection: true`) |
| **BootstrapToken**               |         ✅         |        No         |                  No                  |
| **Cluster**                      |        No         |         ✅         |                  ✅                   |
| **ClusterRestore**               |         ✅         |         ✅         |                  No                  |
| **ClusterRestoreTrigger**        |         ✅         |        No         |                  No                  |
| **CloudConnection**              |         ✅         |         ✅         |                  No                  |
| **ComplianceReportGenerator**    |         ✅         |        No         |                  No                  |
| **CustomCompatibilityMatrix**    |         ✅         |        No         |                  ✅                   |
| **CustomStackRun**               |         ✅         |        No         |                  No                  |
| **DeploymentSettings**           |         ✅         |        No         |                  No                  |
| **FederatedCredential**          |         ✅         |        No         |                  No                  |
| **Flow**                         |         ✅         |        No         |                  ✅                  |
| **GlobalService**                |         ✅         |        No         |                  ✅                  |
| **Group**                        |         ✅         |         ✅         |                  No                  |
| **HelmRepository**               |         ✅         |        No         |                  ✅                  |
| **InfrastructureStack**          |         ✅         |        No         |                  ✅                   |
| **ManagedNamespace**             |         ✅         |         ✅         |                  ✅                  |
| **MCPServer**                    |         ✅         |        No         |                  ✅                  |
| **NamespaceCredentials**         |        No         |         ✅         |                  No                  |
| **NotificationRouter**           |         ✅         |        No         |                  ✅                  |
| **ObservabilityProvider**        |         ✅         |         ✅         |                  No                  |
| **Observer**                     |         ✅         |        No         |                  ✅                  |
| **OIDCProvider**                 |         ✅         |        No         |                  ✅                  |
| **Persona**                      |         ✅         |        No         |                  No                  |
| **Pipeline**                     |         ✅         |        No         |                  No                  |
| **PipelineContext**              |         ✅         |        No         |                  No                  |
| **PrAutomationTrigger**          |         ✅         |        No         |                  No                  |
| **PreviewEnvironmentTemplate**   |         ✅         |        No         |                  ✅                  |
| **PrGovernance**                 |         ✅         |        No         |                  ✅                  |
| **SCMConnection**                |         ✅         |         ✅         |                  No                  |
| **Sentinel**                     |         ✅         |        No         |                  No                  |
| **ServiceDeployment**            |         ✅         |        No         |                  ✅                   |
| **StackDefinition**              |         ✅         |        No         |                  No                  |
| **UpgradePlanCallout**           |         ✅         |        No         |                  ✅                  |



### Legend:
*   **Standard Creation**: Controller creates the resource if it doesn't exist.
*   **Read-Only Support**: Controller can link to an existing resource by name/ID without modifying it.
*   **Adoption Mode Support**: Controller can transition from Read-Only to Ownership if `driftDetection` is enabled or if the logic allows to upsert the resource.