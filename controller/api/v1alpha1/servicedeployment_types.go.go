package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&ServiceDeployment{}, &ServiceDeploymentList{})
}

type ComponentState string

const (
	ComponentStateRunning ComponentState = "RUNNING"
	ComponentStatePending ComponentState = "PENDING"
	ComponentStateFailed  ComponentState = "FAILED"
)

type ServiceKustomize struct {
	Path string `json:"path"`
}

type ServiceGit struct {
	Folder string `json:"folder"`
	Ref    string `json:"ref"`
}

type ServiceHelm struct {
	// +optional
	ValuesRef *corev1.ConfigMapKeySelector `json:"values,omitempty"`
	// +optional
	ValuesFiles []*string `json:"valuesFiles,omitempty"`
	// +optional
	ChartRef *corev1.ConfigMapKeySelector `json:"chart,omitempty"`
	// +optional
	Version *string `json:"version,omitempty"`
	// +optional
	Repository *NamespacedName `json:"repository,omitempty"`
}

type SyncConfigAttributes struct {
	// +optional
	Labels map[string]string `json:"labels,omitempty"`

	// +optional
	Annotations map[string]string `json:"annotations,omitempty"`
}

type ServiceSpec struct {
	// +optional
	DocsPath *string `json:"docsPath,omitempty"`
	// +kubebuilder:default:='0.0.1'
	Version string `json:"version"`
	// +optional
	Protect bool `json:"protect,omitempty"`
	// +optional
	Kustomize *ServiceKustomize `json:"kustomize,omitempty"`
	// +optional
	Git *ServiceGit `json:"git,omitempty"`
	// +optional
	Helm *ServiceHelm `json:"helm,omitempty"`
	// +optional
	SyncConfig *SyncConfigAttributes `json:"syncConfig,omitempty"`
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Repository is immutable"
	RepositoryRef corev1.ObjectReference `json:"repositoryRef"`
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Cluster is immutable"
	ClusterRef corev1.ObjectReference `json:"clusterRef"`
	// ConfigurationRef is a secret reference which should contain service configuration.
	// +optional
	ConfigurationRef *corev1.SecretReference `json:"configurationRef,omitempty"`
	// Bindings contain read and write policies of this cluster
	// +optional
	Bindings *Bindings `json:"bindings,omitempty"`
}

type ServiceStatus struct {
	// +optional
	Errors []ServiceError `json:"errors,omitempty"`
	// +optional
	Components []ServiceComponent `json:"components,omitempty"`
	// ID of the provider in the Console API.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	ID *string `json:"id,omitempty"`
	// SHA of last applied configuration.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	SHA *string `json:"sha,omitempty"`
	// Represents the observations of Repository current state.
	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
}

type ServiceError struct {
	Source  string `json:"source"`
	Message string `json:"message"`
}

type ServiceComponent struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	// +optional
	Group *string `json:"group,omitempty"`
	Kind  string  `json:"kind"`
	// +optional
	Namespace *string `json:"namespace,omitempty"`
	// State specifies the component state
	// +kubebuilder:validation:Enum:=RUNNING;PENDING;FAILED
	// +optional
	State  *ComponentState `json:"state,omitempty"`
	Synced bool            `json:"synced"`
	// +optional
	Version *string `json:"version,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Console repo Id"
type ServiceDeployment struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// +kubebuilder:validation:Required
	Spec   ServiceSpec   `json:"spec,omitempty"`
	Status ServiceStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

type ServiceDeploymentList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ServiceDeployment `json:"items"`
}

func (p *ServiceStatus) HasReadonlyCondition() bool {
	return meta.FindStatusCondition(p.Conditions, ReadonlyConditionType.String()) != nil
}

func (p *ServiceStatus) IsReadonly() bool {
	return meta.IsStatusConditionTrue(p.Conditions, ReadonlyConditionType.String())
}

func (p *ServiceStatus) IsSHAEqual(sha string) bool {
	if !p.HasSHA() {
		return false
	}

	return p.GetSHA() == sha
}

func (p *ServiceStatus) GetSHA() string {
	if !p.HasSHA() {
		return ""
	}

	return *p.SHA
}

func (p *ServiceStatus) HasSHA() bool {
	return p.SHA != nil && len(*p.SHA) > 0
}

func (p *ServiceStatus) GetID() string {
	if !p.HasID() {
		return ""
	}

	return *p.ID
}

func (p *ServiceStatus) HasID() bool {
	return p.ID != nil && len(*p.ID) > 0
}

func (p *ServiceDeployment) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}
