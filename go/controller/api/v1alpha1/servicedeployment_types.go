package v1alpha1

import (
	"encoding/json"

	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&ServiceDeployment{}, &ServiceDeploymentList{})
}

type ComponentState string

const ComponentStateRunning ComponentState = "RUNNING"

type ServiceKustomize struct {
	// Path to the kustomization file to use.
	Path string `json:"path"`

	// EnableHelm indicates whether to enable Helm for this Kustomize deployment.
	// Used for inflating Helm charts.
	// +kubebuilder:validation:Optional
	EnableHelm *bool `json:"enableHelm,omitempty"`
}

func (sk *ServiceKustomize) Attributes() *console.KustomizeAttributes {
	if sk == nil {
		return nil
	}

	return &console.KustomizeAttributes{Path: sk.Path, EnableHelm: sk.EnableHelm}
}

type ServiceHelm struct {
	// +kubebuilder:validation:Optional
	URL *string `json:"url,omitempty"`

	// ValuesFrom is a reference to a Kubernetes Secret containing Helm values.
	// It will consider any key with YAML data as a values file and merge them iteratively.
	// This allows you to store Helm values in a secret and reference them here.
	// +kubebuilder:validation:Optional
	ValuesFrom *corev1.SecretReference `json:"valuesFrom,omitempty"`

	// +kubebuilder:validation:Optional
	ValuesConfigMapRef *corev1.ConfigMapKeySelector `json:"valuesConfigMapRef,omitempty"`

	// Release contains the name of the Helm release to use when applying this service.
	// +kubebuilder:validation:Optional
	Release *string `json:"release,omitempty"`

	// RepositoryRef contains a reference to a GitRepository to source the Helm chart from.
	// This is useful for using a multi-source configuration for values files.
	// +kubebuilder:validation:Optional
	RepositoryRef *corev1.ObjectReference `json:"repositoryRef"`

	// Values contains arbitrary YAML values to overlay.
	// +kubebuilder:validation:Optional
	Values *runtime.RawExtension `json:"values,omitempty"`

	//  ValuesFiles contains individual values files to overlay.
	// +kubebuilder:validation:Optional
	ValuesFiles []*string `json:"valuesFiles,omitempty"`

	// Chart is the name of the Helm chart to use.
	// +kubebuilder:validation:Optional
	Chart *string `json:"chart,omitempty"`

	// Version of the Helm chart to use.
	// +kubebuilder:validation:Optional
	Version *string `json:"version,omitempty"`

	// Repository is a pointer to the FluxCD Helm repository to use.
	// +kubebuilder:validation:Optional
	Repository *NamespacedName `json:"repository,omitempty"`

	// Git contains a reference to a Git folder and ref where the Helm chart is located.
	// +kubebuilder:validation:Optional
	Git *GitRef `json:"git,omitempty"`

	// IgnoreHooks indicates whether to completely ignore Helm hooks when actualizing this service.
	// +kubebuilder:validation:Optional
	IgnoreHooks *bool `json:"ignoreHooks,omitempty"`

	// IgnoreCrds indicates whether to not include the CRDs in the /crds folder of the chart.
	// It is useful if you want to avoid installing CRDs that are already present in the cluster.
	// +kubebuilder:validation:Optional
	IgnoreCrds *bool `json:"ignoreCrds,omitempty"`

	// LuaScript to use to generate Helm configuration.
	// This can ultimately return a lua table with keys "values" and "valuesFiles"
	// to supply overlays for either dynamically based on git state or other metadata.
	// +kubebuilder:validation:Optional
	LuaScript *string `json:"luaScript,omitempty"`

	// LuaFile to use to generate Helm configuration.
	// This can ultimately return a Lua table with keys "values" and "valuesFiles"
	// to supply overlays for either dynamically based on Git state or other metadata.
	// +kubebuilder:validation:Optional
	LuaFile *string `json:"luaFile,omitempty"`

	// a folder of lua files to include in the final script used
	// +kubebuilder:validation:Optional
	LuaFolder *string `json:"luaFolder,omitempty"`
}

type ServiceDependency struct {
	// The name of a service on the same cluster this service depends on
	Name string `json:"name"`
}

type SyncConfigAttributes struct {
	// Whether to auto-create the namespace for this service (specifying labels and annotations will also add those to the created namespace)
	// +kubebuilder:validation:Optional
	CreateNamespace *bool `json:"createNamespace,omitempty"`

	// Whether to delete the namespace for this service upon deletion
	// +kubebuilder:validation:Optional
	DeleteNamespace *bool `json:"deleteNamespace,omitempty"`

	// Whether to enforce all created resources are placed in the service namespace
	// +kubebuilder:validation:Optional
	EnforceNamespace *bool `json:"enforceNamespace,omitempty"`

	// Whether to require all resources are owned by this service and fail if they are owned by another. Default is true.
	// +kubebuilder:validation:Optional
	RequireOwnership *bool `json:"requireOwnership,omitempty"`

	// +kubebuilder:validation:Optional
	Labels map[string]string `json:"labels,omitempty"`

	// +kubebuilder:validation:Optional
	Annotations map[string]string `json:"annotations,omitempty"`

	// DiffNormalizers a list of diff normalizers to apply to the service which controls how drift detection works.
	// +kubebuilder:validation:Optional
	DiffNormalizers []DiffNormalizers `json:"diffNormalizers,omitempty"`
}

type DiffNormalizers struct {
	Name *string `json:"name,omitempty"`
	Kind *string `json:"kind,omitempty"`

	// +kubebuilder:validation:Optional
	Namespace *string `json:"namespace,omitempty"`

	// Backfill indicates whether to backfill the given pointers with the current live value
	// or otherwise ignore it entirely.
	// +kubebuilder:validation:Optional
	Backfill *bool `json:"backfill,omitempty"`

	// JSONPointers contains a list of JSON patches to apply to the service, which controls how drift detection works.
	JSONPointers []string `json:"jsonPointers,omitempty"`
}

func (sca *SyncConfigAttributes) Attributes() (*console.SyncConfigAttributes, error) {
	if sca == nil {
		return nil, nil
	}

	createNamespace := true
	if sca.CreateNamespace != nil {
		createNamespace = *sca.CreateNamespace
	}

	deleteNamespace := false
	if sca.DeleteNamespace != nil {
		deleteNamespace = *sca.DeleteNamespace
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

	var diffNormalizers []*console.DiffNormalizerAttributes
	totalSize := len(sca.DiffNormalizers)
	if totalSize > 0 {
		// Preallocate the slice with the exact size required
		diffNormalizers = make([]*console.DiffNormalizerAttributes, 0, totalSize)

		// Populate from sca.DiffNormalizers
		for _, diffNormalizer := range sca.DiffNormalizers {
			diffNormalizers = append(diffNormalizers, &console.DiffNormalizerAttributes{
				Name:         diffNormalizer.Name,
				Kind:         diffNormalizer.Kind,
				Namespace:    diffNormalizer.Namespace,
				Backfill:     diffNormalizer.Backfill,
				JSONPointers: lo.ToSlicePtr(diffNormalizer.JSONPointers),
			})
		}
	}

	return &console.SyncConfigAttributes{
		CreateNamespace:  &createNamespace,
		EnforceNamespace: &enforceNamespace,
		DeleteNamespace:  &deleteNamespace,
		RequireOwnership: sca.RequireOwnership,
		NamespaceMetadata: &console.MetadataAttributes{
			Labels:      labels,
			Annotations: annotations,
		},
		DiffNormalizers: diffNormalizers,
	}, nil
}

// ServiceSpec defines the desired state of a ServiceDeployment.
type ServiceSpec struct {
	// Name of this service.
	// If not provided, the name from ServiceDeployment.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Namespace where this service will be deployed.
	// If not provided, deploys to the ServiceDeployment namespace.
	// +kubebuilder:validation:Optional
	Namespace *string `json:"namespace,omitempty"`

	// DocsPath specifies the path to documentation within the Git repository.
	// +kubebuilder:validation:Optional
	DocsPath *string `json:"docsPath,omitempty"`

	// Version specifies the semantic version of this ServiceDeployment.
	// +kubebuilder:validation:Optional
	Version *string `json:"version"`

	// Protect when true, prevents deletion of this service to avoid accidental removal.
	// +kubebuilder:validation:Optional
	Protect bool `json:"protect,omitempty"`

	// Kustomize configuration for applying Kustomize transformations to manifests.
	// +kubebuilder:validation:Optional
	Kustomize *ServiceKustomize `json:"kustomize,omitempty"`

	// Git reference within the repository where the service manifests are located.
	// +kubebuilder:validation:Optional
	Git *GitRef `json:"git,omitempty"`

	// Helm configuration for deploying Helm charts, including values and repository settings.
	// +kubebuilder:validation:Optional
	Helm *ServiceHelm `json:"helm,omitempty"`

	// SyncConfig contains advanced configuration for how manifests are synchronized to the cluster.
	// +kubebuilder:validation:Optional
	SyncConfig *SyncConfigAttributes `json:"syncConfig,omitempty"`

	// RepositoryRef references the GitRepository CRD containing the service source code.
	// +kubebuilder:validation:Optional
	RepositoryRef *corev1.ObjectReference `json:"repositoryRef"`

	// ClusterRef references the target Cluster where this service will be deployed.
	// +kubebuilder:validation:Required
	ClusterRef corev1.ObjectReference `json:"clusterRef"`

	// ConfigurationRef is a secret reference containing service configuration for templating.
	// +kubebuilder:validation:Optional
	ConfigurationRef *corev1.SecretReference `json:"configurationRef,omitempty"`

	// FlowRef provides contextual linkage to a broader application Flow this service belongs within.
	// +kubebuilder:validation:Optional
	FlowRef *corev1.ObjectReference `json:"flowRef,omitempty"`

	// Configuration contains non-secret key-value pairs for lightweight templating of manifests.
	// +kubebuilder:validation:Optional
	Configuration map[string]string `json:"configuration,omitempty"`

	// Bindings contain read and write policies controlling access to this service.
	// +kubebuilder:validation:Optional
	Bindings *Bindings `json:"bindings,omitempty"`

	// Dependencies specify services that must be healthy before this service can be deployed.
	// +kubebuilder:validation:Optional
	Dependencies []ServiceDependency `json:"dependencies,omitempty"`

	// Contexts reference ServiceContext names to inject additional configuration.
	// +kubebuilder:validation:Optional
	Contexts []string `json:"contexts,omitempty"`

	// Templated enables Liquid templating for raw YAML files, defaults to true.
	// +kubebuilder:validation:Optional
	Templated *bool `json:"templated,omitempty"`

	// Imports enable importing outputs from InfrastructureStack resources for use in templating.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Imports are immutable"
	Imports []ServiceImport `json:"imports"`

	// Detach when true, detaches the service on deletion instead of destroying it.
	// +kubebuilder:validation:Optional
	Detach bool `json:"detach,omitempty"`

	// Sources specify additional Git repositories to source manifests from for multi-source deployments.
	// +kubebuilder:validation:Optional
	Sources []Source `json:"sources,omitempty"`

	// Renderers define how to process and render manifests using different engines (Helm, Kustomize, etc.).
	// +kubebuilder:validation:Optional
	Renderers []Renderer `json:"renderers,omitempty"`

	// AgentId represents agent session ID that created this service.
	// It is used for UI linking and otherwise ignored.
	// +kubebuilder:validation:Optional
	AgentId *string `json:"agentId,omitempty"`
}

type Source struct {
	// Path the subdirectory this source will live in the final tarball
	Path *string `json:"path,omitempty"`

	// RepositoryRef the reference of the Git repository to source from.
	RepositoryRef *corev1.ObjectReference `json:"repositoryRef,omitempty"`

	// Git contains a location in a Git repository to use.
	Git *GitRef `json:"git,omitempty"`
}

type Renderer struct {
	Path string `json:"path"`

	// +kubebuilder:validation:Enum=AUTO;RAW;HELM;KUSTOMIZE
	Type console.RendererType `json:"type"`

	Helm *HelmMinimal `json:"helm,omitempty"`
}

type HelmMinimal struct {
	// Values a Helm values file to use when rendering this Helm chart.
	Values *string `json:"values,omitempty"`

	// ValuesFiles a list of relative paths to values files to use for Helm chart templating.
	ValuesFiles []string `json:"valuesFiles,omitempty"`

	// Release is a Helm release name to use when rendering this Helm chart.
	Release *string `json:"release,omitempty"`
}

type ServiceImport struct {
	// StackRef is a reference to an InfrastructureStack resource that provides outputs to import.
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
	ID string `json:"id"`

	// Name is the name of the Kubernetes resource, e.g. "test-deployment" or "test-job".
	Name string `json:"name"`

	// Group is a Kubernetes resource group, e.g. "apps" or "batch".
	// +kubebuilder:validation:Optional
	Group *string `json:"group,omitempty"`

	// Version is the Kubernetes resource version, e.g. "v1" or "v1beta1".
	// +kubebuilder:validation:Optional
	Version *string `json:"version,omitempty"`

	// Kind is the Kubernetes resource kind, e.g. "Deployment" or "Job".
	Kind string `json:"kind"`

	// Namespace is the Kubernetes namespace where this component is deployed.
	// +kubebuilder:validation:Optional
	Namespace *string `json:"namespace,omitempty"`

	// State specifies the component state.
	// One of RUNNING, PENDING, FAILED.
	// +kubebuilder:validation:Enum:=RUNNING;PENDING;FAILED
	// +kubebuilder:validation:Optional
	State *ComponentState `json:"state,omitempty"`

	// Synced indicates whether this component is in sync with the desired state.
	Synced bool `json:"synced"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Console repo Id"

// ServiceDeployment provides a GitOps-driven approach to deploy and manage Kubernetes applications from Git repositories.
// It represents a reference to a service deployed from a Git repo into a Cluster, enabling complete GitOps workflows
// with full auditability and automated synchronization. The operator manages the deployment lifecycle by fetching
// manifests from Git repositories and applying them to target clusters with support for Helm, Kustomize, and raw YAML.
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

// ServiceDeploymentList contains a list of ServiceDeployment resources.
type ServiceDeploymentList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ServiceDeployment `json:"items"`
}
