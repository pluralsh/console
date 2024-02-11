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
	console "github.com/pluralsh/console-client-go"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// PipelineSpec defines the desired state of Pipeline.
type PipelineSpec struct {
	// Stages of a pipeline.
	Stages []PipelineStage `json:"stages,omitempty"`

	// Edges of a pipeline.
	Edges []PipelineEdge `json:"edges,omitempty"`
}

// PipelineStage defines the Pipeline stage.
type PipelineStage struct {
	// Name of this stage.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Name string `json:"name"`

	// Services including optional promotion criteria.
	Services []PipelineStageService `json:"services,omitempty"`
}

// PipelineStageService is the configuration of a service within a pipeline stage,
// including optional promotion criteria.
type PipelineStageService struct {
	ServiceRef *v1.ObjectReference `json:"serviceRef,omitempty"`

	// +kubebuilder:validation:Optional
	Criteria *PipelineStageServicePromotionCriteria `json:"criteria,omitempty"`
}

// PipelineStageServicePromotionCriteria represents actions to perform if this stage service were promoted.
type PipelineStageServicePromotionCriteria struct {
	// ServiceRef pointing to source service to promote from.
	ServiceRef *v1.ObjectReference `json:"serviceRef,omitempty"`

	// Secrets to copy over in a promotion.
	// +kubebuilder:validation:Optional
	Secrets []*string `json:"secrets,omitempty"`
}

// PipelineEdge is a specification of an edge between two pipeline stages.
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

// PipelineGate will configure a promotion gate for a pipeline.
type PipelineGate struct {
	// Name of this gate.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Name string `json:"name"`

	// Type of gate this is.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=APPROVAL;WINDOW;JOB
	Type console.GateType `json:"type"`

	// ClusterRef of a Cluster this gate will execute on.
	// +kubebuilder:validation:Optional
	ClusterRef *v1.ObjectReference `json:"clusterRef,omitempty"`

	// Spec contains specification for more complex gate types.
	// +kubebuilder:validation:Optional
	Spec *GateSpec `json:"spec,omitempty"`
}

// GateSpec is a more refined spec for parameters needed for complex gates.
type GateSpec struct {
	// +kubebuilder:validation:Optional
	Job *GateJob `json:"job,omitempty"`
}

// GateJob is a spec for a job gate.
type GateJob struct {
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Namespace string `json:"namespace"`

	// +kubebuilder:validation:Optional
	Containers []*Container `json:"containers,omitempty"`

	// +kubebuilder:validation:Optional
	Labels map[string]string `json:"labels,omitempty"`

	// +kubebuilder:validation:Optional
	Annotations map[string]string `json:"annotations,omitempty"`

	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	ServiceAccount *string `json:"serviceAccount,omitempty"`

	// Raw can be used if you'd rather define the job spec via straight Kubernetes manifest file.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Raw *string `json:"raw,omitempty"`
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
}

type Env struct {
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Name string `json:"name"`

	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	Value string `json:"value"`
}

type EnvFrom struct {
	// +kubebuilder:validation:Type:=string
	Secret string `json:"secret"`

	// +kubebuilder:validation:Type:=string
	ConfigMap string `json:"configMap"`
}

// Pipeline is the Schema for the pipelines API
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="Console ID"
type Pipeline struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   PipelineSpec `json:"spec,omitempty"`
	Status Status       `json:"status,omitempty"`
}

func (p *Pipeline) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

// PipelineList contains a list of Pipeline
// +kubebuilder:object:root=true
type PipelineList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Pipeline `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Pipeline{}, &PipelineList{})
}
