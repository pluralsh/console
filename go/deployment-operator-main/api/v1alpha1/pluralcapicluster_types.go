package v1alpha1

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sClient "sigs.k8s.io/controller-runtime/pkg/client"
)

func init() {
	SchemeBuilder.Register(&PluralCAPIClusterList{}, &PluralCAPICluster{})
}

// PluralCAPIClusterList contains a list of [PluralCAPICluster]
// +kubebuilder:object:root=true
type PluralCAPIClusterList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []PluralCAPICluster `json:"items"`
}

// PluralCAPICluster is the Schema for the CAPI cluster configuration
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
type PluralCAPICluster struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec of the CAPI cluster configuration
	// +kubebuilder:validation:Required
	Spec CapiConfigurationClusterSpec `json:"spec"`

	// Status of the CAPI cluster configuration
	// +kubebuilder:validation:Optional
	Status Status `json:"status,omitempty"`
}

type CapiConfigurationClusterSpec struct {
	// Cluster is a simplified representation of the Console API cluster
	// object. See [ClusterSpec] for more information.
	// +kubebuilder:validation:Optional
	Cluster *ClusterSpec `json:"cluster,omitempty"`

	// TokenSecretRef contains the reference to the secret holding the token to access the Console API
	// +kubebuilder:validation:Required
	ConsoleTokenSecretRef corev1.SecretKeySelector `json:"consoleTokenSecretRef"`

	// CapiClusterRef contains the reference to the CAPI cluster
	// +kubebuilder:validation:Required
	CapiClusterRef corev1.ObjectReference `json:"capiClusterRef"`

	// Agent allows configuring agent specific helm chart options.
	// +kubebuilder:validation:Optional
	Agent *AgentHelmConfiguration `json:"agent,omitempty"`
}

func (in *CapiConfigurationClusterSpec) GetAgent() *AgentHelmConfiguration {
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

func (in *PluralCAPICluster) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *PluralCAPICluster) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *PluralCAPICluster) ClusterName() string {
	if in.Spec.Cluster != nil && in.Spec.Cluster.Handle != nil {
		return lo.FromPtr(in.Spec.Cluster.Handle)
	}
	return in.Name
}

func (in *PluralCAPICluster) GetConsoleToken(ctx context.Context, c k8sClient.Client) (string, error) {
	secret := &corev1.Secret{}

	if err := c.Get(
		ctx,
		k8sClient.ObjectKey{Name: in.Spec.ConsoleTokenSecretRef.Name, Namespace: in.Namespace},
		secret,
	); err != nil {
		return "", err
	}

	token, exists := secret.Data[in.Spec.ConsoleTokenSecretRef.Key]
	if !exists {
		return "", fmt.Errorf("secret %s/%s does not contain console token", in.Namespace, in.Spec.ConsoleTokenSecretRef.Name)
	}

	return string(token), nil
}

func (in *PluralCAPICluster) Attributes() console.ClusterAttributes {
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

// ConvertClusterAttributesToUpdate converts a console.ClusterAttributes into console.ClusterUpdateAttributes
func ConvertClusterAttributesToUpdate(a console.ClusterAttributes) console.ClusterUpdateAttributes {
	up := console.ClusterUpdateAttributes{
		Name: lo.ToPtr(a.Name),
	}

	if a.Handle != nil {
		up.Handle = a.Handle
	}
	if a.Tags != nil {
		up.Tags = a.Tags
	}
	if a.Metadata != nil {
		up.Metadata = a.Metadata
	}
	if a.ReadBindings != nil {
		up.ReadBindings = a.ReadBindings
	}
	if a.WriteBindings != nil {
		up.WriteBindings = a.WriteBindings
	}

	return up
}

// UpdateAttributes returns the update attributes for this CR by converting
// the value returned from Attributes().
func (in *PluralCAPICluster) UpdateAttributes() console.ClusterUpdateAttributes {
	return ConvertClusterAttributesToUpdate(in.Attributes())
}
