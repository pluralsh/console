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
	console "github.com/pluralsh/console-client-go"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&GlobalService{}, &GlobalServiceList{})
}

// GlobalServiceSpec defines the desired state of GlobalService
type GlobalServiceSpec struct {
	// Tags a set of tags to select clusters for this global service
	// +optional
	Tags map[string]string `json:"tags,omitempty"`

	// Distro of kubernetes this cluster is running
	// +optional
	Distro *console.ClusterDistro `json:"distro,omitempty"`

	// ServiceRef to replicate across clusters
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Service is immutable"
	ServiceRef corev1.ObjectReference `json:"serviceRef"`
	// ProviderRef apply to clusters with this provider
	// +optional
	ProviderRef *corev1.ObjectReference `json:"providerRef,omitempty"`
}

// GlobalServiceStatus defines the observed state of GlobalService
type GlobalServiceStatus struct {
	// ID of the global service in the Console API.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	ID *string `json:"id,omitempty"`
	// SHA of last applied configuration.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	SHA *string `json:"sha,omitempty"`
	// Represents the observations of GlobalService current state.
	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Global service Id"

// GlobalService is the Schema for the globalservices API
type GlobalService struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   GlobalServiceSpec   `json:"spec,omitempty"`
	Status GlobalServiceStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// GlobalServiceList contains a list of GlobalService
type GlobalServiceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []GlobalService `json:"items"`
}

func (p *GlobalServiceStatus) IsSHAEqual(sha string) bool {
	if !p.HasSHA() {
		return false
	}

	return p.GetSHA() == sha
}

func (p *GlobalServiceStatus) GetSHA() string {
	if !p.HasSHA() {
		return ""
	}

	return *p.SHA
}

func (p *GlobalServiceStatus) HasSHA() bool {
	return p.SHA != nil && len(*p.SHA) > 0
}

func (p *GlobalServiceStatus) GetID() string {
	if !p.HasID() {
		return ""
	}

	return *p.ID
}

func (p *GlobalServiceStatus) HasID() bool {
	return p.ID != nil && len(*p.ID) > 0
}

func (p *GlobalService) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}
