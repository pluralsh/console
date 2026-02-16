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
	SchemeBuilder.Register(&WorkbenchTool{}, &WorkbenchToolList{})
}

// +kubebuilder:object:root=true

// WorkbenchToolList contains a list of WorkbenchTool resources.
type WorkbenchToolList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []WorkbenchTool `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the WorkbenchTool in the Console API."
// +kubebuilder:printcolumn:name="Tool",type="string",JSONPath=".spec.tool",description="Type of tool."
// +kubebuilder:printcolumn:name="READONLY",type="boolean",JSONPath=".status.readonly",description="Flag indicating if the object is read-only"

// WorkbenchTool represents a tool that can be attached to a Workbench (e.g. HTTP tool).
// Tools are defined once and can be associated with multiple workbenches.
type WorkbenchTool struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the WorkbenchTool.
	// +kubebuilder:validation:Required
	Spec WorkbenchToolSpec `json:"spec"`

	// Status represents the current state of this resource.
	// +kubebuilder:validation:Optional
	Status Status `json:"status,omitempty"`
}

// SetReadOnlyStatus sets the read-only status of the workbench tool.
func (in *WorkbenchTool) SetReadOnlyStatus(readOnly bool) {
	in.Status.ReadOnly = readOnly
}

// ConsoleID implements [PluralResource] interface.
func (in *WorkbenchTool) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName implements [PluralResource] interface.
func (in *WorkbenchTool) ConsoleName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}
	return in.Name
}

// Diff compares the current WorkbenchTool spec with its last known state.
func (in *WorkbenchTool) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}
	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

// SetCondition sets a condition on the WorkbenchTool status.
func (in *WorkbenchTool) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *WorkbenchTool) Attributes(projectID *string) console.WorkbenchToolAttributes {
	return console.WorkbenchToolAttributes{
		Name:          in.ConsoleName(),
		Tool:          in.Spec.Tool,
		Categories:    lo.ToSlicePtr(in.Spec.Categories),
		ProjectID:     projectID,
		Configuration: in.Spec.Configuration.Attributes(),
	}
}

// WorkbenchToolSpec defines the desired state of a WorkbenchTool.
type WorkbenchToolSpec struct {
	// Name of the tool. If not set, metadata.name is used.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Pattern:=^[a-z0-9_]+$
	Name *string `json:"name,omitempty"`

	// Tool type (e.g. HTTP).
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum:=HTTP
	Tool console.WorkbenchToolType `json:"tool"`

	// Categories for the tool (e.g. METRICS, LOGS, INTEGRATION).
	// +kubebuilder:validation:Optional
	Categories []console.WorkbenchToolCategory `json:"categories,omitempty"`

	// ProjectRef references the project this tool belongs to.
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// Configuration is the tool-specific configuration (e.g. HTTP).
	// +kubebuilder:validation:Optional
	Configuration *WorkbenchToolConfiguration `json:"configuration,omitempty"`

	// Reconciliation settings for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

// WorkbenchToolConfiguration defines tool-specific configuration.
type WorkbenchToolConfiguration struct {
	// HTTP tool configuration.
	// +kubebuilder:validation:Optional
	HTTP *WorkbenchToolHTTPConfig `json:"http,omitempty"`
}

func (c *WorkbenchToolConfiguration) Attributes() *console.WorkbenchToolConfigurationAttributes {
	if c == nil {
		return nil
	}

	return &console.WorkbenchToolConfigurationAttributes{
		HTTP: c.HTTP.Attributes(),
	}
}

// WorkbenchToolHTTPConfig defines HTTP tool configuration.
type WorkbenchToolHTTPConfig struct {
	// URL is the request URL.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Format=uri
	URL string `json:"url"`

	// Method is the HTTP method (GET, POST, PUT, DELETE, PATCH).
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum:=GET;POST;PUT;DELETE;PATCH
	Method console.WorkbenchToolHTTPMethod `json:"method,omitempty"`

	// Headers are optional request headers.
	// +kubebuilder:validation:Optional
	Headers []WorkbenchToolHTTPHeader `json:"headers,omitempty"`

	// Body is the optional request body.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Body *string `json:"body,omitempty"`

	// InputSchema is the JSON schema for the tool input (arbitrary JSON).
	// +kubebuilder:validation:Optional
	InputSchema *runtime.RawExtension `json:"inputSchema,omitempty"`
}

func (c *WorkbenchToolHTTPConfig) Attributes() *console.WorkbenchToolHTTPConfigurationAttributes {
	if c == nil {
		return nil
	}

	attrs := &console.WorkbenchToolHTTPConfigurationAttributes{
		URL:    c.URL,
		Method: c.Method,
		Headers: lo.Map(c.Headers, func(header WorkbenchToolHTTPHeader, _ int) *console.WorkbenchToolHTTPHeaderAttributes {
			return &console.WorkbenchToolHTTPHeaderAttributes{
				Name:  header.Name,
				Value: header.Value,
			}
		}),
		Body: c.Body,
	}

	if c.InputSchema != nil {
		attrs.InputSchema = lo.ToPtr(string(c.InputSchema.Raw))
	}

	return attrs
}

// WorkbenchToolHTTPHeader represents a single HTTP header.
type WorkbenchToolHTTPHeader struct {
	// Name is the header name.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Name *string `json:"name,omitempty"`

	// Value is the header value.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Value *string `json:"value,omitempty"`
}
