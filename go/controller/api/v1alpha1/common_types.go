package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// NamespacedName is the same as types.NamespacedName
// with the addition of kubebuilder/json annotations for better schema support.
type NamespacedName struct {
	// Name is a resource name.
	// +kubebuilder:validation:Required
	Name string `json:"name"`

	// Namespace is a resource namespace.
	// +kubebuilder:validation:Required
	Namespace string `json:"namespace"`
}

// PluralResource represents a resource that can be managed in plural form.
// +k8s:deepcopy-gen=false
type PluralResource interface {
	client.Object

	// ConsoleID returns a resource id read from the Console API
	ConsoleID() *string
	// ConsoleName returns a resource name read from the Console API
	ConsoleName() string
}

// NamespacedPluralResource represents a resource that can be managed in plural form.
// +k8s:deepcopy-gen=false
type NamespacedPluralResource interface {
	PluralResource

	// ConsoleNamespace returns a resource namespace read from the Console API
	ConsoleNamespace() string
}

// ReadOnlyPluralResource represents a resource that can be in read-only mode.
// +k8s:deepcopy-gen=false
type ReadOnlyPluralResource interface {
	PluralResource
	SetCondition(condition metav1.Condition)
	SetReadOnlyStatus(readOnly bool)
}

// ObjectKeyReference is a reference to an object in a specific namespace.
// It is used to reference objects like secrets, configmaps, etc.
type ObjectKeyReference struct {
	// Name is unique within a namespace to reference a resource.
	// +kubebuilder:validation:Required
	Name string `json:"name"`

	// Namespace defines the space within which the resource name must be unique.
	// +kubebuilder:validation:Required
	Namespace string `json:"namespace"`

	// Key is the key of the object to use.
	// +kubebuilder:validation:Required
	Key string `json:"key"`
}
