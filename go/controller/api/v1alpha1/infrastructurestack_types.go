/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&InfrastructureStack{}, &InfrastructureStackList{})
}

// +kubebuilder:object:root=true

// InfrastructureStackList contains a list of InfrastructureStack resources.
type InfrastructureStackList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []InfrastructureStack `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the InfrastructureStack in the Console API."

// InfrastructureStack provides a scalable framework to manage infrastructure as code with a K8s-friendly, API-driven approach.
// It declaratively defines a stack with a type, Git repository location, and target cluster for execution.
// On each commit to the tracked repository, a run is created which the Plural deployment operator detects
// and executes on the targeted cluster, enabling fine-grained permissions and network location control for IaC runs.
type InfrastructureStack struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   InfrastructureStackSpec `json:"spec,omitempty"`
	Status Status                  `json:"status,omitempty"`
}

// InfrastructureStackSpec defines the desired state of the InfrastructureStack.
type InfrastructureStackSpec struct {
	// Name of this stack.
	// If not provided, the name from InfrastructureStack.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Type specifies the IaC tool to use for executing the stack.
	// One of TERRAFORM, ANSIBLE, CUSTOM.
	// +kubebuilder:validation:Enum=TERRAFORM;ANSIBLE;CUSTOM
	// +kubebuilder:validation:Required
	Type console.StackType `json:"type"`

	// Interval specifies the interval at which the stack will be reconciled, default is 5m
	// +kubebuilder:validation:Optional
	Interval *string `json:"interval,omitempty"`

	// RepositoryRef references the GitRepository containing the IaC source code.
	// +kubebuilder:validation:Required
	RepositoryRef corev1.ObjectReference `json:"repositoryRef"`

	// ClusterRef references the target Cluster where this stack will be executed.
	// +kubebuilder:validation:Required
	ClusterRef corev1.ObjectReference `json:"clusterRef"`

	// ProjectRef references a project this stack belongs to.
	// If not provided, it will use the default project.
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// Git contains reference within the repository where the IaC manifests are located.
	Git GitRef `json:"git"`

	// ManageState indicates whether Plural should manage the Terraform state of this stack.
	// +kubebuilder:validation:Optional
	ManageState *bool `json:"manageState,omitempty"`

	// Workdir specifies the working directory within the Git repository to execute commands in.
	// It is useful for projects with external modules or nested folder structures.
	// +kubebuilder:validation:Optional
	Workdir *string `json:"workdir,omitempty"`

	// JobSpec contains an optional configuration for the job that will apply this stack.
	// +kubebuilder:validation:Optional
	JobSpec *JobSpec `json:"jobSpec,omitempty"`

	// Configuration specifies version/image config for the IaC tool being used.
	// +kubebuilder:validation:Optional
	Configuration *StackConfiguration `json:"configuration,omitempty"`

	// Cron configuration for automated, scheduled generation of stack runs.
	// +kubebuilder:validation:Optional
	Cron *StackCron `json:"cron,omitempty"`

	// Approval when set to true, requires human approval before Terraform apply triggers,
	// ensuring verification of the plan to reduce misconfiguration risk.
	// +kubebuilder:validation:Optional
	Approval *bool `json:"approval,omitempty"`

	// Bindings contain read and write policies of this stack.
	// +kubebuilder:validation:Optional
	Bindings *Bindings `json:"bindings,omitempty"`

	// Environment variables to inject into the stack execution environment.
	// +kubebuilder:validation:Optional
	Environment []StackEnvironment `json:"environment,omitempty"`

	// Files to mount from Secrets into the stack execution environment,
	// commonly used for cloud credentials (though IRSA/Workload Identity is preferred).
	// +kubebuilder:validation:Optional
	Files []StackFile `json:"files,omitempty"`

	// Detach indicates whether to detach the stack on deletion instead of destroying it.
	// This leaves all cloud resources in place.
	// +kubebuilder:validation:Optional
	Detach bool `json:"detach,omitempty"`

	// Actor is a user email to use for default Plural authentication in this stack.
	// +kubebuilder:validation:Optional
	Actor *string `json:"actor,omitempty"`

	// +kubebuilder:validation:Optional
	ScmConnectionRef *corev1.ObjectReference `json:"scmConnectionRef,omitempty"`

	// +kubebuilder:validation:Optional
	StackDefinitionRef *corev1.ObjectReference `json:"stackDefinitionRef,omitempty"`

	// ObservableMetrics is a list of metrics to poll to determine if a stack run should be canceled.
	// +kubebuilder:validation:Optional
	ObservableMetrics []ObservableMetric `json:"observableMetrics,omitempty"`

	// Tags represent a set of key-value pairs that can be used to filter stacks.
	// +kubebuilder:validation:Optional
	Tags map[string]string `json:"tags,omitempty"`

	// Variables represent a file with variables in the stack run environment.
	// It will be automatically passed to the specific tool depending on the
	// stack Type (except [console.StackTypeCustom]).
	// +kubebuilder:validation:Optional
	Variables *runtime.RawExtension `json:"variables,omitempty"`

	// PolicyEngine is a configuration for applying policy enforcement to a stack.
	// +kubebuilder:validation:Optional
	PolicyEngine *PolicyEngine `json:"policyEngine,omitempty"`

	// AgentId represents agent session ID that created this stack.
	// It is used for UI linking and otherwise ignored.
	// +kubebuilder:validation:Optional
	AgentId *string `json:"agentId,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

// StackFile represents	a file to mount from secrets into the stack execution environment.
type StackFile struct {
	// MountPath is the path where the file will be mounted in the stack execution environment.
	MountPath string `json:"mountPath"`

	// SecretRef is a reference to the secret containing the file.
	SecretRef corev1.LocalObjectReference `json:"secretRef"`
}

type StackConfiguration struct {
	// Image contains the optional Docker image to use for the IaC tool.
	// If not provided, the default image for the tool will be used.
	// +kubebuilder:validation:Optional
	Image *string `json:"image,omitempty"`

	// Version of the IaC tool to use.
	// +kubebuilder:validation:Optional
	Version *string `json:"version,omitempty"`

	// Tag of the IaC tool Docker image to use.
	// +kubebuilder:validation:Optional
	Tag *string `json:"tag,omitempty"`

	// Hooks to run at various stages of the stack run.
	// +kubebuilder:validation:Optional
	Hooks []*StackHook `json:"hooks,omitempty"`

	// Terraform configuration for this stack.
	// +kubebuilder:validation:Optional
	Terraform *TerraformConfiguration `json:"terraform,omitempty"`

	// Ansible configuration for this stack.
	// +kubebuilder:validation:Optional
	Ansible *AnsibleConfiguration `json:"ansible,omitempty"`

	// AiApproval configuration for this stack to be auto-approved by AI according to rules sourced from Git.
	// +kubebuilder:validation:Optional
	AiApproval *AiApprovalConfiguration `json:"aiApproval,omitempty"`
}

type TerraformConfiguration struct {
	// Parallelism is the number of concurrent operations to run,
	// equivalent to the -parallelism flag in Terraform.
	// +kubebuilder:validation:Optional
	Parallelism *int64 `json:"parallelism,omitempty"`

	// Refresh is whether to refresh the state of the stack,
	// equivalent to the -refresh flag in Terraform.
	// +kubebuilder:validation:Optional
	Refresh *bool `json:"refresh,omitempty"`
}

type AnsibleConfiguration struct {
	// Playbook is the ansible playbook to run.
	// +kubebuilder:validation:Optional
	Playbook *string `json:"playbook,omitempty"`

	// Inventory is the ansible inventory file to use.  We recommend checking this into git alongside your playbook files, and referencing it with a relative path.
	// +kubebuilder:validation:Optional
	Inventory *string `json:"inventory,omitempty"`

	// Additional args for the ansible playbook command.
	// +kubebuilder:validation:Optional
	AdditionalArgs []*string `json:"additionalArgs,omitempty"`
}

type AiApprovalConfiguration struct {
	// Enabled indicates if AI approval is enabled for this stack.
	// +kubebuilder:validation:Required
	Enabled bool `json:"enabled,omitempty"`

	// Git references the Git repository containing the rules file.
	// +kubebuilder:validation:Required
	Git GitRef `json:"git"`

	// File is the name of the rules file within the Git repository.
	// +kubebuilder:validation:Required
	File string `json:"file"`

	// IgnoreCancel indicates if the cancellation of a stack run should be ignored by AI.
	// +kubebuilder:validation:Optional
	IgnoreCancel *bool `json:"ignoreCancel,omitempty"`
}

func (in *AiApprovalConfiguration) Attributes() *console.AiApprovalAttributes {
	if in == nil {
		return nil
	}

	cancel := false
	if in.IgnoreCancel != nil {
		cancel = *in.IgnoreCancel
	}

	return &console.AiApprovalAttributes{
		Enabled:      in.Enabled,
		IgnoreCancel: cancel,
		Git:          *in.Git.Attributes(),
		File:         in.File,
	}
}

type StackCron struct {
	// The crontab on which to spawn stack runs.
	Crontab string `json:"crontab"`

	// Whether to automatically approve cron-spawned runs.
	// +kubebuilder:validation:Optional
	AutoApprove *bool `json:"autoApprove"`

	// Overrides for the cron triggered stack run configuration.
	// +kubebuilder:validation:Optional
	Overrides *StackOverrides `json:"overrides,omitempty"`
}

type StackOverrides struct {
	// Terraform is the terraform configuration for this stack
	// +kubebuilder:validation:Optional
	Terraform *TerraformConfiguration `json:"terraform,omitempty"`
}

type StackHook struct {
	// Cmd is the command to execute.
	// +kubebuilder:validation:Required
	Cmd string `json:"cmd"`

	// Args contain optional arguments to pass to the command.
	// +kubebuilder:validation:Optional
	Args []string `json:"args,omitempty"`

	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=INIT;PLAN;VERIFY;APPLY;DESTROY
	AfterStage console.StepStage `json:"afterStage"`
}

type StackEnvironment struct {
	// Name of the environment variable to set.
	// +kubebuilder:validation:Required
	Name string `json:"name"`

	// Value of the environment variable to set.
	// +kubebuilder:validation:Optional
	Value *string `json:"value,omitempty"`

	// SecretKeyRef references a key in a Secret to set the environment variable value.
	// +kubebuilder:validation:Optional
	SecretKeyRef *corev1.SecretKeySelector `json:"secretKeyRef,omitempty"`

	// ConfigMapRef references a key in a ConfigMap to set the environment variable value.
	// +kubebuilder:validation:Optional
	ConfigMapRef *corev1.ConfigMapKeySelector `json:"configMapRef,omitempty"`
}

func (p *InfrastructureStack) StackName() string {
	if p.Spec.Name != nil && len(*p.Spec.Name) > 0 {
		return *p.Spec.Name
	}

	return p.Name
}

func (p *InfrastructureStack) ProjectName() string {
	if p.Spec.ProjectRef == nil {
		return ""
	}

	return p.Spec.ProjectRef.Name
}

func (p *InfrastructureStack) HasProjectRef() bool {
	return p.Spec.ProjectRef != nil
}

func (p *InfrastructureStack) StackDefinitionObjectKey() client.ObjectKey {
	if p.Spec.StackDefinitionRef == nil {
		return client.ObjectKey{}
	}

	return client.ObjectKey{
		Name:      p.Spec.StackDefinitionRef.Name,
		Namespace: p.Spec.StackDefinitionRef.Namespace,
	}
}

func (p *InfrastructureStack) HasStackDefinitionRef() bool {
	return p.Spec.StackDefinitionRef != nil
}

func (p *InfrastructureStack) HasObservableMetrics() bool {
	return len(p.Spec.ObservableMetrics) > 0
}

func (p *InfrastructureStack) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

type ObservableMetric struct {
	// +kubebuilder:validation:Required
	Identifier string `json:"identifier"`

	// +kubebuilder:validation:Required
	ObservabilityProviderRef corev1.ObjectReference `json:"observabilityProviderRef"`
}

// PolicyEngine defines configuration for applying policy enforcement to a stack.
type PolicyEngine struct {
	// Type of the policy engine to use with this stack.
	// At the moment only TRIVY is supported.
	// +kubebuilder:validation:Enum=TRIVY
	// +kubebuilder:validation:Required
	Type console.PolicyEngineType `json:"type"`

	// MaxSeverity is the maximum allowed severity without failing the stack run.
	// One of UNKNOWN, LOW, MEDIUM, HIGH, CRITICAL, NONE.
	// +kubebuilder:validation:Enum=UNKNOWN;LOW;MEDIUM;HIGH;CRITICAL;NONE
	// +kubebuilder:validation:Optional
	MaxSeverity *console.VulnSeverity `json:"maxSeverity,omitempty"`
}

func (in *PolicyEngine) Attributes() *console.PolicyEngineAttributes {
	if in == nil {
		return nil
	}

	return &console.PolicyEngineAttributes{
		Type:        in.Type,
		MaxSeverity: in.MaxSeverity,
	}
}
