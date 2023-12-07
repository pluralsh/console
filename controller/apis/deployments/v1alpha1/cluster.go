package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&Cluster{}, &ClusterList{})
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type ClusterList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Cluster `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Health",type="string",JSONPath=".status.health",description="Cluster health status"
// +kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Console cluster ID"
type Cluster struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`
	Spec              ClusterSpec   `json:"spec,omitempty"`
	Status            ClusterStatus `json:"status,omitempty"`
}

type ClusterSpec struct {
	// Handle is a short, unique human-readable name used to identify this cluster.
	// Does not necessarily map to the cloud resource name.
	// +kubebuilder:validation:Optional
	Handle *string `json:"handle,omitempty"`

	// Version of Kubernetes to use for this cluster. Can be skipped only for BYOK.
	// +kubebuilder:validation:Optional
	Version *string `json:"version,omitempty"`

	// ProviderRef references provider to use for this cluster. Can be skipped only for BYOK.
	// +kubebuilder:validation:Optional
	ProviderRef corev1.ObjectReference `json:"providerRef,omitempty"`

	// Cloud provider to use for this cluster.
	// +kubebuilder:validation:Enum=aws;azure;gcp;byok
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Cloud is immutable"
	Cloud string `json:"cloud"`

	// Protect cluster from being deleted.
	// +kubebuilder:validation:Optional
	Protect *bool `json:"protect,omitempty"`

	// Tags used to filter clusters.
	// +kubebuilder:validation:Optional
	Tags map[string]string `json:"tags,omitempty"`

	// Bindings contain read and write policies of this cluster
	// +kubebuilder:validation:Optional
	Bindings *Bindings `json:"bindings,omitempty"`

	// CloudSettings contains cloud-specific settings for this cluster.
	// +kubebuilder:validation:Optional
	CloudSettings *ClusterCloudSettings `json:"cloudSettings,omitempty"`

	// NodePools contains specs of node pools managed by this cluster.
	NodePools []ClusterNodePool `json:"nodePools"`
}

type ClusterCloudSettings struct {
	// AWS cluster customizations.
	// +kubebuilder:validation:Optional
	AWS *ClusterAWSCloudSettings `json:"aws,omitempty"`

	// Azure cluster customizations.
	// +kubebuilder:validation:Optional
	Azure *ClusterAzureCloudSettings `json:"azure,omitempty"`

	// GCP cluster customizations.
	// +kubebuilder:validation:Optional
	GCP *ClusterGCPCloudSettings `json:"gcp,omitempty"`

	// BYOK cluster customizations.
	// +kubebuilder:validation:Optional
	BYOK *ClusterBYOKCloudSettings `json:"byok,omitempty"`
}

type ClusterAWSCloudSettings struct {
	// Region in AWS to deploy this cluster to.
	Region string `json:"region"`
}

type ClusterAzureCloudSettings struct {
	// ResourceGroup is a name for the Azure resource group for this cluster.
	ResourceGroup string `json:"resourceGroup"`

	// Network is a name for the Azure virtual network for this cluster.
	Network string `json:"network"`

	// SubscriptionId is GUID of the Azure subscription to hold this cluster.
	SubscriptionId string `json:"subscriptionId"`

	// Location in Azure to deploy this cluster to, i.e. eastus.
	Location string `json:"location"`
}

type ClusterGCPCloudSettings struct {
	// Project in GCP to deploy cluster to.
	Project string `json:"project"`
}

type ClusterBYOKCloudSettings struct {
	// TODO: Decide how we handle BYOK settings and how we will deploy operator.
}

type ClusterNodePool struct {
	// Name of the node pool. Must be unique.
	Name string `json:"name"`

	// InstanceType contains the type of node to use. Usually cloud-specific.
	InstanceType string `json:"instanceType"`

	// MinSize is minimum number of instances in this node pool.
	// +kubebuilder:validation:Minimum=1
	MinSize int `json:"minSize"`

	// MaxSize is maximum number of instances in this node pool.
	// +kubebuilder:validation:Minimum=1
	MaxSize int `json:"maxSize"`

	// Labels to apply to the nodes in this pool. Useful for node selectors.
	// +kubebuilder:validation:Optional
	Labels map[string]string `json:"labels,omitempty"`

	// Taints you'd want to apply to a node, i.e. for preventing scheduling on spot instances.
	// +kubebuilder:validation:Optional
	Taints []Taint `json:"taints,omitempty"`

	// CloudSettings contains cloud-specific settings for this node pool.
	// +kubebuilder:validation:Optional
	CloudSettings *ClusterNodePoolCloudSettings `json:"cloudSettings,omitempty"`
}

type ClusterNodePoolCloudSettings struct {
	// AWS node pool customizations.
	// +kubebuilder:validation:Optional
	AWS *ClusterNodePoolAWSCloudSettings `json:"aws,omitempty"`
}

type ClusterNodePoolAWSCloudSettings struct {
	// LaunchTemplateId is an ID of custom launch template for your nodes. Useful for Golden AMI setups.
	// +kubebuilder:validation:Optional
	LaunchTemplateId *string `json:"launchTemplateId,omitempty"`
}

type ClusterStatus struct {
	// Id from Console.
	// +kubebuilder:validation:Optional
	Id *string `json:"id,omitempty"`

	// CurrentVersion contains current Kubernetes version this cluster is using.
	// +kubebuilder:validation:Optional
	CurrentVersion *string `json:"currentVersion,omitempty"`

	// Health status.
	// +optional
	Health *string `json:"health,omitempty"`
}
