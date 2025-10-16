package v1alpha1

import (
	"slices"
	"strings"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

func init() {
	SchemeBuilder.Register(&Cluster{}, &ClusterList{})
}

// +kubebuilder:object:root=true

// ClusterList contains a list of Cluster resources.
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

// Cluster represents a Kubernetes cluster managed by the Plural Console for continuous deployment.
// Clusters serve as deployment targets for services and can be either management clusters (hosting
// the Plural Console and operators) or workload clusters (running application workloads). The Console
// tracks cluster health, versions, and coordinates service deployments across the fleet.
type Cluster struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ClusterSpec   `json:"spec,omitempty"`
	Status ClusterStatus `json:"status,omitempty"`
}

// ConsoleID implements PluralResource interface
func (c *Cluster) ConsoleID() *string {
	return c.Status.ID
}

// ConsoleName implements PluralResource interface
func (c *Cluster) ConsoleName() string {
	return c.Name
}

func (c *Cluster) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&c.Status.Conditions, condition)
}

func (c *Cluster) TagUpdateAttributes() console.ClusterUpdateAttributes {
	var tags []*console.TagAttributes
	if len(c.Spec.Tags) > 0 {
		for k, v := range c.Spec.Tags {
			tags = append(tags, &console.TagAttributes{
				Name:  k,
				Value: v,
			})
		}
		slices.SortFunc(tags, func(a, b *console.TagAttributes) int { return strings.Compare(a.Name, b.Name) })
	}
	var metadata *string
	if c.Spec.Metadata != nil {
		metadata = lo.ToPtr(string(c.Spec.Metadata.Raw))
	}

	return console.ClusterUpdateAttributes{
		Handle:   c.Spec.Handle,
		Tags:     tags,
		Metadata: metadata,
	}
}

// ClusterSpec defines the desired state of a Cluster.
// Configures cluster properties including cloud provider settings, node pools, and access controls
// for continuous deployment workflows across the Plural fleet management architecture.
type ClusterSpec struct {
	// Handle is a short, unique human-readable name used to identify this cluster.
	// Does not necessarily map to the cloud resource name.
	// This has to be specified to adopt the existing cluster.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:=myclusterhandle
	Handle *string `json:"handle,omitempty"`

	// Version specifies the Kubernetes version to use for this cluster.
	// Can be skipped only for BYOK (Bring Your Own Kubernetes) clusters where a version is externally managed.
	// Deprecated.
	// Do not use.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:="1.25.11"
	Version *string `json:"version,omitempty"`

	// ProviderRef references the cloud provider to use for this cluster.
	// Can be skipped only for BYOK clusters where infrastructure is externally provisioned.
	// Deprecated.
	// Do not use.
	// +kubebuilder:validation:Optional
	ProviderRef *corev1.ObjectReference `json:"providerRef,omitempty"`

	// ProjectRef references the project this cluster belongs to for multi-tenancy and access control.
	// If not provided, the cluster will be assigned to the default project.
	// Deprecated.
	// Do not use.
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// Cloud specifies the cloud provider to use for this cluster.
	// Determines the infrastructure platform where the cluster will be provisioned and managed.
	// For BYOK clusters, this field is set to "byok" and no cloud provider is required.
	// Deprecated.
	// Do not use.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum=aws;azure;gcp;byok
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Cloud is immutable"
	// +kubebuilder:example:=azure
	Cloud string `json:"cloud"`

	// Protect prevents accidental deletion of this cluster.
	// When enabled, the cluster cannot be deleted through the Console UI or API.
	// Deprecated.
	// Do not use.
	// +kubebuilder:validation:Optional
	// +kubebuilder:example:=false
	Protect *bool `json:"protect,omitempty"`

	// Tags are key-value pairs used to categorize and filter clusters in fleet management.
	// Used for organizing clusters by environment, team, or other operational criteria.
	// +kubebuilder:validation:Optional
	Tags map[string]string `json:"tags,omitempty"`

	// Metadata contains arbitrary JSON metadata for storing cluster-specific configuration.
	// Used for custom cluster properties and integration with external systems.
	// +kubebuilder:validation:Optional
	Metadata *runtime.RawExtension `json:"metadata,omitempty"`

	// Bindings contain read and write access policies for this cluster.
	// Controls which users and groups can view or manage this cluster through RBAC.
	// +kubebuilder:validation:Optional
	Bindings *Bindings `json:"bindings,omitempty"`

	// CloudSettings contains cloud provider-specific configuration for this cluster.
	// Deprecated.
	// Do not use.
	// +kubebuilder:validation:Optional
	// +structType=atomic
	CloudSettings *ClusterCloudSettings `json:"cloudSettings,omitempty"`

	// NodePools defines the worker node configurations managed by this cluster.
	// Deprecated.
	// Do not use.
	// +kubebuilder:validation:Optional
	NodePools []ClusterNodePool `json:"nodePools"`
}

func (cs *ClusterSpec) HasHandle() bool {
	return cs.Handle != nil
}

// ClusterCloudSettings contains cloud provider-specific configuration for cluster infrastructure.
// Allows customization of networking, regions, and other cloud-specific cluster properties.
type ClusterCloudSettings struct {
	// AWS contains Amazon Web Services specific cluster configuration.
	// +kubebuilder:validation:Optional
	AWS *ClusterAWSCloudSettings `json:"aws,omitempty"`

	// Azure contains Microsoft Azure specific cluster configuration.
	// +kubebuilder:validation:Optional
	Azure *ClusterAzureCloudSettings `json:"azure,omitempty"`

	// GCP contains Google Cloud Platform specific cluster configuration.
	// +kubebuilder:validation:Optional
	GCP *ClusterGCPCloudSettings `json:"gcp,omitempty"`
}

// ClusterAWSCloudSettings contains AWS-specific configuration for cluster deployment.
type ClusterAWSCloudSettings struct {
	// Region in AWS to deploy this cluster to.
	// Determines data residency, latency characteristics, and available AWS services.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Region string `json:"region"`
}

// ClusterAzureCloudSettings contains Azure-specific configuration for cluster deployment.
type ClusterAzureCloudSettings struct {
	// ResourceGroup specifies the Azure resource group name for organizing cluster resources.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:=myresourcegroup
	ResourceGroup string `json:"resourceGroup"`

	// Network specifies the Azure virtual network name for cluster networking.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:=mynetwork
	Network string `json:"network"`

	// SubscriptionId is the GUID of the Azure subscription that will contain this cluster.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	SubscriptionId string `json:"subscriptionId"`

	// Location specifies the Azure region where this cluster will be deployed.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:=eastus
	Location string `json:"location"`
}

// ClusterGCPCloudSettings contains Google Cloud Platform specific configuration for cluster deployment.
type ClusterGCPCloudSettings struct {
	// Project specifies the GCP project ID where this cluster will be deployed.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Project string `json:"project"`

	// Network specifies the GCP VPC network name for cluster networking.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Network string `json:"network"`

	// Region specifies the GCP region where this cluster will be deployed.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Region string `json:"region"`
}

// ClusterNodePool defines the configuration for a group of worker nodes in the cluster.
type ClusterNodePool struct {
	// Name is the unique identifier for this node pool within the cluster.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Name string `json:"name"`

	// InstanceType specifies the cloud provider instance type for nodes in this pool.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	InstanceType string `json:"instanceType"`

	// MinSize is the minimum number of nodes that must be running in this pool.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Minimum=1
	MinSize int64 `json:"minSize"`

	// MaxSize is the maximum number of nodes that can be running in this pool.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Minimum=1
	MaxSize int64 `json:"maxSize"`

	// Labels are key-value pairs applied to nodes for workload scheduling and organization.
	// +kubebuilder:validation:Optional
	Labels map[string]string `json:"labels,omitempty"`

	// Taints are restrictions applied to nodes to control which pods can be scheduled.
	// +kubebuilder:validation:Optional
	Taints []Taint `json:"taints,omitempty"`

	// CloudSettings contains cloud provider-specific configuration for this node pool.
	// +kubebuilder:validation:Optional
	// +structType=atomic
	CloudSettings *ClusterNodePoolCloudSettings `json:"cloudSettings,omitempty"`
}

// ClusterNodePoolCloudSettings contains cloud provider-specific settings for node pools.
type ClusterNodePoolCloudSettings struct {
	// AWS contains Amazon Web Services specific node pool configuration.
	// +kubebuilder:validation:Optional
	AWS *ClusterNodePoolAWSCloudSettings `json:"aws,omitempty"`
}

// ClusterNodePoolAWSCloudSettings contains AWS-specific configuration for node pool deployment.
type ClusterNodePoolAWSCloudSettings struct {
	// LaunchTemplateId specifies a custom EC2 launch template ID for node provisioning.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	LaunchTemplateId *string `json:"launchTemplateId,omitempty"`
}

// ClusterStatus represents the observed state of a Cluster.
type ClusterStatus struct {
	Status `json:",inline"`

	// CurrentVersion contains the actual Kubernetes version currently running on this cluster.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	CurrentVersion *string `json:"currentVersion,omitempty"`

	// KasURL contains the Kubernetes API Server URL for accessing this cluster.
	// Used by the Console and deployment operators for cluster communication.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	KasURL *string `json:"kasURL,omitempty"`

	// PingedAt contains the timestamp of the last successful cluster health check.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	PingedAt *string `json:"pingedAt,omitempty"`
}
