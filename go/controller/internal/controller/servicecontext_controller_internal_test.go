package controller

import (
	"testing"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/stretchr/testify/require"
)

func TestValidateConfigMapReference(t *testing.T) {
	_, err := validateConfigMapReference(v1alpha1.ConfigMapReference{}, 0, "default")
	require.EqualError(t, err, "configMapRefs[0].name must not be empty")

	namespace, err := validateConfigMapReference(v1alpha1.ConfigMapReference{Name: "source"}, 0, "default")
	require.NoError(t, err)
	require.Equal(t, "default", namespace)
}
