package v1alpha1

import (
	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

func init() {
	SchemeBuilder.Register(&VirtualClusterList{}, &VirtualCluster{})
}

const (
	VClusterDefaultRepository   = "https://charts.loft.sh"
	VClusterDefaultChartName    = "vcluster"
	VClusterKubeconfigSecretKey = "config"
	AgentDefaultRepository      = "https://pluralsh.github.io/deployment-operator"
	AgentDefaultChartName       = "deployment-operator"
	AgentDefaultReleaseName     = "deploy-operator"
	AgentDefaultNamespace       = "plrl-deploy-operator"
)

// VirtualClusterList contains a list of [VirtualCluster]
// +kubebuilder:object:root=true
type VirtualClusterList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []VirtualCluster `json:"items"`
}

// VirtualCluster is the Schema for the virtual cluster API
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the VirtualCluster in the Console API."
type VirtualCluster struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec ...
	// +kubebuilder:validation:Required
	Spec VirtualClusterSpec `json:"spec"`

	// Status ...
	// +kubebuilder:validation:Optional
	Status VirtualClusterStatus `json:"status,omitempty"`
}

func (in *VirtualCluster) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *VirtualCluster) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *VirtualCluster) Attributes() console.ClusterAttributes {
	attrs := console.ClusterAttributes{
		Name: in.Name,
	}

	if in.Spec.Cluster == nil {
		return attrs
	}

	if in.Spec.Cluster.Handle != nil {
		attrs.Handle = in.Spec.Cluster.Handle
	}

	if in.Spec.Cluster.Tags != nil {
		tags := make([]*console.TagAttributes, 0)
		for name, value := range in.Spec.Cluster.Tags {
			tags = append(tags, &console.TagAttributes{Name: name, Value: value})
		}
		attrs.Tags = tags
	}

	if in.Spec.Cluster.Metadata != nil {
		attrs.Metadata = lo.ToPtr(string(in.Spec.Cluster.Metadata.Raw))
	}

	if in.Spec.Cluster.Bindings != nil {
		attrs.ReadBindings = PolicyBindings(in.Spec.Cluster.Bindings.Read)
		attrs.WriteBindings = PolicyBindings(in.Spec.Cluster.Bindings.Write)
	}

	return attrs
}

type VirtualClusterSpec struct {
	// KubeconfigRef is a reference to the secret created by the
	// vcluster helm chart. It contains kubeconfig with information
	// on how to access created virtual cluster.
	// +kubebuilder:validation:Required
	KubeconfigRef corev1.LocalObjectReference `json:"kubeconfigRef"`

	// CredentialsRef is a reference to the secret pointing to the
	// key that holds Console API access token. It allows to communicate
	// with the standard Console API.
	// +kubebuilder:validation:Required
	CredentialsRef corev1.SecretKeySelector `json:"credentialsRef"`

	// Cluster is a simplified representation of the Console API cluster
	// object. See [ClusterSpec] for more information.
	// +kubebuilder:validation:Optional
	Cluster *ClusterSpec `json:"cluster,omitempty"`

	// External marks this virtual cluster as external one, meaning
	// that the vcluster deployment will not be automatically created.
	// User has to pre-provision vcluster and provide a valid KubeconfigRef
	// pointing to an existing vcluster installation.
	// +kubebuilder:validation:Optional
	External *bool `json:"external,omitempty"`

	// Helm allows configuring helm chart options of both agent and vcluster.
	// It is then deployed by the [VirtualCluster] CRD controller.
	// +kubebuilder:validation:Optional
	Helm *HelmSpec `json:"helm,omitempty"`
}

func (in *VirtualClusterSpec) IsExternal() bool {
	if in.External == nil {
		return false
	}

	return *in.External
}

type HelmSpec struct {
	// Agent allows configuring agent specific helm chart options.
	// +kubebuilder:validation:Optional
	Agent *AgentHelmConfiguration `json:"agent,omitempty"`

	// VCluster allows configuring vcluster specific helm chart options.
	// +kubebuilder:validation:Optional
	VCluster *VClusterHelmConfiguration `json:"vcluster,omitempty"`
}

func (in *HelmSpec) GetAgent() *AgentHelmConfiguration {
	if in == nil || in.Agent == nil {
		return &AgentHelmConfiguration{
			HelmConfiguration: HelmConfiguration{
				RepoUrl:   lo.ToPtr(AgentDefaultRepository),
				ChartName: lo.ToPtr(AgentDefaultChartName),
			},
		}
	}

	return in.Agent
}

func (in *HelmSpec) GetVCluster() *VClusterHelmConfiguration {
	if in == nil || in.VCluster == nil {
		return &VClusterHelmConfiguration{
			HelmConfiguration: HelmConfiguration{
				RepoUrl:   lo.ToPtr(VClusterDefaultRepository),
				ChartName: lo.ToPtr(VClusterDefaultChartName),
			},
		}
	}

	return in.VCluster
}

type HelmConfiguration struct {
	// ChartName is a helm chart name.
	ChartName *string `json:"chartName,omitempty"`

	// RepoUrl is a url that points to this helm chart.
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Optional
	RepoUrl *string `json:"repoUrl,omitempty"`

	// Values allows defining arbitrary YAML values to pass to the helm as values.yaml file.
	// Use only one of:
	// 	- Values
	//	- ValuesSecretRef
	//	- ValuesConfigMapRef
	// +kubebuilder:validation:Optional
	Values *runtime.RawExtension `json:"values,omitempty"`

	// ValuesSecretRef fetches helm values from a secret in this cluster.
	// Use only one of:
	// 	- Values
	//	- ValuesSecretRef
	//	- ValuesConfigMapRef
	// +kubebuilder:validation:Optional
	ValuesSecretRef *corev1.SecretKeySelector `json:"valuesSecretRef,omitempty"`

	// ValuesConfigMapRef fetches helm values from a config map in this cluster.
	// Use only one of:
	// 	- Values
	//	- ValuesSecretRef
	//	- ValuesConfigMapRef
	// +kubebuilder:validation:Optional
	ValuesConfigMapRef *corev1.ConfigMapKeySelector `json:"valuesConfigMapRef,omitempty"`
}

type AgentHelmConfiguration struct {
	HelmConfiguration `json:",inline"`
}

func (in *AgentHelmConfiguration) GetChartName() string {
	if in == nil || in.ChartName == nil {
		return AgentDefaultChartName
	}

	return *in.ChartName
}

func (in *AgentHelmConfiguration) GetRepoUrl() string {
	if in == nil || in.RepoUrl == nil {
		return AgentDefaultRepository
	}

	return *in.RepoUrl
}

type VClusterHelmConfiguration struct {
	HelmConfiguration `json:",inline"`
}

func (in *VClusterHelmConfiguration) GetChartName() string {
	if in == nil || in.ChartName == nil {
		return VClusterDefaultChartName
	}

	return *in.ChartName
}

func (in *VClusterHelmConfiguration) GetRepoUrl() string {
	if in == nil || in.RepoUrl == nil {
		return VClusterDefaultRepository
	}

	return *in.RepoUrl
}

type ClusterSpec struct {
	// Handle is a short, unique human-readable name used to identify this cluster.
	// Does not necessarily map to the cloud resource name.
	// +kubebuilder:validation:Optional
	// +kubebuilder:example:=myclusterhandle
	Handle *string `json:"handle,omitempty"`

	// Tags used to filter clusters.
	// +kubebuilder:validation:Optional
	Tags map[string]string `json:"tags,omitempty"`

	// Metadata for the cluster
	// +kubebuilder:validation:Optional
	Metadata *runtime.RawExtension `json:"metadata,omitempty"`

	// Bindings contain read and write policies of this cluster
	// +kubebuilder:validation:Optional
	Bindings *Bindings `json:"bindings,omitempty"`
}

type VirtualClusterStatus struct {
	Status `json:",inline"`
}

func (in *VirtualClusterStatus) IsVClusterReady() bool {
	return meta.IsStatusConditionTrue(in.Conditions, VirtualClusterConditionType.String())
}

func (in *VirtualClusterStatus) IsAgentReady() bool {
	return meta.IsStatusConditionTrue(in.Conditions, AgentConditionType.String())
}
