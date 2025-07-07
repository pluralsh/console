package v1alpha1

import (
	"context"
	console "github.com/pluralsh/console/go/client"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// PrGovernanceSpec defines the desired state of PrGovernance
type PrGovernanceSpec struct {
	Name *string `json:"name,omitempty"`
	// Reference a ScmConnection to reuse its credentials for this PrGovernance's authentication
	// +kubebuilder:validation:Optional
	ConnectionRef *corev1.ObjectReference   `json:"connectionRef,omitempty"`
	Configuration PrGovernanceConfiguration `json:"configuration"`
}

type PrGovernanceConfiguration struct {
	Webhooks PrGovernanceWebhook `json:"webhook"`
}

type PrGovernanceWebhook struct {
	Url string `json:"url"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Cluster
//+kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the PrGovernance in the Console API."

// PrGovernance is the Schema for the prgovernances API
type PrGovernance struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   PrGovernanceSpec `json:"spec,omitempty"`
	Status Status           `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// PrGovernanceList contains a list of PrGovernance
type PrGovernanceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []PrGovernance `json:"items"`
}

func init() {
	SchemeBuilder.Register(&PrGovernance{}, &PrGovernanceList{})
}

func (in *PrGovernance) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *PrGovernance) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *PrGovernance) Attributes(ctx context.Context, client client.Client, governance PrGovernance) (*console.PrGovernanceAttributes, *ctrl.Result, error) {
	attributes := &console.PrGovernanceAttributes{
		Name:          "",
		ConnectionID:  "",
		Configuration: nil,
	}

	return attributes, nil, nil
}
