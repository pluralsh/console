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
	"fmt"
	"strconv"

	"github.com/samber/lo"

	console "github.com/pluralsh/console/go/client"
)

// WorkbenchJobModes defines mode-specific options for workbench jobs.
type WorkbenchJobModes struct {
	// Plan enables planning mode for the job.
	// +kubebuilder:validation:Optional
	Plan *bool `json:"plan,omitempty"`

	// Verification enables verification mode for the job.
	// +kubebuilder:validation:Optional
	Verification *bool `json:"verification,omitempty"`

	// Model overrides the AI model used for the job.
	// +kubebuilder:validation:Optional
	Model *WorkbenchJobModel `json:"model,omitempty"`

	// Coding defines coding mode options for the job.
	// +kubebuilder:validation:Optional
	Coding *WorkbenchJobCodingModes `json:"coding,omitempty"`

	// Budget defines budget limits for the job.
	// +kubebuilder:validation:Optional
	Budget *WorkbenchJobBudget `json:"budget,omitempty"`

	// Kubernetes defines kubernetes action options for the job.
	// +kubebuilder:validation:Optional
	Kubernetes *WorkbenchJobKubernetesModes `json:"kubernetes,omitempty"`
}

func (in *WorkbenchJobModes) Attributes() (*console.WorkbenchJobModesAttributes, error) {
	if in == nil {
		return nil, nil
	}

	budget, err := in.Budget.Attributes()
	if err != nil {
		return nil, err
	}

	attrs := &console.WorkbenchJobModesAttributes{
		Plan:         in.Plan,
		Verification: in.Verification,
		Budget:       budget,
	}

	if in.Model != nil {
		attrs.Model = &console.WorkbenchJobModelAttributes{
			Provider: in.Model.Provider,
			Model:    in.Model.Model,
		}
	}

	if in.Coding != nil {
		attrs.Coding = &console.WorkbenchJobCodingModesAttributes{
			Babysit:  in.Coding.Babysit,
			Approval: in.Coding.Approval,
			Review:   in.Coding.Review,
		}
	}

	if in.Kubernetes != nil {
		attrs.Kubernetes = &console.WorkbenchJobKubernetesModesAttributes{
			Update:            in.Kubernetes.Update,
			Delete:            in.Kubernetes.Delete,
			Exec:              in.Kubernetes.Exec,
			Drain:             in.Kubernetes.Drain,
			ExcludeNamespaces: lo.ToSlicePtr(in.Kubernetes.ExcludeNamespaces),
			RequireNamespaces: lo.ToSlicePtr(in.Kubernetes.RequireNamespaces),
		}
	}

	return attrs, nil
}

// WorkbenchJobModel defines the AI model override for a workbench job.
type WorkbenchJobModel struct {
	// Provider is the AI provider for the job.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=OPENAI;ANTHROPIC;OLLAMA;AZURE;BEDROCK;VERTEX;OPENAI_COMPATIBLE;XAI
	Provider console.AiProvider `json:"provider"`

	// Model is the model name for the job.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:MinLength=1
	Model string `json:"model"`
}

// WorkbenchJobCodingModes defines coding mode options for a workbench job.
type WorkbenchJobCodingModes struct {
	// Babysit enables babysit mode for coding agent runs.
	// +kubebuilder:validation:Optional
	Babysit *bool `json:"babysit,omitempty"`

	// Approval requires approval before coding agent runs continue.
	// +kubebuilder:validation:Optional
	Approval *bool `json:"approval,omitempty"`

	// Review enables pull request review mode for coding agent runs.
	// +kubebuilder:validation:Optional
	Review *bool `json:"review,omitempty"`
}

// WorkbenchJobBudget defines budget limits for a workbench job.
type WorkbenchJobBudget struct {
	// Cost is the maximum cost budget for the job.
	// It is a string to allow decimal values (e.g. "12.5").
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Pattern=`^[0-9]+(\.[0-9]+)?$`
	Cost *string `json:"cost,omitempty"`

	// Tokens is the maximum token budget for the job.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Minimum=0
	Tokens *int64 `json:"tokens,omitempty"`
}

func (in *WorkbenchJobBudget) Attributes() (*console.WorkbenchJobBudgetAttributes, error) {
	if in == nil {
		return nil, nil
	}

	attrs := &console.WorkbenchJobBudgetAttributes{Tokens: in.Tokens}
	if in.Cost != nil {
		cost, err := strconv.ParseFloat(*in.Cost, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid budget cost %q: %w", *in.Cost, err)
		}
		attrs.Cost = &cost
	}

	return attrs, nil
}

// WorkbenchJobKubernetesModes defines kubernetes action options for a workbench job.
type WorkbenchJobKubernetesModes struct {
	// Update enables kubernetes update actions.
	// +kubebuilder:validation:Optional
	Update *bool `json:"update,omitempty"`

	// Delete enables kubernetes delete actions.
	// +kubebuilder:validation:Optional
	Delete *bool `json:"delete,omitempty"`

	// Exec enables kubernetes exec actions.
	// +kubebuilder:validation:Optional
	Exec *bool `json:"exec,omitempty"`

	// Drain enables kubernetes node drain actions.
	// +kubebuilder:validation:Optional
	Drain *bool `json:"drain,omitempty"`

	// ExcludeNamespaces are namespaces the agent can never act in.
	// +kubebuilder:validation:Optional
	ExcludeNamespaces []string `json:"excludeNamespaces,omitempty"`

	// RequireNamespaces, if set, are the only namespaces the agent is allowed to act in.
	// +kubebuilder:validation:Optional
	RequireNamespaces []string `json:"requireNamespaces,omitempty"`
}
