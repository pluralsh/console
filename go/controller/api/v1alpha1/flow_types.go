package v1alpha1

import (
	console "github.com/pluralsh/console/go/client"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// FlowSpec defines the desired state of Flow
type FlowSpec struct {
	// Name of this Flow. If not provided Flow's own name from Flow.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Longform description of the service managed by this flow
	// +kubebuilder:validation:Optional
	Description *string `json:"description,omitempty"`

	// Optional image icon for the flow to apply branding or improve identification
	// +kubebuilder:validation:Optional
	Icon *string `json:"icon,omitempty"`

	// ProjectRef allows a global service to span a specific project only
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// Bindings contain read and write policies of this Flow
	// +kubebuilder:validation:Optional
	Bindings *Bindings `json:"bindings,omitempty"`

	// ServerAssociations contains a list of MCP services you wish to associate with this flow. Can also be managed within the Plural Console UI securely.
	// +kubebuilder:validation:Optional
	ServerAssociations []FlowServerAssociation `json:"serverAssociations,omitempty"`
}

type FlowServerAssociation struct {
	// +kubebuilder:validation:Required
	MCPServerRef corev1.ObjectReference `json:"mcpServerRef,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:resource:scope=Namespaced
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Flow Id"

// Flow is the Schema for the flows API
type Flow struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   FlowSpec `json:"spec,omitempty"`
	Status Status   `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// FlowList contains a list of Flow
type FlowList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Flow `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Flow{}, &FlowList{})
}

func (in *Flow) FlowName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

func (in *Flow) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *Flow) Attributes(projectID *string, serverAssociations []*console.McpServerAssociationAttributes) console.FlowAttributes {
	attrs := console.FlowAttributes{
		Name:               in.FlowName(),
		Description:        in.Spec.Description,
		Icon:               in.Spec.Icon,
		ProjectID:          projectID,
		ServerAssociations: serverAssociations,
	}

	if in.Spec.Bindings != nil {
		attrs.ReadBindings = PolicyBindings(in.Spec.Bindings.Read)
		attrs.WriteBindings = PolicyBindings(in.Spec.Bindings.Write)
	}
	return attrs
}

func (in *Flow) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *FlowSpec) HasProjectRef() bool {
	return in.ProjectRef != nil
}
