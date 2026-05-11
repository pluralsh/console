package streamline

import (
	"sync"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	smcommon "github.com/pluralsh/deployment-operator/pkg/streamline/common"
	"github.com/pluralsh/deployment-operator/pkg/streamline/store"
)

var (
	globalStoreInstance *GlobalStore
	mu                  sync.Mutex
)

func InitGlobalStore(s store.Store) {
	mu.Lock()
	defer mu.Unlock()

	if globalStoreInstance != nil {
		return
	}

	globalStoreInstance = &GlobalStore{store: s}
}

func ResetGlobalStore() {
	mu.Lock()
	defer mu.Unlock()
	globalStoreInstance = nil
}

func GetGlobalStore() *GlobalStore {
	mu.Lock()
	defer mu.Unlock()

	return globalStoreInstance
}

type GlobalStore struct {
	store store.Store
}

func (in *GlobalStore) GetComponent(obj unstructured.Unstructured) (result *smcommon.Component, err error) {
	return in.store.GetAppliedComponent(obj)
}

func (in *GlobalStore) UpdateComponentSHA(obj unstructured.Unstructured, shaType store.SHAType) error {
	return in.store.UpdateComponentSHA(obj, shaType)
}

func (in *GlobalStore) CommitTransientSHA(obj unstructured.Unstructured) error {
	return in.store.CommitTransientSHA(obj)
}

func (in *GlobalStore) SyncAppliedResource(obj unstructured.Unstructured) error {
	return in.store.SyncAppliedResource(obj)
}

func (in *GlobalStore) ExpireSHA(obj unstructured.Unstructured) error {
	return in.store.ExpireSHA(obj)
}

func (in *GlobalStore) Expire(serviceID string) error {
	return in.store.Expire(serviceID)
}

func (in *GlobalStore) DeleteComponent(key smcommon.StoreKey) error {
	return in.store.DeleteComponent(key)
}

func (in *GlobalStore) GetResourceHealth(resources []unstructured.Unstructured) (hasPendingResources, hasFailedResources bool, err error) {
	return in.store.GetResourceHealth(resources)
}

func (in *GlobalStore) SaveHookComponentWithManifestSHA(manifest, appliedResource unstructured.Unstructured) error {
	return in.store.SaveHookComponentWithManifestSHA(manifest, appliedResource)
}

func (in *GlobalStore) SetServiceChildren(serviceID, parentUID string, keys []smcommon.StoreKey) (int, error) {
	return in.store.SetServiceChildren(serviceID, parentUID, keys)
}
