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

func (in *WorkbenchTool) Attributes(ctx context.Context, c client.Client, projectID, mcpServerID, cloudConnectionID, scmConnectionID *string, readBindings, writeBindings []*console.PolicyBindingAttributes) (console.WorkbenchToolAttributes, error) {
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
		ScmConnectionID:   scmConnectionID,
		Approval:          in.Spec.Approval,
		ReadBindings:      readBindings,
		WriteBindings:     writeBindings,
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
	// +kubebuilder:validation:Enum:=HTTP;ELASTIC;DATADOG;PROMETHEUS;LOKI;TEMPO;SENTRY;MCP;LINEAR;ATLASSIAN;SPLUNK;DYNATRACE;CLOUDWATCH;AZURE;CLOUD;JAEGER;EXA;GITHUB;SLACK;TEAMS;GITLAB;BITBUCKET;BITBUCKET_DATACENTER;AZURE_DEVOPS;PAGERDUTY;OPENSEARCH;LAMBDA;CLOUD_RUN;AZURE_FUNCTION;DOCKER
	Tool console.WorkbenchToolType `json:"tool"`

	// Categories for the tool.
	// +kubebuilder:validation:Optional
	Categories []console.WorkbenchToolCategory `json:"categories,omitempty"`

	// Whether this tool requires approval before execution.
	// +kubebuilder:validation:Optional
	Approval *bool `json:"approval,omitempty"`

	// The project for this tool.
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// The mcp server for this tool.
	// +kubebuilder:validation:Optional
	MCPServerRef *corev1.ObjectReference `json:"mcpServerRef,omitempty"`

	// The cloud connection for this tool (e.g. infrastructure cloud tools).
	// +kubebuilder:validation:Optional
	CloudConnectionRef *corev1.ObjectReference `json:"cloudConnectionRef,omitempty"`

	// The SCM connection for this tool (e.g. shared Git provider credentials).
	// +kubebuilder:validation:Optional
	ScmConnectionRef *corev1.ObjectReference `json:"scmConnectionRef,omitempty"`

	// Bindings define the read and write access policies for this tool.
	// +kubebuilder:validation:Optional
	Bindings *Bindings `json:"bindings,omitempty"`

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

	// AWS OpenSearch connection (logs).
	// +kubebuilder:validation:Optional
	Opensearch *WorkbenchToolOpensearchConfig `json:"opensearch,omitempty"`

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

	// Sentry connection (error tracking).
	// +kubebuilder:validation:Optional
	Sentry *WorkbenchToolSentryConfig `json:"sentry,omitempty"`

	// Linear connection (ticketing).
	// +kubebuilder:validation:Optional
	Linear *WorkbenchToolLinearConfig `json:"linear,omitempty"`

	// Slack connection (integration).
	// +kubebuilder:validation:Optional
	Slack *WorkbenchToolSlackConfig `json:"slack,omitempty"`

	// PagerDuty connection (integration).
	// +kubebuilder:validation:Optional
	Pagerduty *WorkbenchToolPagerdutyConfig `json:"pagerduty,omitempty"`

	// Microsoft Teams / Graph connection (integration).
	// +kubebuilder:validation:Optional
	Teams *WorkbenchToolTeamsConfig `json:"teams,omitempty"`

	// Atlassian/jira connection (ticketing).
	// +kubebuilder:validation:Optional
	Atlassian *WorkbenchToolAtlassianConfig `json:"atlassian,omitempty"`

	// Exa connection (search).
	// +kubebuilder:validation:Optional
	Exa *WorkbenchToolExaConfig `json:"exa,omitempty"`

	// GitHub connection (integration).
	// +kubebuilder:validation:Optional
	Github *WorkbenchToolGithubConfig `json:"github,omitempty"`

	// GitLab connection (scm).
	// +kubebuilder:validation:Optional
	Gitlab *WorkbenchToolGitlabConfig `json:"gitlab,omitempty"`

	// Bitbucket Cloud connection (scm).
	// +kubebuilder:validation:Optional
	Bitbucket *WorkbenchToolBitbucketConfig `json:"bitbucket,omitempty"`

	// Bitbucket Data Center connection (scm).
	// +kubebuilder:validation:Optional
	BitbucketDatacenter *WorkbenchToolBitbucketDatacenterConfig `json:"bitbucketDatacenter,omitempty"`

	// Azure DevOps connection (scm).
	// +kubebuilder:validation:Optional
	AzureDevops *WorkbenchToolAzureDevopsConfig `json:"azureDevops,omitempty"`

	// AWS Lambda function configuration.
	// +kubebuilder:validation:Optional
	Lambda *WorkbenchToolLambdaConfig `json:"lambda,omitempty"`

	// Google Cloud Run service configuration.
	// +kubebuilder:validation:Optional
	CloudRun *WorkbenchToolCloudRunConfig `json:"cloudRun,omitempty"`

	// Azure Function / Cloud Function configuration.
	// +kubebuilder:validation:Optional
	AzureFunction *WorkbenchToolAzureFunctionConfig `json:"azureFunction,omitempty"`

	// Docker/OCI registry connection.
	// +kubebuilder:validation:Optional
	Docker *WorkbenchToolDockerConfig `json:"docker,omitempty"`
}

func (c *WorkbenchToolConfiguration) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolConfigurationAttributes, error) {
	if c == nil {
		return nil, nil
	}

	elastic, err := c.Elastic.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	opensearch, err := c.Opensearch.Attributes(ctx, cl, namespace)
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

	sentry, err := c.Sentry.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	linear, err := c.Linear.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	slack, err := c.Slack.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	pagerduty, err := c.Pagerduty.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	teams, err := c.Teams.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	atlassian, err := c.Atlassian.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	exa, err := c.Exa.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	github, err := c.Github.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	gitlab, err := c.Gitlab.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	bitbucket, err := c.Bitbucket.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	bitbucketDatacenter, err := c.BitbucketDatacenter.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	azureDevops, err := c.AzureDevops.Attributes(ctx, cl, namespace)
	if err != nil {
		return nil, err
	}

	return &console.WorkbenchToolConfigurationAttributes{
		HTTP:                c.HTTP.Attributes(),
		Elastic:             elastic,
		Opensearch:          opensearch,
		Prometheus:          prometheus,
		Loki:                loki,
		Tempo:               tempo,
		Jaeger:              jaeger,
		Splunk:              splunk,
		Datadog:             datadog,
		Dynatrace:           dynatrace,
		Cloudwatch:          cloudwatch,
		Azure:               azure,
		Sentry:              sentry,
		Linear:              linear,
		Slack:               slack,
		Pagerduty:           pagerduty,
		Teams:               teams,
		Atlassian:           atlassian,
		Exa:                 exa,
		Github:              github,
		Gitlab:              gitlab,
		Bitbucket:           bitbucket,
		BitbucketDatacenter: bitbucketDatacenter,
		AzureDevops:         azureDevops,
		Lambda:              c.Lambda.Attributes(),
		CloudRun:            c.CloudRun.Attributes(),
		AzureFunction:       c.AzureFunction.Attributes(),
		Docker:              c.Docker.Attributes(),
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

	// When true, exposes this HTTP tool as a workbench action; execution may require approval when tool approval is enabled.
	// +kubebuilder:validation:Optional
	Function *bool `json:"function,omitempty"`

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
		URL:      c.URL,
		Method:   c.Method,
		Function: c.Function,
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

// WorkbenchToolOpensearchConfig defines an AWS OpenSearch connection.
type WorkbenchToolOpensearchConfig struct {
	// AWS OpenSearch endpoint.
	// +kubebuilder:validation:Required
	Host string `json:"host"`

	// OpenSearch index.
	// +kubebuilder:validation:Required
	Index string `json:"index"`

	// Reference to a secret key containing the AWS access key id for SigV4 authentication.
	// +kubebuilder:validation:Optional
	AWSAccessKeyIDSecretRef *corev1.SecretKeySelector `json:"awsAccessKeyIdSecretRef,omitempty"`

	// Reference to a secret key containing the AWS secret access key for SigV4 authentication.
	// +kubebuilder:validation:Optional
	AWSSecretAccessKeySecretRef *corev1.SecretKeySelector `json:"awsSecretAccessKeySecretRef,omitempty"`

	// AWS region for SigV4 authentication.
	// +kubebuilder:validation:Optional
	AWSRegion *string `json:"awsRegion,omitempty"`

	// Optional IAM role ARN to assume before signing OpenSearch requests.
	// +kubebuilder:validation:Optional
	AssumeRoleArn *string `json:"assumeRoleArn,omitempty"`

	// Whether to use pod identity (IRSA/Workload Identity) for AWS authentication instead of static credentials.
	// +kubebuilder:validation:Optional
	UsePodIdentity *bool `json:"usePodIdentity,omitempty"`
}

func (c *WorkbenchToolOpensearchConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolOpensearchConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolOpensearchConnectionAttributes{
		Host:           c.Host,
		Index:          c.Index,
		AWSRegion:      c.AWSRegion,
		AssumeRoleArn:  c.AssumeRoleArn,
		UsePodIdentity: c.UsePodIdentity,
	}

	if c.AWSAccessKeyIDSecretRef != nil {
		accessKeyID, err := utils.GetSecretKey(ctx, cl, c.AWSAccessKeyIDSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.AWSAccessKeyID = lo.ToPtr(accessKeyID)
	}

	if c.AWSSecretAccessKeySecretRef != nil {
		secretAccessKey, err := utils.GetSecretKey(ctx, cl, c.AWSSecretAccessKeySecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.AWSSecretAccessKey = lo.ToPtr(secretAccessKey)
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

	// Whether to sign requests with AWS SigV4.
	// +kubebuilder:validation:Optional
	AWSSigv4 *bool `json:"awsSigv4,omitempty"`

	// Reference to a secret key containing the AWS access key id for SigV4 authentication.
	// +kubebuilder:validation:Optional
	AWSAccessKeyIDSecretRef *corev1.SecretKeySelector `json:"awsAccessKeyIdSecretRef,omitempty"`

	// Reference to a secret key containing the AWS secret access key for SigV4 authentication.
	// +kubebuilder:validation:Optional
	AWSSecretAccessKeySecretRef *corev1.SecretKeySelector `json:"awsSecretAccessKeySecretRef,omitempty"`

	// AWS region for SigV4 authentication.
	// +kubebuilder:validation:Optional
	AWSRegion *string `json:"awsRegion,omitempty"`
}

func (c *WorkbenchToolPrometheusConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolPrometheusConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolPrometheusConnectionAttributes{
		URL:       c.URL,
		Username:  c.Username,
		TenantID:  c.TenantID,
		AWSSigv4:  c.AWSSigv4,
		AWSRegion: c.AWSRegion,
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

	if c.AWSAccessKeyIDSecretRef != nil {
		accessKeyID, err := utils.GetSecretKey(ctx, cl, c.AWSAccessKeyIDSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.AWSAccessKeyID = lo.ToPtr(accessKeyID)
	}

	if c.AWSSecretAccessKeySecretRef != nil {
		secretAccessKey, err := utils.GetSecretKey(ctx, cl, c.AWSSecretAccessKeySecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.AWSSecretAccessKey = lo.ToPtr(secretAccessKey)
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

	// Optional azure managed prometheus url if you wish to use it for metrics.
	// +kubebuilder:validation:Optional
	PrometheusURL *string `json:"prometheusUrl,omitempty"`
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
		PrometheusURL:  c.PrometheusURL,
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

// WorkbenchToolSentryConfig defines a sentry connection.
type WorkbenchToolSentryConfig struct {
	// Optional Sentry API host (defaults to https://sentry.io; set for self-hosted).
	// +kubebuilder:validation:Optional
	URL *string `json:"url,omitempty"`

	// Reference to a secret key containing the Sentry user auth token or internal integration token.
	// +kubebuilder:validation:Optional
	AccessTokenSecretRef *corev1.SecretKeySelector `json:"accessTokenSecretRef,omitempty"`
}

func (c *WorkbenchToolSentryConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolSentryConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolSentryConnectionAttributes{
		URL: c.URL,
	}

	if c.AccessTokenSecretRef != nil {
		accessToken, err := utils.GetSecretKey(ctx, cl, c.AccessTokenSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.AccessToken = lo.ToPtr(accessToken)
	}

	return attr, nil
}

// WorkbenchToolSlackConfig defines a slack connection.
type WorkbenchToolSlackConfig struct {
	// Reference to a secret key containing the slack bot user OAuth token (xoxb-...).
	// +kubebuilder:validation:Optional
	BotTokenSecretRef *corev1.SecretKeySelector `json:"botTokenSecretRef,omitempty"`
}

func (c *WorkbenchToolSlackConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolSlackConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolSlackConnectionAttributes{}

	if c.BotTokenSecretRef != nil {
		botToken, err := utils.GetSecretKey(ctx, cl, c.BotTokenSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.BotToken = lo.ToPtr(botToken)
	}

	return attr, nil
}

// WorkbenchToolPagerdutyConfig defines a pagerduty connection.
type WorkbenchToolPagerdutyConfig struct {
	// Reference to a secret key containing the pagerduty REST API key.
	// +kubebuilder:validation:Optional
	APITokenSecretRef *corev1.SecretKeySelector `json:"apiTokenSecretRef,omitempty"`
}

func (c *WorkbenchToolPagerdutyConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolPagerdutyConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolPagerdutyConnectionAttributes{}

	if c.APITokenSecretRef != nil {
		apiToken, err := utils.GetSecretKey(ctx, cl, c.APITokenSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.APIToken = lo.ToPtr(apiToken)
	}

	return attr, nil
}

// WorkbenchToolTeamsConfig defines a microsoft teams / graph connection.
type WorkbenchToolTeamsConfig struct {
	// Microsoft Entra application (client) id.
	// +kubebuilder:validation:Required
	ClientID string `json:"clientId"`

	// Reference to a secret key containing the microsoft entra client secret.
	// +kubebuilder:validation:Required
	ClientSecretSecretRef corev1.SecretKeySelector `json:"clientSecretSecretRef"`

	// Microsoft Entra tenant (directory) id.
	// +kubebuilder:validation:Required
	TenantID string `json:"tenantId"`
}

func (c *WorkbenchToolTeamsConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolTeamsConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	clientSecret, err := utils.GetSecretKey(ctx, cl, &c.ClientSecretSecretRef, namespace)
	if err != nil {
		return nil, err
	}

	return &console.WorkbenchToolTeamsConnectionAttributes{
		ClientID:     c.ClientID,
		ClientSecret: clientSecret,
		TenantID:     c.TenantID,
	}, nil
}

// WorkbenchToolExaConfig defines an exa connection.
type WorkbenchToolExaConfig struct {
	// Reference to a secret key containing the exa API key.
	// +kubebuilder:validation:Optional
	APIKeySecretRef *corev1.SecretKeySelector `json:"apiKeySecretRef,omitempty"`
}

func (c *WorkbenchToolExaConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolExaConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolExaConnectionAttributes{}

	if c.APIKeySecretRef != nil {
		apiKey, err := utils.GetSecretKey(ctx, cl, c.APIKeySecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.APIKey = lo.ToPtr(apiKey)
	}

	return attr, nil
}

// WorkbenchToolGithubConfig defines a github connection.
type WorkbenchToolGithubConfig struct {
	// Optional GitHub REST API base URL (defaults to https://api.github.com/; set for GitHub Enterprise Server).
	// +kubebuilder:validation:Optional
	URL *string `json:"url,omitempty"`

	// Reference to a secret key containing an optional GitHub personal access token or fine-grained token.
	// +kubebuilder:validation:Optional
	AccessTokenSecretRef *corev1.SecretKeySelector `json:"accessTokenSecretRef,omitempty"`

	// Optional native tool subset: issues, pull_requests, repos, security, default/all, or omit for all tools.
	// +kubebuilder:validation:Optional
	Toolset *string `json:"toolset,omitempty"`

	// GitHub App ID (use with installationId and privateKey instead of accessToken).
	// +kubebuilder:validation:Optional
	AppID *string `json:"appId,omitempty"`

	// GitHub App installation ID for this organization or account.
	// +kubebuilder:validation:Optional
	InstallationID *string `json:"installationId,omitempty"`

	// Reference to a secret key containing the PEM private key for the GitHub App.
	// +kubebuilder:validation:Optional
	PrivateKeySecretRef *corev1.SecretKeySelector `json:"privateKeySecretRef,omitempty"`
}

func (c *WorkbenchToolGithubConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolGithubConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolGithubConnectionAttributes{
		URL:            c.URL,
		Toolset:        c.Toolset,
		AppID:          c.AppID,
		InstallationID: c.InstallationID,
	}

	if c.AccessTokenSecretRef != nil {
		accessToken, err := utils.GetSecretKey(ctx, cl, c.AccessTokenSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.AccessToken = lo.ToPtr(accessToken)
	}

	if c.PrivateKeySecretRef != nil {
		privateKey, err := utils.GetSecretKey(ctx, cl, c.PrivateKeySecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.PrivateKey = lo.ToPtr(privateKey)
	}

	return attr, nil
}

// WorkbenchToolGitlabConfig defines a gitlab connection.
type WorkbenchToolGitlabConfig struct {
	// Optional GitLab API base URL (defaults to https://gitlab.com when omitted).
	// +kubebuilder:validation:Optional
	URL *string `json:"url,omitempty"`

	// Reference to a secret key containing the GitLab personal access token or project/group token.
	// +kubebuilder:validation:Optional
	TokenSecretRef *corev1.SecretKeySelector `json:"tokenSecretRef,omitempty"`
}

func (c *WorkbenchToolGitlabConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolGitlabConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolGitlabConnectionAttributes{
		URL: c.URL,
	}

	if c.TokenSecretRef != nil {
		token, err := utils.GetSecretKey(ctx, cl, c.TokenSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.Token = lo.ToPtr(token)
	}

	return attr, nil
}

// WorkbenchToolBitbucketConfig defines a bitbucket cloud connection.
type WorkbenchToolBitbucketConfig struct {
	// Optional Bitbucket Cloud API base URL.
	// +kubebuilder:validation:Optional
	URL *string `json:"url,omitempty"`

	// Reference to a secret key containing the Bitbucket app password or access token.
	// +kubebuilder:validation:Optional
	TokenSecretRef *corev1.SecretKeySelector `json:"tokenSecretRef,omitempty"`
}

func (c *WorkbenchToolBitbucketConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolBitbucketConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolBitbucketConnectionAttributes{
		URL: c.URL,
	}

	if c.TokenSecretRef != nil {
		token, err := utils.GetSecretKey(ctx, cl, c.TokenSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.Token = lo.ToPtr(token)
	}

	return attr, nil
}

// WorkbenchToolBitbucketDatacenterConfig defines a bitbucket data center connection.
type WorkbenchToolBitbucketDatacenterConfig struct {
	// Bitbucket Data Center REST API base URL.
	// +kubebuilder:validation:Required
	URL string `json:"url"`

	// Reference to a secret key containing the HTTP access token or personal access token.
	// +kubebuilder:validation:Optional
	TokenSecretRef *corev1.SecretKeySelector `json:"tokenSecretRef,omitempty"`
}

func (c *WorkbenchToolBitbucketDatacenterConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolBitbucketDatacenterConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolBitbucketDatacenterConnectionAttributes{
		URL: c.URL,
	}

	if c.TokenSecretRef != nil {
		token, err := utils.GetSecretKey(ctx, cl, c.TokenSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.Token = lo.ToPtr(token)
	}

	return attr, nil
}

// WorkbenchToolAzureDevopsConfig defines an azure devops connection.
type WorkbenchToolAzureDevopsConfig struct {
	// Optional REST API root (defaults to https://dev.azure.com).
	// +kubebuilder:validation:Optional
	URL *string `json:"url,omitempty"`

	// Reference to a secret key containing the Azure DevOps personal access token.
	// +kubebuilder:validation:Optional
	TokenSecretRef *corev1.SecretKeySelector `json:"tokenSecretRef,omitempty"`
}

func (c *WorkbenchToolAzureDevopsConfig) Attributes(ctx context.Context, cl client.Client, namespace string) (*console.WorkbenchToolAzureDevopsConnectionAttributes, error) {
	if c == nil {
		return nil, nil
	}

	attr := &console.WorkbenchToolAzureDevopsConnectionAttributes{
		URL: c.URL,
	}

	if c.TokenSecretRef != nil {
		token, err := utils.GetSecretKey(ctx, cl, c.TokenSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.Token = lo.ToPtr(token)
	}

	return attr, nil
}

// WorkbenchToolLambdaConfig defines an AWS Lambda function configuration.
type WorkbenchToolLambdaConfig struct {
	// AWS Lambda function ARN.
	// +kubebuilder:validation:Required
	LambdaArn string `json:"lambdaArn"`

	// Description of the function exposed to the agent.
	// +kubebuilder:validation:Required
	Description string `json:"description"`

	// JSON schema for the tool input.
	// +kubebuilder:validation:Optional
	InputSchema *runtime.RawExtension `json:"inputSchema,omitempty"`
}

func (c *WorkbenchToolLambdaConfig) Attributes() *console.WorkbenchToolLambdaConnectionAttributes {
	if c == nil {
		return nil
	}

	attr := &console.WorkbenchToolLambdaConnectionAttributes{
		LambdaArn:   c.LambdaArn,
		Description: c.Description,
	}
	if c.InputSchema != nil {
		attr.InputSchema = lo.ToPtr(string(c.InputSchema.Raw))
	}
	return attr
}

// WorkbenchToolCloudRunConfig defines a Google Cloud Run service configuration.
type WorkbenchToolCloudRunConfig struct {
	// Cloud Run service identifier.
	// +kubebuilder:validation:Required
	Identifier string `json:"identifier"`

	// Description of the function exposed to the agent.
	// +kubebuilder:validation:Required
	Description string `json:"description"`

	// JSON schema for the tool input.
	// +kubebuilder:validation:Optional
	InputSchema *runtime.RawExtension `json:"inputSchema,omitempty"`
}

func (c *WorkbenchToolCloudRunConfig) Attributes() *console.WorkbenchToolCloudRunConnectionAttributes {
	if c == nil {
		return nil
	}

	attr := &console.WorkbenchToolCloudRunConnectionAttributes{
		Identifier:  c.Identifier,
		Description: c.Description,
	}
	if c.InputSchema != nil {
		attr.InputSchema = lo.ToPtr(string(c.InputSchema.Raw))
	}
	return attr
}

// WorkbenchToolAzureFunctionConfig defines an Azure Function / Cloud Function configuration.
type WorkbenchToolAzureFunctionConfig struct {
	// Cloud Function identifier.
	// +kubebuilder:validation:Required
	Identifier string `json:"identifier"`

	// Description of the function exposed to the agent.
	// +kubebuilder:validation:Required
	Description string `json:"description"`

	// JSON schema for the tool input.
	// +kubebuilder:validation:Optional
	InputSchema *runtime.RawExtension `json:"inputSchema,omitempty"`
}

func (c *WorkbenchToolAzureFunctionConfig) Attributes() *console.WorkbenchToolAzureFunctionConnectionAttributes {
	if c == nil {
		return nil
	}

	attr := &console.WorkbenchToolAzureFunctionConnectionAttributes{
		Identifier:  c.Identifier,
		Description: c.Description,
	}
	if c.InputSchema != nil {
		attr.InputSchema = lo.ToPtr(string(c.InputSchema.Raw))
	}
	return attr
}

// WorkbenchToolDockerConfig defines a docker/OCI registry connection.
// Auth secrets are resolved by the reconciler via HelmRepositoryAuth helpers.
type WorkbenchToolDockerConfig struct {
	// Registry host or base URL (defaults to registry-1.docker.io).
	// +kubebuilder:validation:Optional
	URL *string `json:"url,omitempty"`

	// Registry authentication provider: BASIC, BEARER, AWS, AZURE, or GCP.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Enum:=BASIC;BEARER;GCP;AZURE;AWS
	Provider *console.HelmAuthProvider `json:"provider,omitempty"`

	// Registry authentication credentials and optional proxy.
	// +kubebuilder:validation:Optional
	Auth *HelmRepositoryAuth `json:"auth,omitempty"`
}

func (c *WorkbenchToolDockerConfig) Attributes() *console.WorkbenchToolDockerConnectionAttributes {
	if c == nil {
		return nil
	}

	return &console.WorkbenchToolDockerConnectionAttributes{
		URL:      c.URL,
		Provider: c.Provider,
	}
}
