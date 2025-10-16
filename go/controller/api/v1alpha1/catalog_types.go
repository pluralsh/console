package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&Catalog{}, &CatalogList{})
}

//+kubebuilder:object:root=true

// CatalogList contains a list of Catalog resources.
type CatalogList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Catalog `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the Catalog in the Console API."

// Catalog is an organized collection of PR Automations.
// It enables teams to group related automation workflows by category (like "data", "security",
// "devops") and provides a browsable interface for self-service capabilities. Catalogs support
// hierarchical permissions through RBAC bindings and can be scoped to specific projects for
// multi-tenant environments.
type Catalog struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   CatalogSpec `json:"spec,omitempty"`
	Status Status      `json:"status,omitempty"`
}

func (in *Catalog) CatalogName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}
	return in.Name
}

func (in *Catalog) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *Catalog) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

// ConsoleID implements [PluralResource] interface
func (in *Catalog) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName implements [PluralResource] interface
func (in *Catalog) ConsoleName() string {
	if in.Spec.Name != nil {
		return *in.Spec.Name
	}

	return in.Name
}

// CatalogSpec defines the desired state of Catalog
type CatalogSpec struct {
	// Name is the display name for this catalog if different from metadata.name.
	// Defaults to metadata.name if not specified.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Author is the name of the catalog creator used for attribution and contact purposes.
	// This field helps users identify who maintains and supports the catalog contents.
	// +kubebuilder:validation:Required
	Author string `json:"author"`

	// Icon is a URL to an icon image for visual identification in the catalog browser.
	// Should be a publicly accessible image URL that displays well at small sizes.
	// +kubebuilder:validation:Optional
	Icon *string `json:"icon,omitempty"`

	// DarkIcon is a URL to a dark mode variant of the catalog icon.
	// Used when the UI is in dark mode to ensure proper contrast and visibility.
	// +kubebuilder:validation:Optional
	DarkIcon *string `json:"darkIcon,omitempty"`

	// Description provides a detailed explanation of the catalog's purpose and contents.
	// This helps users understand what types of automations they can find within.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:=my catalog description
	Description *string `json:"description,omitempty"`

	// Category is a short classification label for organizing catalogs in the browser.
	// Examples include "infrastructure", "security", "monitoring", or "development".
	// +kubebuilder:validation:Optional
	Category *string `json:"category,omitempty"`

	// ProjectRef links this catalog to a specific project for permission inheritance.
	// When set, the catalog inherits the project's RBAC policies and is scoped to that project.
	// ProjectRef owning project of the catalog, permissions will propagate down
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// Tags provide key-value metadata for filtering and organizing catalogs.
	// Useful for adding custom labels like environment, team, or technology stack.
	// +kubebuilder:validation:Optional
	Tags map[string]string `json:"tags,omitempty"`

	// Bindings define the read, write, and create permissions for this catalog.
	// Controls who can view, modify, and use the PR automations within this catalog.
	// Bindings contain read and write policies of this Catalog.
	// +kubebuilder:validation:Optional
	Bindings *CatalogBindings `json:"bindings,omitempty"`
}

// CatalogBindings defines the RBAC permissions for a catalog, controlling access to PR automations.
// These bindings determine who can view, modify, and create PR automations within the catalog,
// providing fine-grained access control for self-service automation capabilities.
type CatalogBindings struct {
	// Create bindings control who can generate new PR automations using this catalog.
	// Users with create permissions can trigger self-service workflows but cannot modify the catalog itself.
	// +kubebuilder:validation:Optional
	Create []Binding `json:"create,omitempty"`

	// Read bindings control who can view and browse this catalog and its PR automations.
	// Users with read permissions can see available automations but cannot execute or modify them.
	// +kubebuilder:validation:Optional
	Read []Binding `json:"read,omitempty"`

	// Write bindings control who can modify the catalog and its PR automations.
	// Users with write permissions can add, update, or remove PR automations within this catalog.
	// +kubebuilder:validation:Optional
	Write []Binding `json:"write,omitempty"`
}
