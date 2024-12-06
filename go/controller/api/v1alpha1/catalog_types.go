package v1alpha1

import (
	console "github.com/pluralsh/console/go/client"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// CatalogSpec defines the desired state of Catalog
type CatalogSpec struct {
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`
	// +kubebuilder:validation:Required
	Author string `json:"author"`

	// An icon url to annotate this pr automation
	// +kubebuilder:validation:Optional
	Icon *string `json:"icon,omitempty"`

	// An darkmode icon url to annotate this pr automation
	// +kubebuilder:validation:Optional
	DarkIcon *string `json:"darkIcon,omitempty"`

	// Description is a description of this Catalog.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:=my catalog description
	Description *string `json:"description,omitempty"`
	// +kubebuilder:validation:Optional
	Category *string `json:"category,omitempty"`
	// ProjectRef owning project of the catalog, permissions will propagate down
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`
	// +kubebuilder:validation:Optional
	Tags map[string]string `json:"tags,omitempty"`
	// Bindings contain read and write policies of this Catalog.
	// +kubebuilder:validation:Optional
	Bindings *CatalogBindings `json:"bindings,omitempty"`
}

// CatalogBindings ...
type CatalogBindings struct {
	// Create bindings.
	// +kubebuilder:validation:Optional
	Create []Binding `json:"create,omitempty"`

	// Read bindings.
	// +kubebuilder:validation:Optional
	Read []Binding `json:"read,omitempty"`

	// Write bindings.
	// +kubebuilder:validation:Optional
	Write []Binding `json:"write,omitempty"`
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

func (c *Catalog) Attributes(projectID *string) *console.CatalogAttributes {
	attrs := &console.CatalogAttributes{
		Name:        c.CatalogName(),
		Author:      c.Spec.Author,
		Description: c.Spec.Description,
		Category:    c.Spec.Category,
		Icon:        c.Spec.Icon,
		DarkIcon:    c.Spec.DarkIcon,
		ProjectID:   projectID,
	}
	if len(c.Spec.Tags) > 0 {
		attrs.Tags = make([]*console.TagAttributes, 0)
		for k, v := range c.Spec.Tags {
			attrs.Tags = append(attrs.Tags, &console.TagAttributes{
				Name:  k,
				Value: v,
			})
		}
	}

	if c.Spec.Bindings != nil {
		attrs.ReadBindings = PolicyBindings(c.Spec.Bindings.Read)
		attrs.WriteBindings = PolicyBindings(c.Spec.Bindings.Write)
		attrs.CreateBindings = PolicyBindings(c.Spec.Bindings.Create)
	}

	return attrs
}

func (c *Catalog) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(c.Spec)
	if err != nil {
		return false, "", err
	}

	return !c.Status.IsSHAEqual(currentSha), currentSha, nil
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
