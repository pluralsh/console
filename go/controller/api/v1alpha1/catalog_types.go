package v1alpha1

import (
	console "github.com/pluralsh/console/go/client"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// CatalogSpec defines the desired state of Catalog
type CatalogSpec struct {
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Description is a description of this Catalog.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:=my catalog description
	Description *string `json:"description,omitempty"`

	// Bindings contain read and write policies of this Catalog.
	// +kubebuilder:validation:Optional
	Bindings *Bindings `json:"bindings,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the Catalog in the Console API."

// Catalog is the Schema for the catalogs API
type Catalog struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   CatalogSpec `json:"spec,omitempty"`
	Status Status      `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// CatalogList contains a list of Catalog
type CatalogList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Catalog `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Catalog{}, &CatalogList{})
}

func (c *Catalog) CatalogName() string {
	if c.Spec.Name != nil && len(*c.Spec.Name) > 0 {
		return *c.Spec.Name
	}
	return c.Name
}

func (c *Catalog) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&c.Status.Conditions, condition)
}

func (c *Catalog) Attributes() console.CatalogAttributes {
	attrs := console.CatalogAttributes{
		Name:        c.CatalogName(),
		Description: c.Spec.Description,
	}

	if c.Spec.Bindings != nil {
		attrs.ReadBindings = PolicyBindings(c.Spec.Bindings.Read)
		attrs.WriteBindings = PolicyBindings(c.Spec.Bindings.Write)
	}

	return attrs
}
