/*
Copyright 2024.

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
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	// OverlappingConditionType is set on a CustomInsightPriority that lost some of its objects to a CustomInsightPriority with a higher precedence.
	OverlappingConditionType ConditionType = "Overlapping"

	// InvalidScriptConditionReason means the script could not be compiled, so it is not evaluated.
	InvalidScriptConditionReason ConditionReason = "InvalidScript"

	// EvaluationFailedConditionReason means the script failed on the last evaluation, so its objects use the built-in priority.
	EvaluationFailedConditionReason ConditionReason = "EvaluationFailed"

	// OverlapConditionReason is the reason of the Overlapping condition.
	OverlapConditionReason ConditionReason = "Overlap"
)

// InsightEngine is the language an insight priority script is written in.
// +kubebuilder:validation:Enum=python
type InsightEngine string

const (
	// InsightEnginePython evaluates the script as sandboxed Python.
	InsightEnginePython InsightEngine = "python"
)

// InsightTargetKind selects objects by kind.
type InsightTargetKind struct {
	// Group of the kind, empty for the core group.
	// +kubebuilder:validation:Optional
	Group string `json:"group,omitempty"`

	// Version of the kind, any version matches when empty.
	// +kubebuilder:validation:Optional
	Version string `json:"version,omitempty"`

	// Kind of the objects, for example StatefulSet.
	// +kubebuilder:validation:MinLength=1
	Kind string `json:"kind"`
}

// InsightTarget selects the failing objects a script is responsible for. An object has to match every
// non-empty field, so an empty target matches everything.
type InsightTarget struct {
	// Kinds the script is responsible for.
	// +kubebuilder:validation:Optional
	Kinds []InsightTargetKind `json:"kinds,omitempty"`

	// Namespaces the script is responsible for. Cluster scoped objects only match when this is empty.
	// +kubebuilder:validation:Optional
	Namespaces []string `json:"namespaces,omitempty"`

	// LabelSelector selects objects by their labels.
	// +kubebuilder:validation:Optional
	LabelSelector *metav1.LabelSelector `json:"labelSelector,omitempty"`
}

// CustomInsightPrioritySpec defines how the insight priority of failing objects is decided.
type CustomInsightPrioritySpec struct {
	// Target selects the failing objects this script sets the priority of.
	// +kubebuilder:validation:Optional
	Target InsightTarget `json:"target,omitempty"`

	// Precedence decides which script owns an object that several targets match: the highest wins and ties are
	// broken by name. A script never sees objects it does not own, and scripts are not chained.
	// +kubebuilder:validation:Optional
	Precedence int `json:"precedence,omitempty"`

	// Engine the script is written for.
	// +kubebuilder:default=python
	// +kubebuilder:validation:Optional
	Engine InsightEngine `json:"engine,omitempty"`

	// Script defines `evaluate(input)`, called with the objects this script owns in `input["rows"]`, and returns a
	// dictionary from the `uid` of a row to `{"priority": "LOW|MEDIUM|HIGH|CRITICAL|IGNORE", "reason": "..."}`.
	// Rows that are left out keep their built-in priority, IGNORE removes a row from the insights and the cluster health score.
	//
	// Objects annotated with deployments.plural.sh/insight-priority are decided by the annotation and never reach the script.
	//
	// See https://docs.plural.sh/plural-features/continuous-deployment/deployment-operator/insight-priority for the full guide.
	Script string `json:"script"`
}

// InsightEvaluation is the outcome of the last time the script ran.
type InsightEvaluation struct {
	// Time the script last ran with a different outcome than the one before.
	Time metav1.Time `json:"time,omitempty"`

	// Matched is the number of failing objects the script owned.
	Matched int `json:"matched"`

	// Overridden is the number of objects the script gave a priority.
	Overridden int `json:"overridden"`

	// Ignored is the number of objects the script ignored.
	Ignored int `json:"ignored"`

	// DurationMs is how long the script took.
	DurationMs int64 `json:"durationMs"`
}

// CustomInsightPriorityStatus defines the observed state of CustomInsightPriority
type CustomInsightPriorityStatus struct {
	// LastEvaluation is the outcome of the last evaluation, empty until the script ran.
	// +kubebuilder:validation:Optional
	LastEvaluation *InsightEvaluation `json:"lastEvaluation,omitempty"`

	// LastError is the error of the last evaluation, empty when it succeeded.
	// +kubebuilder:validation:Optional
	LastError string `json:"lastError,omitempty"`

	// Represents the observations of a CustomInsightPriority's current state.
	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="Ready",type="string",JSONPath=".status.conditions[?(@.type==\"Ready\")].status"
//+kubebuilder:printcolumn:name="Precedence",type="integer",JSONPath=".spec.precedence"
//+kubebuilder:printcolumn:name="Matched",type="integer",JSONPath=".status.lastEvaluation.matched"

// CustomInsightPriority sets the priority of failing objects in the cluster insights and the cluster health score.
type CustomInsightPriority struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   CustomInsightPrioritySpec   `json:"spec,omitempty"`
	Status CustomInsightPriorityStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// CustomInsightPriorityList contains a list of CustomInsightPriority
type CustomInsightPriorityList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []CustomInsightPriority `json:"items"`
}

func init() {
	SchemeBuilder.Register(&CustomInsightPriority{}, &CustomInsightPriorityList{})
}

func (c *CustomInsightPriority) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&c.Status.Conditions, condition)
}

func (c *CustomInsightPriority) RemoveCondition(conditionType ConditionType) {
	meta.RemoveStatusCondition(&c.Status.Conditions, conditionType.String())
}
