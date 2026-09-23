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
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&Dashboard{}, &DashboardList{})
}

// +kubebuilder:object:root=true

// DashboardList contains a list of Dashboard resources.
type DashboardList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Dashboard `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the Dashboard in the Console API."
// +kubebuilder:printcolumn:name="READY",type="string",JSONPath=".status.conditions[?(@.type==\"Ready\")].status",description="Whether the Dashboard is ready."

// Dashboard represents an observability dashboard owned by a Workbench. It consists of graphs
// arranged on a grid, each backed by an observability tool datasource, and optional user-configurable inputs.
type Dashboard struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the Dashboard.
	// +kubebuilder:validation:Required
	Spec DashboardSpec `json:"spec"`

	// Status represents the current state of this resource.
	// +kubebuilder:validation:Optional
	Status Status `json:"status,omitempty"`
}

// SetReadOnlyStatus sets the read-only status of the dashboard.
func (in *Dashboard) SetReadOnlyStatus(readOnly bool) {
	in.Status.ReadOnly = readOnly
}

// ConsoleID implements [PluralResource] interface.
func (in *Dashboard) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName implements [PluralResource] interface.
func (in *Dashboard) ConsoleName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}
	return in.Name
}

// Diff compares the current Dashboard spec with its last known state.
func (in *Dashboard) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}
	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

// SetCondition sets a condition on the Dashboard status.
func (in *Dashboard) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// Attributes converts the Dashboard spec into Console API attributes.
// The workbenchID has to be resolved from the spec reference by the caller.
func (in *Dashboard) Attributes(workbenchID string) console.DashboardAttributes {
	return console.DashboardAttributes{
		WorkbenchID: &workbenchID,
		Name:        lo.ToPtr(in.ConsoleName()),
		Description: in.Spec.Description,
		Graphs: lo.Map(in.Spec.Graphs, func(g DashboardGraph, _ int) *console.DashboardGraphAttributes {
			return g.Attributes()
		}),
		Inputs: lo.Map(in.Spec.Inputs, func(i DashboardInput, _ int) *console.DashboardInputAttributes {
			return i.Attributes()
		}),
	}
}

// DashboardSpec defines the desired state of a Dashboard.
// +kubebuilder:validation:XValidation:rule="!has(self.graphs) || self.graphs.all(g, !has(g.sectionId) || g.sectionId == '' || self.graphs.exists(s, s.type == 'SECTION' && s.identifier == g.sectionId))",message="sectionId must reference an existing SECTION graph"
type DashboardSpec struct {
	// NOTE: The Console API ignores workbenchId on dashboard updates (it is dropped in
	// Console.Deployments.Observability.update_dashboard/3), so a changed reference would be
	// silently ignored and the dashboard would stay in the old workbench. The CEL rule below
	// rejects such changes instead. To move a dashboard, delete and recreate it.
	// This comment is intentionally detached from the field docs so it does not end up in the CRD.

	// WorkbenchRef references the Workbench that owns this dashboard.
	// It is immutable, a dashboard cannot be moved to a different workbench.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="workbenchRef is immutable"
	WorkbenchRef corev1.ObjectReference `json:"workbenchRef"`

	// Name is the dashboard name, unique within its workbench.
	// If not set, metadata.name is used.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Name *string `json:"name,omitempty"`

	// Description is an optional dashboard description.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Description *string `json:"description,omitempty"`

	// NOTE: MaxItems on graphs and MaxLength on graph identifier, sectionId and type bound the
	// estimated cost of the sectionId CEL rule on DashboardSpec, which compares every graph with
	// every other graph. Without these limits the API server can reject the CRD as too expensive.

	// Graphs arranged on the dashboard grid. Graph identifiers must be unique within the dashboard.
	// Graphs can be grouped by setting sectionId to the identifier of a SECTION graph.
	// Note that overlapping graph layouts are only validated by the Console API.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:MaxItems=200
	// +listType=map
	// +listMapKey=identifier
	Graphs []DashboardGraph `json:"graphs,omitempty"`

	// Inputs are user-configurable dashboard variables.
	// +kubebuilder:validation:Optional
	// +listType=map
	// +listMapKey=name
	Inputs []DashboardInput `json:"inputs,omitempty"`

	// Reconciliation settings for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

// DashboardGraph is a single graph placed on the dashboard grid.
// +kubebuilder:validation:XValidation:rule="self.type != 'MARKDOWN' || has(self.markdown)",message="markdown must be set for MARKDOWN graphs"
// +kubebuilder:validation:XValidation:rule="self.type != 'SECTION' || !has(self.sectionId) || self.sectionId == ''",message="sections cannot be nested, SECTION graphs cannot set sectionId"
type DashboardGraph struct {
	// Identifier is a stable identifier unique within the dashboard.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:MinLength=1
	// +kubebuilder:validation:MaxLength=128
	Identifier string `json:"identifier"`

	// Title is the graph title.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Title *string `json:"title,omitempty"`

	// Description is an optional graph description.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Description *string `json:"description,omitempty"`

	// Type is the graph visualization type.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=TIMESERIES;GAUGE;LOGS;MARKDOWN;TABLE;STAT;BAR;PIE;HEATMAP;TRACES;SECTION
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:MaxLength=16
	Type console.DashboardGraphType `json:"type"`

	// SectionID is the identifier of the SECTION graph containing this graph. Sections cannot be nested.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:MaxLength=128
	SectionID *string `json:"sectionId,omitempty"`

	// Markdown is the content for MARKDOWN graphs.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Markdown *string `json:"markdown,omitempty"`

	// Options are visualization-specific display options. Sections may set collapsed.
	// +kubebuilder:validation:Optional
	Options *runtime.RawExtension `json:"options,omitempty"`

	// Layout is the grid position and size of the graph.
	// +kubebuilder:validation:Required
	Layout DashboardGraphLayout `json:"layout"`

	// Datasource is the tool call used to fetch external data.
	// +kubebuilder:validation:Optional
	Datasource *DashboardDatasource `json:"datasource,omitempty"`
}

func (in *DashboardGraph) Attributes() *console.DashboardGraphAttributes {
	var options *string
	if in.Options != nil && len(in.Options.Raw) > 0 {
		options = lo.ToPtr(string(in.Options.Raw))
	}

	return &console.DashboardGraphAttributes{
		Identifier:  in.Identifier,
		Title:       in.Title,
		Description: in.Description,
		Type:        in.Type,
		SectionID:   in.SectionID,
		Markdown:    in.Markdown,
		Options:     options,
		Layout: console.DashboardGraphLayoutAttributes{
			X: in.Layout.X,
			Y: in.Layout.Y,
			W: in.Layout.W,
			H: in.Layout.H,
		},
		Datasource: in.Datasource.Attributes(),
	}
}

// DashboardGraphLayout defines the grid position and size of a graph.
type DashboardGraphLayout struct {
	// X is the zero-based horizontal grid coordinate.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Minimum=0
	X int64 `json:"x"`

	// Y is the zero-based vertical grid coordinate.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Minimum=0
	Y int64 `json:"y"`

	// W is the width in grid columns.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Minimum=1
	W int64 `json:"w"`

	// H is the height in grid rows.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Minimum=1
	H int64 `json:"h"`
}

// DashboardDatasource defines an observability tool call used to fetch dashboard data.
type DashboardDatasource struct {
	// Type is the kind of data returned by the datasource.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=LOGS;METRICS;TRACES;LABELS
	Type console.DashboardDatasourceType `json:"type"`

	// Tool is the name of the observability tool used to fetch the data.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:MinLength=1
	Tool string `json:"tool"`

	// Input is passed to the observability tool.
	// +kubebuilder:validation:Required
	Input runtime.RawExtension `json:"input"`
}

func (in *DashboardDatasource) Attributes() *console.DashboardDatasourceAttributes {
	if in == nil {
		return nil
	}

	input := "{}"
	if len(in.Input.Raw) > 0 {
		input = string(in.Input.Raw)
	}

	return &console.DashboardDatasourceAttributes{
		Type:  in.Type,
		Tool:  in.Tool,
		Input: input,
	}
}

// DashboardInput is a user-configurable dashboard variable.
type DashboardInput struct {
	// Name is the variable name referenced by graph datasource inputs.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:MinLength=1
	Name string `json:"name"`

	// Label is a human-readable input label.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Label *string `json:"label,omitempty"`

	// Description is an optional input description.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Description *string `json:"description,omitempty"`

	// Type is the input control type.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=TEXT;NUMBER;BOOLEAN;SELECT;MULTI_SELECT;TIME_RANGE
	Type console.DashboardInputType `json:"type"`

	// Default is the default input value.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Default *string `json:"default,omitempty"`

	// Options are the allowed values for select inputs.
	// +kubebuilder:validation:Optional
	Options []string `json:"options,omitempty"`

	// Required defines whether a value is required when rendering.
	// +kubebuilder:validation:Optional
	Required *bool `json:"required,omitempty"`

	// Datasource is the tool query used to populate input options, such as metric label search.
	// +kubebuilder:validation:Optional
	Datasource *DashboardDatasource `json:"datasource,omitempty"`
}

func (in *DashboardInput) Attributes() *console.DashboardInputAttributes {
	return &console.DashboardInputAttributes{
		Name:        in.Name,
		Label:       in.Label,
		Description: in.Description,
		Type:        in.Type,
		Default:     in.Default,
		Options:     lo.ToSlicePtr(in.Options),
		Required:    in.Required,
		Datasource:  in.Datasource.Attributes(),
	}
}
