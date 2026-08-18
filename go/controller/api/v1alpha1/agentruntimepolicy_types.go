package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&AgentRuntimePolicy{}, &AgentRuntimePolicyList{})
}

//+kubebuilder:object:root=true

// AgentRuntimePolicyList contains a list of AgentRuntimePolicy resources.
type AgentRuntimePolicyList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AgentRuntimePolicy `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Runtime",type="string",JSONPath=".spec.runtime",description="Name of the AgentRuntime this policy applies to."
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the AgentRuntime in the Console API."

// AgentRuntimePolicy centrally defines who can create agent runs on an AgentRuntime.
// Bindings must be managed from the management cluster: if a target cluster could set
// its own bindings, cluster operators could grant themselves clone/PR access against
// any repository reachable by the runtime's SCM credentials.
type AgentRuntimePolicy struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AgentRuntimePolicySpec `json:"spec,omitempty"`
	Status Status                 `json:"status,omitempty"`
}

// RuntimeName returns the AgentRuntime name this policy applies to.
// It returns spec.runtime when set, otherwise metadata.name.
func (in *AgentRuntimePolicy) RuntimeName() string {
	if in.Spec.Runtime != nil && len(*in.Spec.Runtime) > 0 {
		return *in.Spec.Runtime
	}

	return in.Name
}

// SetCondition sets a condition on the AgentRuntimePolicy status.
func (in *AgentRuntimePolicy) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *AgentRuntimePolicy) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

// AgentRuntimePolicySpec defines the desired access policy for an AgentRuntime.
type AgentRuntimePolicySpec struct {
	// Runtime is the name of the AgentRuntime this policy applies to.
	// Defaults to metadata.name if not specified.
	// +kubebuilder:validation:Optional
	Runtime *string `json:"runtime,omitempty"`

	// Bindings define who can create agent runs on the targeted runtime.
	// +kubebuilder:validation:Optional
	Bindings *AgentRuntimePolicyBindings `json:"bindings,omitempty"`

	// ClusterRef references the target Cluster where this service will be deployed. Leave it as an empty struct to use the cluster field instead.
	// +kubebuilder:validation:Optional
	ClusterRef corev1.ObjectReference `json:"clusterRef"`

	// Cluster is the handle of the target Cluster where this service will be deployed. Leave it empty to use the clusterRef field instead.
	// +kubebuilder:validation:Optional
	Cluster *string `json:"cluster,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

// AgentRuntimePolicyBindings defines create permissions for an AgentRuntime.
type AgentRuntimePolicyBindings struct {
	// Create bindings control who can create agent runs on this runtime.
	// +kubebuilder:validation:Optional
	Create []Binding `json:"create,omitempty"`
}
