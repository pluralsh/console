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

	Criteria *PipelineStageServicePromotionCriteria `json:"criteria,omitempty"`
}

// PipelineStageServicePromotionCriteria represents actions to perform if this stage service were promoted.
type PipelineStageServicePromotionCriteria struct {
	// ServiceRef pointing to source service to promote from.
	ServiceRef *v1.ObjectReference `json:"serviceRef,omitempty"`

	SourceID *string `json:"sourceID,omitempty"`

	// Secrets to copy over in a promotion.
	Secrets []*string `json:"secrets,omitempty"`
}

// PipelineEdge is a specification of an edge between two pipeline stages.
type PipelineEdge struct {
	// FromID is stage ID the edge is from, can also be specified by name.
	// +kubebuilder:validation:Type:=string
	FromID *string `json:"fromId,omitempty"`

	// ToID is stage ID the edge is to, can also be specified by name.
	// +kubebuilder:validation:Type:=string
	ToID *string `json:"toId,omitempty"`

	// From is the name of the pipeline stage this edge emits from.
	// +kubebuilder:validation:Type:=string
	From *string `json:"from,omitempty"`

	// To is the name of the pipeline stage this edge points to.
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
	Type console.GateType `json:"type"`

	// ClusterRef of a Cluster this gate will execute on.
	ClusterRef v1.ObjectReference `json:"clusterRef,omitempty"`

	// Spec contains specification for more complex gate types.
	Spec *GateSpec `json:"spec,omitempty"`
}

// GateSpec is a more refined spec for parameters needed for complex gates.
type GateSpec struct {
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

// PipelineStatus defines the observed state of Pipeline
type PipelineStatus struct {
	// ID from Console.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	ID *string `json:"id,omitempty"`

	// SHA of last applied configuration.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	SHA *string `json:"sha,omitempty"`

	// Represents the observations of a Pipeline current state.
	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
}

func (ps *PipelineStatus) HasID() bool {
	return ps.ID != nil && len(*ps.ID) > 0
}

func (ps *PipelineStatus) GetID() string {
	if !ps.HasID() {
		return ""
	}

	return *ps.ID
}

func (ps *PipelineStatus) HasSHA() bool {
	return ps.SHA != nil && len(*ps.SHA) > 0
}

func (ps *PipelineStatus) IsSHAChanged(sha string) bool {
	return ps.HasSHA() && *ps.SHA != sha
}

// Pipeline is the Schema for the pipelines API
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="Console ID"
type Pipeline struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   PipelineSpec   `json:"spec,omitempty"`
	Status PipelineStatus `json:"status,omitempty"`
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
