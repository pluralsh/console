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
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"
)

// PipelineSpec defines the desired state of the Pipeline.
type PipelineSpec struct {
	// Stages represent discrete steps in the deployment pipeline, such as environments (dev, staging, prod)
	// or specific deployment phases that services progress through.
	Stages []PipelineStage `json:"stages,omitempty"`

	// Edges define the dependencies and flow between stages, controlling the execution order
	// and promotion path through the pipeline.
	Edges []PipelineEdge `json:"edges,omitempty"`

	// FlowRef provides contextual linkage to a broader application Flow this pipeline belongs within.
	// +kubebuilder:validation:Optional
	FlowRef *corev1.ObjectReference `json:"flowRef,omitempty"`

	// ProjectRef references the project this pipeline belongs to.
	// If not provided, it will use the default project.
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// Bindings contain read and write policies controlling access to this pipeline.
	// +kubebuilder:validation:Optional
	Bindings *Bindings `json:"bindings,omitempty"`
}

// PipelineStage represents a logical unit within the pipeline, typically corresponding to
// environments (e.g., dev, staging, prod) or specific deployment phases.
type PipelineStage struct {
	// Name of this stage.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Name string `json:"name"`

	// Services deployed in this stage, including optional promotion criteria
	// that dictate when and how services advance to subsequent stages.
	Services []PipelineStageService `json:"services,omitempty"`
}

// PipelineStageService defines a service within a pipeline stage and its promotion rules.
// This enables conditional promotions, a critical part of automating production deployments safely.
type PipelineStageService struct {
	// ServiceRef references the ServiceDeployment being deployed at this stage.
	ServiceRef *corev1.ObjectReference `json:"serviceRef,omitempty"`

	// Criteria defines optional promotion rules that control when and how
	// this service is allowed to advance to the next stage.
	// +kubebuilder:validation:Optional
	Criteria *PipelineStageServicePromotionCriteria `json:"criteria,omitempty"`
}

// PipelineStageServicePromotionCriteria defines actions to perform when promoting this service
// to the next stage, including source references and secrets to copy.
type PipelineStageServicePromotionCriteria struct {
	// ServiceRef pointing to a source ServiceDeployment to promote from.
	// +kubebuilder:validation:Optional
	ServiceRef *corev1.ObjectReference `json:"serviceRef,omitempty"`

	// PrAutomationRef pointing to a source PrAutomation to promote from.
	// +kubebuilder:validation:Optional
	PrAutomationRef *corev1.ObjectReference `json:"prAutomationRef,omitempty"`

	// The repository slug the PrAutomation will use.
	// E.g., pluralsh/console if PR is done against https://github.com/pluralsh/console.
	// +kubebuilder:validation:Optional
	Repository *string `json:"repository,omitempty"`

	// Secrets to copy over in a promotion.
	// +kubebuilder:validation:Optional
	Secrets []*string `json:"secrets,omitempty"`
}

// PipelineEdge defines the flow of execution between stages, controlling promotion paths
// and enabling attachment of gates for additional validation and approval.
type PipelineEdge struct {
	// FromID is stage ID the edge is from, can also be specified by name.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	FromID *string `json:"fromId,omitempty"`

	// ToID is stage ID the edge is to, can also be specified by name.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	ToID *string `json:"toId,omitempty"`

	// From is the name of the pipeline stage this edge emits from.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	From *string `json:"from,omitempty"`

	// To is the name of the pipeline stage this edge points to.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	To *string `json:"to,omitempty"`

	// Gates are any optional promotion gates you wish to configure.
	// +kubebuilder:validation:Optional
	Gates []PipelineGate `json:"gates,omitempty"`
}

// PipelineGate serves as a checkpoint between pipeline stages, enforcing promotion policies.
// Three gate types are supported: APPROVAL (human sign-off), WINDOW (time-based constraints),
// and JOB (custom validation jobs like tests or security scans).
type PipelineGate struct {
	// Name of this gate.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Name string `json:"name"`

	// Type of gate.
	// One of:
	// - APPROVAL (requires human approval)
	// - WINDOW (time-based constraints),
	// - JOB (runs custom validation before allowing promotion).
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=APPROVAL;WINDOW;JOB
	Type console.GateType `json:"type"`

	// ClusterRef specifies the target cluster where this gate will execute.
	// +kubebuilder:validation:Optional
	ClusterRef *corev1.ObjectReference `json:"clusterRef,omitempty"`

	// Spec contains detailed configuration for complex gate types like JOB gates.
	// +kubebuilder:validation:Optional
	Spec *GateSpec `json:"spec,omitempty"`
}

// GateSpec provides detailed configuration for complex gate types, particularly JOB gates.
type GateSpec struct {
	// Job configuration for JOB gate types, enabling custom validation jobs
	// such as integration tests, security scans, or other promotion checks.
	// +kubebuilder:validation:Optional
	Job *JobSpec `json:"job,omitempty"`
}

// JobSpec defines a Kubernetes Job to execute as part of a JOB gate, allowing
// inline job definition with containers, resources, and Kubernetes-native configurations.
type JobSpec struct {
	// Namespace where the job will be executed.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Namespace string `json:"namespace"`

	// Containers to run as part of the job, such as test runners or validation scripts.
	// +kubebuilder:validation:Optional
	Containers []*Container `json:"containers,omitempty"`

	// Labels to apply to the job for organization and selection.
	// +kubebuilder:validation:Optional
	Labels map[string]string `json:"labels,omitempty"`

	// Annotations to apply to the job for additional metadata.
	// +kubebuilder:validation:Optional
	Annotations map[string]string `json:"annotations,omitempty"`

	// ServiceAccount to use for the job execution.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	ServiceAccount *string `json:"serviceAccount,omitempty"`

	// Raw allows defining the job using a full Kubernetes JobSpec manifest
	// instead of the simplified container-based approach.
	// +kubebuilder:validation:Optional
	Raw *batchv1.JobSpec `json:"raw,omitempty"`

	// Resources specification that overrides implicit container resources
	// when containers are not directly configured.
	// +kubebuilder:validation:Optional
	Resources *ContainerResources `json:"resources,omitempty"`
}

type Container struct {
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Image string `json:"image"`

	// +kubebuilder:validation:Optional
	Args []*string `json:"args,omitempty"`

	// +kubebuilder:validation:Optional
	Env []*Env `json:"env,omitempty"`

	// +kubebuilder:validation:Optional
	EnvFrom []*EnvFrom `json:"envFrom,omitempty"`

	// +kubebuilder:validation:Optional
	Resources *ContainerResources `json:"resources,omitempty"`
}

type ContainerResources struct {
	// +kubebuilder:validation:Optional
	Requests *ContainerResourceRequests `json:"requests,omitempty"`

	// +kubebuilder:validation:Optional
	Limits *ContainerResourceRequests `json:"limits,omitempty"`
}

type ContainerResourceRequests struct {
	// +kubebuilder:validation:Optional
	CPU *string `json:"cpu,omitempty"`

	// +kubebuilder:validation:Optional
	Memory *string `json:"memory,omitempty"`
}

type Env struct {
	// Name of the environment variable to set.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Name string `json:"name"`

	// Value of the environment variable to set.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Value string `json:"value"`
}

type EnvFrom struct {
	// Secret to source environment variables from.
	// +kubebuilder:validation:Type:=string
	Secret string `json:"secret"`

	// ConfigMap to source environment variables from.
	// +kubebuilder:validation:Type:=string
	ConfigMap string `json:"configMap"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="Console ID"

// Pipeline automates Service Deployments across environments by promoting git-based changes through defined stages.
// It models multi-stage deployment pipelines with support for approval and job gates, offering safe,
// customizable delivery flows. Integrates with continuous deployment systems by enabling declarative
// configuration of deployment flows, including gating, promotions, and service progression.
type Pipeline struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   PipelineSpec `json:"spec,omitempty"`
	Status Status       `json:"status,omitempty"`
}

func (p *Pipeline) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

func (p *Pipeline) ProjectName() string {
	if p.Spec.ProjectRef == nil {
		return ""
	}

	return p.Spec.ProjectRef.Name
}

func (p *Pipeline) HasProjectRef() bool {
	return p.Spec.ProjectRef != nil
}

// +kubebuilder:object:root=true

// PipelineList contains a list of Pipeline resources.
type PipelineList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Pipeline `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Pipeline{}, &PipelineList{})
}
