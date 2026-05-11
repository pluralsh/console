package v1alpha1

import (
	console "github.com/pluralsh/console/go/client"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const AgentRunIDLabel = "deployments.plural.sh/agent-run-id"

// AgentRunSpec defines the desired state of AgentRun
type AgentRunSpec struct {
	// +kubebuilder:validation:Required
	RuntimeRef AgentRuntimeReference `json:"runtimeRef"`

	// Prompt is the task/prompt given to the agent
	// +kubebuilder:validation:Required
	Prompt string `json:"prompt"`

	// Repository is the git repository the agent will work with
	// +kubebuilder:validation:Required
	Repository string `json:"repository"`

	// Mode defines how the agent should run (ANALYZE, WRITE)
	// +kubebuilder:validation:Required
	Mode console.AgentRunMode `json:"mode"`

	// FlowID is the flow this agent run is associated with (optional)
	// +kubebuilder:validation:Optional
	FlowID *string `json:"flowId,omitempty"`

	// Language is the programming language used in the agent run.
	// +kubebuilder:validation:Optional
	Language *console.AgentRunLanguage `json:"language,omitempty"`

	// LanguageVersion is the version of the language to use, if you wish to specify.
	// +kubebuilder:validation:Optional
	LanguageVersion *string `json:"languageVersion,omitempty"`
}

// AgentRunStatus defines the observed state of AgentRun
type AgentRunStatus struct {
	// PodRef references the pod running this agent
	// +kubebuilder:validation:Optional
	PodRef *corev1.ObjectReference `json:"podRef,omitempty"`

	// Phase represents the current phase of the agent run
	// +kubebuilder:validation:Optional
	Phase AgentRunPhase `json:"phase,omitempty"`

	// StartTime is when the agent run started
	// +kubebuilder:validation:Optional
	StartTime *metav1.Time `json:"startTime,omitempty"`

	// EndTime is when the agent run completed
	// +kubebuilder:validation:Optional
	EndTime *metav1.Time `json:"endTime,omitempty"`

	// Error message if the run failed
	// +kubebuilder:validation:Optional
	Error *string `json:"error,omitempty"`

	// Standard status fields (includes ID field for console API)
	Status `json:",inline"`
}

type AgentRuntimeReference struct {
	// +kubebuilder:validation:Required
	Name string `json:"name"`
}

// AgentRunPhase represents the phase of an agent run
// +kubebuilder:validation:Enum=Pending;Running;Succeeded;Failed;Cancelled
type AgentRunPhase string

const (
	AgentRunPhasePending   AgentRunPhase = "Pending"
	AgentRunPhaseRunning   AgentRunPhase = "Running"
	AgentRunPhaseSucceeded AgentRunPhase = "Succeeded"
	AgentRunPhaseFailed    AgentRunPhase = "Failed"
	AgentRunPhaseCancelled AgentRunPhase = "Cancelled"
)

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced
//+kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Console ID"

// AgentRun is the Schema for the agentruns API
type AgentRun struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AgentRunSpec   `json:"spec,omitempty"`
	Status AgentRunStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// AgentRunList contains a list of AgentRun
type AgentRunList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AgentRun `json:"items"`
}

func init() {
	SchemeBuilder.Register(&AgentRun{}, &AgentRunList{})
}

func (in *AgentRun) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *AgentRun) IsPending() bool {
	return in.Status.Phase == AgentRunPhasePending
}

func (in *AgentRun) IsRunning() bool {
	return in.Status.Phase == AgentRunPhaseRunning
}

func (in *AgentRun) IsSucceeded() bool {
	return in.Status.Phase == AgentRunPhaseSucceeded
}

func (in *AgentRun) IsFailed() bool {
	return in.Status.Phase == AgentRunPhaseFailed
}

func (in *AgentRun) IsCancelled() bool {
	return in.Status.Phase == AgentRunPhaseCancelled
}

// Attributes converts the AgentRun CRD to console API format for creating runs
func (in *AgentRun) Attributes() console.AgentRunAttributes {
	return console.AgentRunAttributes{
		Prompt:     in.Spec.Prompt,
		Repository: in.Spec.Repository,
		Mode:       in.Spec.Mode,
		FlowID:     in.Spec.FlowID,
	}
}

// StatusAttributes converts the AgentRun status to console API format for updating runs.
func (in *AgentRun) StatusAttributes(status console.AgentRunStatus) console.AgentRunStatusAttributes {
	attrs := console.AgentRunStatusAttributes{Status: status}

	if in.Status.PodRef != nil {
		attrs.PodReference = &console.NamespacedName{
			Name:      in.Status.PodRef.Name,
			Namespace: in.Status.PodRef.Namespace,
		}
	}

	return attrs
}

func (in *AgentRun) StatusDiff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Status.PodRef)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *AgentRun) EnsureLabels(agentRuntimeName, agentRunID string) {
	if in.Labels == nil {
		in.Labels = make(map[string]string)
	}

	if agentRunID != "" {
		in.Labels[AgentRunIDLabel] = agentRunID
	}
	if agentRuntimeName != "" {
		in.Labels[AgentRuntimeNameLabel] = agentRuntimeName
	}
}

func (in *AgentRun) GetAgentRunID() string {
	if in.Status.HasID() {
		return in.Status.GetID()
	}

	if in.Labels == nil {
		return ""
	}

	return in.Labels[AgentRunIDLabel]
}
