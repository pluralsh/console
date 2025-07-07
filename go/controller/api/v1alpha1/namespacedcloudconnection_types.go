package v1alpha1

import (
	"context"

	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&NamespacedCloudConnection{}, &NamespacedCloudConnectionList{})
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced
//+kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Console ID"
//+kubebuilder:printcolumn:name="Provider",type="string",JSONPath=".spec.provider",description="Name of the Provider cloud service."

// NamespacedCloudConnection is the Schema for the cloudconnections API
type NamespacedCloudConnection struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   CloudConnectionSpec `json:"spec,omitempty"`
	Status Status              `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// NamespacedCloudConnectionList contains a list of NamespacedCloudConnection
type NamespacedCloudConnectionList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []NamespacedCloudConnection `json:"items"`
}

// NamespacedCloudConnectionGetter is just a helper function that can be implemented to properly
// build Console API attributes
// +kubebuilder:object:generate:=false
type NamespacedCloudConnectionGetter func(context.Context, NamespacedCloudConnection) (*console.CloudConnectionAttributes, error)

func (c *NamespacedCloudConnection) Diff(ctx context.Context, getter NamespacedCloudConnectionGetter, hasher Hasher) (changed bool, sha string, err error) {
	cloudSettings, err := getter(ctx, *c)
	if err != nil {
		return false, "", err
	}

	currentSha, err := hasher(cloudSettings)
	if err != nil {
		return false, "", err
	}

	return !c.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (c *NamespacedCloudConnection) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&c.Status.Conditions, condition)
}

func (c *NamespacedCloudConnection) NamespacedCloudConnectionName() string {
	if c.Spec.Name != nil && len(*c.Spec.Name) > 0 {
		return *c.Spec.Name
	}
	return c.Name
}
