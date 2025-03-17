package v1alpha1

import (
	console "github.com/pluralsh/console/go/client"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// MCPServerSpec defines the desired state of the resource.
type MCPServerSpec struct {
	// Name, if not provided name from object meta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// URL is the HTTP URL the server is hosted on.
	// +kubebuilder:validation:Required
	URL string `json:"url,omitempty"`

	// Authentication specs for this server.
	// +kubebuilder:validation:Optional
	Authentication *MCPServerAuthentication `json:"authentication,omitempty"`

	// Confirm whether a tool call against this server should require user confirmation.
	// +kubebuilder:validation:Optional
	Confirm *bool `json:"confirm,omitempty"`
}

// MCPServerAuthentication contains specs for MCP server.
type MCPServerAuthentication struct {
	// Plural turns on built-in Plural JWT authentication.
	// +kubebuilder:validation:Optional
	Plural *bool `json:"plural,omitempty"`

	// Headers contain any custom HTTP headers needed for authentication.
	// +kubebuilder:validation:Optional
	Headers map[string]string `json:"headers,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="MCP Server ID"

type MCPServer struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MCPServerSpec `json:"spec,omitempty"`
	Status Status        `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

type MCPServerList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []MCPServer `json:"items"`
}

func init() {
	SchemeBuilder.Register(&MCPServer{}, &MCPServerList{})
}

func (in *MCPServer) MCPServerName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

func (in *MCPServer) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *MCPServer) Attributes() console.McpServerAttributes {
	attrs := console.McpServerAttributes{
		Name:    in.MCPServerName(),
		URL:     in.Spec.URL,
		Confirm: in.Spec.Confirm,
	}

	if in.Spec.Authentication != nil {
		attrs.Authentication = &console.McpServerAuthenticationAttributes{
			Plural: in.Spec.Authentication.Plural,
		}

		if len(in.Spec.Authentication.Headers) > 0 {
			attrs.Authentication.Headers = make([]*console.McpHeaderAttributes, 0)
			for k, v := range in.Spec.Authentication.Headers {
				attrs.Authentication.Headers = append(attrs.Authentication.Headers, &console.McpHeaderAttributes{
					Name: k, Value: v,
				})
			}
		}
	}

	return attrs
}

func (in *MCPServer) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}
