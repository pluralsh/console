package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

// ClusterSyncSpec defines the desired state of ClusterSync
type ClusterSyncSpec struct {
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// +kubebuilder:validation:Optional
	Tags map[string]string `json:"tags,omitempty"`

	ClusterSpec ClusterSpecTemplate `json:"clusterSpec"`
}

type ClusterSpecTemplate struct {
	Metadata MetadataTemplate `json:"metadata"`

	Spec SpecTemplate `json:"spec,omitempty"`
}

type MetadataTemplate struct {
	Name string `json:"name"`

	// Namespace specifies an optional namespace for categorizing or scoping related resources.
	// If empty then the ClusterSync's namespace will be used.
	// +kubebuilder:validation:Optional
	Namespace *string `json:"namespace,omitempty"`
}

type ObjectReferenceTemplate struct {
	MetadataTemplate `json:",inline"`
}

type SpecTemplate struct {
	// Handle is a short, unique human-readable name used to identify this cluster.
	// Does not necessarily map to the cloud resource name.
	// This has to be specified in order to adopt existing cluster.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:=myclusterhandle
	Handle *string `json:"handle,omitempty"`

	// Version of Kubernetes to use for this cluster. Can be skipped only for BYOK.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:="1.25.11"
	Version *string `json:"version,omitempty"`

	// ProviderRef references provider to use for this cluster. Can be skipped only for BYOK.
	// +kubebuilder:validation:Optional
	ProviderRef *ObjectReferenceTemplate `json:"providerRef,omitempty"`

	// ProjectRef references project this cluster belongs to.
	// If not provided, it will use the default project.
	// +kubebuilder:validation:Optional
	ProjectRef *ObjectReferenceTemplate `json:"projectRef,omitempty"`

	// Cloud provider to use for this cluster.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Cloud *string `json:"cloud,omitempty"`

	// Protect cluster from being deleted.
	// +kubebuilder:validation:Optional
	Protect *string `json:"protect,omitempty"`

	// Tags used to filter clusters.
	// +kubebuilder:validation:Optional
	Tags *string `json:"tags,omitempty"`

	// Metadata for the cluster
	// +kubebuilder:validation:Optional
	Metadata *runtime.RawExtension `json:"metadata,omitempty"`

	// Bindings contain read and write policies of this cluster
	// +kubebuilder:validation:Optional
	Bindings *Bindings `json:"bindings,omitempty"`

	// CloudSettings contains cloud-specific settings for this cluster.
	// +kubebuilder:validation:Optional
	// +structType=atomic
	CloudSettings *ClusterCloudSettings `json:"cloudSettings,omitempty"`

	// NodePools contains specs of node pools managed by this cluster.
	// +kubebuilder:validation:Optional
	NodePools []ClusterNodePool `json:"nodePools,omitempty"`
}

//+kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Console ID"

// ClusterSync is the Schema for the clustersyncs API
type ClusterSync struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ClusterSyncSpec `json:"spec,omitempty"`
	Status Status          `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ClusterSyncList contains a list of ClusterSync
type ClusterSyncList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ClusterSync `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ClusterSync{}, &ClusterSyncList{})
}

func (in *ClusterSync) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}
