package store_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pluralsh/deployment-operator/pkg/streamline/store"
)

func TestSetComponentUnsynced(t *testing.T) {
	ctx := context.Background()
	storeInstance, err := store.NewDatabaseStore(ctx)
	require.NoError(t, err)

	serviceID := "test-service"
	component := createComponent(testUID, WithService(serviceID))
	err = storeInstance.SaveComponent(component)
	require.NoError(t, err)

	// Verify component is saved and applied
	savedComponent, err := storeInstance.GetAppliedComponent(component)
	require.NoError(t, err)
	assert.NotNil(t, savedComponent)
	assert.Equal(t, testUID, savedComponent.UID)

	// Set component unsynced
	err = storeInstance.SetComponentUnsynced(component)
	require.NoError(t, err)

	// Verify component is no longer applied
	savedComponent, err = storeInstance.GetAppliedComponent(component)
	require.NoError(t, err)
	assert.Nil(t, savedComponent)

	// Verify component still exists but with cleared fields
	components, err := storeInstance.GetServiceComponents(serviceID, false)
	require.NoError(t, err)
	require.Len(t, components, 1)

	unsyncedComponent := components[0]
	assert.Equal(t, "", unsyncedComponent.UID)
	assert.Equal(t, "PENDING", unsyncedComponent.Status)
	assert.Equal(t, testGroup, unsyncedComponent.Group)
	assert.Equal(t, testVersion, unsyncedComponent.Version)
	assert.Equal(t, testKind, unsyncedComponent.Kind)
	assert.Equal(t, testName, unsyncedComponent.Name)
	assert.Equal(t, testNamespace, unsyncedComponent.Namespace)
}
