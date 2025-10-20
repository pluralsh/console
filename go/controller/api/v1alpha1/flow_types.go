package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&Flow{}, &FlowList{})
}

//+kubebuilder:object:root=true

// FlowList contains a list of Flow resources.
type FlowList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Flow `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:resource:scope=Namespaced
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Flow Id"

// Flow provides an abstraction layer over complex Kubernetes deployments to simplify application
// management for developers. It groups related services, pipelines, and infrastructure components
// into a single logical unit, making it easier to understand and manage application state.
type Flow struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   FlowSpec `json:"spec,omitempty"`
	Status Status   `json:"status,omitempty"`
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

// ConsoleID implements PluralResource interface
func (in *Flow) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName implements PluralResource interface
func (in *Flow) ConsoleName() string {
	return in.FlowName()
}

func (in *Flow) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

// FlowSpec defines the desired state of Flow
type FlowSpec struct {
	// Name of this Flow. If not provided Flow's own name from Flow.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Description provides a longform description of the service managed by this flow.
	// This field is used for documentation and UI display purposes.
	// +kubebuilder:validation:Optional
	Description *string `json:"description,omitempty"`

	// Icon specifies an optional image icon for the flow to apply branding or improve identification.
	// +kubebuilder:validation:Optional
	Icon *string `json:"icon,omitempty"`

	// ProjectRef allows a global service to be scoped to a specific project only.
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// Bindings contain read and write policies of this Flow.
	// +kubebuilder:validation:Optional
	Bindings *Bindings `json:"bindings,omitempty"`

	// Repositories contains a list of git https urls of the application code repositories used in this flow.
	// +kubebuilder:validation:Optional
	Repositories []string `json:"repositories,omitempty"`

	// ServerAssociations contains a list of MCP services you wish to associate with this flow.
	// Can also be managed within the Plural Console UI securely.
	// +kubebuilder:validation:Optional
	ServerAssociations []FlowServerAssociation `json:"serverAssociations,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

func (in *FlowSpec) HasProjectRef() bool {
	return in.ProjectRef != nil
}

type FlowServerAssociation struct {
	// MCPServerRef is a required reference to an MCP server resource.
	// This establishes the connection between the flow and the server.
	// +kubebuilder:validation:Required
	MCPServerRef corev1.ObjectReference `json:"mcpServerRef,omitempty"`
}
