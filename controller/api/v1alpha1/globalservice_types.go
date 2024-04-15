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
	// +kubebuilder:validation:Optional
	Tags map[string]string `json:"tags,omitempty"`

	// Distro of kubernetes this cluster is running
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Enum=GENERIC;EKS;AKS;GKE;RKE;K3S
	Distro *console.ClusterDistro `json:"distro,omitempty"`

	// ServiceRef to replicate across clusters
	// +kubebuilder:validation:Optional
	ServiceRef *corev1.ObjectReference `json:"serviceRef,omitempty"`
	// ProviderRef apply to clusters with this provider
	// +kubebuilder:validation:Optional
	ProviderRef *corev1.ObjectReference `json:"providerRef,omitempty"`
	// +kubebuilder:validation:Optional
	Template *ServiceTemplate `json:"template,omitempty"`
}

// GlobalService is the Schema for the globalservices API
// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Global service Id"
type GlobalService struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   GlobalServiceSpec `json:"spec,omitempty"`
	Status Status            `json:"status,omitempty"`
}

func (p *GlobalService) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

// GlobalServiceList contains a list of GlobalService
// +kubebuilder:object:root=true
type GlobalServiceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []GlobalService `json:"items"`
}
