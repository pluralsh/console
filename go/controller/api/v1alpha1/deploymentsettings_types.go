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
	"fmt"

	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"

	console "github.com/pluralsh/console/go/client"
	utils "github.com/pluralsh/console/go/controller/internal/utils/safe"
)

func init() {
	SchemeBuilder.Register(&DeploymentSettings{}, &DeploymentSettingsList{})
}

// DeploymentSettingsList contains a list of DeploymentSettings
//
// +kubebuilder:object:root=true
type DeploymentSettingsList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []DeploymentSettings `json:"items"`
}

// DeploymentSettings is the Schema for the deploymentsettings API
//
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
type DeploymentSettings struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   DeploymentSettingsSpec `json:"spec,omitempty"`
	Status Status                 `json:"status,omitempty"`
}

func (in *DeploymentSettings) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// DeploymentSettingsSpec defines the desired state of DeploymentSettings
type DeploymentSettingsSpec struct {
	// AgentHelmValues custom helm values to apply to all agents (useful for things like adding customary annotations/labels)
	//
	// +kubebuilder:validation:Optional
	AgentHelmValues *runtime.RawExtension `json:"agentHelmValues,omitempty"`

	// The root repo for setting up your infrastructure with Plural.  Usually this will be your `plural up repo`
	//
	// +kubebuilder:validation:Optional
	ManagementRepo *string `json:"managementRepo,omitempty"`

	// Stacks global configuration for stack execution
	//
	// +kubebuilder:validation:Optional
	Stacks *StackSettings `json:"stacks,omitempty"`

	// Bindings
	//
	// +kubebuilder:validation:Optional
	Bindings *DeploymentSettingsBindings `json:"bindings,omitempty"`

	// PrometheusConnection connection details for a prometheus instance to use
	//
	// +kubebuilder:validation:Optional
	PrometheusConnection *HTTPConnection `json:"prometheusConnection,omitempty"`

	// LokiConnection connection details for a loki instance to use
	//
	// +kubebuilder:validation:Optional
	LokiConnection *HTTPConnection `json:"lokiConnection,omitempty"`

	// AI settings specifies a configuration for LLM provider clients
	//
	// +kubebuilder:validation:Optional
	AI *AISettings `json:"ai,omitempty"`

	// Settings for connections to log aggregation datastores
	//
	// +kubebuilder:validation:Optional
	Logging *LoggingSettings `json:"logging,omitempty"`

	// Settings for managing Plural's cost management features
	//
	// +kubebuilder:validation:Optional
	Cost *CostSettings `json:"cost,omitempty"`

	// pointer to the deployment GIT repository to use
	// +kubebuilder:validation:Optional
	DeploymentRepositoryRef *NamespacedName `json:"deploymentRepositoryRef,omitempty"`

	// pointer to the Scaffolds GIT repository to use
	// +kubebuilder:validation:Optional
	ScaffoldsRepositoryRef *NamespacedName `json:"scaffoldsRepositoryRef,omitempty"`
}

type LoggingSettings struct {
	// +kubebuilder:validation:Optional
	Enabled *bool `json:"enabled,omitempty"`

	// The type of log aggregation solution you wish to use
	// +kubebuilder:validation:Enum=VICTORIA;ELASTIC;OPENSEARCH
	// +kubebuilder:default=VICTORIA
	// +kubebuilder:validation:Optional
	Driver *console.LogDriver `json:"driver,omitempty"`

	// Configures a connection to victoria metrics
	// +kubebuilder:validation:Optional
	Victoria *HTTPConnection `json:"victoria,omitempty"`

	// Configures a connection to elasticsearch
	// +kubebuilder:validation:Optional
	Elastic *ElasticsearchConnection `json:"elastic,omitempty"`

	// Configures a connection to opensearch
	// +kubebuilder:validation:Optional
	Opensearch *OpensearchConnection `json:"opensearch,omitempty"`
}

type ElasticsearchConnection struct {
	// Host ...
	//
	// +kubebuilder:validation:Required
	Host string `json:"host"`

	// Index to query in elasticsearch
	//
	// +kubebuilder:validation:Optional
	Index string `json:"index"`

	// User to connect with basic auth
	//
	// +kubebuilder:validation:Optional
	User *string `json:"user,omitempty"`

	// PasswordSecretRef selects a key of a password Secret
	//
	// +kubebuilder:validation:Optional
	PasswordSecretRef *corev1.SecretKeySelector `json:"passwordSecretRef,omitempty"`
}

func (r *ElasticsearchConnection) Attributes(ctx context.Context, c client.Client, namespace string) (*console.ElasticsearchConnectionAttributes, error) {
	attr := &console.ElasticsearchConnectionAttributes{
		Host:  r.Host,
		User:  r.User,
		Index: r.Index,
	}
	if r.PasswordSecretRef != nil {
		password, err := utils.GetSecretKey(ctx, c, r.PasswordSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.Password = lo.ToPtr(password)
	}
	return attr, nil
}

type OpensearchConnection struct {
	// Host ...
	//
	// +kubebuilder:validation:Required
	Host string `json:"host"`

	// Index to query in opensearch
	//
	// +kubebuilder:validation:Optional
	Index string `json:"index"`

	// AWS Access Key ID to use, can also use IRSA to acquire credentials
	//
	// +kubebuilder:validation:Optional
	AWSAccessKeyID *string `json:"awsAccessKeyId,omitempty"`

	// AWS Secret Access Key to use, can also use IRSA to acquire credentials
	//
	// +kubebuilder:validation:Optional
	AwsSecretAccessKeySecretRef *corev1.SecretKeySelector `json:"awsSecretAccessKeySecretRef,omitempty"`

	// AWS Region to use
	//
	// +kubebuilder:validation:Optional
	AWSRegion *string `json:"awsRegion,omitempty"`
}

func (r *OpensearchConnection) Attributes(ctx context.Context, c client.Client, namespace string) (*console.OpensearchConnectionAttributes, error) {
	attr := &console.OpensearchConnectionAttributes{
		Host:           r.Host,
		Index:          r.Index,
		AWSAccessKeyID: r.AWSAccessKeyID,
	}
	if r.AwsSecretAccessKeySecretRef != nil {
		awsSecretAccessKeyValue, err := utils.GetSecretKey(ctx, c, r.AwsSecretAccessKeySecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.AWSSecretAccessKey = lo.ToPtr(awsSecretAccessKeyValue)
	}
	return attr, nil
}

type HTTPConnection struct {
	// Host ...
	//
	// +kubebuilder:validation:Required
	Host string `json:"host"`

	// User to connect with basic auth
	//
	// +kubebuilder:validation:Optional
	User *string `json:"user,omitempty"`

	// Password to connect w/ for basic auth
	//
	// +kubebuilder:validation:Optional
	Password *string `json:"password,omitempty"`

	// PasswordSecretRef selects a key of a password Secret
	//
	// +kubebuilder:validation:Optional
	PasswordSecretRef *corev1.SecretKeySelector `json:"passwordSecretRef,omitempty"`
}

func (r *HTTPConnection) Attributes(ctx context.Context, c client.Client, namespace string) (*console.HTTPConnectionAttributes, error) {
	attr := &console.HTTPConnectionAttributes{
		Host:     r.Host,
		User:     r.User,
		Password: r.Password,
	}
	if r.PasswordSecretRef != nil {
		password, err := utils.GetSecretKey(ctx, c, r.PasswordSecretRef, namespace)
		if err != nil {
			return nil, err
		}
		attr.Password = lo.ToPtr(password)
	}
	return attr, nil
}

type DeploymentSettingsBindings struct {
	// Read bindings.
	//
	// +kubebuilder:validation:Optional
	Read []Binding `json:"read,omitempty"`

	// Write bindings.
	//
	// +kubebuilder:validation:Optional
	Write []Binding `json:"write,omitempty"`

	// Create bindings.
	//
	// +kubebuilder:validation:Optional
	Create []Binding `json:"create,omitempty"`

	// Git bindings.
	//
	// +kubebuilder:validation:Optional
	Git []Binding `json:"git,omitempty"`
}

type StackSettings struct {
	// JobSpec optional k8s job configuration for the job that will apply this stack
	//
	// +kubebuilder:validation:Optional
	JobSpec *JobSpec `json:"jobSpec,omitempty"`

	// ConnectionRef reference to ScmConnection
	//
	// +kubebuilder:validation:Optional
	ConnectionRef *corev1.ObjectReference `json:"connectionRef,omitempty"`
}

type CostSettings struct {
	// A percentage amount of cushion to give over the average discovered utilization to generate a scaling recommendation,
	// should be between 1-99.
	//
	// +kubebuilder:validation:Optional
	RecommendationCushion *int64 `json:"recommendationCushion,omitempty"`

	// The minimal monthly cost for a recommendation to be covered by a controller
	//
	// +kubebuilder:validation:Optional
	RecommendationThreshold *int64 `json:"recommendationThreshold,omitempty"`
}

func (cost *CostSettings) Attributes() *console.CostSettingsAttributes {
	if cost == nil {
		return nil
	}

	return &console.CostSettingsAttributes{
		RecommendationThreshold: cost.RecommendationThreshold,
		RecommendationCushion:   cost.RecommendationCushion,
	}
}

// AISettings holds the configuration for LLM provider clients.
type AISettings struct {
	// Enabled defines whether to enable the AI integration or not.
	//
	// +kubebuilder:default=false
	// +kubebuilder:validation:Optional
	Enabled *bool `json:"enabled,omitempty"`

	// +kubebuilder:validation:Optional
	Tools *Tools `json:"tools,omitempty"`

	// Provider defines which of the supported LLM providers should be used.
	//
	// +kubebuilder:validation:Enum=OPENAI;ANTHROPIC;OLLAMA;AZURE;BEDROCK;VERTEX
	// +kubebuilder:default=OPENAI
	// +kubebuilder:validation:Optional
	Provider *console.AiProvider `json:"provider,omitempty"`

	// Provider to use for tool calling, in case you want to use a different LLM more optimized to those tasks
	//
	// +kubebuilder:validation:Enum=OPENAI;ANTHROPIC;OLLAMA;AZURE;BEDROCK;VERTEX
	// +kubebuilder:validation:Optional
	ToolProvider *console.AiProvider `json:"toolProvider,omitempty"`

	// Provider to use for generating embeddings. Oftentimes foundational model providers do not have embeddings models, and it's better to simply use OpenAI.
	//
	// +kubebuilder:validation:Enum=OPENAI;ANTHROPIC;OLLAMA;AZURE;BEDROCK;VERTEX
	// +kubebuilder:validation:Optional
	EmbeddingProvider *console.AiProvider `json:"embeddingProvider,omitempty"`

	// OpenAI holds the OpenAI provider configuration.
	//
	// +kubebuilder:validation:Optional
	OpenAI *AIProviderSettings `json:"openAI,omitempty"`

	// Anthropic holds the Anthropic provider configuration.
	//
	// +kubebuilder:validation:Optional
	Anthropic *AIProviderSettings `json:"anthropic,omitempty"`

	// Ollama holds configuration for a self-hosted Ollama deployment, more details available at https://github.com/ollama/ollama
	//
	// +kubebuilder:validation:Optional
	Ollama *OllamaSettings `json:"ollama,omitempty"`

	// Azure holds configuration for using AzureOpenAI to generate LLM insights
	//
	// +kubebuilder:validation:Optional
	Azure *AzureOpenAISettings `json:"azure,omitempty"`

	// Bedrock holds configuration for using AWS Bedrock to generate LLM insights
	//
	// +kubebuilder:validation:Optional
	Bedrock *BedrockSettings `json:"bedrock,omitempty"`

	// Vertex holds configuration for using GCP VertexAI to generate LLM insights
	//
	// +kubebuilder:validation:Optional
	Vertex *VertexSettings `json:"vertex,omitempty"`

	// +kubebuilder:validation:Optional
	VectorStore *VectorStore `json:"vectorStore,omitempty"`
}

type Tools struct {
	CreatePr *CreatePr `json:"createPr,omitempty"`
}

type CreatePr struct {
	// ScmConnectionRef the SCM connection to use for pr automations
	ScmConnectionRef *corev1.ObjectReference `json:"scmConnectionRef,omitempty"`
}

func (in *LoggingSettings) Attributes(ctx context.Context, c client.Client, namespace string) (*console.LoggingSettingsAttributes, error) {
	attr := &console.LoggingSettingsAttributes{
		Enabled: in.Enabled,
		Driver:  in.Driver,
	}

	if in.Victoria != nil {
		connection, err := in.Victoria.Attributes(ctx, c, namespace)
		if err != nil {
			return nil, err
		}
		attr.Victoria = connection
	}

	if in.Elastic != nil {
		connection, err := in.Elastic.Attributes(ctx, c, namespace)
		if err != nil {
			return nil, err
		}
		attr.Elastic = connection
	}

	if in.Opensearch != nil {
		connection, err := in.Opensearch.Attributes(ctx, c, namespace)
		if err != nil {
			return nil, err
		}
		attr.Opensearch = connection
	}
	return attr, nil
}

func (in *AISettings) Attributes(ctx context.Context, c client.Client, namespace string) (*console.AiSettingsAttributes, error) {
	vectorStoreAttributes, err := in.VectorStore.Attributes(ctx, c, namespace)
	if err != nil {
		return nil, err
	}

	attr := &console.AiSettingsAttributes{
		Enabled:           in.Enabled,
		Provider:          in.Provider,
		ToolProvider:      in.ToolProvider,
		EmbeddingProvider: in.EmbeddingProvider,
		VectorStore:       vectorStoreAttributes,
	}

	if in.Tools != nil && in.Tools.CreatePr != nil {
		if in.Tools.CreatePr.ScmConnectionRef != nil {
			scm := in.Tools.CreatePr.ScmConnectionRef
			connection := &ScmConnection{}
			if err := c.Get(ctx, types.NamespacedName{Name: scm.Name, Namespace: scm.Namespace}, connection); err != nil {
				return nil, err
			}

			attr.Tools = &console.ToolConfigAttributes{
				CreatePr: &console.CreatePrConfigAttributes{
					ConnectionID: connection.Status.ID,
				},
			}
		}
	}

	switch *in.Provider {
	case console.AiProviderOpenai:
		if in.OpenAI == nil {
			return nil, nil // nil if you're using internal plural cloud auth to openai
		}

		token, err := in.OpenAI.Token(ctx, c, namespace)
		if err != nil {
			return nil, err
		}

		attr.Openai = &console.OpenaiSettingsAttributes{
			AccessToken:    &token,
			Model:          in.OpenAI.Model,
			BaseURL:        in.OpenAI.BaseUrl,
			ToolModel:      in.OpenAI.ToolModel,
			EmbeddingModel: in.OpenAI.EmbeddingModel,
		}
	case console.AiProviderAnthropic:
		if in.Anthropic == nil {
			return nil, fmt.Errorf("must provide anthropic configuration to set the provider to ANTHROPIC")
		}

		token, err := in.Anthropic.Token(ctx, c, namespace)
		if err != nil {
			return nil, err
		}

		attr.Anthropic = &console.AnthropicSettingsAttributes{
			AccessToken:    lo.ToPtr(token),
			Model:          in.Anthropic.Model,
			ToolModel:      in.Anthropic.ToolModel,
			EmbeddingModel: in.Anthropic.EmbeddingModel,
		}
	case console.AiProviderAzure:
		if in.Azure == nil {
			return nil, fmt.Errorf("must provide azure openai configuration to set the provider to AZURE")
		}

		token, err := in.Azure.Token(ctx, c, namespace)
		if err != nil {
			return nil, err
		}

		attr.Azure = &console.AzureOpenaiAttributes{
			Endpoint:       in.Azure.Endpoint,
			APIVersion:     in.Azure.ApiVersion,
			Model:          in.Azure.Model,
			ToolModel:      in.Azure.ToolModel,
			EmbeddingModel: in.Azure.EmbeddingModel,
			AccessToken:    token,
		}
	case console.AiProviderVertex:
		if in.Vertex == nil {
			return nil, fmt.Errorf("must provide vertex ai configuration to set the provider to VERTEX")
		}

		json, err := in.Vertex.ServiceAccountJSON(ctx, c, namespace)
		if err != nil {
			return nil, err
		}

		attr.Vertex = &console.VertexAiAttributes{
			Model:              in.Vertex.Model,
			ServiceAccountJSON: json,
			Project:            in.Vertex.Project,
			Location:           in.Vertex.Location,
			Endpoint:           in.Vertex.Endpoint,
		}
	case console.AiProviderBedrock:
		if in.Bedrock == nil {
			return nil, fmt.Errorf("must provide bedrock configuration to set the provider to BEDROCK")
		}

		secret, err := in.Bedrock.SecretAccessKey(ctx, c, namespace)
		if err != nil {
			return nil, err
		}

		attr.Bedrock = &console.BedrockAiAttributes{
			ModelID:         in.Bedrock.ModelID,
			ToolModelID:     in.Bedrock.ToolModelId,
			AccessKeyID:     in.Bedrock.AccessKeyId,
			SecretAccessKey: secret,
		}
	case console.AiProviderOllama:
		if in.Ollama == nil {
			return nil, fmt.Errorf("must provide ollama configuration to set the provider to OLLAMA")
		}

		auth, err := in.Ollama.Authorization(ctx, c, namespace)
		if err != nil {
			return nil, err
		}

		attr.Ollama = &console.OllamaAttributes{
			URL:           in.Ollama.URL,
			Model:         in.Ollama.Model,
			ToolModel:     in.Ollama.ToolModel,
			Authorization: auth,
		}
	}

	return attr, nil
}

type AIProviderSettings struct {
	// Model is the LLM model name to use.
	//
	// +kubebuilder:validation:Optional
	Model *string `json:"model,omitempty"`

	// Model to use for tool calling, which is less frequent and often requires more advanced reasoning
	//
	// +kubebuilder:validation:Optional
	ToolModel *string `json:"toolModel,omitempty"`

	// Model to use for generating embeddings
	//
	// +kubebuilder:validation:Optional
	EmbeddingModel *string `json:"embeddingModel,omitempty"`

	// A custom base url to use, for reimplementations of the same API scheme (for instance Together.ai uses the OpenAI API spec)
	//
	// +kubebuilder:validation:Optional
	BaseUrl *string `json:"baseUrl,omitempty"`

	// TokenSecretRef is a reference to the local secret holding the token to access
	// the configured AI provider.
	//
	// +kubebuilder:validation:Required
	TokenSecretRef corev1.SecretKeySelector `json:"tokenSecretRef"`
}

// Settings for configuring a self-hosted Ollama LLM, more details at https://github.com/ollama/ollama
type OllamaSettings struct {
	// URL is the url this model is queryable on
	//
	// +kubebuilder:validation:Required
	URL string `json:"url"`

	// Model is the Ollama model to use when querying the /chat api
	//
	// +kubebuilder:validation:Required
	Model string `json:"model"`

	// Model to use for tool calling, which is less frequent and often requires more advanced reasoning
	//
	// +kubebuilder:validation:Optional
	ToolModel *string `json:"toolModel,omitempty"`

	// TokenSecretRef is a reference to the local secret holding the contents of a HTTP Authorization header
	// to send to your ollama api in case authorization is required (eg for an instance hosted on a public network)
	//
	// +kubebuilder:validation:Optional
	AuthorizationSecretRef *corev1.SecretKeySelector `json:"tokenSecretRef"`
}

type AzureOpenAISettings struct {
	// Your Azure OpenAI endpoint, should be formatted like: https://{endpoint}/openai/deployments/{deployment-id}"
	//
	// +kubebuilder:validation:Required
	Endpoint string `json:"endpoint"`

	// The azure openai Data plane - inference api version to use, defaults to 2024-10-01-preview or the latest available
	//
	// +kubebuilder:validation:Optional
	ApiVersion *string `json:"apiVersion,omitempty"`

	// The OpenAi Model you wish to use.  If not specified, Plural will provide a default
	//
	// +kubebuilder:validation:Optional
	Model *string `json:"model,omitempty"`

	// Model to use for tool calling, which is less frequent and often requires more advanced reasoning
	//
	// +kubebuilder:validation:Optional
	ToolModel *string `json:"toolModel,omitempty"`

	// Model to use for generating embeddings
	//
	// +kubebuilder:validation:Optional
	EmbeddingModel *string `json:"embeddingModel,omitempty"`

	// TokenSecretRef is a reference to the local secret holding the token to access
	// the configured AI provider.
	//
	// +kubebuilder:validation:Required
	TokenSecretRef corev1.SecretKeySelector `json:"tokenSecretRef"`
}

type BedrockSettings struct {
	// The AWS Bedrock Model ID to use
	//
	// +kubebuilder:validation:Required
	ModelID string `json:"modelId"`

	// Model to use for tool calling, which is less frequent and often requires more advanced reasoning
	//
	// +kubebuilder:validation:Optional
	ToolModelId *string `json:"toolModelId,omitempty"`

	// An AWS Access Key ID to use, can also use IRSA to acquire credentials
	//
	// +kubebuilder:validation:Optional
	AccessKeyId *string `json:"accessKeyId,omitempty"`

	// An AWS Secret Access Key to use, can also use IRSA to acquire credentials
	//
	// +kubebuilder:validation:Optional
	SecretAccessKeyRef *corev1.SecretKeySelector `json:"secretAccessKeyRef"`
}

type VertexSettings struct {
	// The Vertex AI model to use
	//
	// +kubebuilder:validation:Optional
	Model *string `json:"model,omitempty"`

	// Model to use for tool calling, which is less frequent and often requires more advanced reasoning
	//
	// +kubebuilder:validation:Optional
	ToolModel *string `json:"toolModel,omitempty"`

	// The GCP project you'll be using
	//
	// +kubebuilder:validation:Required
	Project string `json:"project"`

	// The GCP region Vertex is queried from
	//
	// +kubebuilder:validation:Required
	Location string `json:"location"`

	// A custom endpoint for self-deployed models
	//
	// +kubebuilder:validation:Optional
	Endpoint *string `json:"endpoint,omitempty"`

	// An Service Account json file stored w/in a kubernetes secret to use for authentication to GCP
	//
	// +kubebuilder:validation:Optional
	ServiceAccountJsonSecretRef *corev1.SecretKeySelector `json:"serviceAccountJsonSecretRef,omitempty"`
}

func (in *AIProviderSettings) Token(ctx context.Context, c client.Client, namespace string) (string, error) {
	if in == nil {
		return "", fmt.Errorf("configured ai provider settings cannot be nil")
	}

	return utils.GetSecretKey(ctx, c, &in.TokenSecretRef, namespace)
}

func (in *AzureOpenAISettings) Token(ctx context.Context, c client.Client, namespace string) (string, error) {
	if in == nil {
		return "", fmt.Errorf("configured ai provider settings cannot be nil")
	}

	return utils.GetSecretKey(ctx, c, &in.TokenSecretRef, namespace)
}

func (in *OllamaSettings) Authorization(ctx context.Context, c client.Client, namespace string) (*string, error) {
	if in == nil {
		return nil, fmt.Errorf("configured ollama settings cannot be nil")
	}

	if in.AuthorizationSecretRef == nil {
		return nil, nil
	}

	res, err := utils.GetSecretKey(ctx, c, in.AuthorizationSecretRef, namespace)
	return lo.ToPtr(res), err
}

func (in *BedrockSettings) SecretAccessKey(ctx context.Context, c client.Client, namespace string) (*string, error) {
	if in == nil {
		return nil, fmt.Errorf("configured ollama settings cannot be nil")
	}

	if in.SecretAccessKeyRef == nil {
		return nil, nil
	}

	res, err := utils.GetSecretKey(ctx, c, in.SecretAccessKeyRef, namespace)
	return lo.ToPtr(res), err
}

func (in *VertexSettings) ServiceAccountJSON(ctx context.Context, c client.Client, namespace string) (*string, error) {
	if in == nil {
		return nil, fmt.Errorf("configured vertex ai settings cannot be nil")
	}

	if in.ServiceAccountJsonSecretRef == nil {
		return nil, nil
	}

	res, err := utils.GetSecretKey(ctx, c, in.ServiceAccountJsonSecretRef, namespace)
	return lo.ToPtr(res), err
}

type VectorStore struct {
	// +kubebuilder:default=false
	// +kubebuilder:validation:Optional
	Enabled *bool `json:"enabled,omitempty"`

	// +kubebuilder:validation:Enum=ELASTIC;OPENSEARCH
	// +kubebuilder:validation:Optional
	VectorStore *console.VectorStore `json:"vectorStore,omitempty"`

	// +kubebuilder:validation:Optional
	Elastic *ElasticsearchConnectionSettings `json:"elastic,omitempty"`

	// +kubebuilder:validation:Optional
	Opensearch *OpensearchConnectionSettings `json:"opensearch,omitempty"`
}

func (in *VectorStore) Attributes(ctx context.Context, c client.Client, namespace string) (*console.VectorStoreAttributes, error) {
	if in == nil {
		return nil, nil
	}

	if lo.FromPtr(in.Enabled) && in.VectorStore == nil {
		return nil, fmt.Errorf("vector store type has to be set if it is enabled")
	}

	attr := &console.VectorStoreAttributes{
		Enabled: in.Enabled,
		Store:   in.VectorStore,
	}

	switch *in.VectorStore {
	case console.VectorStoreElastic:
		if in.Elastic == nil {
			return nil, fmt.Errorf("must provide elastic configuration to set the provider to ELASTIC")
		}

		password, err := in.Elastic.Password(ctx, c, namespace)
		if err != nil {
			return nil, err
		}

		attr.Elastic = &console.ElasticsearchConnectionAttributes{
			Host:     in.Elastic.Host,
			Index:    in.Elastic.Index,
			User:     in.Elastic.User,
			Password: password,
		}
	case console.VectorStoreOpensearch:
		if in.Opensearch == nil {
			return nil, fmt.Errorf("must provide opensearch configuration to set the provider to OPENSEARCH")
		}

		awsSecretAccessKey, err := in.Opensearch.AwsSecretAccessKey(ctx, c, namespace)
		if err != nil {
			return nil, err
		}

		attr.Opensearch = &console.OpensearchConnectionAttributes{
			Host:               in.Opensearch.Host,
			Index:              in.Opensearch.Index,
			AWSAccessKeyID:     in.Opensearch.AWSAccessKeyID,
			AWSSecretAccessKey: awsSecretAccessKey,
			AWSRegion:          in.Opensearch.AwsRegion,
		}
	}
	return attr, nil
}

type ElasticsearchConnectionSettings struct {
	// +kubebuilder:validation:Required
	Host string `json:"host"`

	// +kubebuilder:validation:Required
	Index string `json:"index"`

	// +kubebuilder:validation:Optional
	User *string `json:"user,omitempty"`

	// +kubebuilder:validation:Optional
	PasswordSecretRef *corev1.SecretKeySelector `json:"passwordSecretRef,omitempty"`
}

func (in *ElasticsearchConnectionSettings) Password(ctx context.Context, c client.Client, namespace string) (*string, error) {
	if in == nil {
		return nil, fmt.Errorf("configured elastic settings cannot be nil")
	}

	if in.PasswordSecretRef == nil {
		return nil, nil
	}

	res, err := utils.GetSecretKey(ctx, c, in.PasswordSecretRef, namespace)
	return lo.ToPtr(res), err
}

type OpensearchConnectionSettings struct {
	Host  string `json:"host"`
	Index string `json:"index"`

	// +kubebuilder:validation:Optional
	AWSAccessKeyID *string `json:"awsAccessKeyId,omitempty"`

	// +kubebuilder:validation:Optional
	AWSSecretAccessKeyRef *corev1.SecretKeySelector `json:"awsSecretAccessKeyRef,omitempty"`

	// +kubebuilder:validation:Optional
	AwsRegion *string `json:"awsRegion,omitempty"`
}

func (in *OpensearchConnectionSettings) AwsSecretAccessKey(ctx context.Context, c client.Client, namespace string) (*string, error) {
	if in == nil {
		return nil, fmt.Errorf("configured opensearch settings cannot be nil")
	}

	if in.AWSSecretAccessKeyRef == nil {
		return nil, nil
	}

	res, err := utils.GetSecretKey(ctx, c, in.AWSSecretAccessKeyRef, namespace)
	return lo.ToPtr(res), err
}
