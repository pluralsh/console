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
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="CurrentVersion",type="string",JSONPath=".status.currentVersion",description="Current Kubernetes version"
// +kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Console ID"
type Cluster struct {
	metav1.TypeMeta `json:",inline"`

	metav1.ObjectMeta `json:"metadata,omitempty"`

	// +kubebuilder:validation:XValidation:rule="self.cloud == 'aws' && (has(self.cloudSettings.aws)",message="AWS cloud settings are required"
	// +kubebuilder:validation:XValidation:rule="self.cloud == 'azure' && (has(self.cloudSettings.azure)",message="Azure cloud settings are required"
	// +kubebuilder:validation:XValidation:rule="self.cloud == 'gcp' && (has(self.cloudSettings.gcp)",message="GCP cloud settings are required"
	// +kubebuilder:validation:XValidation:rule="self.cloud == 'aws' && (!has(self.cloudSettings.azure) && !has(self.cloudSettings.gcp)",message="Only AWS cloud settings can be specified"
	// +kubebuilder:validation:XValidation:rule="self.cloud == 'azure' && (!has(self.cloudSettings.aws) && !has(self.cloudSettings.gcp)",message="Only Azure cloud settings can be specified"
	// +kubebuilder:validation:XValidation:rule="self.cloud == 'gcp' && (!has(self.cloudSettings.aws) && !has(self.cloudSettings.azure)",message="Only GCP cloud settings can be specified"
	// +kubebuilder:validation:XValidation:rule="self.cloud == 'byok' && (!has(self.cloudSettings.aws) && !has(self.cloudSettings.azure) && !has(self.cloudSettings.gcp))",message="Cloud settings can't be specified for BYOK"
	Spec ClusterSpec `json:"spec,omitempty"`

	Status ClusterStatus `json:"status,omitempty"`
}

type ClusterSpec struct {
	// Handle is a short, unique human-readable name used to identify this cluster.
	// Does not necessarily map to the cloud resource name.
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
	ProviderRef *corev1.ObjectReference `json:"providerRef,omitempty"`

	// Cloud provider to use for this cluster.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum=aws;azure;gcp;byok
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Cloud is immutable"
	// +kubebuilder:example:=azure
	Cloud string `json:"cloud"`

	// Protect cluster from being deleted.
	// +kubebuilder:validation:Optional
	// +kubebuilder:example:=false
	Protect *bool `json:"protect,omitempty"`

	// Tags used to filter clusters.
	// +kubebuilder:validation:Optional
	Tags map[string]string `json:"tags,omitempty"`

	// Bindings contain read and write policies of this cluster
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Bindings are immutable"
	Bindings *Bindings `json:"bindings,omitempty"`

	// CloudSettings contains cloud-specific settings for this cluster.
	// +kubebuilder:validation:Optional
	// +structType=atomic
	CloudSettings *ClusterCloudSettings `json:"cloudSettings,omitempty"`

	// NodePools contains specs of node pools managed by this cluster.
	// +kubebuilder:validation:Optional
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
}

type ClusterAWSCloudSettings struct {
	// Region in AWS to deploy this cluster to.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Region string `json:"region"`
}

type ClusterAzureCloudSettings struct {
	// ResourceGroup is a name for the Azure resource group for this cluster.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:=myresourcegroup
	ResourceGroup string `json:"resourceGroup"`

	// Network is a name for the Azure virtual network for this cluster.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:=mynetwork
	Network string `json:"network"`

	// SubscriptionId is GUID of the Azure subscription to hold this cluster.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	SubscriptionId string `json:"subscriptionId"`

	// Location in Azure to deploy this cluster to.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:=eastus
	Location string `json:"location"`
}

type ClusterGCPCloudSettings struct {
	// Project in GCP to deploy cluster to.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Project string `json:"project"`
}

type ClusterNodePool struct {
	// Name of the node pool. Must be unique.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Name string `json:"name"`

	// InstanceType contains the type of node to use. Usually cloud-specific.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	InstanceType string `json:"instanceType"`

	// MinSize is minimum number of instances in this node pool.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Minimum=1
	MinSize int `json:"minSize"`

	// MaxSize is maximum number of instances in this node pool.
	// +kubebuilder:validation:Required
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
	// +structType=atomic
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
	// +kubebuilder:validation:Type:=string
	LaunchTemplateId *string `json:"launchTemplateId,omitempty"`
}

type ClusterStatus struct {
	// Id from Console.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	ID *string `json:"id,omitempty"`

	// CurrentVersion contains current Kubernetes version this cluster is using.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	CurrentVersion *string `json:"currentVersion,omitempty"`

	// KasURL contains KAS URL.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	KasURL *string `json:"kasURL,omitempty"`

	// PingedAt contains timestamp of last successful cluster ping.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	PingedAt *string `json:"pingedAt,omitempty"`
}
