package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
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

type ServiceHelm struct {
	// Fetches the helm values from a secret in this cluster, will consider any key with yaml data a values file and merge them iteratively
	// +kubebuilder:validation:Optional
	ValuesFrom *corev1.SecretReference `json:"valuesFrom,omitempty"`
	// +kubebuilder:validation:Optional
	ValuesConfigMapRef *corev1.ConfigMapKeySelector `json:"valuesConfigMapRef,omitempty"`
	// name of the helm release to use when applying
	// +kubebuilder:validation:Optional
	Release *string `json:"release,omitempty"`
	// arbitrary yaml values to overlay
	// +kubebuilder:validation:Optional
	Values *runtime.RawExtension `json:"values,omitempty"`
	// individual values files to overlay
	// +kubebuilder:validation:Optional
	ValuesFiles []*string `json:"valuesFiles,omitempty"`
	// chart to use
	// +kubebuilder:validation:Optional
	Chart *string `json:"chart,omitempty"`
	// chart version to use
	// +kubebuilder:validation:Optional
	Version *string `json:"version,omitempty"`
	// pointer to the FluxCD helm repository to use
	// +kubebuilder:validation:Optional
	Repository *NamespacedName `json:"repository,omitempty"`
}

type SyncConfigAttributes struct {
	// +kubebuilder:validation:Optional
	CreateNamespace *bool `json:"createNamespace,omitempty"`

	// +kubebuilder:validation:Optional
	Labels map[string]string `json:"labels,omitempty"`

	// +kubebuilder:validation:Optional
	Annotations map[string]string `json:"annotations,omitempty"`
}

type ServiceSpec struct {
	// the name of this service, if not provided ServiceDeployment's own name from ServiceDeployment.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`
	// the namespace this service will be deployed into, if not provided deploys to the ServiceDeployment's own namespace
	// +kubebuilder:validation:Optional
	Namespace *string `json:"namespace,omitempty"`
	// +kubebuilder:validation:Optional
	DocsPath *string `json:"docsPath,omitempty"`
	// +kubebuilder:validation:Optional
	Version *string `json:"version"`
	// +kubebuilder:validation:Optional
	Protect bool `json:"protect,omitempty"`
	// +kubebuilder:validation:Optional
	Kustomize *ServiceKustomize `json:"kustomize,omitempty"`
	// +kubebuilder:validation:Optional
	Git *GitRef `json:"git,omitempty"`
	// +kubebuilder:validation:Optional
	Helm *ServiceHelm `json:"helm,omitempty"`
	// +kubebuilder:validation:Optional
	SyncConfig *SyncConfigAttributes `json:"syncConfig,omitempty"`
	// +kubebuilder:validation:Optional
	RepositoryRef *corev1.ObjectReference `json:"repositoryRef"`
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Cluster is immutable"
	ClusterRef corev1.ObjectReference `json:"clusterRef"`
	// ConfigurationRef is a secret reference which should contain service configuration.
	// +kubebuilder:validation:Optional
	ConfigurationRef *corev1.SecretReference `json:"configurationRef,omitempty"`
	// Bindings contain read and write policies of this cluster
	// +kubebuilder:validation:Optional
	Bindings *Bindings `json:"bindings,omitempty"`
	// Dependencies contain dependent services
	// +kubebuilder:validation:Optional
	Dependencies []corev1.ObjectReference `json:"dependencies,omitempty"`
	// Contexts contain dependent service context names
	// +kubebuilder:validation:Optional
	Contexts []string `json:"contexts,omitempty"`
	// Templated should apply liquid templating to raw yaml files, defaults to true
	// +kubebuilder:validation:Optional
	Templated *bool `json:"templated,omitempty"`
}

type ServiceStatus struct {
	Status `json:",inline"`

	// +kubebuilder:validation:Optional
	Errors []ServiceError `json:"errors,omitempty"`
	// +kubebuilder:validation:Optional
	Components []ServiceComponent `json:"components,omitempty"`
}

type ServiceError struct {
	Source  string `json:"source"`
	Message string `json:"message"`
}

type ServiceComponent struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	// +kubebuilder:validation:Optional
	Group *string `json:"group,omitempty"`
	Kind  string  `json:"kind"`
	// +kubebuilder:validation:Optional
	Namespace *string `json:"namespace,omitempty"`
	// State specifies the component state
	// +kubebuilder:validation:Enum:=RUNNING;PENDING;FAILED
	// +kubebuilder:validation:Optional
	State  *ComponentState `json:"state,omitempty"`
	Synced bool            `json:"synced"`
	// +kubebuilder:validation:Optional
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

// ConsoleID implements NamespacedPluralResource interface
func (s *ServiceDeployment) ConsoleID() *string {
	return s.Status.ID
}

// ConsoleName implements NamespacedPluralResource interface
func (s *ServiceDeployment) ConsoleName() string {
	if s.Spec.Name != nil && len(*s.Spec.Name) > 0 {
		return *s.Spec.Name
	}

	return s.Name
}

// ConsoleNamespace implements NamespacedPluralResource interface
func (s *ServiceDeployment) ConsoleNamespace() string {
	if s.Spec.Namespace != nil && len(*s.Spec.Namespace) > 0 {
		return *s.Spec.Namespace
	}

	return s.Namespace
}

func (s *ServiceDeployment) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&s.Status.Conditions, condition)
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

type ServiceDeploymentList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ServiceDeployment `json:"items"`
}
