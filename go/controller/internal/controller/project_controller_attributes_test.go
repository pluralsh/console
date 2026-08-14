package controller

import (
	"testing"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/stretchr/testify/require"
)

func TestProjectAttributesIncludesDisableInsights(t *testing.T) {
	disableInsights := true
	project := &v1alpha1.Project{
		Spec: v1alpha1.ProjectSpec{
			Name:            "test",
			DisableInsights: &disableInsights,
		},
	}

	attributes, err := (&ProjectReconciler{}).attributes(project)

	require.NoError(t, err)
	require.Equal(t, &disableInsights, attributes.DisableInsights)
}
