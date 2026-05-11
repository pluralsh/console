package v1alpha1

import (
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// AgentConfigurationSpec defines the desired state of AgentConfiguration
type AgentConfigurationSpec struct {
	// ServicePollInterval defines how often the agent polls for services.
	// Expected format is a duration string (e.g., "30s", "5m").
	// Set to "0s" to disable service polling.
	ServicePollInterval *string `json:"servicePollInterval,omitempty"`

	// ClusterPingInterval specifies the interval at which the agent pings the cluster.
	// Set to "0s" to disable cluster pings.
	ClusterPingInterval *string `json:"clusterPingInterval,omitempty"`

	// CompatibilityUploadInterval determines how frequently the agent uploads compatibility data.
	// Set to "0s" to disable compatibility uploads.
	CompatibilityUploadInterval *string `json:"compatibilityUploadInterval,omitempty"`

	// StackPollInterval sets how often the agent polls for stack updates or changes.
	// Set to "0s" to disable stack polling.
	StackPollInterval *string `json:"stackPollInterval,omitempty"`

	// PipelineGateInterval specifies how frequently the agent checks pipeline gates.
	// Set to "0s" to disable pipeline gate checks.
	PipelineGateInterval *string `json:"pipelineGateInterval,omitempty"`

	// MaxConcurrentReconciles controls the maximum number of concurrent reconcile loops.
	// Higher values can increase throughput at the cost of resource usage.
	MaxConcurrentReconciles *int `json:"maxConcurrentReconciles,omitempty"`

	// VulnerabilityReportUploadInterval sets how often vulnerability reports are uploaded.
	// Set to "0s" to disable vulnerability report uploads.
	VulnerabilityReportUploadInterval *string `json:"vulnerabilityReportUploadInterval,omitempty"`

	// BaseRegistryURL allows overriding the default base registry URL.
	// For stack run jobs, agent run pods, sentinel run jobs.
	BaseRegistryURL *string `json:"baseRegistryURL,omitempty"`

	// MaxSentinelRunJobs limits the number of concurrent SentinelRunJobs that can be active at any given time.
	// Must be greater than 0. Set this field to nil (omit) to disable the limit.
	// +kubebuilder:validation:Minimum=1
	MaxSentinelRunJobs *int `json:"maxSentinelRunJobs,omitempty"`

	// MaxStackRunJobs limits the number of concurrent StackRunJobs that can be active at any given time.
	// Must be greater than 0. Set this field to nil (omit) to disable the limit.
	// +kubebuilder:validation:Minimum=1
	MaxStackRunJobs *int `json:"maxStackRunJobs,omitempty"`

	// MaxAgentRunPods limits the number of concurrent agent run pods that can be active at any given time.
	// Must be greater than 0. Set this field to nil (omit) to disable the limit.
	// +kubebuilder:validation:Minimum=1
	MaxAgentRunPods *int `json:"maxAgentRunPods,omitempty"`

	// DisableWebsocket disables the cluster websocket connection to the Console.
	// When enabled, the agent will rely exclusively on polling instead of receiving
	// push updates. This is useful in large-scale edge deployments where maintaining
	// persistent websocket connections has an infeasible network cost.
	DisableWebsocket *bool `json:"disableWebsocket,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
// +kubebuilder:resource:scope=Cluster

// AgentConfiguration is the deployment operator configuration
type AgentConfiguration struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AgentConfigurationSpec `json:"spec,omitempty"`
	Status Status                 `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// AgentConfigurationList contains a list of AgentConfiguration
type AgentConfigurationList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AgentConfiguration `json:"items"`
}

func init() {
	SchemeBuilder.Register(&AgentConfiguration{}, &AgentConfigurationList{})
}

func (c *AgentConfiguration) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&c.Status.Conditions, condition)
}
