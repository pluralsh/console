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
	"context"

	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	console "github.com/pluralsh/console/go/client"
	utils "github.com/pluralsh/console/go/controller/internal/utils/safe"
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

// WorkbenchTool is the Schema for the workbenchtools API.
type WorkbenchTool struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// +kubebuilder:validation:Required
	Spec WorkbenchToolSpec `json:"spec"`

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

func (in *WorkbenchTool) Attributes(ctx context.Context, c client.Client, projectID, mcpServerID, cloudConnectionID *string) (console.WorkbenchToolAttributes, error) {
	configuration, err := in.Spec.Configuration.Attributes(ctx, c, in.Namespace)
	if err != nil {
		return console.WorkbenchToolAttributes{}, err
	}

	return console.WorkbenchToolAttributes{
		Name:              in.ConsoleName(),
		Tool:              in.Spec.Tool,
		Categories:        lo.ToSlicePtr(in.Spec.Categories),
		ProjectID:         projectID,
		McpServerID:       mcpServerID,
		CloudConnectionID: cloudConnectionID,
		Configuration:     configuration,
	}, nil
}

// WorkbenchToolSpec defines the desired state of a WorkbenchTool.
type WorkbenchToolSpec struct {
	// The name of the tool (a-z, 0-9, underscores). If not set, metadata.name is used.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Pattern:=^[a-z0-9_]+$
	Name *string `json:"name,omitempty"`

	// The type of tool.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum:=HTTP;ELASTIC;DATADOG;PROMETHEUS;LOKI;TEMPO;SENTRY;MCP;LINEAR;ATLASSIAN;SPLUNK;DYNATRACE;CLOUDWATCH;AZURE;CLOUD;JAEGER
	Tool console.WorkbenchToolType `json:"tool"`

	// Categories for the tool.
	// +kubebuilder:validation:Optional
	Categories []console.WorkbenchToolCategory `json:"categories,omitempty"`

	// The project for this tool.
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// The mcp server for this tool.
	// +kubebuilder:validation:Optional
	MCPServerRef *corev1.ObjectReference `json:"mcpServerRef,omitempty"`

	// The cloud connection for this tool (e.g. infrastructure cloud tools).
	// +kubebuilder:validation:Optional
	CloudConnectionRef *corev1.ObjectReference `json:"cloudConnectionRef,omitempty"`

	// Tool configuration (e.g. HTTP).
	// +kubebuilder:validation:Optional
	Configuration *WorkbenchToolConfiguration `json:"configuration,omitempty"`

	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

// WorkbenchToolConfiguration defines tool-specific connection configuration.
type WorkbenchToolConfiguration struct {
	// Http tool configuration.
	// +kubebuilder:validation:Optional
	HTTP *WorkbenchToolHTTPConfig `json:"http,omitempty"`

	// Elasticsearch connection (logs).
	// +kubebuilder:validation:Optional
	Elastic *WorkbenchToolElasticConfig `json:"elastic,omitempty"`

	// Prometheus connection (metrics).
	// +kubebuilder:validation:Optional
	Prometheus *WorkbenchToolPrometheusConfig `json:"prometheus,omitempty"`

	// Loki connection (logs).
	// +kubebuilder:validation:Optional
	Loki *WorkbenchToolLokiConfig `json:"loki,omitempty"`

	// Tempo connection (traces).
	// +kubebuilder:validation:Optional
	Tempo *WorkbenchToolTempoConfig `json:"tempo,omitempty"`

	// Jaeger connection (traces).
	// +kubebuilder:validation:Optional
	Jaeger *WorkbenchToolJaegerConfig `json:"jaeger,omitempty"`

	// Splunk connection (logs).
	// +kubebuilder:validation:Optional
	Splunk *WorkbenchToolSplunkConfig `json:"splunk,omitempty"`

	// Datadog connection (metrics, logs).
	// +kubebuilder:validation:Optional
	Datadog *WorkbenchToolDatadogConfig `json:"datadog,omitempty"`

	// Dynatrace connection (metrics, logs, traces).
	// +kubebuilder:validation:Optional
	Dynatrace *WorkbenchToolDynatraceConfig `json:"dynatrace,omitempty"`

	// Cloudwatch connection (metrics, logs).
	// +kubebuilder:validation:Optional
	Cloudwatch *WorkbenchToolCloudwatchConfig `json:"cloudwatch,omitempty"`

	// Azure monitor connection (metrics).
	// +kubebuilder:validation:Optional
	Azure *WorkbenchToolAzureConfig `json:"azure,omitempty"`

	// Linear connection (ticketing).
	// +kubebuilder:validation:Optional
	Linear *WorkbenchToolLinearConfig `json:"linear,omitempty"`

	// Atlassian/jira connection (ticketing).
	// +kubebuilder:validation:Optional
	Atlassian *WorkbenchToolAtlassianConfig `json:"atlassian,omitempty"`
}

func (c *WorkbenchToolConfiguration) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolConfigurationAttributes, error) {
	if c == nil {
		return nil, nil
	}

	elastic, err := c.Elastic.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	prometheus, err := c.Prometheus.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	loki, err := c.Loki.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	tempo, err := c.Tempo.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	jaeger, err := c.Jaeger.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	splunk, err := c.Splunk.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	datadog, err := c.Datadog.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	dynatrace, err := c.Dynatrace.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	cloudwatch, err := c.Cloudwatch.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	azure, err := c.Azure.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	linear, err := c.Linear.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	atlassian, err := c.Atlassian.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	return &console.WorkbenchToolConfigurationAttributes{
		HTTP:       c.HTTP.Attributes(),
		Elastic:    elastic,
		Prometheus: prometheus,
		Loki:       loki,
		Tempo:      tempo,
		Jaeger:     jaeger,
		Splunk:     splunk,
		Datadog:    datadog,
		Dynatrace:  dynatrace,
		Cloudwatch: cloudwatch,
		Azure:      azure,
		Linear:     linear,
		Atlassian:  atlassian,
	}, nil
}

// WorkbenchToolHTTPConfig defines the HTTP tool configuration.
type WorkbenchToolHTTPConfig struct {
	// The request URL.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Format=uri
	URL string `json:"url"`

	// The HTTP method.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum:=GET;POST;PUT;DELETE;PATCH
	Method console.WorkbenchToolHTTPMethod `json:"method"`

	// Request headers.
	// +kubebuilder:validation:Optional
	Headers []WorkbenchToolHTTPHeader `json:"headers,omitempty"`

	// Request body.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Body *string `json:"body,omitempty"`

	// JSON schema for the tool input.
	// +kubebuilder:validation:Required
	InputSchema *runtime.RawExtension `json:"inputSchema"`
}

func (c *WorkbenchToolHTTPConfig) Attributes() *console.WorkbenchToolHTTPConfigurationAttributes {
	if c == nil {
		return nil
	}

	return &console.WorkbenchToolHTTPConfigurationAttributes{
		URL:    c.URL,
		Method: c.Method,
		Headers: lo.Map(c.Headers, func(header WorkbenchToolHTTPHeader, _ int) *console.WorkbenchToolHTTPHeaderAttributes {
			return &console.WorkbenchToolHTTPHeaderAttributes{
				Name:  header.Name,
				Value: header.Value,
			}
		}),
		Body:        c.Body,
		InputSchema: lo.ToPtr(string(c.InputSchema.Raw)),
	}
}

// WorkbenchToolHTTPHeader represents a single HTTP header.
type WorkbenchToolHTTPHeader struct {
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Name *string `json:"name,omitempty"`

	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Value *string `json:"value,omitempty"`
}

// WorkbenchToolElasticConfig defines an elasticsearch connection.
type WorkbenchToolElasticConfig struct {
	// Elasticsearch base URL.
	// +kubebuilder:validation:Required
	URL string `json:"url"`

	// Basic auth username.
	// +kubebuilder:validation:Required
	Username string `json:"username"`

	// Reference to a secret key containing the basic auth password.
	// +kubebuilder:validation:Optional
	PasswordSecretRef *corev1.SecretKeySelector `json:"passwordSecretRef,omitempty"`

	// Elasticsearch index.
	// +kubebuilder:validation:Required
	Index string `json:"index"`
}

func (c *WorkbenchToolElasticConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolElasticConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolElasticConnectionAttributes{
		URL:      c.URL,
		Username: c.Username,
		Index:    c.Index,
	}

	if c.PasswordSecretRef != nil {
		password, err := utils.GetSecretKey(ctx, cl, c.PasswordSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.Password = lo.ToPtr(password)
	}

	return attr, nil
}

// WorkbenchToolPrometheusConfig defines a prometheus connection.
type WorkbenchToolPrometheusConfig struct {
	// Prometheus base URL.
	// +kubebuilder:validation:Required
	URL string `json:"url"`

	// Reference to a secret key containing the bearer token or api key.
	// +kubebuilder:validation:Optional
	TokenSecretRef *corev1.SecretKeySelector `json:"tokenSecretRef,omitempty"`

	// Basic auth username.
	// +kubebuilder:validation:Optional
	Username *string `json:"username,omitempty"`

	// Reference to a secret key containing the basic auth password.
	// +kubebuilder:validation:Optional
	PasswordSecretRef *corev1.SecretKeySelector `json:"passwordSecretRef,omitempty"`

	// Optional tenant id (e.g. for Mimir).
	// +kubebuilder:validation:Optional
	TenantID *string `json:"tenantId,omitempty"`
}

func (c *WorkbenchToolPrometheusConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolPrometheusConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolPrometheusConnectionAttributes{
		URL:      c.URL,
		Username: c.Username,
		TenantID: c.TenantID,
	}

	if c.TokenSecretRef != nil {
		token, err := utils.GetSecretKey(ctx, cl, c.TokenSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.Token = lo.ToPtr(token)
	}

	if c.PasswordSecretRef != nil {
		password, err := utils.GetSecretKey(ctx, cl, c.PasswordSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.Password = lo.ToPtr(password)
	}

	return attr, nil
}

// WorkbenchToolLokiConfig defines a loki connection.
type WorkbenchToolLokiConfig struct {
	// Loki base URL.
	// +kubebuilder:validation:Required
	URL string `json:"url"`

	// Reference to a secret key containing the bearer token or api key.
	// +kubebuilder:validation:Optional
	TokenSecretRef *corev1.SecretKeySelector `json:"tokenSecretRef,omitempty"`

	// Basic auth username.
	// +kubebuilder:validation:Optional
	Username *string `json:"username,omitempty"`

	// Reference to a secret key containing the basic auth password.
	// +kubebuilder:validation:Optional
	PasswordSecretRef *corev1.SecretKeySelector `json:"passwordSecretRef,omitempty"`

	// Optional tenant id.
	// +kubebuilder:validation:Optional
	TenantID *string `json:"tenantId,omitempty"`
}

func (c *WorkbenchToolLokiConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolLokiConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolLokiConnectionAttributes{
		URL:      c.URL,
		Username: c.Username,
		TenantID: c.TenantID,
	}

	if c.TokenSecretRef != nil {
		token, err := utils.GetSecretKey(ctx, cl, c.TokenSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.Token = lo.ToPtr(token)
	}

	if c.PasswordSecretRef != nil {
		password, err := utils.GetSecretKey(ctx, cl, c.PasswordSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.Password = lo.ToPtr(password)
	}

	return attr, nil
}

// WorkbenchToolTempoConfig defines a tempo connection.
type WorkbenchToolTempoConfig struct {
	// Tempo base URL.
	// +kubebuilder:validation:Required
	URL string `json:"url"`

	// Reference to a secret key containing the bearer token or api key.
	// +kubebuilder:validation:Optional
	TokenSecretRef *corev1.SecretKeySelector `json:"tokenSecretRef,omitempty"`

	// Basic auth username.
	// +kubebuilder:validation:Optional
	Username *string `json:"username,omitempty"`

	// Reference to a secret key containing the basic auth password.
	// +kubebuilder:validation:Optional
	PasswordSecretRef *corev1.SecretKeySelector `json:"passwordSecretRef,omitempty"`

	// Optional tenant id.
	// +kubebuilder:validation:Optional
	TenantID *string `json:"tenantId,omitempty"`
}

func (c *WorkbenchToolTempoConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolTempoConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolTempoConnectionAttributes{
		URL:      c.URL,
		Username: c.Username,
		TenantID: c.TenantID,
	}

	if c.TokenSecretRef != nil {
		token, err := utils.GetSecretKey(ctx, cl, c.TokenSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.Token = lo.ToPtr(token)
	}

	if c.PasswordSecretRef != nil {
		password, err := utils.GetSecretKey(ctx, cl, c.PasswordSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.Password = lo.ToPtr(password)
	}

	return attr, nil
}

// WorkbenchToolJaegerConfig defines a jaeger connection.
type WorkbenchToolJaegerConfig struct {
	// Jaeger base URL.
	// +kubebuilder:validation:Required
	URL string `json:"url"`

	// Reference to a secret key containing the bearer token.
	// +kubebuilder:validation:Optional
	TokenSecretRef *corev1.SecretKeySelector `json:"tokenSecretRef,omitempty"`

	// Basic auth username.
	// +kubebuilder:validation:Optional
	Username *string `json:"username,omitempty"`

	// Reference to a secret key containing the basic auth password.
	// +kubebuilder:validation:Optional
	PasswordSecretRef *corev1.SecretKeySelector `json:"passwordSecretRef,omitempty"`
}

func (c *WorkbenchToolJaegerConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolJaegerConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolJaegerConnectionAttributes{
		URL:      c.URL,
		Username: c.Username,
	}

	if c.TokenSecretRef != nil {
		token, err := utils.GetSecretKey(ctx, cl, c.TokenSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.Token = lo.ToPtr(token)
	}

	if c.PasswordSecretRef != nil {
		password, err := utils.GetSecretKey(ctx, cl, c.PasswordSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.Password = lo.ToPtr(password)
	}

	return attr, nil
}

// WorkbenchToolSplunkConfig defines a splunk connection.
type WorkbenchToolSplunkConfig struct {
	// Splunk base URL.
	// +kubebuilder:validation:Required
	URL string `json:"url"`

	// Reference to a secret key containing the bearer token.
	// +kubebuilder:validation:Optional
	TokenSecretRef *corev1.SecretKeySelector `json:"tokenSecretRef,omitempty"`

	// Basic auth username.
	// +kubebuilder:validation:Optional
	Username *string `json:"username,omitempty"`

	// Reference to a secret key containing the basic auth password.
	// +kubebuilder:validation:Optional
	PasswordSecretRef *corev1.SecretKeySelector `json:"passwordSecretRef,omitempty"`
}

func (c *WorkbenchToolSplunkConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolSplunkConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolSplunkConnectionAttributes{
		URL:      c.URL,
		Username: c.Username,
	}

	if c.TokenSecretRef != nil {
		token, err := utils.GetSecretKey(ctx, cl, c.TokenSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.Token = lo.ToPtr(token)
	}

	if c.PasswordSecretRef != nil {
		password, err := utils.GetSecretKey(ctx, cl, c.PasswordSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.Password = lo.ToPtr(password)
	}

	return attr, nil
}

// WorkbenchToolDatadogConfig defines a datadog connection.
type WorkbenchToolDatadogConfig struct {
	// Datadog site (e.g. datadoghq.com).
	// +kubebuilder:validation:Optional
	Site *string `json:"site,omitempty"`

	// Reference to a secret key containing the datadog API key.
	// +kubebuilder:validation:Optional
	APIKeySecretRef *corev1.SecretKeySelector `json:"apiKeySecretRef,omitempty"`

	// Reference to a secret key containing the datadog application key.
	// +kubebuilder:validation:Optional
	AppKeySecretRef *corev1.SecretKeySelector `json:"appKeySecretRef,omitempty"`
}

func (c *WorkbenchToolDatadogConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolDatadogConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolDatadogConnectionAttributes{
		Site: c.Site,
	}

	if c.APIKeySecretRef != nil {
		apiKey, err := utils.GetSecretKey(ctx, cl, c.APIKeySecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.APIKey = lo.ToPtr(apiKey)
	}

	if c.AppKeySecretRef != nil {
		appKey, err := utils.GetSecretKey(ctx, cl, c.AppKeySecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.AppKey = lo.ToPtr(appKey)
	}

	return attr, nil
}

// WorkbenchToolDynatraceConfig defines a dynatrace connection.
type WorkbenchToolDynatraceConfig struct {
	// Dynatrace base URL.
	// +kubebuilder:validation:Required
	URL string `json:"url"`

	// Reference to a secret key containing the dynatrace platform token.
	// +kubebuilder:validation:Required
	PlatformTokenSecretRef corev1.SecretKeySelector `json:"platformTokenSecretRef"`
}

func (c *WorkbenchToolDynatraceConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolDynatraceConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	platformToken, err := utils.GetSecretKey(ctx, cl, &c.PlatformTokenSecretRef, namespace)
	if err != nil {
		return nil, err
	}

	return &console.WorkbenchToolDynatraceConnectionAttributes{
		URL:           c.URL,
		PlatformToken: platformToken,
	}, nil
}

// WorkbenchToolCloudwatchConfig defines a cloudwatch connection.
type WorkbenchToolCloudwatchConfig struct {
	// AWS region (e.g. us-east-1).
	// +kubebuilder:validation:Required
	Region string `json:"region"`

	// Optional default log groups for CloudWatch Logs Insights.
	// +kubebuilder:validation:Optional
	LogGroupNames []string `json:"logGroupNames,omitempty"`

	// Reference to a secret key containing the optional static AWS access key id.
	// +kubebuilder:validation:Optional
	AccessKeyIDSecretRef *corev1.SecretKeySelector `json:"accessKeyIdSecretRef,omitempty"`

	// Reference to a secret key containing the optional static AWS secret access key.
	// +kubebuilder:validation:Optional
	SecretAccessKeySecretRef *corev1.SecretKeySelector `json:"secretAccessKeySecretRef,omitempty"`

	// Optional IAM role ARN to assume.
	// +kubebuilder:validation:Optional
	RoleArn *string `json:"roleArn,omitempty"`

	// Optional external id for assume role.
	// +kubebuilder:validation:Optional
	ExternalID *string `json:"externalId,omitempty"`

	// Optional role session name for assume role.
	// +kubebuilder:validation:Optional
	RoleSessionName *string `json:"roleSessionName,omitempty"`
}

func (c *WorkbenchToolCloudwatchConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolCloudwatchConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolCloudwatchConnectionAttributes{
		Region:          c.Region,
		LogGroupNames:   lo.ToSlicePtr(c.LogGroupNames),
		RoleArn:         c.RoleArn,
		ExternalID:      c.ExternalID,
		RoleSessionName: c.RoleSessionName,
	}

	if c.AccessKeyIDSecretRef != nil {
		accessKeyID, err := utils.GetSecretKey(ctx, cl, c.AccessKeyIDSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.AccessKeyID = lo.ToPtr(accessKeyID)
	}

	if c.SecretAccessKeySecretRef != nil {
		secretAccessKey, err := utils.GetSecretKey(ctx, cl, c.SecretAccessKeySecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.SecretAccessKey = lo.ToPtr(secretAccessKey)
	}

	return attr, nil
}

// WorkbenchToolAzureConfig defines an azure monitor connection.
type WorkbenchToolAzureConfig struct {
	// Azure subscription id.
	// +kubebuilder:validation:Required
	SubscriptionID string `json:"subscriptionId"`

	// Azure tenant id.
	// +kubebuilder:validation:Required
	TenantID string `json:"tenantId"`

	// Azure client id.
	// +kubebuilder:validation:Required
	ClientID string `json:"clientId"`

	// Reference to a secret key containing the azure client secret.
	// +kubebuilder:validation:Required
	ClientSecretSecretRef corev1.SecretKeySelector `json:"clientSecretSecretRef"`
}

func (c *WorkbenchToolAzureConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolAzureConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	clientSecret, err := utils.GetSecretKey(ctx, cl, &c.ClientSecretSecretRef, namespace)
	if err != nil {
		return nil, err
	}

	return &console.WorkbenchToolAzureConnectionAttributes{
		SubscriptionID: c.SubscriptionID,
		TenantID:       c.TenantID,
		ClientID:       c.ClientID,
		ClientSecret:   clientSecret,
	}, nil
}

// WorkbenchToolLinearConfig defines a linear connection.
type WorkbenchToolLinearConfig struct {
	// Reference to a secret key containing the linear API access token.
	// +kubebuilder:validation:Optional
	AccessTokenSecretRef *corev1.SecretKeySelector `json:"accessTokenSecretRef,omitempty"`
}

func (c *WorkbenchToolLinearConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolLinearConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolLinearConnectionAttributes{}

	if c.AccessTokenSecretRef != nil {
		accessToken, err := utils.GetSecretKey(ctx, cl, c.AccessTokenSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.AccessToken = lo.ToPtr(accessToken)
	}

	return attr, nil
}

// WorkbenchToolAtlassianConfig defines an atlassian/jira connection.
type WorkbenchToolAtlassianConfig struct {
	// Reference to a secret key containing the encrypted service account JSON (alternative to api_token + email).
	// +kubebuilder:validation:Optional
	ServiceAccountSecretRef *corev1.SecretKeySelector `json:"serviceAccountSecretRef,omitempty"`

	// Reference to a secret key containing the atlassian API token (required if not using service_account).
	// +kubebuilder:validation:Optional
	APITokenSecretRef *corev1.SecretKeySelector `json:"apiTokenSecretRef,omitempty"`

	// Atlassian account email (required if not using service_account).
	// +kubebuilder:validation:Optional
	Email *string `json:"email,omitempty"`
}

func (c *WorkbenchToolAtlassianConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolAtlassianConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolAtlassianConnectionAttributes{
		Email: c.Email,
	}

	if c.ServiceAccountSecretRef != nil {
		serviceAccount, err := utils.GetSecretKey(ctx, cl, c.ServiceAccountSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.ServiceAccount = lo.ToPtr(serviceAccount)
	}

	if c.APITokenSecretRef != nil {
		apiToken, err := utils.GetSecretKey(ctx, cl, c.APITokenSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.APIToken = lo.ToPtr(apiToken)
	}

	return attr, nil
}
