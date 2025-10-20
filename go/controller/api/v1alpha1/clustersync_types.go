package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&ClusterSync{}, &ClusterSyncList{})
}

//+kubebuilder:object:root=true

// ClusterSyncList contains a list of ClusterSync resources.
type ClusterSyncList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ClusterSync `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Console ID"

// ClusterSync enables automatic synchronization of clusters from the Plural Console
// into Kubernetes cluster CRDs. It polls the Console clusters API endpoint and creates
// or updates cluster resources based on the discovered infrastructure, making it ideal
// for scenarios where clusters are provisioned externally (e.g., via Terraform) without
// direct CRD creation capability.
//
// The resource supports optional filtering by project and tags, and uses templatable
// specifications that are populated with data from the discovered clusters.
//
// Example usage:
//
//	```yaml
//	apiVersion: deployments.plural.sh/v1alpha1
//	kind: ClusterSync
//	metadata:
//	  name: my-cluster-sync
//	  namespace: default
//	spec:
//	  projectRef:
//	    name: my-project  # optional: only sync clusters from this project
//	  tags:
//	    environment: production  # optional: filter clusters by tags
//	  clusterSpec:
//	    metadata:
//	      name: "{{ .cluster.name }}"  # templated from discovered cluster
//	      namespace: clusters
//	    spec:
//	      handle: "{{ .cluster.handle }}"
//	      version: "{{ .cluster.version }}"
//	      cloud: "{{ .cluster.cloud }}"
//	 ````
type ClusterSync struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ClusterSyncSpec `json:"spec,omitempty"`
	Status Status          `json:"status,omitempty"`
}

func (in *ClusterSync) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// ClusterSyncSpec defines the desired state of ClusterSync
type ClusterSyncSpec struct {
	// ProjectRef references project to sync clusters from.
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// Tags used to filter clusters.
	// +kubebuilder:validation:Optional
	Tags map[string]string `json:"tags,omitempty"`

	// ClusterSpec contains specifications of the cluster.
	// +kubebuilder:validation:Required
	ClusterSpec ClusterSpecTemplate `json:"clusterSpec"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

type ClusterSpecTemplate struct {
	// Metadata for the cluster.
	// +kubebuilder:validation:Required
	Metadata MetadataTemplate `json:"metadata"`

	// Spec for the cluster.
	// +kubebuilder:validation:Required
	Spec SpecTemplate `json:"spec,omitempty"`
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
	Metadata *string `json:"metadata,omitempty"`

	// Bindings contain read and write policies of this cluster
	// +kubebuilder:validation:Optional
	Bindings *BindingsTemplate `json:"bindings,omitempty"`

	// NodePools contains specs of node pools managed by this cluster.
	// +kubebuilder:validation:Optional
	NodePools *string `json:"nodePools,omitempty"`
}

type MetadataTemplate struct {
	// Name is a short, unique human-readable name used to identify this cluster.
	// +kubebuilder:validation:Required
	Name string `json:"name"`

	// Namespace specifies an optional namespace for categorizing or scoping related resources.
	// If empty then the ClusterSync's namespace will be used.
	// +kubebuilder:validation:Optional
	Namespace *string `json:"namespace,omitempty"`
}

type ObjectReferenceTemplate struct {
	// +kubebuilder:validation:Required
	MetadataTemplate `json:",inline"`
}

type BindingsTemplate struct {
	// Read bindings.
	// +kubebuilder:validation:Optional
	Read *string `json:"read,omitempty"`

	// Write bindings.
	// +kubebuilder:validation:Optional
	Write *string `json:"write,omitempty"`
}
