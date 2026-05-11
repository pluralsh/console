package store

import (
	"time"

	"github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/containers"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"

	smcommon "github.com/pluralsh/deployment-operator/pkg/streamline/common"
)

type Store interface {
	SaveComponent(obj unstructured.Unstructured) error

	SaveComponents(obj []unstructured.Unstructured) error

	SaveUnsyncedComponents(obj []unstructured.Unstructured) error

	SetComponentUnsynced(obj unstructured.Unstructured) error

	// GetComponentAttributes returns service components attributes from the store.
	GetComponentAttributes(serviceID string, isDeleting bool) ([]client.ComponentAttributes, error)

	// SyncServiceComponents is used to store all service components in the store before applying them and to
	// ensure that components that are no longer part of the service and were not applied are removed from the store.
	SyncServiceComponents(serviceID string, resources []unstructured.Unstructured) error

	// DeleteUnsyncedComponentsByKeys removes multiple components from the store based on their smcommon.StoreKey.
	// It will delete only not applied components.
	// If the applied component is passed, it will be ignored.
	// It returns an error if any issue occurs during the deletion process.
	DeleteUnsyncedComponentsByKeys(objects containers.Set[smcommon.StoreKey]) error

	GetAppliedComponent(obj unstructured.Unstructured) (*smcommon.Component, error)

	GetAppliedComponentByUID(uid types.UID) (*client.ComponentChildAttributes, error)

	// GetAppliedComponentsByGVK returns all applied components matching provided GVK.
	GetAppliedComponentsByGVK(gvk schema.GroupVersionKind) ([]smcommon.Component, error)

	// DeleteComponent removes a component from the store based on its smcommon.StoreKey.
	// It returns an error if any issue occurs during the deletion process.
	DeleteComponent(key smcommon.StoreKey) error

	// DeleteComponents removes components from the store based on GVK.
	// It returns an error if any issue occurs during the deletion process.
	DeleteComponents(group, version, kind string) error

	SaveComponentAttributes(obj client.ComponentChildAttributes, args ...any) error

	// GetServiceComponents retrieves all parent components associated with a given service ID.
	// All components with parents are filtered out.
	// It returns a slice of Component structs containing information about each component and any error encountered.
	GetServiceComponents(serviceID string, onlyApplied bool) (smcommon.Components, error)

	// GetServiceComponentsWithChildren returns service components with their children populated.
	// It uses a single query to fetch both components and their recursive children (up to 4 levels deep).
	GetServiceComponentsWithChildren(serviceID string, onlyApplied bool) ([]client.ComponentAttributes, error)

	GetComponentInsights() ([]client.ClusterInsightComponentAttributes, error)

	GetComponentCounts() (nodeCount, namespaceCount int64, err error)

	// GetNodeStatistics returns a list of node statistics, including the node name and count of pending pods
	// that were created more than 5 minutes ago. Each NodeStatisticAttributes contains the node name and
	// the number of pending pods for that node. The health field is currently not implemented.
	// Returns an error if the database operation fails or if the connection cannot be established.
	GetNodeStatistics() ([]*client.NodeStatisticAttributes, error)

	// GetHealthScore calculates cluster health as a percentage using a base score minus deductions system.
	// Returns the health score as an integer value (0-100) and any error encountered.
	GetHealthScore() (int64, error)

	// UpdateComponentSHA updates the SHA for a component.
	UpdateComponentSHA(unstructured.Unstructured, SHAType) error

	// CommitTransientSHA commits a transient SHA to the store.
	CommitTransientSHA(unstructured.Unstructured) error

	// SyncAppliedResource synchronizes the component information after its manifest is applied.
	// It updates apply SHA, server SHA, commits transient manifest SHA and marks the component with the manifest flag.
	SyncAppliedResource(obj unstructured.Unstructured) error

	// ExpireSHA removes component SHA information.
	ExpireSHA(unstructured.Unstructured) error

	// Expire removes component SHA information based on the provided service ID.
	Expire(string) error

	// ExpireOlderThan removes component SHA information from entries older than the provided TTL.
	ExpireOlderThan(time.Duration) error

	// Shutdown closes the database connection and deletes the store.
	Shutdown() error

	// GetResourceHealth checks health statuses of provided resources.
	GetResourceHealth(resources []unstructured.Unstructured) (hasPendingResources, hasFailedResources bool, err error)

	// GetHookComponents returns all hook components with a deletion policy that belong to the specified service.
	GetHookComponents(serviceID string) ([]smcommon.HookComponent, error)

	// SaveHookComponentWithManifestSHA saves the hook component with manifest SHA in the store.
	SaveHookComponentWithManifestSHA(manifest, appliedResource unstructured.Unstructured) error

	// ExpireHookComponents removes all hook components that belong to the specified service from the store.
	ExpireHookComponents(serviceID string) error

	// SetServiceChildren sets the children of a service based on the provided parent UID and keys.
	SetServiceChildren(serviceID, parentUID string, keys []smcommon.StoreKey) (int, error)
}
