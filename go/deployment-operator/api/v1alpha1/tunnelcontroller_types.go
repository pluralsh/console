package v1alpha1

import (
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	TunnelControllerNameLabel = "deployments.plural.sh/tunnel-controller-name"

	// DefaultTunnelControllerImage is used when spec.image is empty.
	DefaultTunnelControllerImage = "ghcr.io/pluralsh/ferrotunnel-client:master"
)

// +kubebuilder:object:generate=false

// TunnelControllerSpec is the client image for this cluster.
// The controller creates the Secret and Deployment from the operator configuration.
type TunnelControllerSpec struct {
	// Image is the ferrotunnel-client image, including the tag.
	// Empty defaults to ghcr.io/pluralsh/ferrotunnel-client:master.
	// +kubebuilder:validation:Optional
	Image string `json:"image,omitempty"`
}

// +kubebuilder:object:generate=false

// TunnelControllerStatus defines the observed state of TunnelController.
type TunnelControllerStatus struct {
	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
}

func (in *TunnelController) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// +kubebuilder:object:root=true
// +kubebuilder:object:generate=false
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Image",type="string",JSONPath=".spec.image"
// +kubebuilder:printcolumn:name="Ready",type="string",JSONPath=".status.conditions[?(@.type==\"Ready\")].status"

// TunnelController runs one FerroTunnel client Deployment for this cluster.
type TunnelController struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   TunnelControllerSpec   `json:"spec,omitempty"`
	Status TunnelControllerStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:object:generate=false

// TunnelControllerList contains a list of TunnelController.
type TunnelControllerList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []TunnelController `json:"items"`
}

func init() {
	SchemeBuilder.Register(&TunnelController{}, &TunnelControllerList{})
}
