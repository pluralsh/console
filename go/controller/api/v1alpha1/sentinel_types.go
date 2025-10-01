package v1alpha1

import (
	console "github.com/pluralsh/console/go/client"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// SentinelSpec defines the desired state of Sentinel
type SentinelSpec struct {
	// Name of this Sentinel.
	// If not provided, the name from Sentinel.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Description provides a human-readable explanation of what this Sentinel.
	Description *string `json:"description,omitempty"`

	// RepositoryRef references a Git repository.
	// +kubebuilder:validation:Optional
	RepositoryRef *corev1.ObjectReference `json:"repositoryRef,omitempty"`

	// ProjectRef references the project this object belongs to, enabling
	// project-scoped organization and access control.
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// Git the git repository to use for this sentinel.
	Git *Git `json:"git,omitempty"`

	Checks []SentinelCheck `json:"checks,omitempty"`
}

type Git struct {
	// URL the url of this repository.
	URL string `json:"url"`

	// PrivateKeyRef reference to a secret containing ssh private key.
	PrivateKeyRef *corev1.SecretKeySelector `json:"privateKeyRef,omitempty"`

	// PassphraseRef reference to a secret containing passphrase for the private key.
	PassphraseRef *corev1.SecretKeySelector `json:"passphraseRef,omitempty"`

	// UsernameRef reference to a secret containing http username.
	UsernameRef *corev1.SecretKeySelector `json:"usernameRef,omitempty"`

	// PasswordRef reference to a secret containing http password.
	PasswordRef *corev1.SecretKeySelector `json:"passwordRef,omitempty"`

	// HTTPSPath a manually supplied https path for non standard git setups.
	HTTPSPath *string `json:"httpsPath,omitempty"`

	// URLFormat custom URL format, e.g. {url}/tree/{ref}/{folder}.
	URLFormat *string `json:"urlFormat,omitempty"`

	// ConnectionID id of a scm connection to use for authentication.
	ConnectionID *string `json:"connectionId,omitempty"`

	// Decrypt whether to run plural crypto on this repo.
	Decrypt *bool `json:"decrypt,omitempty"`
}

type SentinelCheck struct {
	// Type the type of check to run.
	//+kubebuilder:validation:Enum=LOG;KUBERNETES
	Type console.SentinelCheckType `json:"type"`
	// Name the name of the check.
	Name string `json:"name"`
	// RuleFile the rule file to use for this check.
	RuleFile *string `json:"ruleFile,omitempty"`
	// Configuration the configuration to use for this check.
	Configuration *SentinelCheckConfiguration `json:"configuration,omitempty"`
}

type SentinelCheckConfiguration struct {
	// the log configuration to use for this check
	Log *SentinelCheckLogConfiguration `json:"log,omitempty"`
	// the kubernetes configuration to use for this check
	Kubernetes *SentinelCheckKubernetesConfiguration `json:"kubernetes,omitempty"`
}

type SentinelCheckLogConfiguration struct {
	// Namespaces the namespaces to run the query against.
	Namespaces []*string `json:"namespaces,omitempty"`
	// Query a search query this will run against the logs.
	Query string `json:"query"`
	// ClusterRef the cluster to run the query against.
	ClusterRef *corev1.ObjectReference `json:"clusterRef,omitempty"`
	// Duration of the log analysis run.
	Duration string `json:"duration"`
	// Facets the log facets to run the query against.
	Facets map[string]string `json:"facets,omitempty"`
}

type SentinelCheckKubernetesConfiguration struct {
	// Group to use when fetching this resource.
	Group *string `json:"group,omitempty"`
	// Version the api version to use when fetching this resource.
	Version string `json:"version"`
	// Kind the kind to use when fetching this resource.
	Kind string `json:"kind"`
	// Name to use when fetching this resource.
	Name string `json:"name"`
	// Namespace to use when fetching this resource
	Namespace *string `json:"namespace,omitempty"`
	// ClusterRef the cluster to run the query against
	//+kubebuilder:validation:Required
	ClusterRef corev1.ObjectReference `json:"clusterRef"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced
//+kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the ServiceAccount in the Console API."

// Sentinel is the Schema for the sentinels API
type Sentinel struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   SentinelSpec `json:"spec,omitempty"`
	Status Status       `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// SentinelList contains a list of Sentinel
type SentinelList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Sentinel `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Sentinel{}, &SentinelList{})
}

// ConsoleID implements NamespacedPluralResource interface
func (s *Sentinel) ConsoleID() *string {
	return s.Status.ID
}

// ConsoleName implements NamespacedPluralResource interface
func (s *Sentinel) ConsoleName() string {
	if s.Spec.Name != nil && len(*s.Spec.Name) > 0 {
		return *s.Spec.Name
	}

	return s.Name
}

func (s *Sentinel) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&s.Status.Conditions, condition)
}
