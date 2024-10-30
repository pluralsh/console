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
		secret := &corev1.Secret{}
		if err := c.Get(ctx, types.NamespacedName{Name: r.PasswordSecretRef.Name, Namespace: namespace}, secret); err != nil {
			return nil, err
		}
		password := secret.Data[r.PasswordSecretRef.Key]
		attr.Password = lo.ToPtr(string(password))
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

// AISettings holds the configuration for LLM provider clients.
type AISettings struct {
	// Enabled defines whether to enable the AI integration or not.
	//
	// +kubebuilder:default=false
	// +kubebuilder:validation:Optional
	Enabled *bool `json:"enabled,omitempty"`

	// Provider defines which of the supported LLM providers should be used.
	//
	// +kubebuilder:validation:Enum=OPENAI;ANTHROPIC;OLLAMA;AZURE
	// +kubebuilder:default=OPENAI
	// +kubebuilder:validation:Optional
	Provider *console.AiProvider `json:"provider,omitempty"`

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
}

func (in *AISettings) Attributes(ctx context.Context, c client.Client, namespace string) (*console.AiSettingsAttributes, error) {
	attr := &console.AiSettingsAttributes{
		Enabled:  in.Enabled,
		Provider: in.Provider,
	}

	switch *in.Provider {
	case console.AiProviderOpenai:
		if in.OpenAI == nil {
			return nil, fmt.Errorf("must provide openai configuration to set the provider to OPENAI")
		}

		token, err := in.OpenAI.Token(ctx, c, namespace)
		if err != nil {
			return nil, err
		}

		attr.Openai = &console.OpenaiSettingsAttributes{
			AccessToken: &token,
			Model:       in.OpenAI.Model,
			BaseURL:     in.OpenAI.BaseUrl,
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
			AccessToken: lo.ToPtr(token),
			Model:       in.OpenAI.Model,
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
			Endpoint:    in.Azure.Endpoint,
			APIVersion:  in.Azure.ApiVersion,
			AccessToken: token,
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

	// An AWS Access Key ID to use, can also use IRSA to acquire credentials
	//
	// +kubebuilder:validation:Optional
	AccessKeyId *string `json:"accessKeyId,omitempty"`

	// An AWS Secret Access Key to use, can also use IRSA to acquire credentials
	//
	// +kubebuilder:validation:Optional
	SecretAccessKeyRef *corev1.SecretKeySelector `json:"secretAccessKeyRef"`
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
