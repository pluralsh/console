package v1alpha1

import (
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&MCPServer{}, &MCPServerList{})
}

// +kubebuilder:object:root=true

// MCPServerList contains a list of MCPServer resources.
type MCPServerList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []MCPServer `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:printcolumn:name="URL",type="string",JSONPath=".spec.url",description="MCP server URL"
// +kubebuilder:printcolumn:name="Confirm",type="boolean",JSONPath=".spec.confirm",description="Requires confirmation"

// MCPServer represents a Model Context Protocol server for AI tool
// integration within the Plural Console environment. MCP servers enable
// large language models to execute functions, access external APIs,
// and interact with various systems.
type MCPServer struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MCPServerSpec `json:"spec,omitempty"`
	Status Status        `json:"status,omitempty"`
}

// SetCondition sets a condition on the MCPServer status.
func (in *MCPServer) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// GetServerName returns the effective server name to be used for this MCP server.
// It returns the explicitly configured name if provided, otherwise falls back to
// the MCPServer resource's own name from metadata.
func (in *MCPServer) GetServerName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

func (in *MCPServer) Attributes() console.McpServerAttributes {
	attrs := console.McpServerAttributes{
		Name:    in.GetServerName(),
		URL:     in.Spec.URL,
		Confirm: in.Spec.Confirm,
	}

	if in.Spec.Bindings != nil {
		attrs.ReadBindings = PolicyBindings(in.Spec.Bindings.Read)
		attrs.WriteBindings = PolicyBindings(in.Spec.Bindings.Write)
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

// MCPServerSpec defines the desired state of an MCP (Model Context Protocol) server.
type MCPServerSpec struct {
	// Name specifies the name for this MCP server.
	// If not provided, the name from the resource metadata will be used.
	// This name is used for identification and referencing in AI workflows.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// URL is the HTTP endpoint where the MCP server is hosted.
	// This must be a valid HTTP or HTTPS URL that the AI system can reach
	// to execute tool calls and interact with the server's capabilities.
	// +kubebuilder:validation:Required
	URL string `json:"url,omitempty"`

	// Bindings define the read and write access policies for this MCP server.
	// These control which users and groups can view, modify, or execute tools
	// provided by this server, enabling fine-grained access control.
	// +kubebuilder:validation:Optional
	Bindings *Bindings `json:"bindings,omitempty"`

	// Authentication specifies the authentication configuration for accessing this MCP server.
	// Different authentication methods are supported including built-in Plural JWT
	// and custom HTTP headers for integration with various authentication systems.
	// +kubebuilder:validation:Optional
	Authentication *MCPServerAuthentication `json:"authentication,omitempty"`

	// Confirm determines whether tool calls against this server require explicit user confirmation.
	// When true, users must approve each tool execution before it proceeds, providing
	// an additional safety mechanism for sensitive operations. Defaults to false.
	// +kubebuilder:validation:Optional
	Confirm *bool `json:"confirm,omitempty"`
}

// MCPServerAuthentication defines the authentication configuration for an MCP server.
// It supports multiple authentication methods to integrate with various systems
// and security requirements, from simple JWT tokens to custom header-based authentication.
type MCPServerAuthentication struct {
	// Plural enables built-in Plural JWT authentication for this MCP server.
	// When true, the server will receive a valid Plural JWT token in requests,
	// allowing it to authenticate and authorize operations within the Plural ecosystem.
	// +kubebuilder:validation:Optional
	Plural *bool `json:"plural,omitempty"`

	// Headers specify custom HTTP headers required for authentication with this MCP server.
	// This allows integration with servers that use API keys, bearer tokens, or other
	// header-based authentication schemes. Common examples include "Authorization",
	// "X-API-Key", or custom authentication headers.
	// +kubebuilder:validation:Optional
	Headers map[string]string `json:"headers,omitempty"`
}
