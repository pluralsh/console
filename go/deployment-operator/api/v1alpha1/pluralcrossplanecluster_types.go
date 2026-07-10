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
	SchemeBuilder.Register(&PluralCrossplaneClusterList{}, &PluralCrossplaneCluster{})
}

// PluralCrossplanelusterList contains a list of [PluralCrossplaneCluster]
// +kubebuilder:object:root=true
type PluralCrossplaneClusterList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []PluralCrossplaneCluster `json:"items"`
}

// PluralCrossplaneCluster is the Schema for the Crossplane cluster configuration
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
type PluralCrossplaneCluster struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec of the Crossplane cluster configuration
	// +kubebuilder:validation:Required
	Spec CrossplaneConfigurationClusterSpec `json:"spec"`

	// Status of the Crossplane cluster configuration
	// +kubebuilder:validation:Optional
	Status Status `json:"status,omitempty"`
}

type CrossplaneConfigurationClusterSpec struct {
	// Cluster is a simplified representation of the Console API cluster
	// object. See [ClusterSpec] for more information.
	// +kubebuilder:validation:Optional
	Cluster *ClusterSpec `json:"cluster,omitempty"`

	// TokenSecretRef contains the reference to the secret holding the token to access the Console API
	// +kubebuilder:validation:Required
	ConsoleTokenSecretRef corev1.SecretKeySelector `json:"consoleTokenSecretRef"`

	// CrossplaneClusterRef contains the reference to the Crossplane cluster
	// +kubebuilder:validation:Required
	CrossplaneClusterRef corev1.ObjectReference `json:"crossplaneClusterRef"`

	// Agent allows configuring agent specific helm chart options.
	// +kubebuilder:validation:Optional
	Agent *AgentHelmConfiguration `json:"agent,omitempty"`
}

func (in *CrossplaneConfigurationClusterSpec) GetAgent() *AgentHelmConfiguration {
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

func (in *PluralCrossplaneCluster) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *PluralCrossplaneCluster) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *PluralCrossplaneCluster) ClusterName() string {
	if in.Spec.Cluster != nil && in.Spec.Cluster.Handle != nil {
		return lo.FromPtr(in.Spec.Cluster.Handle)
	}
	return in.Name
}

func (in *PluralCrossplaneCluster) GetConsoleToken(ctx context.Context, c k8sClient.Client) (string, error) {
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

func (in *PluralCrossplaneCluster) Attributes() console.ClusterAttributes {
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

// UpdateAttributes returns the update attributes for this CR by converting
// the value returned from Attributes().
func (in *PluralCrossplaneCluster) UpdateAttributes() console.ClusterUpdateAttributes {
	return ConvertClusterAttributesToUpdate(in.Attributes())
}
