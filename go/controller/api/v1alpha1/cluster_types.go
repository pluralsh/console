package v1alpha1

import (
	"bytes"
	"slices"
	"strings"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/json"
)

func init() {
	SchemeBuilder.Register(&Cluster{}, &ClusterList{})
}

// ClusterList ...
// +kubebuilder:object:root=true
type ClusterList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Cluster `json:"items"`
}

// Cluster ...
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="CurrentVersion",type="string",JSONPath=".status.currentVersion",description="Current Kubernetes version"
// +kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Console ID"
type Cluster struct {
	metav1.TypeMeta `json:",inline"`

	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec ClusterSpec `json:"spec,omitempty"`

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

func (c *Cluster) Attributes(providerId, projectId *string) console.ClusterAttributes {
	attrs := console.ClusterAttributes{
		Name:          c.ConsoleName(),
		Handle:        c.Spec.Handle,
		ProviderID:    providerId,
		ProjectID:     projectId,
		Version:       c.Spec.Version,
		Protect:       c.Spec.Protect,
		CloudSettings: c.Spec.CloudSettings.Attributes(),
		NodePools: algorithms.Map(c.Spec.NodePools,
			func(np ClusterNodePool) *console.NodePoolAttributes { return np.Attributes() }),
	}

	if c.Spec.Tags != nil {
		tags := make([]*console.TagAttributes, 0)
		for name, value := range c.Spec.Tags {
			tags = append(tags, &console.TagAttributes{Name: name, Value: value})
		}
		attrs.Tags = tags
	}

	if c.Spec.Metadata != nil {
		attrs.Metadata = lo.ToPtr(string(c.Spec.Metadata.Raw))
	}

	if c.Spec.Bindings != nil {
		attrs.ReadBindings = PolicyBindings(c.Spec.Bindings.Read)
		attrs.WriteBindings = PolicyBindings(c.Spec.Bindings.Write)
	}

	return attrs
}

func (c *Cluster) UpdateAttributes() console.ClusterUpdateAttributes {
	nodePools := algorithms.Map(c.Spec.NodePools, func(np ClusterNodePool) *console.NodePoolAttributes { return np.Attributes() })
	slices.SortFunc(nodePools, func(a, b *console.NodePoolAttributes) int { return strings.Compare(a.Name, b.Name) })
	tagAttr := c.TagUpdateAttributes()
	attr := console.ClusterUpdateAttributes{
		Name:      lo.ToPtr(c.ConsoleName()),
		Handle:    c.Spec.Handle,
		Version:   c.Spec.Version,
		Protect:   c.Spec.Protect,
		NodePools: nodePools,
		Tags:      tagAttr.Tags,
		Metadata:  tagAttr.Metadata,
	}
	if c.Spec.Bindings != nil {
		attr.ReadBindings = PolicyBindings(c.Spec.Bindings.Read)
		attr.WriteBindings = PolicyBindings(c.Spec.Bindings.Write)
	}
	return attr
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

type ClusterSpec struct {
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
	ProviderRef *corev1.ObjectReference `json:"providerRef,omitempty"`

	// ProjectRef references project this cluster belongs to.
	// If not provided, it will use the default project.
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// Cloud provider to use for this cluster.
	// +kubebuilder:validation:Optional
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
	NodePools []ClusterNodePool `json:"nodePools"`
}

func (cs *ClusterSpec) HasHandle() bool {
	return cs.Handle != nil
}

func (cs *ClusterSpec) IsProviderRefRequired() bool {
	return cs.Cloud != "byok"
}

func (cs *ClusterSpec) HasProviderRef() bool {
	return cs.ProviderRef != nil
}

func (cs *ClusterSpec) HasProjectRef() bool {
	return cs.ProjectRef != nil
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

func (cs *ClusterCloudSettings) Attributes() *console.CloudSettingsAttributes {
	if cs == nil {
		return nil
	}

	return &console.CloudSettingsAttributes{
		AWS:   cs.AWS.Attributes(),
		Azure: cs.Azure.Attributes(),
		GCP:   cs.GCP.Attributes(),
	}
}

type ClusterAWSCloudSettings struct {
	// Region in AWS to deploy this cluster to.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Region string `json:"region"`
}

func (cs *ClusterAWSCloudSettings) Attributes() *console.AWSCloudAttributes {
	if cs == nil {
		return nil
	}

	return &console.AWSCloudAttributes{
		Region: &cs.Region,
	}
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

func (cs *ClusterAzureCloudSettings) Attributes() *console.AzureCloudAttributes {
	if cs == nil {
		return nil
	}

	return &console.AzureCloudAttributes{
		Location:       &cs.Location,
		SubscriptionID: &cs.SubscriptionId,
		ResourceGroup:  &cs.ResourceGroup,
		Network:        &cs.Network,
	}
}

type ClusterGCPCloudSettings struct {
	// Project in GCP to deploy cluster to.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Project string `json:"project"`

	// Network in GCP to use when creating the cluster.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Network string `json:"network"`

	// Region in GCP to deploy cluster to.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Region string `json:"region"`
}

func (cs *ClusterGCPCloudSettings) Attributes() *console.GCPCloudAttributes {
	if cs == nil {
		return nil
	}

	return &console.GCPCloudAttributes{
		Project: &cs.Project,
		Network: &cs.Network,
		Region:  &cs.Region,
	}
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
	MinSize int64 `json:"minSize"`

	// MaxSize is maximum number of instances in this node pool.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Minimum=1
	MaxSize int64 `json:"maxSize"`

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

func (np *ClusterNodePool) Attributes() *console.NodePoolAttributes {
	if np == nil {
		return nil
	}

	taints := algorithms.Map(np.Taints, func(t Taint) *console.TaintAttributes { return t.Attributes() })
	slices.SortFunc(taints, func(a, b *console.TaintAttributes) int { return strings.Compare(a.Key, b.Key) })

	attrs := &console.NodePoolAttributes{
		Name:          np.Name,
		MinSize:       np.MinSize,
		MaxSize:       np.MaxSize,
		InstanceType:  np.InstanceType,
		CloudSettings: np.CloudSettings.Attributes(),
		Taints:        taints,
	}

	if np.Labels != nil {
		if marshalledLabels, err := json.Marshal(np.Labels); err == nil { // Ignoring errors.
			labels := bytes.NewBuffer(marshalledLabels).String()
			attrs.Labels = &labels
		}
	}

	return attrs
}

type ClusterNodePoolCloudSettings struct {
	// AWS node pool customizations.
	// +kubebuilder:validation:Optional
	AWS *ClusterNodePoolAWSCloudSettings `json:"aws,omitempty"`
}

func (cs *ClusterNodePoolCloudSettings) Attributes() *console.NodePoolCloudAttributes {
	if cs == nil {
		return nil
	}

	return &console.NodePoolCloudAttributes{
		AWS: cs.AWS.Attributes(),
	}
}

type ClusterNodePoolAWSCloudSettings struct {
	// LaunchTemplateId is an ID of custom launch template for your nodes. Useful for Golden AMI setups.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	LaunchTemplateId *string `json:"launchTemplateId,omitempty"`
}

func (cs *ClusterNodePoolAWSCloudSettings) Attributes() *console.AWSNodeCloudAttributes {
	if cs == nil {
		return nil
	}

	return &console.AWSNodeCloudAttributes{
		LaunchTemplateID: cs.LaunchTemplateId,
	}
}

type ClusterStatus struct {
	Status `json:",inline"`

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
