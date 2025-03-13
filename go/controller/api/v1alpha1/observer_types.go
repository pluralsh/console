package v1alpha1

import (
	console "github.com/pluralsh/console/go/client"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

// ObserverSpec defines the desired state of Observer
type ObserverSpec struct {
	// the name of this observer, if not provided Observer's own name from Observer.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// The crontab you will poll the given Target with
	Crontab string `json:"crontab"`

	// The initial polled value of this observer, useful when you don't want to cause duplicate actions on initialization
	// +kubebuilder:validation:Optional
	Initial *string `json:"initial,omitempty"`

	// The target object to poll, triggering the list of Actions w/ the discovered value
	Target ObserverTarget `json:"target"`

	// A list of predefined actions to take if a new Target is discovered in the last poll loop
	Actions []ObserverAction `json:"actions,omitempty"`

	// ProjectRef references project this observer belongs to.
	// If not provided, it will use the default project.
	// +kubebuilder:validation:Optional
	ProjectRef *v1.ObjectReference `json:"projectRef,omitempty"`
}

type ObserverAction struct {
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=PIPELINE;PR
	Type console.ObserverActionType `json:"type"`

	// The configuration for the given action, relative to its current Type
	Configuration ObserverConfiguration `json:"configuration"`
}

type ObserverConfiguration struct {
	Pr       *ObserverPrAction       `json:"pr,omitempty"`
	Pipeline *ObserverPipelineAction `json:"pipeline,omitempty"`
}

type ObserverPrAction struct {
	// PrAutomationRef references to PR automation.
	PrAutomationRef v1.ObjectReference `json:"prAutomationRef"`
	// +kubebuilder:validation:Optional
	Repository *string `json:"repository,omitempty"`
	// BranchTemplate a template to use for the created branch, use $value to interject the observed value
	BranchTemplate *string `json:"branchTemplate,omitempty"`

	// Context is a templated context that will become the context applied to the given PR Automation, use `$value` to interpolate the observed value
	Context runtime.RawExtension `json:"context,omitempty"`
}

type ObserverPipelineAction struct {
	// PipelineRef references to Pipeline.
	PipelineRef v1.ObjectReference `json:"pipelineRef"`

	// Context is a templated context that will become the PipelineContext applied to the given pipeline, use `$value` to interpolate the observed value
	Context runtime.RawExtension `json:"context,omitempty"`
}

type ObserverTarget struct {
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=OCI;HELM;GIT;ADDON;EKS_ADDON
	Type console.ObserverTargetType `json:"type"`

	// Format is a regex with a capture group matching a well-formatted semver, eg `app-v([0-9]+.[0-9]+.[0-9]+)`
	// +kubebuilder:validation:Optional
	Format *string `json:"format,omitempty"`

	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=SEMVER;LATEST
	Order console.ObserverTargetOrder `json:"order"`

	// Configuration for helm scraping
	// +kubebuilder:validation:Optional
	Helm *ObserverHelm `json:"helm,omitempty"`

	// Configuration for OCI repository scraping
	// +kubebuilder:validation:Optional
	OCI *ObserverOci `json:"oci,omitempty"`

	// Configuration for Git tags scaping
	// +kubebuilder:validation:Optional
	Git *ObserverGit `json:"git,omitempty"`

	// Configuration for Plural AddOn table scraping
	// +kubebuilder:validation:Optional
	AddOn *ObserverAddOn `json:"addon,omitempty"`

	// Configuration for EKS AddOn scraping
	// +kubebuilder:validation:Optional
	EksAddOn *ObserverAddOn `json:"eksAddon,omitempty"`
}

type ObserverGit struct {

	// GitRepositoryRef references to Git repository.
	GitRepositoryRef v1.ObjectReference `json:"gitRepositoryRef"`
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=TAGS
	Type console.ObserverGitTargetType `json:"type"`
}

type ObserverHelm struct {
	// URL of the Helm repository.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="URL is immutable"
	URL string `json:"url"`

	// Chart of the Helm repository.
	// +kubebuilder:validation:Required
	Chart string `json:"chart"`

	// Provider is the name of the Helm auth provider.
	// +kubebuilder:example:=AWS
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=BASIC;BEARER;GCP;AZURE;AWS
	Provider *console.HelmAuthProvider `json:"provider,omitempty"`

	// Auth contains authentication credentials for the Helm repository.
	// +kubebuilder:validation:Optional
	Auth *HelmRepositoryAuth `json:"auth,omitempty"`
}

type ObserverOci struct {
	// URL of the Helm repository.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="URL is immutable"
	URL string `json:"url"`

	// Provider is the name of the Helm auth provider.
	// +kubebuilder:example:=AWS
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=BASIC;BEARER;GCP;AZURE;AWS
	Provider *console.HelmAuthProvider `json:"provider,omitempty"`

	// Auth contains authentication credentials for the Helm repository.
	// +kubebuilder:validation:Optional
	Auth *HelmRepositoryAuth `json:"auth,omitempty"`
}

type ObserverAddOn struct {
	// The name of the add-on you want to poll
	Name string `json:"name"`

	// The Kubernetes Version you want to ensure this add-on is compatible with
	// +kubebuilder:validation:Optional
	KubernetesVersion *string `json:"kubernetesVersion,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the observer in the Console API."

// Observer is the Schema for the observers API
type Observer struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ObserverSpec `json:"spec,omitempty"`
	Status Status       `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ObserverList contains a list of Observer
type ObserverList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Observer `json:"items"`
}

func (o *Observer) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&o.Status.Conditions, condition)
}

func (o *Observer) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(o.Spec)
	if err != nil {
		return false, "", err
	}

	return !o.Status.IsSHAEqual(currentSha), currentSha, nil
}

// ObserverName implements NamespacedPluralResource interface
func (o *Observer) ObserverName() string {
	if o.Spec.Name != nil && len(*o.Spec.Name) > 0 {
		return *o.Spec.Name
	}

	return o.Name
}

func (o *Observer) Attributes(target console.ObserverTargetAttributes, actions []*console.ObserverActionAttributes, projectID *string) console.ObserverAttributes {
	attributes := console.ObserverAttributes{
		Name:      o.ObserverName(),
		Crontab:   o.Spec.Crontab,
		Target:    target,
		Actions:   actions,
		ProjectID: projectID,
		Initial:   o.Spec.Initial,
	}
	return attributes
}

func init() {
	SchemeBuilder.Register(&Observer{}, &ObserverList{})
}
