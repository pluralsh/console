package v1alpha1

import (
	"encoding/json"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
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

func (sk *ServiceKustomize) Attributes() *console.KustomizeAttributes {
	if sk == nil {
		return nil
	}

	return &console.KustomizeAttributes{Path: sk.Path}
}

type ServiceHelm struct {
	// +kubebuilder:validation:Optional
	URL *string `json:"url,omitempty"`
	// Fetches the helm values from a secret in this cluster, will consider any key with yaml data a values file and merge them iteratively
	// +kubebuilder:validation:Optional
	ValuesFrom *corev1.SecretReference `json:"valuesFrom,omitempty"`
	// +kubebuilder:validation:Optional
	ValuesConfigMapRef *corev1.ConfigMapKeySelector `json:"valuesConfigMapRef,omitempty"`
	// name of the helm release to use when applying
	// +kubebuilder:validation:Optional
	Release *string `json:"release,omitempty"`
	// reference to a GitRepository to source the helm chart from (useful if you're using a multi-source configuration for values files)
	// +kubebuilder:validation:Optional
	RepositoryRef *corev1.ObjectReference `json:"repositoryRef"`
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

	// whether you want to completely ignore any helm hooks when actualizing this service
	// +kubebuilder:validation:Optional
	IgnoreHooks *bool `json:"ignoreHooks,omitempty"`
}

type ServiceDependency struct {
	// The name of a service on the same cluster this service depends on
	Name string `json:"name"`
}

type SyncConfigAttributes struct {
	// +kubebuilder:validation:Optional
	CreateNamespace *bool `json:"createNamespace,omitempty"`

	// +kubebuilder:validation:Optional
	EnforceNamespace *bool `json:"enforceNamespace,omitempty"`

	// +kubebuilder:validation:Optional
	Labels map[string]string `json:"labels,omitempty"`

	// +kubebuilder:validation:Optional
	Annotations map[string]string `json:"annotations,omitempty"`
}

func (sca *SyncConfigAttributes) Attributes() (*console.SyncConfigAttributes, error) {
	if sca == nil {
		return nil, nil
	}

	createNamespace := true
	if sca.CreateNamespace != nil {
		createNamespace = *sca.CreateNamespace
	}
	enforceNamespace := false
	if sca.EnforceNamespace != nil {
		enforceNamespace = *sca.EnforceNamespace
	}

	var annotations *string
	if sca.Annotations != nil {
		result, err := json.Marshal(sca.Annotations)
		if err != nil {
			return nil, err
		}
		annotations = lo.ToPtr(string(result))
	}

	var labels *string
	if sca.Labels != nil {
		result, err := json.Marshal(sca.Labels)
		if err != nil {
			return nil, err
		}
		labels = lo.ToPtr(string(result))
	}

	return &console.SyncConfigAttributes{
		CreateNamespace:  &createNamespace,
		EnforceNamespace: &enforceNamespace,
		NamespaceMetadata: &console.MetadataAttributes{
			Labels:      labels,
			Annotations: annotations,
		},
	}, nil
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

	// Configuration is a set of non-secret configuration to apply for lightweight templating of manifests in this service
	// +kubebuilder:validation:Optional
	Configuration map[string]string `json:"configuration,omitempty"`

	// Bindings contain read and write policies of this cluster
	// +kubebuilder:validation:Optional
	Bindings *Bindings `json:"bindings,omitempty"`
	// Dependencies contain dependent services
	// +kubebuilder:validation:Optional
	Dependencies []ServiceDependency `json:"dependencies,omitempty"`
	// Contexts contain dependent service context names
	// +kubebuilder:validation:Optional
	Contexts []string `json:"contexts,omitempty"`
	// Templated should apply liquid templating to raw yaml files, defaults to true
	// +kubebuilder:validation:Optional
	Templated *bool `json:"templated,omitempty"`
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Imports are immutable"
	Imports []ServiceImport `json:"imports"`
	// Detach determined if user want to delete or detach service
	// +kubebuilder:validation:Optional
	Detach bool `json:"detach,omitempty"`
}

type ServiceImport struct {
	// +kubebuilder:validation:Required
	StackRef corev1.ObjectReference `json:"stackRef"`
}

func (ss *ServiceSpec) DependenciesAttribute() []*console.ServiceDependencyAttributes {
	if len(ss.Dependencies) < 1 {
		return nil
	}

	deps := make([]*console.ServiceDependencyAttributes, 0)
	for _, dep := range ss.Dependencies {
		deps = append(deps, &console.ServiceDependencyAttributes{Name: dep.Name})
	}

	return deps
}

func (ss *ServiceSpec) TemplatedAttribute() *bool {
	if ss.Templated == nil {
		return lo.ToPtr(true)
	}

	return ss.Templated
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
